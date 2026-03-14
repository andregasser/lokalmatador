import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Tooltip, useMap, LayersControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';
import { fetchBassersdorfStreets } from './osmService';
import type { Street } from './osmService';
import './App.css';
import { useTranslation } from 'react-i18next';
import { 
  BookOpen, 
  Trophy, 
  LayoutList, 
  History, 
  LogOut, 
  Languages, 
  Map as MapIcon, 
  CheckCircle2, 
  XCircle,
  ChevronRight,
  Timer,
  Play,
  Zap,
  Target,
  Clock,
  Flame
} from 'lucide-react';

const BASSERSDORF_CENTER: [number, number] = [47.444, 8.625];
const QUESTION_TIME_LIMIT = 20;

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

const App: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [user, setUser] = useState<string | null>(localStorage.getItem('user'));
  const [streets, setStreets] = useState<Street[]>([]);
  const [mode, setMode] = useState<'learn' | 'compete' | 'leaderboard' | 'release_notes'>('learn');
  const [loading, setLoading] = useState(true);
  const [selectedStreetId, setSelectedStreetId] = useState<string | null>(null);

  // Competition state
  const [currentStreet, setCurrentStreet] = useState<Street | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_LIMIT);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [streak, setStreak] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const rawLeaderboard = localStorage.getItem('leaderboard');
    if (rawLeaderboard) {
      try {
        const leaderboard = JSON.parse(rawLeaderboard);
        const migrated = leaderboard.map((entry: any) => {
          if (entry.date && !entry.date.includes(':')) {
            return { ...entry, date: `${entry.date}, 12:00:00` };
          }
          return entry;
        });
        localStorage.setItem('leaderboard', JSON.stringify(migrated));
      } catch (e) { console.error(e); }
    }

    const loadStreets = async () => {
      try {
        const data = await fetchBassersdorfStreets();
        setStreets(data);
      } catch (err) {
        console.error("Failed to load streets:", err);
      } finally {
        setLoading(false);
      }
    };
    loadStreets();
  }, []);

  useEffect(() => {
    if (isTimerActive && timeLeft > 0) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => prev - 0.1);
      }, 100);
    } else if (timeLeft <= 0 && isTimerActive) {
      handleAnswer(""); 
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isTimerActive, timeLeft]);

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
    setTotalQuestions(0);
    setStreak(0);
    nextQuestion();
  };

  const nextQuestion = () => {
    if (streets.length < 4) return;
    setFeedback(null);
    setTimeLeft(QUESTION_TIME_LIMIT);
    const correct = streets[Math.floor(Math.random() * streets.length)];
    const distractors = streets
      .filter(s => s.name !== correct.name)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);
    
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
    
    // Streak logic
    const newStreak = isCorrect ? streak + 1 : 0;
    setStreak(newStreak);

    // Multiplier logic
    let multiplier = 1;
    if (newStreak >= 10) multiplier = 3;
    else if (newStreak >= 5) multiplier = 2;
    else if (newStreak >= 3) multiplier = 1.5;

    const timeBonus = isCorrect ? Math.floor(timeLeft * 100) : 0;
    const basePoints = isCorrect ? 500 : 0;
    const roundPoints = Math.floor((basePoints + timeBonus) * multiplier);

    if (isCorrect) {
      setScore(prev => prev + roundPoints);
      setFeedback(t('correct'));
    } else {
      setFeedback(option === "" ? "Zeit abgelaufen!" : t('wrong', { name: currentStreet?.name }));
    }

    if (totalQuestions >= 10) {
      const leaderboard = JSON.parse(localStorage.getItem('leaderboard') || '[]');
      leaderboard.push({ 
        user, 
        score: score + roundPoints, 
        date: new Date().toLocaleString() 
      });
      localStorage.setItem('leaderboard', JSON.stringify(leaderboard));
    }
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  if (!user) {
    return (
      <div className="login-container">
        <div className="login-glow"></div>
        <div className="login-content">
          <h1>{t('app_title')}</h1>
          <p>{t('login_desc')}</p>
          <form onSubmit={handleLogin}>
            <input name="username" placeholder={t('username')} required autoComplete="off" />
            <button type="submit">{t('login')}</button>
          </form>
          <div className="lang-select-wrapper">
            <Languages size={18} />
            <select className="lang-select-login" value={i18n.language} onChange={(e) => changeLanguage(e.target.value)}>
              <option value="de">Deutsch</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>
      </div>
    );
  }

  if (loading) return (
    <div className="loading">
      <div className="spinner"></div>
      <p>{t('loading')}</p>
    </div>
  );

  return (
    <div className="app-wrapper">
      <header>
        <div className="header-left">
          <div className="user-info">
            <MapIcon size={20} className="header-icon" />
            {t('firefighter')}: <strong>{user}</strong>
          </div>
          <div className="header-divider"></div>
          <select className="lang-select" value={i18n.language} onChange={(e) => changeLanguage(e.target.value)}>
            <option value="de">DE</option>
            <option value="en">EN</option>
          </select>
        </div>
        <nav>
          <button className={mode === 'learn' ? 'active' : ''} onClick={() => setMode('learn')}>
            <BookOpen size={18} /> {t('learn_mode')}
          </button>
          <button className={mode === 'compete' ? 'active' : ''} onClick={() => { setMode('compete'); setShowRulesModal(true); }}>
            <Trophy size={18} /> {t('compete_mode')}
          </button>
          <button className={mode === 'leaderboard' ? 'active' : ''} onClick={() => setMode('leaderboard')}>
            <LayoutList size={18} /> {t('leaderboard')}
          </button>
          <button className={mode === 'release_notes' ? 'active' : ''} onClick={() => setMode('release_notes')}>
            <History size={18} /> {t('release_notes')}
          </button>
          <button onClick={handleLogout} className="logout-btn">
            <LogOut size={18} /> {t('logout')}
          </button>
        </nav>
      </header>

      <main>
        {showRulesModal && (
          <div className="modal-overlay">
            <div className="rules-modal">
              <div className="modal-header">
                <Zap size={32} color="var(--primary)" />
                <h2>Wettkampfregeln</h2>
              </div>
              <div className="rules-grid">
                <div className="rule-item">
                  <Target size={24} color="var(--accent)" />
                  <div>
                    <h4>Basis-Punkte</h4>
                    <p>Erhalte <strong>500 Punkte</strong> für jede korrekt identifizierte Strasse.</p>
                  </div>
                </div>
                <div className="rule-item">
                  <Clock size={24} color="var(--primary)" />
                  <div>
                    <h4>Zeitlimit</h4>
                    <p>Du hast <strong>20 Sekunden</strong> pro Frage. Beeil dich!</p>
                  </div>
                </div>
                <div className="rule-item">
                  <Zap size={24} color="#4ade80" />
                  <div>
                    <h4>Speed-Bonus</h4>
                    <p>Je schneller du antwortest, desto mehr Bonus-Punkte bekommst du (bis zu <strong>1000 Extra</strong>).</p>
                  </div>
                </div>
                <div className="rule-item">
                  <Flame size={24} color="#fb923c" />
                  <div>
                    <h4>Combo-Streaks</h4>
                    <p>Antworte mehrmals richtig für Multiplikatoren (3x: 1.5x, 5x: 2x, 10x: 3x Punkte!).</p>
                  </div>
                </div>
              </div>
              <button className="primary-action-btn" onClick={() => { setShowRulesModal(false); startCompetition(); }}>
                <Play size={20} fill="currentColor" /> JETZT STARTEN
              </button>
            </div>
          </div>
        )}

        {mode === 'learn' && (
          <div className="map-container">
            <MapContainer key={`map-learn-${streets.length}`} center={BASSERSDORF_CENTER} zoom={15} maxZoom={22} style={{ height: '100%', width: '100%' }}>
              <LayersControl position="topright">
                <LayersControl.BaseLayer checked name={t('map_osm')}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={22} maxNativeZoom={19} className="leaflet-dark" />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name={t('map_sat')}>
                  <TileLayer url="https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857/{z}/{x}/{y}.jpeg" attribution='&copy; swisstopo' maxZoom={22} />
                </LayersControl.BaseLayer>
              </LayersControl>
              <MapResizer />
              {streets.map(s => (
                <React.Fragment key={s.id}>
                  {s.coordinates.map((path, idx) => (
                    <Polyline 
                      key={`${s.id}-${idx}-${selectedStreetId === s.id}`} 
                      positions={path} 
                      pathOptions={{
                        color: selectedStreetId === s.id ? "var(--primary)" : "var(--accent)",
                        weight: selectedStreetId === s.id ? 8 : 4,
                        opacity: selectedStreetId === s.id ? 1 : 0.6,
                        className: selectedStreetId === s.id ? "pulse-line" : ""
                      }}
                      eventHandlers={{ click: () => setSelectedStreetId(s.id) }}
                      interactive={true}
                    >
                      <Tooltip permanent={false}>{s.name}</Tooltip>
                    </Polyline>
                  ))}
                </React.Fragment>
              ))}
            </MapContainer>
            <div className="overlay-info"><BookOpen size={18} /> {t('learn_overlay')}</div>
          </div>
        )}

        {mode === 'compete' && currentStreet && !showRulesModal && (
          <div className="compete-container">
            <div className="stats-header">
              <div className="stats-badge">
                <Trophy size={16} /> {t('round')}: {totalQuestions}/10
              </div>
              <div className={`stats-badge score-badge ${streak >= 3 ? 'on-fire' : ''}`}>
                {score.toLocaleString()} PTS
                {streak >= 3 && <span className="multiplier">x{streak >= 10 ? '3' : streak >= 5 ? '2' : '1.5'}</span>}
                {streak >= 3 && <Flame size={18} className="flame-icon" />}
              </div>
            </div>
            
            <div className="timer-wrapper">
              <div className="timer-bar" style={{ 
                width: `${(timeLeft / QUESTION_TIME_LIMIT) * 100}%`,
                backgroundColor: timeLeft < 5 ? 'var(--primary)' : 'var(--accent)'
              }}></div>
              <div className="timer-text"><Timer size={14} /> {Math.ceil(timeLeft)}s</div>
            </div>

            <div className="map-container mini-map">
              <MapContainer key={`map-compete-${currentStreet.id}`} center={BASSERSDORF_CENTER} zoom={17} maxZoom={22} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                <LayersControl position="topright">
                  <LayersControl.BaseLayer checked name={t('map_stumm')}>
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png" attribution='&copy; OSM' maxZoom={22} maxNativeZoom={19} className="leaflet-dark" />
                  </LayersControl.BaseLayer>
                  <LayersControl.BaseLayer name={t('map_sat')}>
                    <TileLayer url="https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857/{z}/{x}/{y}.jpeg" attribution='&copy; swisstopo' maxZoom={22} />
                  </LayersControl.BaseLayer>
                </LayersControl>
                {currentStreet.coordinates.map((path, idx) => (
                  <Polyline key={idx} positions={path} pathOptions={{ color: "var(--primary)", className: "pulse-line" }} />
                ))}
                <MapFocus coords={currentStreet.coordinates} />
                <MapResizer />
              </MapContainer>
            </div>
            
            <div className="quiz-controls">
              {feedback ? (
                <div className="feedback-overlay-content">
                  <div className={`feedback-card ${feedback === t('correct') ? 'success' : 'error'}`}>
                    <div className="feedback-icon-container">
                      {feedback === t('correct') ? <CheckCircle2 size={64} className="icon-pulse" /> : <XCircle size={64} className="icon-shake" />}
                    </div>
                    <div className="feedback-text-content">
                      <h2 className="feedback-status">{feedback === t('correct') ? t('correct') : (timeLeft <= 0 ? "Zeit abgelaufen!" : "Falsch!")}</h2>
                      {feedback !== t('correct') && <p className="correct-answer-reveal">Korrekt ist {currentStreet?.name}</p>}
                      {feedback === t('correct') && streak >= 3 && <p className="streak-feedback">STREAK: {streak} 🔥</p>}
                    </div>
                    <div className="feedback-actions">
                      {totalQuestions < 10 ? (
                        <button onClick={nextQuestion} className="primary-action-btn">
                          <span>{t('next_street')}</span> <ChevronRight size={20} />
                        </button>
                      ) : (
                        <button onClick={() => setMode('leaderboard')} className="primary-action-btn finish">
                          <Trophy size={20} /> <span>{t('to_leaderboard')}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="options-grid">
                  {options.map(opt => (
                    <button key={opt} onClick={() => handleAnswer(opt)}>{opt}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {mode === 'leaderboard' && (
          <div className="leaderboard-container">
            <div className="section-header"><Trophy size={32} className="text-accent" /> <h2>{t('leaderboard')}</h2></div>
            <div className="leaderboard-table-wrapper">
              <table>
                <thead>
                  <tr><th>{t('rank')}</th><th>{t('name')}</th><th>{t('points')}</th><th>{t('date')}</th></tr>
                </thead>
                <tbody>
                  {JSON.parse(localStorage.getItem('leaderboard') || '[]')
                    .sort((a: any, b: any) => b.score - a.score)
                    .slice(0, 10)
                    .map((entry: any, i: number) => (
                      <tr key={i} className={entry.user === user ? 'highlight' : ''}>
                        <td>#{i + 1}</td>
                        <td>{entry.user}</td>
                        <td className="score-cell">{entry.score.toLocaleString()}</td>
                        <td>{entry.date}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <button onClick={() => setMode('learn')} className="back-btn">{t('back_to_learn')}</button>
          </div>
        )}

        {mode === 'release_notes' && (
          <div className="release-notes-container">
            <div className="section-header"><History size={32} className="text-primary" /> <h2>{t('release_notes')}</h2></div>
            <div className="release-list">
              <div className="release-item">
                <div className="version-badge">v1.2.0</div>
                <h3>Gamification Update</h3>
                <ul>
                  <li>⏱️ **Time Bonus**: More points for faster answers!</li>
                  <li>🔥 **Streaks**: Maintain a streak for point multipliers (up to 3x!).</li>
                  <li>📊 **Enhanced Scoring**: Scores now reflect speed and precision.</li>
                  <li>⏳ **Countdown Timer**: 20 seconds to find the street.</li>
                </ul>
              </div>
              <div className="release-item">
                <div className="version-badge">v1.1.0</div>
                <h3>{t('rel_1_1_0_title')}</h3>
                <ul>
                  {(t('rel_1_1_0_items', { returnObjects: true }) as string[]).map((item, i) => (
                    <li key={i}>{item.replace(/\*\*(.*?)\*\*/g, '$1')}</li>
                  ))}
                </ul>
              </div>
            </div>
            <button onClick={() => setMode('learn')} className="back-btn">{t('back_to_learn')}</button>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
