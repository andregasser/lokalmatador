import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Tooltip, useMap, LayersControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';
import { fetchBassersdorfStreets } from './osmService';
import type { Street } from './osmService';
import './App.css';
import { useTranslation } from 'react-i18next';

// Center of Bassersdorf
const BASSERSDORF_CENTER: [number, number] = [47.444, 8.625];

// Map Focus Helper
const MapFocus = ({ coords }: { coords: [number, number][][] | null }) => {
  const map = useMap();
  useEffect(() => {
    if (coords && coords.length > 0) {
      // Flatten coords for fitBounds
      const flatCoords = coords.flat();
      map.fitBounds(flatCoords as any, { padding: [50, 50], maxZoom: 20 });
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
    console.log("App mounted, starting OSM street fetch...");
    
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
    if (currentStreet?.name === option) {
      setScore(prev => prev + 1);
      setFeedback(t('correct'));
    } else {
      setFeedback(t('wrong', { name: currentStreet?.name }));
    }

    if (totalQuestions >= 10) {
      const leaderboard = JSON.parse(localStorage.getItem('leaderboard') || '[]');
      leaderboard.push({ 
        user, 
        score: score + (currentStreet?.name === option ? 1 : 0), 
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
        <h1>{t('app_title')}</h1>
        <p>{t('login_desc')}</p>
        <form onSubmit={handleLogin}>
          <input name="username" placeholder={t('username')} required />
          <button type="submit">{t('login')}</button>
        </form>
        <select 
          className="lang-select-login" 
          value={i18n.language} 
          onChange={(e) => changeLanguage(e.target.value)}
        >
          <option value="de">Deutsch</option>
          <option value="en">English</option>
        </select>
      </div>
    );
  }

  if (loading) return <div className="loading">{t('loading')}</div>;

  return (
    <div className="app-wrapper">
      <header>
        <div className="header-left">
          <div className="user-info">{t('firefighter')}: <strong>{user}</strong></div>
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
          <button onClick={() => setMode('learn')}>{t('learn_mode')}</button>
          <button onClick={() => { setMode('compete'); startCompetition(); }}>{t('compete_mode')}</button>
          <button onClick={() => setMode('leaderboard')}>{t('leaderboard')}</button>
          <button onClick={() => setMode('release_notes')}>{t('release_notes')}</button>
          <button onClick={handleLogout} className="logout-btn">{t('logout')}</button>
        </nav>
      </header>

      <main>
        {mode === 'learn' && (
          <div className="map-container">
            <MapContainer center={BASSERSDORF_CENTER} zoom={15} maxZoom={22} style={{ height: '100%', width: '100%' }}>
              <LayersControl position="topright">
                <LayersControl.BaseLayer checked name={t('map_osm')}>
                  <TileLayer 
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
                    maxZoom={22} 
                    maxNativeZoom={19} 
                  />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name={t('map_sat')}>
                  <TileLayer 
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                    maxZoom={22}
                    maxNativeZoom={19}
                  />
                </LayersControl.BaseLayer>
              </LayersControl>
              <MapResizer />
              {streets.map(s => (
                <React.Fragment key={s.id}>
                  {s.coordinates.map((path, idx) => (
                    <Polyline 
                      key={`${s.id}-${idx}`} 
                      positions={path} 
                      pathOptions={{
                        color: selectedStreetId === s.id ? "red" : "blue",
                        weight: selectedStreetId === s.id ? 8 : 5,
                        opacity: 0.8
                      }}
                      eventHandlers={{
                        click: () => {
                          console.log("Street clicked:", s.name);
                          setSelectedStreetId(s.id);
                        }
                      }}
                      interactive={true}
                    >
                      <Tooltip permanent={false}>{s.name}</Tooltip>
                    </Polyline>
                  ))}
                </React.Fragment>
              ))}
            </MapContainer>
            <div className="overlay-info">{t('learn_overlay')}</div>
          </div>
        )}

        {mode === 'compete' && currentStreet && (
          <div className="compete-container">
            <div className="stats">{t('round')}: {totalQuestions}/10 | {t('points')}: {score}</div>
            <div className="map-container mini-map">
              <MapContainer center={BASSERSDORF_CENTER} zoom={17} maxZoom={22} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                <LayersControl position="topright">
                  <LayersControl.BaseLayer checked name={t('map_stumm')}>
                    <TileLayer 
                      url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
                      attribution='&copy; OSM'
                      maxZoom={22}
                      maxNativeZoom={19}
                    />
                  </LayersControl.BaseLayer>
                  <LayersControl.BaseLayer name={t('map_sat')}>
                    <TileLayer 
                      url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" 
                      maxZoom={22}
                      maxNativeZoom={19}
                    />
                  </LayersControl.BaseLayer>
                </LayersControl>
                {currentStreet.coordinates.map((path, idx) => (
                  <Polyline key={idx} positions={path} color="red" weight={8} />
                ))}
                <MapFocus coords={currentStreet.coordinates} />
                <MapResizer />
              </MapContainer>
            </div>
            
            <div className="quiz-controls">
              {feedback ? (
                <div className="feedback-area">
                  <p className={feedback === t('correct') ? 'text-success' : 'text-error'}>{feedback}</p>
                  {totalQuestions < 10 ? (
                    <button onClick={nextQuestion}>{t('next_street')}</button>
                  ) : (
                    <div className="end-game">
                      <h3>{t('comp_finished')} {score}/10</h3>
                      <button onClick={() => setMode('leaderboard')}>{t('to_leaderboard')}</button>
                    </div>
                  )}
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
            <h2>{t('leaderboard')}</h2>
            <table>
              <thead>
                <tr><th>{t('rank')}</th><th>{t('name')}</th><th>{t('points')}</th><th>{t('date')}</th></tr>
              </thead>
              <tbody>
                {JSON.parse(localStorage.getItem('leaderboard') || '[]')
                  .sort((a: any, b: any) => b.score - a.score)
                  .slice(0, 10)
                  .map((entry: any, i: number) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>{entry.user}</td>
                      <td>{entry.score}/10</td>
                      <td>{entry.date}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
            <button onClick={() => setMode('learn')}>{t('back_to_learn')}</button>
          </div>
        )}

        {mode === 'release_notes' && (
          <div className="release-notes-container">
            <h2>{t('release_notes')}</h2>
            <div className="release-list">
              <div className="release-item">
                <h3>{t('rel_1_1_0_title')}</h3>
                <ul>
                  {(t('rel_1_1_0_items', { returnObjects: true }) as string[]).map((item, i) => (
                    <li key={i}>{item.replace(/\*\*(.*?)\*\*/g, '$1')}</li>
                  ))}
                </ul>
              </div>
              <div className="release-item">
                <h3>{t('rel_1_0_0_title')}</h3>
                <ul>
                  {(t('rel_1_0_0_items', { returnObjects: true }) as string[]).map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
            <button onClick={() => setMode('learn')}>{t('back_to_learn')}</button>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
