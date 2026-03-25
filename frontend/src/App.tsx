import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Tooltip, useMap, LayersControl, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';
import { fetchBassersdorfStreets, fetchBassersdorfHydrants, fetchBassersdorfPOIs } from './osmService';
import type { Street, Hydrant, POI } from './osmService';
import { useTranslation } from 'react-i18next';
import confetti from 'canvas-confetti';
import LandingPage from './LandingPage';
import { 
  BookOpen, Trophy, LayoutList, History, LogOut, 
  Map as MapIcon, CheckCircle2, XCircle, ChevronRight, Play, Zap, 
  Target, Clock, Flame, Moon, Star, ShieldCheck, Compass, Medal, 
  ShieldAlert, User as UserIcon, Droplets, EyeOff, Sun, Infinity,
  Award, Footprints, Flag, ArrowLeft
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
  <div className="flex bg-white/5 p-1 rounded-xl border border-glass-border gap-1 text-white leading-none">
    <button 
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-extrabold text-[0.75rem] transition-all duration-200 cursor-pointer ${current === 'de' ? 'bg-primary shadow-lg shadow-primary-glow text-white' : 'text-text-muted hover:bg-white/5 hover:text-white'}`} 
      onClick={() => onChange('de')}
    >
      <span className="text-lg md:text-xl leading-none">🇩🇪</span> <span className="leading-none uppercase">de</span>
    </button>
    <button 
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-extrabold text-[0.75rem] transition-all duration-200 cursor-pointer ${current === 'en' ? 'bg-primary shadow-lg shadow-primary-glow text-white' : 'text-text-muted hover:bg-white/5 hover:text-white'}`} 
      onClick={() => onChange('en')}
    >
      <span className="text-lg md:text-xl leading-none">🇬🇧</span> <span className="leading-none uppercase">en</span>
    </button>
  </div>
);

