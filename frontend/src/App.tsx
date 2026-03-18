import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Tooltip, useMap, LayersControl, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';
import { fetchBassersdorfStreets, fetchBassersdorfHydrants } from './osmService';
import type { Street, Hydrant } from './osmService';
import { useTranslation } from 'react-i18next';
import confetti from 'canvas-confetti';
import { 
  BookOpen, Trophy, LayoutList, History, LogOut, Languages, 
  Map as MapIcon, CheckCircle2, XCircle, ChevronRight, Play, Zap, 
  Target, Clock, Flame, Moon, Star, ShieldCheck, Compass, Medal, 
  ShieldAlert, User as UserIcon, Droplets, EyeOff, Sun, Infinity,
  Award, Footprints, Flag
} from 'lucide-react';

const BASSERSDORF_CENTER: [number, number] = [47.444, 8.625];
const QUESTION_TIME_LIMIT = 20;

const RANKS = [
  { min: 0, title: "Rekrut", color: "#94a3b8" },
  { min: 5000, title: "Soldat", color: "#4ade80" },
  { min: 15000, title: "Korporal", color: "#38bdf8" },
  { min: 35000, title: "Wachtmeister", color: "#fb923c" },
  { min: 75000, title: "Offizier", color: "#f472b6" },
  { min: 150000, title: "Lokalmatador", color: "#ff5252" },
  { min: 300000, title: "Legende", color: "#fbbf24" }
];

const ACHIEVEMENTS = [
  { id: 'speed_demon', title: 'speed_demon_title', desc: 'speed_demon_desc', icon: Zap, color: '#facc15' },
  { id: 'perfect_round', title: 'perfect_round_title', desc: 'perfect_round_desc', icon: Star, color: '#fbbf24' },
  { id: 'night_shift', title: 'night_shift_title', desc: 'night_shift_desc', icon: Moon, color: '#818cf8' },
  { id: 'early_bird', title: 'early_bird_title', desc: 'early_bird_desc', icon: Sun, color: '#fde047' },
  { id: 'on_fire_7', title: 'on_fire_7_title', desc: 'on_fire_7_desc', icon: Flame, color: '#ff5252' },
  { id: 'streak_10', title: 'streak_10_title', desc: 'streak_10_desc', icon: Infinity, color: '#a855f7' },
  { id: 'high_score_round', title: 'high_score_round_title', desc: 'high_score_round_desc', icon: Award, color: '#3b82f6' },
  { id: 'marathon', title: 'marathon_title', desc: 'marathon_desc', icon: Footprints, color: '#f97316' },
  { id: 'master_explorer', title: 'master_explorer_title', desc: 'master_explorer_desc', icon: Flag, color: '#10b981' },
  { id: 'local_hero', title: 'local_hero_title', desc: 'local_hero_desc', icon: ShieldCheck, color: '#4ade80' }
];

const getRank = (totalScore: number) => {
  return [...RANKS].reverse().find(r => totalScore >= r.min) || RANKS[0];
};

const MapFocus = ({ coords }: { coords: [number, number][][] | null }) => {
  const map = useMap();
  useEffect(() => {
    if (coords && coords.length > 0) {
      const flatCoords = coords.flat();
      map.fitBounds(flatCoords as any, { padding: [100, 100], maxZoom: 20 });
    }
  }, [coords, map]);
  return null;
};

const MapResizer = () => {
  const map = useMap();
  useEffect(() => {
    const handleResize = () => { map.invalidateSize(); };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [map]);
  return null;
};

const MapTracker = ({ setZoom, setBounds }: { setZoom: (z: number) => void, setBounds: (b: L.LatLngBounds) => void }) => {
  const map = useMap();
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const update = () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => {
        setZoom(map.getZoom());
        setBounds(map.getBounds());
      }, 100);
    };
    map.on('zoomend moveend', update);
    setZoom(map.getZoom());
    setBounds(map.getBounds());
    return () => { 
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      map.off('zoomend moveend', update); 
    };
  }, [map, setZoom, setBounds]);
  return null;
};

const LanguageSwitcher = ({ current, onChange }: { current: string, onChange: (lng: string) => void }) => (
  <div className="flex bg-white/5 p-1 rounded-xl border border-glass-border gap-1">
    <button 
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-extrabold text-[0.75rem] transition-all duration-200 cursor-pointer ${current === 'de' ? 'bg-primary text-white shadow-lg shadow-primary-glow' : 'text-text-muted hover:bg-white/5 hover:text-white'}`} 
      onClick={() => onChange('de')}
    >
      <span className="text-lg">🇩🇪</span> <span>DE</span>
    </button>
    <button 
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-extrabold text-[0.75rem] transition-all duration-200 cursor-pointer ${current === 'en' ? 'bg-primary text-white shadow-lg shadow-primary-glow' : 'text-text-muted hover:bg-white/5 hover:text-white'}`} 
      onClick={() => onChange('en')}
    >
      <span className="text-lg">🇬🇧</span> <span>EN</span>
    </button>
  </div>
);

