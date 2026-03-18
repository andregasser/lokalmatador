import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Tooltip, useMap, LayersControl, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';
import { fetchBassersdorfStreets, fetchBassersdorfHydrants } from './osmService';
import type { Street, Hydrant } from './osmService';
import './App.css';
import { useTranslation } from 'react-i18next';
import confetti from 'canvas-confetti';
import { 
  BookOpen, Trophy, LayoutList, History, LogOut, Languages, 
  Map as MapIcon, CheckCircle2, XCircle, ChevronRight, Play, Zap, 
  Target, Clock, Flame, Moon, Star, ShieldCheck, Compass, Medal, 
  ShieldAlert, User as UserIcon, Droplets, EyeOff
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
  { id: 'speed_demon', title: 'Blitz-Reaktion', desc: 'Antwort in unter 2 Sek.', icon: Zap, color: '#facc15' },
  { id: 'perfect_round', title: 'Perfekter Einsatz', desc: '10/10 Punkte in einer Runde', icon: Star, color: '#fbbf24' },
  { id: 'night_shift', title: 'Nachtschicht', desc: 'Spiele eine Runde nach 22:00 Uhr', icon: Moon, color: '#818cf8' },
  { id: 'on_fire_7', title: 'Dauerbrenner', desc: 'Erreiche einen 7er Streak', icon: Flame, color: '#ff5252' },
  { id: 'local_hero', title: 'Ehrenbürger', desc: 'Erreiche 100.000 Gesamtpunkte', icon: ShieldCheck, color: '#4ade80' }
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
    // Initial state
    setZoom(map.getZoom());
    setBounds(map.getBounds());
    return () => { 
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      map.off('zoomend moveend', update); 
    };
  }, [map, setZoom, setBounds]);
  return null;
};

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
    }
    const timeBonus = isCorrect ? Math.floor(timeLeft * 100) : 0;
    const basePoints = isCorrect ? 500 : 0;
    const roundPoints = Math.floor((basePoints + timeBonus) * multiplier) + discoveryBonus;
    if (isCorrect) {
      setScore(prev => prev + roundPoints);
      setCorrectCount(prev => prev + 1);
      setFeedback(t('correct'));
    } else {
      setFeedback(option === "" ? "Zeit abgelaufen!" : t('wrong', { name: currentStreet?.name }));
    }
    if (totalQuestions >= 10) {
      const finalCorrectCount = isCorrect ? correctCount + 1 : correctCount;
      const finalScore = score + roundPoints;
      if (finalCorrectCount === 10) {
        unlockAchievement('perfect_round');
        confetti({ particleCount: 300, spread: 100, origin: { y: 0.5 } });
      }
      const hour = new Date().getHours();
      if (hour >= 22 || hour < 5) unlockAchievement('night_shift');
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
      // Fast check: is the entire street outside the visible bounds?
      const streetBounds = L.latLngBounds(s.coordinates.flat());
      if (!bufferedBounds.intersects(streetBounds)) return false;
      
      // Detailed check: do any actual segments intersect?
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
      <div className="login-container">
        <div className="login-background-deco"><div className="circle-one"></div><div className="circle-two"></div></div>
        <div className="login-content">
          <div className="login-hero"><ShieldAlert size={80} color="var(--primary)" className="hero-icon-main" /><h1>{t('app_title')}</h1><p className="hero-subtitle">{t('login_desc')}</p></div>
          <form className="login-form-modern" onSubmit={handleLogin}><div className="input-wrapper-modern"><UserIcon size={20} className="input-icon" /><input name="username" placeholder={t('username')} required autoComplete="off" /></div><button type="submit" className="login-submit-btn"><span>{t('login')}</span><ChevronRight size={20} /></button></form>
          <div className="lang-select-wrapper-modern"><Languages size={18} /><select className="lang-select-login-modern" value={i18n.language} onChange={(e) => changeLanguage(e.target.value)}><option value="de">Deutsch</option><option value="en">English</option></select></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`app-wrapper ${isEmergencyActive ? 'emergency-lights' : ''}`}>
      <header>
        <div className="header-left">
          <div className="user-info">
            <MapIcon size={20} className="header-icon" />
            <div className="user-text-details">
              <span className="user-name"><strong>{user}</strong></span>
              <span className="user-rank-badge" style={{ backgroundColor: userRank.color + '33', color: userRank.color }}>{userRank.title}</span>
            </div>
          </div>
          <div className="header-divider"></div>
          <div className="completion-stats" title={`${knownStreetIds.length} von ${streets.length} Strassen bekannt`}>
            <Compass size={16} /><div className="completion-bar-wrapper"><div className="completion-bar" style={{ width: `${completionRate}%` }}></div></div><span className="completion-text">{completionRate}%</span>
          </div>
          <div className="header-divider"></div>
          <div className="lang-select-wrapper-header">
            <Languages size={18} color="var(--text-muted)" />
            <select className="lang-select-header" value={i18n.language} onChange={(e) => changeLanguage(e.target.value)}>
              <option value="de">DE</option>
              <option value="en">EN</option>
            </select>
          </div>
        </div>
        <nav>
          <button className={mode === 'learn' ? 'active' : ''} onClick={() => setMode('learn')}><BookOpen size={18} /> {t('learn_mode')}</button>
          <button className={mode === 'compete' ? 'active' : ''} onClick={() => { setMode('compete'); setShowRulesModal(true); }}><Trophy size={18} /> {t('compete_mode')}</button>
          <button className={mode === 'leaderboard' ? 'active' : ''} onClick={() => setMode('leaderboard')}><LayoutList size={18} /> {t('leaderboard')}</button>
          <button className={mode === 'release_notes' ? 'active' : ''} onClick={() => setMode('release_notes')}><History size={18} /> {t('release_notes')}</button>
          <button onClick={handleLogout} className="logout-btn"><LogOut size={18} /> {t('logout')}</button>
        </nav>
      </header>

      <main>
        {loading && (<div className="map-loading-overlay"><div className="spinner"></div><p>{t('loading')}</p></div>)}

        {showRulesModal && (
          <div className="modal-overlay">
            <div className="rules-modal">
              <div className="modal-header"><Zap size={32} color="var(--primary)" /> <h2>Wettkampfregeln</h2></div>
              <div className="rules-grid">
                <div className="rule-item">
                  <Target size={28} color="var(--accent)" /> 
                  <div><h4>Basis-Punkte</h4><p>Erhalte <strong>500 Punkte</strong> pro korrekte Strasse.</p></div>
                </div>
                <div className="rule-item">
                  <Clock size={28} color="var(--primary)" /> 
                  <div><h4>Zeitlimit</h4><p>Du hast <strong>20 Sekunden</strong> pro Frage.</p></div>
                </div>
                <div className="rule-item">
                  <Zap size={28} color="#4ade80" /> 
                  <div><h4>Speed-Bonus</h4><p>Bis zu <strong>1000 Extra-Punkte</strong> für schnelle Antworten.</p></div>
                </div>
                <div className="rule-item">
                  <Flame size={28} color="#fb923c" /> 
                  <div><h4>Combo-Streaks</h4><p>Multiplikatoren (bis zu 3x!) bei Serien.</p></div>
                </div>
                <div className="rule-item">
                  <Compass size={28} color="var(--accent)" /> 
                  <div><h4>Entdecker-Bonus</h4><p>Erhalte einmalig <strong>1000 Punkte</strong> beim ersten Mal finden!</p></div>
                </div>
              </div>
              <button className="primary-action-btn" onClick={() => { setShowRulesModal(false); startCompetition(); }}><Play size={20} fill="currentColor" /> JETZT STARTEN</button>
            </div>
          </div>
        )}

        {mode === 'learn' && streets.length > 0 && (
          <div className="map-container">
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
            <button className="hydrant-toggle-btn" onClick={() => setShowHydrants(!showHydrants)}>{showHydrants ? <EyeOff size={20} /> : <Droplets size={20} />}<span>{showHydrants ? "Hydranten aus" : "Hydranten ein"}</span></button>
            <div className="overlay-info">
              <div className="overlay-text"><BookOpen size={18} /> {t('learn_overlay')}</div>
              <div className="map-legend"><div className="legend-item"><span className="dot known"></span> {t('legend_known')}</div><div className="legend-item"><span className="dot unknown"></span> {t('legend_unknown')}</div><div className="legend-item"><span className="dot hydrant"></span> Hydrant</div></div>
            </div>
          </div>
        )}

        {mode === 'compete' && currentStreet && !showRulesModal && (
          <div className="compete-container">
            <div className="stats-header">
              <div className="stats-badge"><Trophy size={16} /> {t('round')}: {totalQuestions}/10</div>
              <div className={`stats-badge score-badge ${streak >= 3 ? 'on-fire' : ''}`}>
                {score.toLocaleString()} PTS
                {streak >= 3 && <span className="multiplier">x{streak >= 10 ? '3' : streak >= 5 ? '2' : '1.5'}</span>}
                {streak >= 3 && <Flame size={18} className="flame-icon" />}
              </div>
            </div>
            <div className="timer-wrapper">
              <div className="timer-bar-container"><div className="timer-bar" style={{ width: `${(timeLeft / QUESTION_TIME_LIMIT) * 100}%`, backgroundColor: timeLeft < 5 ? 'var(--primary)' : 'var(--accent)' }}></div></div>
              <div className="timer-text">{Math.ceil(timeLeft)}s</div>
            </div>
            <div className="map-container mini-map">
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
            <div className="quiz-controls">
              {feedback ? (
                <div className="feedback-overlay-content">
                  <div className={`feedback-card ${feedback === t('correct') ? 'success' : 'error'}`}>
                    <div className="feedback-icon-container">{feedback === t('correct') ? <CheckCircle2 size={64} className="icon-pulse" /> : <XCircle size={64} className="icon-shake" />}</div>
                    <div className="feedback-text-content">
                      <h2 className="feedback-status">{feedback === t('correct') ? t('correct') : (timeLeft <= 0 ? "Zeit abgelaufen!" : "Falsch!")}</h2>
                      {feedback !== t('correct') && <p className="correct-answer-reveal">Korrekt ist {currentStreet?.name}</p>}
                      {feedback === t('correct') && (
                        <div className="bonus-container">
                          {streak >= 3 && <p className="streak-feedback">STREAK: {streak} 🔥</p>}
                          {lastDiscoveryBonus && <p className="discovery-feedback">+1000 ENTDECKER-BONUS! 🧭</p>}
                        </div>
                      )}
                    </div>
                    <div className="feedback-actions">
                      {totalQuestions < 10 ? (
                        <button onClick={nextQuestion} className="primary-action-btn"><span>{t('next_street')}</span> <ChevronRight size={20} /></button>
                      ) : (
                        <button onClick={() => setMode('leaderboard')} className="primary-action-btn finish"><Trophy size={20} /> <span>{t('to_leaderboard')}</span></button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="options-grid">{options.map(opt => (<button key={opt} onClick={() => handleAnswer(opt)}>{opt}</button>))}</div>
              )}
            </div>
          </div>
        )}

        {(mode === 'leaderboard' || mode === 'release_notes') && (
          <div className="scroll-content">
            {mode === 'leaderboard' && (
              <div className="leaderboard-container">
                <div className="section-header"><Trophy size={32} className="text-accent" /> <h2>Hall of Fame</h2></div>
                <div className="podium-container">
                  {topThree.map((entry, i) => {
                    const totalS = leaderboardData.filter((ld: any) => ld.user === entry.user).reduce((sum: number, ld: any) => sum + ld.score, 0);
                    const rank = getRank(totalS);
                    const medalColors = ['#fbbf24', '#cbd5e1', '#d97706'];
                    return (
                      <div key={i} className={`podium-card rank-${i + 1}`}>
                        <div className="podium-medal" style={{ backgroundColor: medalColors[i] }}><Medal size={24} color="#0f172a" /></div>
                        <span className="podium-name">{entry.user}</span>
                        <span className="podium-rank" style={{ color: rank.color }}>{rank.title}</span>
                        <span className="podium-score">{entry.score.toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="leaderboard-table-wrapper">
                  <table>
                    <thead><tr><th>{t('rank')}</th><th>{t('name')}</th><th>{t('points')}</th><th>{t('date')}</th></tr></thead>
                    <tbody>
                      {restOfList.map((entry: any, i: number) => {
                        const totalS = leaderboardData.filter((ld: any) => ld.user === entry.user).reduce((sum: number, ld: any) => sum + ld.score, 0);
                        const rank = getRank(totalS);
                        return (
                          <tr key={i} className={entry.user === user ? 'highlight' : ''}>
                            <td>#{i + 4}</td>
                            <td><div className="leaderboard-user-cell"><span className="leaderboard-name">{entry.user}</span><span className="leaderboard-rank" style={{ color: rank.color }}>{rank.title}</span></div></td>
                            <td className="score-cell">{entry.score.toLocaleString()}</td>
                            <td>{entry.date}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="achievements-shelf">
                  {ACHIEVEMENTS.map(ach => {
                    const isUnlocked = unlockedAchievements.includes(ach.id);
                    return (
                      <div key={ach.id} className={`achievement-badge ${isUnlocked ? 'unlocked' : 'locked'}`} title={ach.desc}>
                        <ach.icon size={24} color={isUnlocked ? ach.color : '#475569'} />
                        <span className="badge-name">{ach.title}</span>
                      </div>
                    );
                  })}
                </div>
                <button onClick={() => setMode('learn')} className="back-btn">{t('back_to_learn')}</button>
              </div>
            )}

            {mode === 'release_notes' && (
              <div className="release-notes-container">
                <div className="section-header"><History size={32} className="text-primary" /> <h2>{t('release_notes')}</h2></div>
                <div className="release-list">
                  <div className="release-item">
                    <div className="version-badge">v1.9.0</div>
                    <h3>House Numbers Integrated</h3>
                    <ul>
                      <li>🏠 **Always Visible**: Hausnummern werden nun permanent auf der Karte angezeigt (ab Zoom-Level 18).</li>
                    </ul>
                  </div>
                  <div className="release-item">
                    <div className="version-badge">v1.8.0</div>
                    <h3>Map Refinement</h3>
                    <ul>
                      <li>🗺️ **Consistent Map**: Lern- und Wettkampfmodus nutzen den identischen CartoDB Voyager Stil.</li>
                    </ul>
                  </div>
                </div>
                <button onClick={() => setMode('learn')} className="back-btn">{t('back_to_learn')}</button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
