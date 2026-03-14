import React, { useState, useEffect } from 'react';
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
  ChevronRight
} from 'lucide-react';

// Center of Bassersdorf
const BASSERSDORF_CENTER: [number, number] = [47.444, 8.625];

// Map Focus Helper
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

// Map Resizer Helper
const MapResizer = () => {
  const map = useMap();
  useEffect(() => {
    const handleResize = () => {
      map.invalidateSize();
    };
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

  useEffect(() => {
    // Migrate existing leaderboard entries
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
      setLoading(true);
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
    nextQuestion();
  };

  const nextQuestion = () => {
    if (streets.length < 4) return;
    setFeedback(null);
    const correct = streets[Math.floor(Math.random() * streets.length)];
    const distractors = streets
      .filter(s => s.name !== correct.name)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);
    
    const allOptions = [correct.name, ...distractors.map(s => s.name)].sort(() => 0.5 - Math.random());
    
    setCurrentStreet(correct);
    setOptions(allOptions);
    setTotalQuestions(prev => prev + 1);
  };

  const handleAnswer = (option: string) => {
    const isCorrect = currentStreet?.name === option;
    if (isCorrect) {
      setScore(prev => prev + 1);
      setFeedback(t('correct'));
    } else {
      setFeedback(t('wrong', { name: currentStreet?.name }));
    }

    if (totalQuestions >= 10) {
      const leaderboard = JSON.parse(localStorage.getItem('leaderboard') || '[]');
      leaderboard.push({ 
        user, 
        score: score + (isCorrect ? 1 : 0), 
        date: new Date().toLocaleString() 
      });
      localStorage.setItem('leaderboard', JSON.stringify(leaderboard));
    }
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  // Auth Screen
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
            <select 
              className="lang-select-login" 
              value={i18n.language} 
              onChange={(e) => changeLanguage(e.target.value)}
            >
              <option value="de">Deutsch</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>
      </div>
    );
  }

  // Loading Screen
  if (loading) return (
    <div className="loading">
      <div className="spinner"></div>
      <p>{t('loading')}</p>
    </div>
  );

  // Empty State / Error Screen
  if (!loading && streets.length === 0) return (
    <div className="loading">
      <XCircle size={48} color="var(--primary)" />
      <p style={{ marginTop: '20px' }}>Could not load street data. OSM API may be busy.</p>
      <button onClick={() => window.location.reload()} className="back-btn">Retry</button>
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
          <select 
            className="lang-select" 
            value={i18n.language} 
            onChange={(e) => changeLanguage(e.target.value)}
          >
            <option value="de">DE</option>
            <option value="en">EN</option>
          </select>
        </div>
        <nav>
          <button className={mode === 'learn' ? 'active' : ''} onClick={() => setMode('learn')}>
            <BookOpen size={18} /> {t('learn_mode')}
          </button>
          <button className={mode === 'compete' ? 'active' : ''} onClick={() => { setMode('compete'); startCompetition(); }}>
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
        {mode === 'learn' && (
          <div className="map-container">
            <MapContainer 
              key={`map-learn-${streets.length}`}
              center={BASSERSDORF_CENTER} 
              zoom={15} 
              maxZoom={22} 
              style={{ height: '100%', width: '100%' }} 
            >
              <LayersControl position="topright">
                <LayersControl.BaseLayer checked name={t('map_osm')}>
                  <TileLayer 
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
                    maxZoom={22} 
                    maxNativeZoom={19} 
                    className="leaflet-dark"
                  />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name={t('map_sat')}>
                  <TileLayer 
                    url="https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857/{z}/{x}/{y}.jpeg"
                    attribution='&copy; swisstopo'
                    maxZoom={22}
                  />
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
                      eventHandlers={{
                        click: () => setSelectedStreetId(s.id)
                      }}
                      interactive={true}
                    >
                      <Tooltip permanent={false}>{s.name}</Tooltip>
                    </Polyline>
                  ))}
                </React.Fragment>
              ))}
            </MapContainer>
            <div className="overlay-info">
              <BookOpen size={18} /> {t('learn_overlay')}
            </div>
          </div>
        )}

        {mode === 'compete' && currentStreet && (
          <div className="compete-container">
            <div className="stats">
              <Trophy size={16} /> {t('round')}: {totalQuestions}/10 | {t('points')}: {score}
            </div>
            <div className="map-container mini-map">
              <MapContainer 
                key={`map-compete-${currentStreet.id}`}
                center={BASSERSDORF_CENTER} 
                zoom={17} 
                maxZoom={22} 
                style={{ height: '100%', width: '100%' }} 
                zoomControl={false} 
              >
                <LayersControl position="topright">
                  <LayersControl.BaseLayer checked name={t('map_stumm')}>
                    <TileLayer 
                      url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
                      attribution='&copy; OSM'
                      maxZoom={22}
                      maxNativeZoom={19}
                      className="leaflet-dark"
                    />
                  </LayersControl.BaseLayer>
                  <LayersControl.BaseLayer name={t('map_sat')}>
                    <TileLayer 
                      url="https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857/{z}/{x}/{y}.jpeg" 
                      maxZoom={22} 
                      attribution='&copy; swisstopo'
                    />
                  </LayersControl.BaseLayer>
                </LayersControl>
                {currentStreet.coordinates.map((path, idx) => (
                  <Polyline 
                    key={idx} 
                    positions={path} 
                    pathOptions={{ color: "var(--primary)", className: "pulse-line" }} 
                  />
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
                      {feedback === t('correct') ? (
                        <CheckCircle2 size={64} className="icon-pulse" />
                      ) : (
                        <XCircle size={64} className="icon-shake" />
                      )}
                    </div>
                    <div className="feedback-text-content">
                      <h2 className="feedback-status">
                        {feedback === t('correct') ? t('correct') : t('wrong').split('.')[0]}
                      </h2>
                      {feedback !== t('correct') && (
                        <p className="correct-answer-reveal">
                          {t('wrong', { name: currentStreet?.name }).split('. ')[1]}
                        </p>
                      )}
                    </div>
                    <div className="feedback-actions">
                      {totalQuestions < 10 ? (
                        <button onClick={nextQuestion} className="primary-action-btn">
                          <span>{t('next_street')}</span>
                          <ChevronRight size={20} />
                        </button>
                      ) : (
                        <button onClick={() => setMode('leaderboard')} className="primary-action-btn finish">
                          <Trophy size={20} />
                          <span>{t('to_leaderboard')}</span>
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
            <div className="section-header">
              <Trophy size={32} className="text-accent" />
              <h2>{t('leaderboard')}</h2>
            </div>
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
                        <td className="score-cell">{entry.score}/10</td>
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
            <div className="section-header">
              <History size={32} className="text-primary" />
              <h2>{t('release_notes')}</h2>
            </div>
            <div className="release-list">
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