const App: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [user, setUser] = useState<string | null>(localStorage.getItem('user'));
  const [streets, setStreets] = useState<Street[]>([]);
  const [hydrants, setHydrants] = useState<Hydrant[]>([]);
  const [showHydrants, setShowHydrants] = useState(false);
  const [mode, setMode] = useState<'learn' | 'compete' | 'leaderboard' | 'release_notes'>('learn');
  const [loading, setLoading] = useState(true);
  const [selectedStreetId, setSelectedStreetId] = useState<string | null>(null);

  // Competition state
  const [currentStreet, setCurrentStreet] = useState<Street | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_LIMIT);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [streak, setStreak] = useState(0);
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([]);
  const [knownStreetIds, setKnownStreetIds] = useState<string[]>([]);
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);
  const [lastDiscoveryBonus, setLastDiscoveryBonus] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(15);
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);
  const [roundsPlayedInSession, setRoundsPlayedInSession] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!user) return;
    const savedAchievements = JSON.parse(localStorage.getItem(`achievements_${user}`) || '[]');
    setUnlockedAchievements(savedAchievements);
    const savedKnown = JSON.parse(localStorage.getItem(`known_streets_${user}`) || '[]');
    setKnownStreetIds(savedKnown);

    const loadData = async () => {
      setLoading(true);
      try {
        const [streetData, hydrantData] = await Promise.all([
          fetchBassersdorfStreets(),
          fetchBassersdorfHydrants()
        ]);
        setStreets(streetData);
        setHydrants(hydrantData);
      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user]);

  useEffect(() => {
    if (isTimerActive && timeLeft > 0) {
      timerRef.current = window.setInterval(() => { setTimeLeft((prev) => prev - 0.1); }, 100);
    } else if (timeLeft <= 0 && isTimerActive) {
      handleAnswer(""); 
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isTimerActive, timeLeft]);

  const unlockAchievement = (id: string) => {
    if (!unlockedAchievements.includes(id)) {
      const updated = [...unlockedAchievements, id];
      setUnlockedAchievements(updated);
      localStorage.setItem(`achievements_${user}`, JSON.stringify(updated));
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#ff5252', '#38bdf8', '#fbbf24'] });
      triggerEmergencyEffect();
    }
  };

  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const username = (e.currentTarget.elements.namedItem('username') as HTMLInputElement).value;
    if (username) {
      localStorage.setItem('user', username);
      setUser(username);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  const startCompetition = () => {
    setScore(0);
    setCorrectCount(0);
    setTotalQuestions(0);
    setStreak(0);
    nextQuestion();
  };

  const nextQuestion = () => {
    if (streets.length < 4) return;
    setFeedback(null);
    setLastDiscoveryBonus(false);
    setTimeLeft(QUESTION_TIME_LIMIT);
    const correct = streets[Math.floor(Math.random() * streets.length)];
    const distractors = streets.filter(s => s.name !== correct.name).sort(() => 0.5 - Math.random()).slice(0, 3);
    const allOptions = [correct.name, ...distractors.map(s => s.name)].sort(() => 0.5 - Math.random());
    setCurrentStreet(correct);
    setOptions(allOptions);
    setTotalQuestions(prev => prev + 1);
    setIsTimerActive(true);
  };

  const handleAnswer = (option: string) => {
    setIsTimerActive(false);
    if (timerRef.current) clearInterval(timerRef.current);
    const isCorrect = currentStreet?.name === option;
    const responseTime = QUESTION_TIME_LIMIT - timeLeft;
    if (isCorrect && responseTime < 2) unlockAchievement('speed_demon');
    const newStreak = isCorrect ? streak + 1 : 0;
    setStreak(newStreak);
    if (newStreak >= 7) unlockAchievement('on_fire_7');
    if (newStreak >= 10) unlockAchievement('streak_10');
    let multiplier = 1;
    if (newStreak >= 10) multiplier = 3;
    else if (newStreak >= 5) multiplier = 2;
    else if (newStreak >= 3) multiplier = 1.5;
    let discoveryBonus = 0;
    if (isCorrect && currentStreet && !knownStreetIds.includes(currentStreet.id)) {
      discoveryBonus = 1000;
      setLastDiscoveryBonus(true);
      const updatedKnown = [...knownStreetIds, currentStreet.id];
      setKnownStreetIds(updatedKnown);
      localStorage.setItem(`known_streets_${user}`, JSON.stringify(updatedKnown));
      if (updatedKnown.length >= 100) unlockAchievement('master_explorer');
    }
    const timeBonus = isCorrect ? Math.floor(timeLeft * 100) : 0;
    const basePoints = isCorrect ? 500 : 0;
    const roundPoints = Math.floor((basePoints + timeBonus) * multiplier) + discoveryBonus;
    if (isCorrect) {
      setScore(prev => prev + roundPoints);
      setCorrectCount(prev => prev + 1);
      setFeedback('correct');
    } else {
      setFeedback(option === "" ? "time_expired" : "wrong");
    }
    if (totalQuestions >= 10) {
      const finalCorrectCount = isCorrect ? correctCount + 1 : correctCount;
      const finalScore = score + roundPoints;
      
      const newRoundsCount = roundsPlayedInSession + 1;
      setRoundsPlayedInSession(newRoundsCount);
      if (newRoundsCount >= 5) unlockAchievement('marathon');
      if (finalScore >= 15000) unlockAchievement('high_score_round');

      if (finalCorrectCount === 10) {
        unlockAchievement('perfect_round');
        confetti({ particleCount: 300, spread: 100, origin: { y: 0.5 } });
      }
      const hour = new Date().getHours();
      if (hour >= 22 || hour < 5) unlockAchievement('night_shift');
      if (hour >= 5 && hour < 9) unlockAchievement('early_bird');
      
      const leaderboard = JSON.parse(localStorage.getItem('leaderboard') || '[]');
      leaderboard.push({ user, score: finalScore, date: new Date().toLocaleString() });
      localStorage.setItem('leaderboard', JSON.stringify(leaderboard));
      const userTotalScore = leaderboard.filter((entry: any) => entry.user === user).reduce((sum: number, entry: any) => sum + entry.score, 0);
      if (userTotalScore >= 100000) unlockAchievement('local_hero');
    }
  };

  const visibleHydrants = useMemo(() => {
    if (!showHydrants || !mapBounds) return [];
    return hydrants.filter(h => mapBounds.contains([h.lat, h.lon]));
  }, [hydrants, mapBounds, showHydrants]);

  const visibleStreets = useMemo(() => {
    if (!mapBounds) return streets;
    const bufferedBounds = mapBounds.pad(0.1);
    return streets.filter(s => {
      const streetBounds = L.latLngBounds(s.coordinates.flat());
      if (!bufferedBounds.intersects(streetBounds)) return false;
      return s.coordinates.some(path => {
        return path.some(coord => bufferedBounds.contains(coord));
      });
    });
  }, [streets, mapBounds]);

  const triggerEmergencyEffect = () => {
    setIsEmergencyActive(true);
    setTimeout(() => setIsEmergencyActive(false), 2000);
  };

  const changeLanguage = (lng: string) => { i18n.changeLanguage(lng); };

  const leaderboardData = JSON.parse(localStorage.getItem('leaderboard') || '[]');
  const sortedLeaderboard = [...leaderboardData].sort((a: any, b: any) => b.score - a.score).slice(0, 10);
  const userTotalScore = leaderboardData.filter((entry: any) => entry.user === user).reduce((sum: number, entry: any) => sum + entry.score, 0);
  const userRank = getRank(userTotalScore);
  const completionRate = streets.length > 0 ? Math.round((knownStreetIds.length / streets.length) * 100) : 0;
  const topThree = sortedLeaderboard.slice(0, 3);
  const restOfList = sortedLeaderboard.slice(3);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-screen relative overflow-hidden bg-[radial-gradient(circle_at_center,#1e293b_0%,#020617_100%)]">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-[radial-gradient(circle,var(--primary-glow)_0%,transparent_70%)] animate-float"></div>
          <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(56,189,248,0.1)_0%,transparent_70%)] animate-float-reverse"></div>
        </div>
        <div className="relative z-10 text-center animate-login-fade">
          <div className="mb-10">
            <ShieldAlert size={80} className="text-primary mb-5 mx-auto drop-shadow-[0_0_20px_var(--primary-glow)]" />
            <h1 className="text-[5rem] font-black tracking-tighter m-0 bg-gradient-to-br from-white via-white to-[#64748b] bg-clip-text text-transparent leading-none">
              {t('app_title')}
            </h1>
            <p className="text-text-muted text-[1.1rem] font-medium max-w-[400px] mx-auto mt-2.5 leading-relaxed">
              {t('login_desc')}
            </p>
          </div>
          <form className="flex flex-col gap-5 w-full max-w-[380px] mx-auto bg-[#1e293b]/50 backdrop-blur-2xl p-10 rounded-[32px] border border-glass-border shadow-2xl" onSubmit={handleLogin}>
            <div className="relative flex items-center">
              <UserIcon size={20} className="absolute left-4 text-text-muted" />
              <input name="username" placeholder={t('username')} required autoComplete="off" className="w-full py-4.5 pl-12 pr-4.5 rounded-2xl bg-[#0f172a]/60 border border-glass-border text-white text-[1rem] font-semibold outline-none" />
            </div>
            <button type="submit" className="py-4.5 bg-primary text-white border-none rounded-2xl cursor-pointer font-extrabold text-[1.1rem] flex items-center justify-center gap-3 transition-all duration-300 shadow-[0_10px_20px_-5px_var(--primary-glow)] hover:-translate-y-[3px] hover:brightness-110">
              <span>{t('login')}</span><ChevronRight size={20} />
            </button>
          </form>
          <div className="mt-7.5 flex items-center justify-center">
            <LanguageSwitcher current={i18n.language} onChange={changeLanguage} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`grid grid-rows-[auto_1fr] h-screen h-[100dvh] w-screen overflow-hidden ${isEmergencyActive ? 'emergency-lights' : ''}`}>
      <header className="bg-surface text-white px-6 py-2.5 flex justify-between items-center border-b border-glass-border z-[1001] shadow-2xl shrink-0 min-h-[64px]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3">
            <MapIcon size={20} className="header-icon" />
            <div className="flex flex-col leading-[1.2]">
              <span className="text-[0.9rem] font-bold"><strong>{user}</strong></span>
              <span className="text-[0.65rem] font-black uppercase px-2 py-0.5 rounded-[4px] tracking-wider" style={{ backgroundColor: userRank.color + '33', color: userRank.color }}>
                {userRank.title}
              </span>
            </div>
          </div>
          <div className="w-[1px] h-5 bg-glass-border mx-2"></div>
          <div className="flex items-center gap-2.5 text-text-muted" title={`${knownStreetIds.length} von ${streets.length} Strassen bekannt`}>
            <Compass size={16} />
            <div className="w-20 h-1.5 bg-white/5 rounded-full overflow-hidden border border-glass-border">
              <div className="h-full bg-gradient-to-r from-accent to-[#4ade80] transition-[width] duration-1000" style={{ width: `${completionRate}%` }}></div>
            </div>
            <span className="text-[0.75rem] font-extrabold text-white min-w-[35px]">{completionRate}%</span>
          </div>
          <div className="w-[1px] h-5 bg-glass-border mx-2"></div>
          <div className="flex items-center">
            <LanguageSwitcher current={i18n.language} onChange={changeLanguage} />
          </div>
        </div>
        <nav className="flex gap-2">
          <button 
            className={`flex items-center gap-2 px-4 py-2.5 cursor-pointer rounded-xl transition-all duration-200 font-semibold text-[0.85rem] ${mode === 'learn' ? 'text-primary bg-primary/12' : 'text-text-muted hover:text-white hover:bg-white/5'}`} 
            onClick={() => setMode('learn')}
          >
            <BookOpen size={18} /> {t('learn_mode')}
          </button>
          <button 
            className={`flex items-center gap-2 px-4 py-2.5 cursor-pointer rounded-xl transition-all duration-200 font-semibold text-[0.85rem] ${mode === 'compete' ? 'text-primary bg-primary/12' : 'text-text-muted hover:text-white hover:bg-white/5'}`} 
            onClick={() => { setMode('compete'); setShowRulesModal(true); }}
          >
            <Trophy size={18} /> {t('compete_mode')}
          </button>
          <button 
            className={`flex items-center gap-2 px-4 py-2.5 cursor-pointer rounded-xl transition-all duration-200 font-semibold text-[0.85rem] ${mode === 'leaderboard' ? 'text-primary bg-primary/12' : 'text-text-muted hover:text-white hover:bg-white/5'}`} 
            onClick={() => setMode('leaderboard')}
          >
            <LayoutList size={18} /> {t('leaderboard')}
          </button>
          <button 
            className={`flex items-center gap-2 px-4 py-2.5 cursor-pointer rounded-xl transition-all duration-200 font-semibold text-[0.85rem] ${mode === 'release_notes' ? 'text-primary bg-primary/12' : 'text-text-muted hover:text-white hover:bg-white/5'}`} 
            onClick={() => setMode('release_notes')}
          >
            <History size={18} /> {t('release_notes')}
          </button>
          <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2.5 cursor-pointer rounded-xl transition-all duration-200 font-semibold text-[0.85rem] text-red-500 hover:bg-white/5">
            <LogOut size={18} /> {t('logout')}
          </button>
        </nav>
      </header>

      <main className="flex-1 relative bg-bg overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-bg/80 backdrop-blur-md z-[2000]">
            <div className="w-10 h-10 border-4 border-primary/10 border-t-primary rounded-full animate-spin mb-5"></div>
            <p className="font-semibold">{t('loading')}</p>
          </div>
        )}

        {showRulesModal && (
          <div className="fixed inset-0 bg-[#0f172a]/90 backdrop-blur-xl flex justify-center items-center z-[9999] animate-modal-fade">
            <div className="bg-surface w-[95%] max-w-[650px] p-10 rounded-[40px] border border-glass-border shadow-[0_40px_100px_-20px_rgba(0,0,0,0.7)] text-left relative overflow-hidden animate-modal-scale">
              <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle,rgba(255,82,82,0.05)_0%,transparent_70%)] pointer-events-none z-0"></div>
              <div className="flex items-center gap-5 mb-7.5 relative z-10">
                <Zap size={32} className="text-primary" /> 
                <h2 className="text-[2.2rem] font-black m-0 tracking-tight">{t('rules_title')}</h2>
              </div>
              <div className="grid grid-cols-1 gap-4 mb-[35px] relative z-10">
                {[
                  { icon: Target, color: 'var(--accent)', title: 'rule_base_title', desc: 'rule_base_desc' },
                  { icon: Clock, color: 'var(--primary)', title: 'rule_time_title', desc: 'rule_time_desc' },
                  { icon: Zap, color: '#4ade80', title: 'rule_speed_title', desc: 'rule_speed_desc' },
                  { icon: Flame, color: '#fb923c', title: 'rule_streak_title', desc: 'rule_streak_desc' },
                  { icon: Compass, color: 'var(--accent)', title: 'rule_discovery_title', desc: 'rule_discovery_desc' }
                ].map((rule, i) => (
                  <div key={i} className="flex items-start gap-5 bg-white/[0.03] p-5 rounded-[20px] border border-white/[0.05] transition-all duration-200 hover:bg-white/[0.06] hover:translate-x-[5px] hover:border-white/10">
                    <rule.icon size={28} color={rule.color} /> 
                    <div>
                      <h4 className="m-0 mb-1 text-[1rem] font-extrabold text-white">{t(rule.title)}</h4>
                      <p className="m-0 text-[0.9rem] text-text-muted leading-relaxed" dangerouslySetInnerHTML={{ __html: t(rule.desc) }}></p>
                    </div>
                  </div>
                ))}
              </div>
              <button className="w-full py-4 px-8 bg-primary text-white border-none rounded-2xl text-[1.1rem] font-extrabold cursor-pointer flex items-center justify-center gap-3 transition-all duration-200 shadow-[0_10px_20px_-5px_var(--primary-glow)] hover:-translate-y-0.5 hover:brightness-110 relative z-10" onClick={() => { setShowRulesModal(false); startCompetition(); }}>
                <Play size={20} fill="currentColor" /> {t('rules_start')}
              </button>
            </div>
          </div>
        )}

        {mode === 'learn' && streets.length > 0 && (
          <div className="absolute inset-0 w-full h-full z-1 touch-none">
            <MapContainer key={`map-learn-${streets.length}`} center={BASSERSDORF_CENTER} zoom={15} maxZoom={22} style={{ height: '100%', width: '100%' }}>
              <LayersControl position="topright">
                <LayersControl.BaseLayer checked name={t('map_osm')}>
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" attribution='&copy; OSM' maxZoom={22} />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name={t('map_sat')}><TileLayer url="https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857/{z}/{x}/{y}.jpeg" attribution='&copy; swisstopo' maxZoom={22} /></LayersControl.BaseLayer>
              </LayersControl>
              <MapResizer /><MapTracker setZoom={setCurrentZoom} setBounds={setMapBounds} />
              {visibleStreets.map(s => (
                <React.Fragment key={s.id}>
                  {s.coordinates.map((path, idx) => (
                    <Polyline 
                      key={`${s.id}-${idx}-${selectedStreetId === s.id}`} positions={path} 
                      pathOptions={{
                        color: selectedStreetId === s.id ? "var(--primary)" : (knownStreetIds.includes(s.id) ? "#4ade80" : "var(--accent)"),
                        weight: selectedStreetId === s.id ? 8 : 4, opacity: selectedStreetId === s.id ? 1 : 0.6, className: selectedStreetId === s.id ? "pulse-line" : ""
                      }}
                      eventHandlers={{ click: () => setSelectedStreetId(s.id) }} interactive={true}
                    >
                      <Tooltip permanent={false} className="street-tooltip">{s.name} {knownStreetIds.includes(s.id) ? '✅' : ''}</Tooltip>
                    </Polyline>
                  ))}
                </React.Fragment>
              ))}
              {visibleHydrants.map(h => (
                <CircleMarker key={h.id} center={[h.lat, h.lon]} radius={6} pathOptions={{ color: '#38bdf8', fillColor: '#0ea5e9', fillOpacity: 0.8, weight: 2 }}>
                  <Tooltip className="street-tooltip">Hydrant #{h.id}</Tooltip>
                </CircleMarker>
              ))}
            </MapContainer>
            <button 
              className="absolute bottom-[120px] left-6 bg-glass-bg backdrop-blur-lg border border-glass-border text-white px-4.5 py-2.5 rounded-xl flex items-center gap-2.5 cursor-pointer z-[1000] shadow-2xl transition-all duration-300 font-bold text-[0.85rem] hover:-translate-y-0.5 hover:bg-surface hover:border-accent" 
              onClick={() => setShowHydrants(!showHydrants)}
            >
              {showHydrants ? <EyeOff size={20} className="text-accent" /> : <Droplets size={20} className="text-accent" />}
              <span>{showHydrants ? "Hydranten aus" : "Hydranten ein"}</span>
            </button>
            <div className="absolute bottom-[30px] left-1/2 -translate-x-1/2 bg-glass-bg backdrop-blur-lg px-6 py-3 rounded-full border border-glass-border z-[1000] shadow-2xl flex flex-col items-center gap-2">
              <div className="flex items-center gap-2.5 text-[0.9rem] text-white font-semibold"><BookOpen size={18} /> {t('learn_overlay')}</div>
              <div className="flex gap-5 border-t border-white/10 pt-2">
                <div className="flex items-center gap-1.5 text-[0.7rem] text-text-muted font-black uppercase"><span className="w-2 h-2 rounded-full bg-[#4ade80] shadow-[0_0_8px_rgba(74,222,128,0.5)]"></span> {t('legend_known')}</div>
                <div className="flex items-center gap-1.5 text-[0.7rem] text-text-muted font-black uppercase"><span className="w-2 h-2 rounded-full bg-accent shadow-[0_0_8px_rgba(56,189,248,0.5)]"></span> {t('legend_unknown')}</div>
                <div className="flex items-center gap-1.5 text-[0.7rem] text-text-muted font-black uppercase"><span className="w-2 h-2 rounded-full bg-[#38bdf8] shadow-[0_0_8px_rgba(56,189,248,0.5)]"></span> Hydrant</div>
              </div>
            </div>
          </div>
        )}

        {mode === 'compete' && currentStreet && !showRulesModal && (
          <div className="flex flex-col h-full w-full">
            <div className="flex justify-between absolute top-5 inset-x-5 z-[1000]">
              <div className="bg-glass-bg backdrop-blur-lg px-4 py-2 rounded-2xl border border-glass-border shadow-2xl text-white font-black flex items-center gap-2"><Trophy size={16} /> {t('round')}: {totalQuestions}/10</div>
              <div className={`bg-glass-bg backdrop-blur-lg px-4 py-2 rounded-2xl border border-glass-border shadow-2xl text-white font-black flex items-center gap-2 ${streak >= 3 ? 'animate-pulse text-primary border-primary/30' : ''}`}>
                {score.toLocaleString()} PTS
                {streak >= 3 && <span className="text-[0.7rem] bg-primary text-white px-1.5 rounded ml-1.5">x{streak >= 10 ? '3' : streak >= 5 ? '2' : '1.5'}</span>}
                {streak >= 3 && <Flame size={18} className="text-[#fb923c]" />}
              </div>
            </div>
            <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[260px] bg-glass-bg backdrop-blur-md p-1.5 px-3 rounded-[20px] z-[1000] border border-glass-border flex items-center gap-3 shadow-2xl">
              <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-100 linear" style={{ width: `${(timeLeft / QUESTION_TIME_LIMIT) * 100}%`, backgroundColor: timeLeft < 5 ? 'var(--primary)' : 'var(--accent)' }}></div>
              </div>
              <div className="text-[0.8rem] font-black text-white min-w-[35px] text-right tabular-nums">{Math.ceil(timeLeft)}s</div>
            </div>
            <div className="absolute inset-0 w-full h-full z-1 touch-none">
              <MapContainer key={`map-compete-${currentStreet.id}`} center={BASSERSDORF_CENTER} zoom={17} maxZoom={22} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                <LayersControl position="topright">
                  <LayersControl.BaseLayer checked name={t('map_stumm')}>
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" attribution='&copy; OSM' maxZoom={22} />
                  </LayersControl.BaseLayer>
                  <LayersControl.BaseLayer name={t('map_sat')}><TileLayer url="https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857/{z}/{x}/{y}.jpeg" attribution='&copy; swisstopo' maxZoom={22} /></LayersControl.BaseLayer>
                </LayersControl>
                <MapResizer /><MapTracker setZoom={setCurrentZoom} setBounds={setMapBounds} />
                {currentStreet.coordinates.map((path, idx) => (
                  <Polyline key={idx} positions={path} pathOptions={{ color: "var(--primary)", className: "pulse-line" }} />
                ))}
                {visibleHydrants.map(h => (
                  <CircleMarker key={h.id} center={[h.lat, h.lon]} radius={6} pathOptions={{ color: '#38bdf8', fillColor: '#0ea5e9', fillOpacity: 0.8, weight: 2 }}>
                    <Tooltip className="street-tooltip">Hydrant #{h.id}</Tooltip>
                  </CircleMarker>
                ))}
                <MapFocus coords={currentStreet.coordinates} />
              </MapContainer>
            </div>
            <div className="absolute bottom-[30px] left-1/2 -translate-x-1/2 w-[90%] max-w-[600px] bg-glass-bg backdrop-blur-[24px] p-6 rounded-[32px] border border-glass-border shadow-2xl z-[1000]">
              {feedback ? (
                <div className="flex flex-col items-center gap-[15px]">
                  <div className={`flex flex-col items-center gap-[15px] ${feedback === 'correct' ? 'text-[#4ade80]' : 'text-primary'}`}>
                    <div className="mb-2">{feedback === 'correct' ? <CheckCircle2 size={64} className="icon-pulse" /> : <XCircle size={64} className="icon-shake" />}</div>
                    <div className="text-center">
                      <h2 className="text-[2.2rem] font-black mb-1 leading-none uppercase">{t(feedback)}</h2>
                      {feedback !== 'correct' && <p className="text-[1.1rem] font-bold text-white/80">{t('correct_is', { name: currentStreet?.name })}</p>}
                      {feedback === 'correct' && (
                        <div className="flex flex-col items-center gap-1 mt-2">
                          {streak >= 3 && <p className="text-[#fb923c] font-black text-[1.2rem]">{t('streak_bonus', { count: streak })}</p>}
                          {lastDiscoveryBonus && <p className="text-[#4ade80] font-black text-[1.1rem]">{t('discovery_bonus_label')}</p>}
                        </div>
                      )}
                    </div>
                    <div className="w-full mt-[15px]">
                      {totalQuestions < 10 ? (
                        <button onClick={nextQuestion} className="w-full py-4 px-8 bg-primary text-white border-none rounded-2xl text-[1.1rem] font-extrabold cursor-pointer flex items-center justify-center gap-3 transition-all duration-200 shadow-[0_10px_20px_-5px_var(--primary-glow)] hover:-translate-y-0.5 hover:brightness-110">
                          <span>{t('next_street')}</span> <ChevronRight size={20} />
                        </button>
                      ) : (
                        <button onClick={() => setMode('leaderboard')} className="w-full py-4 px-8 bg-primary text-white border-none rounded-2xl text-[1.1rem] font-extrabold cursor-pointer flex items-center justify-center gap-3 transition-all duration-200 shadow-[0_10px_20px_-5px_var(--primary-glow)] hover:-translate-y-0.5 hover:brightness-110 border-2 border-accent/30">
                          <Trophy size={20} /> <span>{t('to_leaderboard')}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {options.map(opt => (
                    <button key={opt} onClick={() => handleAnswer(opt)} className="p-[1.2rem] text-[0.95rem] font-bold bg-white/5 border border-white/10 text-white cursor-pointer rounded-[18px] transition-all duration-200 min-h-[70px] flex items-center justify-center text-center hover:bg-primary hover:-translate-y-[3px] hover:shadow-[0_8px_20px_var(--primary-glow)]">
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {(mode === 'leaderboard' || mode === 'release_notes') && (
          <div className="absolute inset-0 overflow-y-auto pb-[50px] z-10">
            {mode === 'leaderboard' && (
              <div className="py-12 px-6 max-w-[900px] mx-auto text-center">
                <div className="flex items-center justify-center gap-4 mb-10"><Trophy size={32} className="text-accent" /> <h2 className="text-[2.5rem] font-black tracking-tight leading-none">Hall of Fame</h2></div>
                <div className="flex justify-center items-end gap-4 mb-16 pt-5 flex-wrap md:flex-nowrap">
                  {topThree.map((entry, i) => {
                    const totalS = leaderboardData.filter((ld: any) => ld.user === entry.user).reduce((sum: number, ld: any) => sum + ld.score, 0);
                    const rank = getRank(totalS);
                    const medalColors = ['#fbbf24', '#cbd5e1', '#d97706'];
                    const isWinner = i === 0;
                    return (
                      <div key={i} className={`bg-surface border border-glass-border rounded-[28px] p-6 flex flex-col items-center gap-3 w-full md:w-[190px] relative transition-all duration-300 shadow-2xl hover:-translate-y-2.5 ${isWinner ? 'order-1 md:order-2 md:p-11 md:w-[220px] border-yellow-500/40 bg-gradient-to-b from-[#1e293b] to-[#0f172a] z-[2]' : i === 1 ? 'order-2 md:order-1' : 'order-3 md:order-3'}`}>
                        <div className={`w-14 h-14 rounded-full flex justify-center items-center mb-2.5 ${isWinner ? 'bg-[#fbbf24] shadow-[0_0_30px_rgba(251,191,36,0.5)]' : i === 1 ? 'bg-[#cbd5e1]' : 'bg-[#d97706]'}`}>
                          <Medal size={24} color="#0f172a" />
                        </div>
                        <span className="font-black text-[1.2rem] text-white truncate w-full">{entry.user}</span>
                        <span className="text-[0.7rem] font-black uppercase" style={{ color: rank.color }}>{rank.title}</span>
                        <span className="text-[1.4rem] font-black text-accent">{entry.score.toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="bg-surface rounded-[32px] p-4 border border-glass-border mb-12">
                  <table className="w-full border-collapse">
                    <thead><tr><th className="p-4 px-5 text-text-muted text-[0.7rem] uppercase text-left">{t('rank')}</th><th className="p-4 px-5 text-text-muted text-[0.7rem] uppercase text-left">{t('name')}</th><th className="p-4 px-5 text-text-muted text-[0.7rem] uppercase text-left">{t('points')}</th><th className="p-4 px-5 text-text-muted text-[0.7rem] uppercase text-left">{t('date')}</th></tr></thead>
                    <tbody>
                      {restOfList.map((entry: any, i: number) => {
                        const totalS = leaderboardData.filter((ld: any) => ld.user === entry.user).reduce((sum: number, ld: any) => sum + ld.score, 0);
                        const rank = getRank(totalS);
                        return (
                          <tr key={i} className={`border-t border-white/[0.05] ${entry.user === user ? 'bg-accent/8 text-accent' : ''}`}>
                            <td className="p-5">#{i + 4}</td>
                            <td className="p-5"><div className="flex flex-col gap-[2px]"><span className="font-bold text-[1rem]">{entry.user}</span><span className="text-[0.7rem] font-black uppercase" style={{ color: rank.color }}>{rank.title}</span></div></td>
                            <td className="p-5 font-black text-primary text-[1.1rem]">{entry.score.toLocaleString()}</td>
                            <td className="p-5">{entry.date}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-6 bg-surface p-10 rounded-[32px] mb-8 border border-glass-border justify-items-center">
                  {ACHIEVEMENTS.map(ach => {
                    const isUnlocked = unlockedAchievements.includes(ach.id);
                    return (
                      <div key={ach.id} className={`flex flex-col items-center gap-3 w-full transition-all duration-300 ${isUnlocked ? 'filter-none opacity-100 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'grayscale opacity-20'}`} title={t(ach.desc)}>
                        <div className="p-3 rounded-full bg-white/[0.03] border border-white/[0.05]">
                          <ach.icon size={24} color={isUnlocked ? ach.color : '#475569'} />
                        </div>
                        <span className={`text-[0.7rem] font-extrabold uppercase text-center ${isUnlocked ? 'text-white' : 'text-text-muted'}`}>{t(ach.title)}</span>
                      </div>
                    );
                  })}
                </div>                
                <button onClick={() => setMode('learn')} className="mt-8 bg-transparent border border-glass-border text-text-muted px-5 py-2.5 rounded-xl cursor-pointer font-semibold hover:bg-white/5 hover:text-white">{t('back_to_learn')}</button>
              </div>
            )}

            {mode === 'release_notes' && (
              <div className="py-12 px-6 max-w-[900px] mx-auto">
                <div className="flex items-center gap-4 mb-10"><History size={32} className="text-primary" /> <h2 className="text-[2.5rem] font-black tracking-tight">{t('release_notes')}</h2></div>
                <div className="flex flex-col gap-8">
                  <div className="bg-surface p-10 rounded-[32px] border border-glass-border shadow-2xl text-left">
                    <div className="bg-primary text-white inline-block px-3.5 py-1.5 rounded-lg font-black text-[0.75rem] mb-3">v1.9.0</div>
                    <h3 className="mt-0 text-white text-[1.6rem] font-black mb-6">House Numbers Integrated</h3>
                    <ul className="p-0 list-none flex flex-col gap-3">
                      <li className="relative pl-7 leading-normal text-text-muted text-[0.95rem] before:content-['→'] before:absolute before:left-0 before:text-accent before:font-black">🏠 **Always Visible**: Hausnummern werden nun permanent auf der Karte angezeigt (ab Zoom-Level 18).</li>
                    </ul>
                  </div>
                  <div className="bg-surface p-10 rounded-[32px] border border-glass-border shadow-2xl text-left">
                    <div className="bg-primary text-white inline-block px-3.5 py-1.5 rounded-lg font-black text-[0.75rem] mb-3">v1.8.0</div>
                    <h3 className="mt-0 text-white text-[1.6rem] font-black mb-6">Map Refinement</h3>
                    <ul className="p-0 list-none flex flex-col gap-3">
                      <li className="relative pl-7 leading-normal text-text-muted text-[0.95rem] before:content-['→'] before:absolute before:left-0 before:text-accent before:font-black">🗺️ **Consistent Map**: Lern- und Wettkampfmodus nutzen den identischen CartoDB Voyager Stil.</li>
                    </ul>
                  </div>
                </div>
                <button onClick={() => setMode('learn')} className="mt-8 bg-transparent border border-glass-border text-text-muted px-5 py-2.5 rounded-xl cursor-pointer font-semibold hover:bg-white/5 hover:text-white">{t('back_to_learn')}</button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