const App: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [user, setUser] = useState<string | null>(localStorage.getItem('user'));
  const [streets, setStreets] = useState<Street[]>([]);
  const [hydrants, setHydrants] = useState<Hydrant[]>([]);
  const [pois, setPois] = useState<POI[]>([]);
  const [showHydrants, setShowHydrants] = useState(false);
  const [showPOIs, setShowPOIs] = useState(false);
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
  const [, setCurrentZoom] = useState(15);
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);
  const [roundsPlayedInSession, setRoundsPlayedInSession] = useState(0);
  const [showLanding, setShowLanding] = useState(!user);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!user) return;
    setShowLanding(false);
    const savedAchievements = JSON.parse(localStorage.getItem(`achievements_${user}`) || '[]');
    setUnlockedAchievements(savedAchievements);
    const savedKnown = JSON.parse(localStorage.getItem(`known_streets_${user}`) || '[]');
    setKnownStreetIds(savedKnown);

    const loadData = async () => {
      setLoading(true);
      try {
        const [streetData, hydrantData, poiData] = await Promise.all([
          fetchBassersdorfStreets(),
          fetchBassersdorfHydrants(),
          fetchBassersdorfPOIs()
        ]);
        setStreets(streetData);
        setHydrants(hydrantData);
        setPois(poiData);
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
    setMode('learn');
    setShowLanding(true);
  };

  const startCompetition = () => {
    setScore(0);
    setCorrectCount(0);
    setTotalQuestions(0);
    setStreak(0);
    nextQuestion();
  };

  const nextQuestion = () => {
    if (streets.length < 4 || pois.length < 4) return;
    setFeedback(null);
    setLastDiscoveryBonus(false);
    setTimeLeft(QUESTION_TIME_LIMIT);
    
    const isPoiQuest = Math.random() < 0.3;
    
    if (isPoiQuest && pois.length >= 4) {
      const correct = pois[Math.floor(Math.random() * pois.length)];
      const distractors = pois.filter(p => p.name !== correct.name).sort(() => 0.5 - Math.random()).slice(0, 3);
      const allOptions = [correct.name, ...distractors.map(p => p.name)].sort(() => 0.5 - Math.random());
      setCurrentStreet({ id: correct.id, name: correct.name, coordinates: [[ [correct.lat, correct.lon] ]] } as any);
      setOptions(allOptions);
    } else {
      const correct = streets[Math.floor(Math.random() * streets.length)];
      const distractors = streets.filter(s => s.name !== correct.name).sort(() => 0.5 - Math.random()).slice(0, 3);
      const allOptions = [correct.name, ...distractors.map(s => s.name)].sort(() => 0.5 - Math.random());
      setCurrentStreet(correct);
      setOptions(allOptions);
    }
    
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

  const visiblePois = useMemo(() => {
    if (!showPOIs || !mapBounds) return [];
    return pois.filter(p => mapBounds.contains([p.lat, p.lon]));
  }, [pois, mapBounds, showPOIs]);

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

  if (!user && mode !== 'release_notes') {
    if (showLanding) {
      return (
        <div className="w-full min-h-screen bg-[#0f172a] text-white relative">
          <LandingPage onStart={() => setShowLanding(false)} />
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 z-50">
             <button onClick={() => setMode('release_notes')} className="bg-white/10 backdrop-blur-xl text-white hover:bg-white/20 font-black text-[0.65rem] md:text-xs uppercase tracking-[0.2em] px-6 py-3 rounded-full border border-white/20 transition-all cursor-pointer shadow-2xl leading-none">Latest Updates</button>
          </div>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center h-screen w-screen relative overflow-hidden bg-[radial-gradient(circle_at_center,#1e293b_0%,#020617_100%)]">
        <button 
          onClick={() => setShowLanding(true)}
          className="absolute top-6 left-6 md:top-8 md:left-8 flex items-center gap-2 text-text-muted hover:text-white transition-colors font-bold z-20 text-white cursor-pointer leading-none"
        >
          <ArrowLeft size={20} className="text-white" /> {t('back_to_home')}
        </button>
        <div className="absolute inset-0 z-0 text-white leading-none">
          <div className="absolute top-[-10%] right-[-5%] w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-[radial-gradient(circle,var(--primary-glow)_0%,transparent_70%)] animate-float text-white leading-none"></div>
          <div className="absolute bottom-[-10%] left-[-5%] w-[400px] md:w-[600px] h-[400px] md:h-[600px] bg-[radial-gradient(circle,rgba(56,189,248,0.1)_0%,transparent_70%)] animate-float-reverse text-white leading-none"></div>
        </div>
        <div className="relative z-10 text-center animate-login-fade px-6 text-white leading-none text-white leading-none">
          <div className="mb-8 md:mb-10 text-white leading-none text-white leading-none">
            <ShieldAlert size={64} className="text-primary mb-4 md:mb-5 mx-auto drop-shadow-[0_0_20px_var(--primary-glow)] md:w-20 md:h-20 text-white leading-none text-white leading-none" />
            <h1 className="text-4xl md:text-[5rem] font-black tracking-tighter m-0 bg-gradient-to-br from-white via-white to-[#64748b] bg-clip-text text-transparent leading-tight md:leading-none leading-none leading-none">
              {t('app_title')}
            </h1>
            <p className="text-text-muted text-base md:text-[1.1rem] font-medium max-w-[400px] mx-auto mt-2 md:mt-2.5 leading-relaxed text-white leading-none text-white leading-none">
              {t('login_desc')}
            </p>
          </div>
          <form className="flex flex-col gap-4 md:gap-5 w-full max-w-[380px] mx-auto bg-[#1e293b]/50 backdrop-blur-2xl p-6 md:p-10 rounded-2xl md:rounded-[32px] border border-glass-border shadow-2xl text-white leading-none text-white leading-none" onSubmit={handleLogin}>
            <div className="relative flex items-center text-white leading-none text-white leading-none">
              <UserIcon size={20} className="absolute left-4 text-text-muted leading-none text-white leading-none" />
              <input name="username" placeholder={t('username')} required autoComplete="off" className="w-full py-3.5 md:py-4.5 pl-12 pr-4.5 rounded-xl md:rounded-2xl bg-[#0f172a]/60 border border-glass-border text-white text-base md:text-[1rem] font-semibold outline-none focus:border-primary/50 transition-all text-white leading-none text-white leading-none" />
            </div>
            <button type="submit" className="py-3.5 md:py-4.5 bg-primary text-white border-none rounded-xl md:rounded-2xl cursor-pointer font-extrabold text-base md:text-[1.1rem] flex items-center justify-center gap-2 md:gap-3 transition-all duration-300 shadow-[0_10px_20px_-5px_var(--primary-glow)] hover:-translate-y-[3px] hover:brightness-110 active:scale-95 text-white leading-none leading-none text-white leading-none">
              <span>{t('login')}</span><ChevronRight size={20} className="leading-none text-white leading-none text-white leading-none" />
            </button>
          </form>
          <div className="mt-6 md:mt-7.5 flex items-center justify-center text-white leading-none text-white leading-none">
            <LanguageSwitcher current={i18n.language} onChange={changeLanguage} />
          </div>
        </div>
      </div>
    );
  }

  // Handle Release Notes mode
  if (mode === 'release_notes') {
    return (
      <div className="w-full h-screen bg-bg overflow-y-auto text-white leading-none">
        <div className="py-8 md:py-12 px-4 md:px-6 max-w-[900px] mx-auto text-white text-center leading-none">
          <div className="flex items-center justify-center gap-3 md:gap-4 mb-8 md:mb-10 text-white leading-none">
            <History size={28} className="text-primary md:w-8 md:h-8 text-white leading-none" /> 
            <h2 className="text-[1.8rem] md:text-[2.5rem] font-black tracking-tight leading-none uppercase text-white leading-none">Release Notes</h2>
          </div>
          
          <div className="flex flex-col gap-6 md:gap-8 text-left text-white leading-none">
            <div className="bg-surface p-6 md:p-10 rounded-2xl md:rounded-[32px] border border-glass-border shadow-2xl leading-none">
              <div className="flex justify-between items-start mb-4 leading-none">
                <div className="bg-primary text-white px-3.5 py-1.5 rounded-lg font-black text-[0.65rem] md:text-[0.75rem] uppercase tracking-wider leading-none">v2.1.0</div>
                <span className="text-text-muted text-[0.65rem] md:text-xs font-bold uppercase tracking-widest leading-none">March 18, 2026</span>
              </div>
              <h3 className="mt-0 text-white text-[1.3rem] md:text-[1.6rem] font-black mb-4 uppercase tracking-tight leading-tight leading-none text-white leading-none">POIs & Enhanced Training</h3>
              <ul className="p-0 list-none flex flex-col gap-3 leading-none">
                <li className="relative pl-6 md:pl-7 leading-normal text-text-muted text-[0.85rem] md:text-[0.95rem] before:content-['→'] before:absolute before:left-0 before:text-accent before:font-black italic text-white leading-none">🍴 **POIs Integrated**: Restaurants, shops, and public buildings are now on the map.</li>
                <li className="relative pl-6 md:pl-7 leading-normal text-text-muted text-[0.85rem] md:text-[0.95rem] before:content-['→'] before:absolute before:left-0 before:text-accent before:font-black italic text-white leading-none">🎯 **POI Quiz**: Competition mode now includes questions about local points of interest.</li>
                <li className="relative pl-6 md:pl-7 leading-normal text-text-muted text-[0.85rem] md:text-[0.95rem] before:content-['→'] before:absolute before:left-0 before:text-accent before:font-black italic text-white leading-none">🔘 **Overlay Toggles**: Improved mobile-optimized toggles for hydrants and POIs.</li>
              </ul>
            </div>

            <div className="bg-surface p-6 md:p-10 rounded-2xl md:rounded-[32px] border border-glass-border shadow-2xl leading-none">
              <div className="flex justify-between items-start mb-4 leading-none">
                <div className="bg-primary text-white px-3.5 py-1.5 rounded-lg font-black text-[0.65rem] md:text-[0.75rem] uppercase tracking-wider leading-none">v2.0.0</div>
                <span className="text-text-muted text-[0.65rem] md:text-xs font-bold uppercase tracking-widest leading-none">March 17, 2026</span>
              </div>
              <h3 className="mt-0 text-white text-[1.3rem] md:text-[1.6rem] font-black mb-4 uppercase tracking-tight leading-tight text-white leading-none text-white leading-none">Mobile-First & UI Overhaul</h3>
              <ul className="p-0 list-none flex flex-col gap-3 leading-none text-white leading-none">
                <li className="relative pl-6 md:pl-7 leading-normal text-text-muted text-[0.85rem] md:text-[0.95rem] before:content-['→'] before:absolute before:left-0 before:text-accent before:font-black italic text-white leading-none">📱 **Mobile-First**: Complete interface overhaul for perfect usage on smartphones.</li>
                <li className="relative pl-6 md:pl-7 leading-normal text-text-muted text-[0.85rem] md:text-[0.95rem] before:content-['→'] before:absolute before:left-0 before:text-accent before:font-black italic text-white leading-none text-white leading-none text-white leading-none">🎨 **Tailwind CSS**: Refactored to Tailwind CSS v4 for a modern and fast UI.</li>
                <li className="relative pl-6 md:pl-7 leading-normal text-text-muted text-[0.85rem] md:text-[0.95rem] before:content-['→'] before:absolute before:left-0 before:text-accent before:font-black italic text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none">🏠 **Landing Page**: New informative home page explaining the mission.</li>
              </ul>
            </div>
          </div>
          
          <button onClick={() => { if (!user) setMode('learn'); else setMode('learn'); }} className="mt-8 md:mt-12 w-full sm:w-auto bg-transparent border border-glass-border text-text-muted px-6 py-3 rounded-xl cursor-pointer font-bold text-[0.9rem] hover:bg-white/5 hover:text-white active:scale-95 transition-all uppercase tracking-widest text-white leading-none text-white leading-none text-white leading-none">
            {user ? t('back_to_learn') : "CLOSE"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`grid grid-rows-[auto_1fr] h-screen h-[100dvh] w-screen overflow-hidden ${isEmergencyActive ? 'emergency-lights' : ''} text-white leading-none`}>
      <header className="bg-surface text-white px-4 md:px-6 py-2 flex justify-between items-center border-b border-glass-border z-[1001] shadow-2xl shrink-0 min-h-[56px] md:min-h-[64px] leading-none">
        <div className="flex items-center gap-2 md:gap-3 text-white leading-none">
          <div className="flex items-center gap-2 md:gap-3 text-white leading-none">
            <MapIcon size={18} className="text-primary md:w-5 md:h-5 text-white leading-none" />
            <div className="flex flex-col leading-tight text-white leading-none text-white leading-none text-white leading-none">
              <span className="text-[0.8rem] md:text-[0.9rem] font-bold truncate max-w-[80px] md:max-w-none text-white leading-none font-sans uppercase tracking-tight text-white leading-none text-white leading-none text-white leading-none"><strong>{user}</strong></span>
              <span className="text-[0.55rem] md:text-[0.65rem] font-black uppercase px-1.5 py-0.5 rounded-[4px] tracking-wider text-white leading-none text-white leading-none text-white leading-none" style={{ backgroundColor: userRank.color + '33', color: userRank.color }}>
                {userRank.title}
              </span>
            </div>
          </div>
          <div className="w-[1px] h-4 md:h-5 bg-glass-border mx-1 md:mx-2 leading-none"></div>
          <div className="flex items-center gap-1.5 md:gap-2.5 text-text-muted leading-none text-white leading-none text-white leading-none text-white leading-none" title={`${knownStreetIds.length} von ${streets.length} Strassen bekannt`}>
            <Compass size={14} className="md:w-4 md:h-4 text-white leading-none text-white leading-none text-white leading-none" />
            <div className="w-12 md:w-20 h-1 md:h-1.5 bg-white/5 rounded-full overflow-hidden border border-glass-border hidden sm:block leading-none text-white leading-none text-white leading-none text-white leading-none">
              <div className="h-full bg-gradient-to-r from-accent to-[#4ade80] transition-[width] duration-1000" style={{ width: `${completionRate}%` }}></div>
            </div>
            <span className="text-[0.65rem] md:text-[0.75rem] font-extrabold text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none">{completionRate}%</span>
          </div>
          <div className="w-[1px] h-4 md:h-5 bg-glass-border mx-1 md:mx-2 hidden sm:block text-white leading-none text-white leading-none"></div>
          <div className="flex items-center scale-90 md:scale-100 origin-left text-white leading-none text-white leading-none">
            <LanguageSwitcher current={i18n.language} onChange={changeLanguage} />
          </div>
        </div>
        
        <nav className="flex gap-1 md:gap-2 overflow-x-auto no-scrollbar ml-2 md:ml-0 text-white leading-none text-white leading-none">
          <button 
            className={`flex items-center gap-1.5 md:gap-2 px-2.5 py-2 md:px-4 md:py-2.5 cursor-pointer rounded-lg md:rounded-xl transition-all duration-200 font-bold text-[0.75rem] md:text-[0.85rem] whitespace-nowrap ${mode === 'learn' ? 'text-primary bg-primary/10' : 'text-text-muted hover:text-white'} leading-none text-white leading-none text-white leading-none`} 
            onClick={() => setMode('learn')}
          >
            <BookOpen size={16} className="md:w-[18px] md:h-[18px] leading-none text-white leading-none text-white leading-none" /> <span className="hidden md:inline leading-none uppercase tracking-widest text-white leading-none text-white leading-none">{t('nav_learn')}</span>
          </button>
          <button 
            className={`flex items-center gap-1.5 md:gap-2 px-2.5 py-2 md:px-4 md:py-2.5 cursor-pointer rounded-lg md:rounded-xl transition-all duration-200 font-bold text-[0.75rem] md:text-[0.85rem] whitespace-nowrap ${mode === 'compete' ? 'text-primary bg-primary/10' : 'text-text-muted hover:text-white'} leading-none text-white leading-none text-white leading-none`} 
            onClick={() => { setMode('compete'); setShowRulesModal(true); }}
          >
            <Trophy size={16} className="md:w-[18px] md:h-[18px] leading-none text-white leading-none text-white leading-none" /> <span className="hidden md:inline leading-none uppercase tracking-widest text-white leading-none text-white leading-none">{t('nav_compete')}</span>
          </button>
          <button 
            className={`flex items-center gap-1.5 md:gap-2 px-2.5 py-2 md:px-4 md:py-2.5 cursor-pointer rounded-lg md:rounded-xl transition-all duration-200 font-bold text-[0.75rem] md:text-[0.85rem] whitespace-nowrap ${mode === 'leaderboard' ? 'text-primary bg-primary/10' : 'text-text-muted hover:text-white'} leading-none text-white leading-none text-white leading-none`} 
            onClick={() => setMode('leaderboard')}
          >
            <LayoutList size={16} className="md:w-[18px] md:h-[18px] leading-none text-white leading-none text-white leading-none" /> <span className="hidden md:inline text-white leading-none uppercase tracking-widest leading-none text-white leading-none text-white leading-none">{t('nav_leaderboard')}</span>
          </button>
          <button 
            className={`flex items-center gap-1.5 md:gap-2 px-2.5 py-2 md:px-4 md:py-2.5 cursor-pointer rounded-lg md:rounded-xl transition-all duration-200 font-bold text-[0.75rem] md:text-[0.85rem] whitespace-nowrap ${mode === 'release_notes' ? 'text-primary bg-primary/10' : 'text-text-muted hover:text-white'} leading-none text-white leading-none text-white leading-none`} 
            onClick={() => setMode('release_notes')}
          >
            <History size={16} className="md:w-[18px] md:h-[18px] leading-none text-white leading-none text-white leading-none" /> <span className="hidden md:inline text-white leading-none uppercase tracking-widest leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none">{t('nav_updates')}</span>
          </button>
          <button onClick={handleLogout} className="flex items-center gap-1.5 md:gap-2 px-2 md:px-4 py-2 md:py-2.5 cursor-pointer rounded-lg md:rounded-xl text-red-500 hover:bg-red-500/10 transition-all text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none">
            <LogOut size={16} className="md:w-[18px] md:h-[18px] text-white leading-none text-white leading-none text-white leading-none text-white leading-none" />
          </button>
        </nav>
      </header>

      <main className="flex-1 relative bg-bg overflow-hidden text-white leading-none text-white leading-none text-white leading-none">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-bg/80 backdrop-blur-md z-[2000] text-white leading-none text-white leading-none text-white leading-none text-white leading-none">
            <div className="w-10 h-10 border-4 border-primary/10 border-t-primary rounded-full animate-spin mb-5 leading-none text-white leading-none text-white leading-none text-white leading-none"></div>
            <p className="font-semibold text-white leading-none text-white leading-none text-white leading-none">{t('loading')}</p>
          </div>
        )}

        {showRulesModal && (
          <div className="fixed inset-0 bg-[#0f172a]/90 backdrop-blur-xl flex justify-center items-center z-[9999] animate-modal-fade px-4 text-white leading-none text-white leading-none text-white leading-none text-white leading-none">
            <div className="bg-surface w-full max-w-[650px] p-6 md:p-10 rounded-3xl md:rounded-[40px] border border-glass-border shadow-[0_40px_100px_-20px_rgba(0,0,0,0.7)] text-left relative overflow-hidden animate-modal-scale max-h-[90vh] overflow-y-auto text-white leading-none text-white leading-none text-white leading-none">
              <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle,rgba(255,82,82,0.05)_0%,transparent_70%)] pointer-events-none z-0 text-white leading-none text-white leading-none text-white leading-none"></div>
              <div className="flex items-center gap-4 md:gap-5 mb-6 md:mb-7.5 relative z-10 text-white leading-none text-white leading-none text-white leading-none text-white leading-none">
                <Zap size={28} className="text-primary md:w-8 md:h-8 text-white leading-none text-white leading-none text-white leading-none text-white leading-none" /> 
                <h2 className="text-[1.5rem] md:text-[2.2rem] font-black m-0 tracking-tight leading-none uppercase text-white leading-none text-white leading-none text-white leading-none text-white leading-none">{t('rules_title')}</h2>
              </div>
              <div className="grid grid-cols-1 gap-3 md:gap-4 mb-8 md:mb-[35px] relative z-10 text-white leading-none text-white leading-none text-white leading-none text-white leading-none">
                {[
                  { icon: Target, color: 'var(--accent)', title: 'rule_base_title', desc: 'rule_base_desc' },
                  { icon: Clock, color: 'var(--primary)', title: 'rule_time_title', desc: 'rule_time_desc' },
                  { icon: Zap, color: '#4ade80', title: 'rule_speed_title', desc: 'rule_speed_desc' },
                  { icon: Flame, color: '#fb923c', title: 'rule_streak_title', desc: 'rule_streak_desc' },
                  { icon: Compass, color: 'var(--accent)', title: 'rule_discovery_title', desc: 'rule_discovery_desc' }
                ].map((rule, i) => (
                  <div key={i} className="flex items-start gap-4 md:gap-5 bg-white/[0.03] p-4 md:p-5 rounded-xl md:rounded-[20px] border border-white/[0.05] transition-all duration-200 text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none">
                    <rule.icon size={24} className="md:w-7 md:h-7 shrink-0 mt-1 text-white leading-none text-white leading-none text-white leading-none text-white leading-none" color={rule.color} /> 
                    <div className="text-white leading-none text-white leading-none text-white leading-none">
                      <h4 className="m-0 mb-0.5 md:mb-1 text-[0.9rem] md:text-[1rem] font-extrabold text-white leading-none text-white leading-none text-white leading-none text-white leading-none">{t(rule.title)}</h4>
                      <p className="m-0 text-[0.8rem] md:text-[0.9rem] text-text-muted leading-relaxed text-white font-sans text-white leading-none text-white leading-none text-white leading-none text-white leading-none" dangerouslySetInnerHTML={{ __html: t(rule.desc) }}></p>
                    </div>
                  </div>
                ))}
              </div>
              <button className="w-full py-3.5 md:py-4 px-8 bg-primary text-white border-none rounded-xl md:rounded-2xl text-[1rem] md:text-[1.1rem] font-black cursor-pointer flex items-center justify-center gap-2 md:gap-3 shadow-lg active:scale-95 transition-all relative z-10 text-white leading-none uppercase text-white leading-none text-white leading-none text-white leading-none" onClick={() => { setShowRulesModal(false); startCompetition(); }}>
                <Play size={20} fill="currentColor" className="text-white leading-none text-white leading-none" /> {t('rules_start')}
              </button>
            </div>
          </div>
        )}

        {mode === 'learn' && streets.length > 0 && (
          <div className="absolute inset-0 w-full h-full z-1 touch-none text-white leading-none text-white leading-none text-white leading-none">
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
                        color: selectedStreetId === s.id ? "#ff5252" : (knownStreetIds.includes(s.id) ? "#4ade80" : "var(--accent)"),
                        weight: selectedStreetId === s.id ? 7 : 4, opacity: selectedStreetId === s.id ? 1 : 0.6, className: selectedStreetId === s.id ? "selected-street-line" : ""
                      }}
                      eventHandlers={{ click: () => setSelectedStreetId(s.id) }} interactive={true}
                    >
                      <Tooltip permanent={false} className="street-tooltip text-white leading-none font-sans font-black text-white leading-none text-white leading-none">{s.name} {knownStreetIds.includes(s.id) ? '✅' : ''}</Tooltip>
                    </Polyline>
                  ))}
                </React.Fragment>
              ))}
              {visibleHydrants.map(h => (
                <CircleMarker key={h.id} center={[h.lat, h.lon]} radius={6} pathOptions={{ color: '#38bdf8', fillColor: '#0ea5e9', fillOpacity: 0.8, weight: 2 }}>
                  <Tooltip className="street-tooltip text-white leading-none font-sans text-white leading-none text-white leading-none text-white leading-none">Hydrant #{h.id}</Tooltip>
                </CircleMarker>
              ))}
              {visiblePois.map(p => (
                <CircleMarker key={p.id} center={[p.lat, p.lon]} radius={7} pathOptions={{ color: '#fbbf24', fillColor: '#f59e0b', fillOpacity: 0.8, weight: 2 }}>
                  <Tooltip className="street-tooltip text-white leading-none font-sans text-white leading-none text-white leading-none text-white leading-none"><strong>{p.name}</strong><br/><span className="text-[0.65rem] opacity-80 uppercase leading-none text-white leading-none text-white leading-none">{p.category}</span></Tooltip>
                </CircleMarker>
              ))}
            </MapContainer>
            
            <div className="absolute bottom-24 md:bottom-[120px] left-4 md:left-6 flex flex-col gap-2 z-[1000] text-white leading-none text-white leading-none text-white leading-none">
              <button 
                className="bg-glass-bg backdrop-blur-lg border border-glass-border text-white px-3 py-2 md:px-4.5 md:py-2.5 rounded-lg md:rounded-xl flex items-center gap-2 cursor-pointer shadow-2xl transition-all duration-300 font-bold text-[0.7rem] md:text-[0.85rem] hover:bg-surface hover:border-accent active:scale-95 text-white leading-none uppercase tracking-widest text-white leading-none text-white leading-none" 
                onClick={() => setShowHydrants(!showHydrants)}
              >
                {showHydrants ? <EyeOff size={16} className="text-accent md:w-5 md:h-5 text-white leading-none text-white leading-none" /> : <Droplets size={16} className="text-accent md:w-5 md:h-5 text-white leading-none text-white leading-none" />}
                <span className="text-white leading-none uppercase text-white leading-none text-white leading-none">{showHydrants ? t('toggle_off') : t('toggle_hydrants')}</span>
              </button>
              <button 
                className="bg-glass-bg backdrop-blur-lg border border-glass-border text-white px-3 py-2 md:px-4.5 md:py-2.5 rounded-lg md:rounded-xl flex items-center gap-2 cursor-pointer shadow-2xl transition-all duration-300 font-bold text-[0.7rem] md:text-[0.85rem] hover:bg-surface hover:border-accent active:scale-95 text-white leading-none uppercase tracking-widest text-white leading-none text-white leading-none" 
                onClick={() => setShowPOIs(!showPOIs)}
              >
                {showPOIs ? <EyeOff size={16} className="text-yellow-500 md:w-5 md:h-5 text-white leading-none text-white leading-none" /> : <MapIcon size={16} className="text-yellow-500 md:w-5 md:h-5 text-white leading-none text-white leading-none" />}
                <span className="text-white leading-none uppercase text-white leading-none text-white leading-none">{showPOIs ? t('toggle_off') : t('toggle_pois')}</span>
              </button>
            </div>

            <div className="absolute bottom-6 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-auto bg-glass-bg backdrop-blur-lg px-4 py-2 md:px-6 md:py-3 rounded-xl md:rounded-full border border-glass-border z-[1000] shadow-2xl flex flex-col items-center gap-1.5 md:gap-2 text-white leading-none text-white leading-none text-white leading-none text-white leading-none">
              <div className="flex items-center gap-2 text-[0.75rem] md:text-[0.9rem] text-white font-semibold text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none"><BookOpen size={14} className="md:w-[18px] md:h-[18px] text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none" /> {t('learn_overlay')}</div>
              <div className="flex gap-3 md:gap-5 border-t border-white/10 pt-1.5 md:pt-2 w-full justify-center text-white leading-none font-black uppercase text-[0.6rem] md:text-[0.7rem] text-white leading-none text-white leading-none text-white leading-none text-white leading-none">
                <div className="flex items-center gap-1 text-text-muted text-white leading-none text-white leading-none text-white leading-none"><span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[#4ade80] shadow-[0_0_8px_rgba(74,222,128,0.5)] text-white leading-none text-white leading-none"></span> <span>{t('legend_known')}</span></div>
                <div className="flex items-center gap-1 text-text-muted text-white leading-none text-white leading-none text-white leading-none"><span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-accent shadow-[0_0_8px_rgba(56,189,248,0.5)] text-white leading-none text-white leading-none"></span> <span>{t('legend_unknown')}</span></div>
                <div className="flex items-center gap-1 text-text-muted text-white leading-none text-white leading-none text-white leading-none"><span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[#38bdf8] shadow-[0_0_8px_rgba(56,189,248,0.5)] text-white leading-none text-white leading-none"></span> <span>Hydrant</span></div>
                <div className="flex items-center gap-1 text-text-muted text-white leading-none text-white leading-none text-white leading-none"><span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[#fbbf24] shadow-[0_0_20px_rgba(251,191,36,0.5)] text-white leading-none text-white leading-none"></span> <span>POI</span></div>
              </div>
            </div>
          </div>
        )}

        {mode === 'compete' && currentStreet && !showRulesModal && (
          <div className="flex flex-col h-full w-full relative text-white leading-none text-white leading-none text-white leading-none text-white leading-none">
            <div className="flex justify-between absolute top-3 md:top-5 inset-x-3 md:inset-x-5 z-[1000] gap-2 text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none">
              <div className="bg-glass-bg backdrop-blur-lg px-3 py-1.5 md:px-4 md:py-2 rounded-xl md:rounded-2xl border border-glass-border shadow-2xl font-black flex items-center gap-1.5 text-[0.7rem] md:text-base text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none"><Trophy size={14} className="md:w-4 md:h-4 text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none" /> {t('round')}: {totalQuestions}/10</div>
              <div className={`bg-glass-bg backdrop-blur-lg px-3 py-1.5 md:px-4 md:py-2 rounded-xl md:rounded-2xl border border-glass-border shadow-2xl font-black flex items-center gap-1.5 text-[0.7rem] md:text-base text-white leading-none text-white leading-none ${streak >= 3 ? 'animate-pulse text-primary border-primary/30' : ''}`}>
                {score.toLocaleString()} <span className="hidden xs:inline text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none">PTS</span>
                {streak >= 3 && <span className="text-[0.6rem] bg-primary text-white px-1 rounded ml-1 text-white leading-none font-sans font-black text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none">x{streak >= 10 ? '3' : streak >= 5 ? '2' : '1.5'}</span>}
                {streak >= 3 && <Flame size={14} className="text-[#fb923c] md:w-4 md:h-4 text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none" />}
              </div>
            </div>

            <div className="absolute top-14 md:top-20 left-1/2 -translate-x-1/2 w-[180px] md:w-[260px] bg-glass-bg backdrop-blur-md p-1 px-3 rounded-full md:rounded-[20px] z-[1000] border border-glass-border flex items-center gap-2 md:gap-3 shadow-2xl text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none">
              <div className="flex-1 h-1 md:h-1.5 bg-white/5 rounded-full overflow-hidden text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none">
                <div className="h-full rounded-full transition-all duration-100 linear" style={{ width: `${(timeLeft / QUESTION_TIME_LIMIT) * 100}%`, backgroundColor: timeLeft < 5 ? 'var(--primary)' : 'var(--accent)' }}></div>
              </div>
              <div className="text-[0.7rem] md:text-[0.8rem] font-black text-white min-w-[25px] md:min-w-[35px] text-right tabular-nums text-white leading-none font-sans text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none">{Math.ceil(timeLeft)}s</div>
            </div>

            <div className="absolute inset-0 w-full h-full z-1 touch-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none">
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
                    <Tooltip className="street-tooltip text-white leading-none font-sans text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none">Hydrant #{h.id}</Tooltip>
                  </CircleMarker>
                ))}
                <MapFocus coords={currentStreet.coordinates} />
              </MapContainer>
            </div>

            <div className="absolute bottom-4 md:bottom-[30px] left-1/2 -translate-x-1/2 w-[94%] md:w-[90%] max-w-[600px] bg-glass-bg backdrop-blur-[24px] p-4 md:p-6 rounded-2xl md:rounded-[32px] border border-glass-border shadow-2xl z-[1000] text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none">
              {feedback ? (
                <div className="flex flex-col items-center gap-3 md:gap-[15px] text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none">
                  <div className={`flex flex-col items-center gap-2 md:gap-[15px] ${feedback === 'correct' ? 'text-[#4ade80]' : 'text-primary'} text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none`}>
                    <div className="mb-1 md:mb-2 text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none">{feedback === 'correct' ? <CheckCircle2 size={48} className="icon-pulse md:w-16 md:h-16 text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none" /> : <XCircle size={48} className="icon-shake md:w-16 md:h-16 text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none" />}</div>
                    <div className="text-center text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none">
                      <h2 className="text-[1.5rem] md:text-[2.2rem] font-black mb-0.5 md:mb-1 leading-none uppercase tracking-tighter text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none">{t(feedback)}</h2>
                      {feedback !== 'correct' && <p className="text-[0.9rem] md:text-[1.1rem] font-bold text-white/80 text-white leading-none font-sans text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none">{t('correct_is', { name: currentStreet?.name })}</p>}
                      {feedback === 'correct' && (
                        <div className="flex flex-col items-center gap-0.5 md:gap-1 mt-1 md:mt-2 text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none">
                          {streak >= 3 && <p className="text-[#fb923c] font-black text-[1rem] md:text-[1.2rem] text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none">{t('streak_bonus', { count: streak })}</p>}
                          {lastDiscoveryBonus && <p className="text-[#4ade80] font-black text-[0.9rem] md:text-[1.1rem] text-white leading-none uppercase font-sans text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none">{t('discovery_bonus_label')}</p>}
                        </div>
                      )}
                    </div>
                    <div className="w-full mt-2 md:mt-[15px] text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none">
                      {totalQuestions < 10 ? (
                        <button onClick={nextQuestion} className="w-full py-3.5 md:py-4 px-6 md:px-8 bg-primary text-white border-none rounded-xl md:rounded-2xl font-black text-[1rem] md:text-[1.1rem] cursor-pointer flex items-center justify-center gap-2 md:gap-3 shadow-lg active:scale-95 transition-all text-white leading-none uppercase tracking-widest leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none">
                          <span>{t('next_street')}</span> <ChevronRight size={18} className="md:w-5 md:h-5 text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none" />
                        </button>
                      ) : (
                        <button onClick={() => setMode('leaderboard')} className="w-full py-3.5 md:py-4 px-6 md:px-8 bg-primary text-white border-none rounded-xl md:rounded-2xl font-black text-[1rem] md:text-[1.1rem] cursor-pointer flex items-center justify-center gap-2 md:gap-3 shadow-lg active:scale-95 transition-all border-2 border-accent/30 text-white leading-none uppercase tracking-widest leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none">
                          <Trophy size={18} className="md:w-5 md:h-5 text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none" /> <span>{t('to_leaderboard')}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none font-sans uppercase font-bold text-sm tracking-tight leading-none text-center">
                  {options.map(opt => (
                    <button key={opt} onClick={() => handleAnswer(opt)} className="p-3.5 md:p-[1.2rem] text-[0.85rem] md:text-[0.95rem] font-bold bg-white/5 border border-white/10 text-white cursor-pointer rounded-xl md:rounded-[18px] transition-all duration-200 min-h-[50px] md:min-h-[70px] flex items-center justify-center text-center hover:bg-primary active:scale-95 active:bg-primary text-white leading-none uppercase tracking-tight leading-none text-center text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none">
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* OVERLAYS */}
        {(mode === 'leaderboard' || mode === 'release_notes') && (
          <div className="absolute inset-0 overflow-y-auto pb-[50px] z-[3000] bg-bg text-white leading-none text-white leading-none text-white leading-none">
            {mode === 'leaderboard' && (
              <div className="py-8 md:py-12 px-4 md:px-6 max-w-[900px] mx-auto text-center text-white leading-none text-white leading-none text-white leading-none text-white leading-none">
                <div className="flex items-center justify-center gap-3 md:gap-4 mb-8 md:mb-10 text-white leading-none text-white leading-none text-white leading-none text-white leading-none"><Trophy size={28} className="text-accent md:w-8 md:h-8 text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none" /> <h2 className="text-[1.8rem] md:text-[2.5rem] font-black tracking-tight leading-none uppercase text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none">{t('leaderboard')}</h2></div>
                
                <div className="flex justify-center items-end gap-2 md:gap-4 mb-12 md:mb-16 pt-5 text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none">
                  {topThree.map((entry, i) => {
                    const totalS = leaderboardData.filter((ld: any) => ld.user === entry.user).reduce((sum: number, ld: any) => sum + ld.score, 0);
                    const rank = getRank(totalS);
                    const isWinner = i === 0;
                    return (
                      <div key={i} className={`bg-surface border border-glass-border rounded-2xl md:rounded-[28px] p-3 md:p-6 flex flex-col items-center gap-1.5 md:gap-3 w-[100px] sm:w-[140px] md:w-[190px] relative transition-all duration-300 shadow-2xl ${isWinner ? 'order-2 scale-110 md:scale-125 border-yellow-500/40 bg-gradient-to-b from-[#1e293b] to-[#0f172a] z-[2] mb-4' : i === 1 ? 'order-1' : 'order-3'} text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none`}>
                        <div className={`w-8 h-8 md:w-14 md:h-14 rounded-full flex justify-center items-center mb-1 ${isWinner ? 'bg-[#fbbf24] shadow-[0_0_20px_rgba(251,191,36,0.5)]' : i === 1 ? 'bg-[#cbd5e1]' : 'bg-[#d97706]'} text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none`}>
                          <Medal size={isWinner ? 20 : 16} className="md:w-6 md:h-6 text-white leading-none text-white leading-none text-white leading-none text-white leading-none text-white leading-none" color="#0f172a" />
                        </div>
                        <span className="font-black text-[0.7rem] md:text-[1.2rem] text-white truncate w-full px-1 text-white leading-none text-white leading-none text-white leading-none text-white leading-none font-sans uppercase tracking-tight text-white leading-none">{entry.user}</span>
                        <span className="text-[0.5rem] md:text-[0.7rem] font-black uppercase text-white leading-none text-white leading-none text-white leading-none text-white leading-none font-sans tracking-widest text-white leading-none" style={{ color: rank.color }}>{rank.title}</span>
                        <span className="text-[0.9rem] md:text-[1.4rem] font-black text-accent leading-none mt-1 text-white leading-none text-white leading-none text-white leading-none text-white leading-none font-sans tracking-tighter tabular-nums text-white leading-none">{entry.score.toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="bg-surface rounded-2xl md:rounded-[32px] p-2 md:p-4 border border-glass-border mb-8 md:mb-12 overflow-hidden text-white leading-none text-white leading-none">
                  <div className="overflow-x-auto text-white leading-none text-white leading-none">
                    <table className="w-full border-collapse min-w-[400px] text-white leading-none text-white leading-none">
                      <thead><tr><th className="p-3 md:p-4 px-4 md:px-5 text-text-muted text-[0.6rem] md:text-[0.7rem] uppercase text-left text-white leading-none text-white leading-none font-sans tracking-widest text-white leading-none">{t('rank')}</th><th className="p-3 md:p-4 px-4 md:px-5 text-text-muted text-[0.6rem] md:text-[0.7rem] uppercase text-left text-white leading-none text-white leading-none font-sans tracking-widest text-white leading-none">{t('name')}</th><th className="p-3 md:p-4 px-4 md:px-5 text-text-muted text-[0.6rem] md:text-[0.7rem] uppercase text-left text-white leading-none text-white leading-none font-sans tracking-widest text-white leading-none">{t('points')}</th><th className="p-3 md:p-4 px-4 md:px-5 text-text-muted text-[0.6rem] md:text-[0.7rem] uppercase text-left hidden sm:table-cell text-white leading-none text-white leading-none font-sans tracking-widest text-white leading-none">{t('date')}</th></tr></thead>
                      <tbody>
                        {restOfList.map((entry: any, i: number) => {
                          const totalS = leaderboardData.filter((ld: any) => ld.user === entry.user).reduce((sum: number, ld: any) => sum + ld.score, 0);
                          const rank = getRank(totalS);
                          return (
                            <tr key={i} className={`border-t border-white/[0.05] ${entry.user === user ? 'bg-accent/10 text-accent font-black' : ''} text-white leading-none text-white leading-none`}>
                              <td className="p-3 md:p-5 text-[0.8rem] md:text-base text-white leading-none text-white leading-none font-sans font-black tabular-nums text-white leading-none">#{i + 4}</td>
                              <td className="p-3 md:p-5 text-white leading-none text-white leading-none"><div className="flex flex-col gap-0.5 text-white leading-none text-white leading-none"><span className="text-[0.85rem] md:text-[1rem] text-white leading-none text-white leading-none font-sans font-bold uppercase tracking-tight text-white leading-none">{entry.user}</span><span className="text-[0.55rem] md:text-[0.7rem] font-black uppercase text-white leading-none text-white leading-none font-sans tracking-widest text-white leading-none" style={{ color: rank.color }}>{rank.title}</span></div></td>
                              <td className="p-3 md:p-5 font-black text-primary text-[0.9rem] md:text-[1.1rem] text-white leading-none text-white leading-none font-sans tabular-nums text-white leading-none">{entry.score.toLocaleString()}</td>
                              <td className="p-3 md:p-5 text-[0.7rem] md:text-[0.85rem] text-text-muted hidden sm:table-cell text-white leading-none text-white leading-none font-sans tracking-tight text-white leading-none">{entry.date}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 md:gap-6 bg-surface p-6 md:p-10 rounded-2xl md:rounded-[32px] mb-8 border border-glass-border justify-items-center text-white leading-none text-white leading-none">
                  {ACHIEVEMENTS.map(ach => {
                    const isUnlocked = unlockedAchievements.includes(ach.id);
                    return (
                      <div key={ach.id} className={`flex flex-col items-center gap-2 md:gap-3 w-full transition-all duration-300 ${isUnlocked ? 'filter-none opacity-100' : 'grayscale opacity-20'} text-white leading-none text-white leading-none`} title={t(ach.desc)}>
                        <div className={`p-2.5 md:p-3 rounded-full bg-white/[0.03] border border-white/[0.05] ${isUnlocked ? 'shadow-[0_0_15px_rgba(255,255,255,0.1)]' : ''} text-white leading-none text-white leading-none`}>
                          <ach.icon size={20} className="md:w-6 md:h-6 text-white leading-none text-white leading-none" color={isUnlocked ? ach.color : '#475569'} />
                        </div>
                        <span className={`text-[0.55rem] md:text-[0.7rem] font-extrabold uppercase text-center leading-tight ${isUnlocked ? 'text-white' : 'text-text-muted'} text-white leading-none text-white leading-none font-sans tracking-widest leading-none text-white leading-none`}>{t(ach.title)}</span>
                      </div>
                    );
                  })}
                </div>                
                <button onClick={() => setMode('learn')} className="mt-4 md:mt-8 w-full sm:w-auto bg-transparent border border-glass-border text-text-muted px-6 py-3 rounded-xl cursor-pointer font-bold text-[0.9rem] hover:bg-white/5 hover:text-white active:scale-95 transition-all uppercase tracking-widest text-white leading-none text-white leading-none font-sans">{t('back_to_learn')}</button>
              </div>
            )}

            {mode === 'release_notes' && (
              <div className="py-8 md:py-12 px-4 md:px-6 max-w-[900px] mx-auto text-white text-center leading-none">
                <div className="flex items-center justify-center gap-3 md:gap-4 mb-8 md:mb-10 text-white leading-none">
                  <History size={28} className="text-primary md:w-8 md:h-8 text-white leading-none" /> 
                  <h2 className="text-[1.8rem] md:text-[2.5rem] font-black tracking-tight leading-none uppercase text-white leading-none">Release Notes</h2>
                </div>
                
                <div className="flex flex-col gap-6 md:gap-8 text-left text-white leading-none">
                  {/* v2.1.0 */}
                  <div className="bg-surface p-6 md:p-10 rounded-2xl md:rounded-[32px] border border-glass-border shadow-2xl leading-none">
                    <div className="flex justify-between items-start mb-4 leading-none text-white leading-none">
                      <div className="bg-primary text-white px-3.5 py-1.5 rounded-lg font-black text-[0.65rem] md:text-[0.75rem] uppercase tracking-wider leading-none text-white leading-none">v2.1.0</div>
                      <span className="text-text-muted text-[0.65rem] md:text-xs font-bold uppercase tracking-widest leading-none text-white leading-none">March 18, 2026</span>
                    </div>
                    <h3 className="mt-0 text-white text-[1.3rem] md:text-[1.6rem] font-black mb-4 uppercase tracking-tight leading-tight text-white leading-none text-white leading-none">POIs & Enhanced Training</h3>
                    <ul className="p-0 list-none flex flex-col gap-3 mt-4 text-white leading-none text-white leading-none text-white leading-none">
                      <li className="relative pl-6 md:pl-7 leading-normal text-text-muted text-[0.85rem] md:text-[0.95rem] before:content-['→'] before:absolute before:left-0 before:text-accent before:font-black italic text-white leading-none text-white leading-none">🍴 **POIs Integrated**: Restaurants, shops, and public buildings are now on the map.</li>
                      <li className="relative pl-6 md:pl-7 leading-normal text-text-muted text-[0.85rem] md:text-[0.95rem] before:content-['→'] before:absolute before:left-0 before:text-accent before:font-black italic text-white leading-none text-white leading-none">🎯 **POI Quiz**: Competition mode now includes questions about local points of interest.</li>
                      <li className="relative pl-6 md:pl-7 leading-normal text-text-muted text-[0.85rem] md:text-[0.95rem] before:content-['→'] before:absolute before:left-0 before:text-accent before:font-black italic text-white leading-none text-white leading-none">🔘 **Overlay Toggles**: Improved mobile-optimized toggles for hydrants and POIs.</li>
                    </ul>
                  </div>

                  {/* v2.0.0 */}
                  <div className="bg-surface p-6 md:p-10 rounded-2xl md:rounded-[32px] border border-glass-border shadow-2xl leading-none text-white leading-none">
                    <div className="flex justify-between items-start mb-4 leading-none text-white leading-none text-white leading-none">
                      <div className="bg-primary text-white px-3.5 py-1.5 rounded-lg font-black text-[0.65rem] md:text-[0.75rem] uppercase tracking-wider leading-none text-white leading-none text-white leading-none">v2.0.0</div>
                      <span className="text-text-muted text-[0.65rem] md:text-xs font-bold uppercase tracking-widest leading-none text-white leading-none text-white leading-none">March 17, 2026</span>
                    </div>
                    <h3 className="mt-0 text-white text-[1.3rem] md:text-[1.6rem] font-black mb-4 uppercase tracking-tight leading-tight text-white leading-none text-white leading-none">Mobile-First & UI Overhaul</h3>
                    <ul className="p-0 list-none flex flex-col gap-3 mt-4 text-white leading-none text-white leading-none text-white leading-none">
                      <li className="relative pl-6 md:pl-7 leading-normal text-text-muted text-[0.85rem] md:text-[0.95rem] before:content-['→'] before:absolute before:left-0 before:text-accent before:font-black italic text-white leading-none text-white leading-none">📱 **Mobile-First**: Complete interface overhaul for perfect usage on smartphones.</li>
                      <li className="relative pl-6 md:pl-7 leading-normal text-text-muted text-[0.85rem] md:text-[0.95rem] before:content-['→'] before:absolute before:left-0 before:text-accent before:font-black italic text-white leading-none text-white leading-none">🎨 **Tailwind CSS**: Refactored to Tailwind CSS v4 for a modern and fast UI.</li>
                      <li className="relative pl-6 md:pl-7 leading-normal text-text-muted text-[0.85rem] md:text-[0.95rem] before:content-['→'] before:absolute before:left-0 before:text-accent before:font-black italic text-white leading-none text-white leading-none">🏠 **Landing Page**: New informative home page explaining the mission.</li>
                    </ul>
                  </div>
                </div>
                
                <button onClick={() => setMode('learn')} className="mt-8 md:mt-12 w-full sm:w-auto bg-transparent border border-glass-border text-text-muted px-6 py-3 rounded-xl cursor-pointer font-bold text-[0.9rem] hover:bg-white/5 hover:text-white active:scale-95 transition-all uppercase tracking-widest text-white leading-none text-white leading-none font-sans uppercase">{t('back_to_learn')}</button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
