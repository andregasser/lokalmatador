import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  de: {
    translation: {
      "app_title": "Lokalmatador",
      "login_desc": "Verbessere deine Ortskenntnis für die Feuerwehr Bassersdorf.",
      "username": "Benutzername",
      "login": "Einloggen",
      "firefighter": "Feuerwehrmann",
      "learn_mode": "Lernmodus",
      "compete_mode": "Wettkampf",
      "leaderboard": "Bestenliste",
      "release_notes": "Release Notes",
      "logout": "Logout",
      "learn_overlay": "Klicke auf eine Strasse oder fahre mit der Maus darüber, um den Namen zu sehen.",
      "round": "Runde",
      "points": "Punkte",
      "next_street": "Nächste Strasse",
      "comp_finished": "Wettkampf beendet! Endstand: ",
      "to_leaderboard": "Zum Leaderboard",
      "correct": "Korrekt!",
      "wrong": "Falsch. Korrekt ist {{name}}.",
      "rank": "Rang",
      "name": "Name",
      "date": "Datum",
      "back_to_learn": "Zurück zum Lernen",
      "loading": "Lade Strassendaten von OpenStreetMap...",
      "map_stumm": "Karte (Stumm)",
      "map_osm": "Karte (OSM)",
      "map_sat": "Satellit (Esri)",
      "rel_1_1_0_title": "Version 1.1.0",
      "rel_1_1_0_items": [
        "🌍 **Zweisprachigkeit**: Die App ist jetzt auf Deutsch und Englisch verfügbar.",
        "🗺️ **Satellitenbilder**: Wechsel zwischen OSM-Karte und Esri-Satellitenansicht möglich.",
        "🔍 **Zoom-Power**: Man kann nun deutlich näher an die Strassen heranzoomen (Level 22).",
        "🕒 **Leaderboard-Details**: In der Bestenliste wird nun auch die Uhrzeit angezeigt.",
        "📱 **Responsive Design**: Die App passt sich nun optimal an verschiedene Bildschirmgrössen an.",
        "🛣️ **Bessere Daten**: Strassenabzweigungen (z.B. Obstgartenstrasse) werden nun lückenlos erfasst."
      ],
      "rel_1_0_0_title": "Version 1.0.0",
      "rel_1_0_0_items": [
        "🚀 Erster Release mit Lern- und Wettkampfmodus für Bassersdorf.",
        "🥇 Lokales Leaderboard."
      ]
    }
  },
  en: {
    translation: {
      "app_title": "Lokalmatador",
      "login_desc": "Improve your street knowledge for the Bassersdorf fire department.",
      "username": "Username",
      "login": "Login",
      "firefighter": "Firefighter",
      "learn_mode": "Learn Mode",
      "compete_mode": "Competition",
      "leaderboard": "Leaderboard",
      "release_notes": "Release Notes",
      "logout": "Logout",
      "learn_overlay": "Click on a street or hover over it to see the name.",
      "round": "Round",
      "points": "Points",
      "next_street": "Next Street",
      "comp_finished": "Competition finished! Final score: ",
      "to_leaderboard": "To Leaderboard",
      "correct": "Correct!",
      "wrong": "Wrong. Correct is {{name}}.",
      "rank": "Rank",
      "name": "Name",
      "date": "Date",
      "back_to_learn": "Back to Learning",
      "loading": "Loading street data from OpenStreetMap...",
      "map_stumm": "Map (Mute)",
      "map_osm": "Map (OSM)",
      "map_sat": "Satellite (Esri)",
      "rel_1_1_0_title": "Version 1.1.0",
      "rel_1_1_0_items": [
        "🌍 **Multi-language**: The app is now available in German and English.",
        "🗺️ **Satellite Imagery**: Toggle between OSM map and Esri satellite view.",
        "🔍 **Zoom Power**: Deeper zoom level supported (up to level 22).",
        "🕒 **Leaderboard Details**: Timestamps are now shown in the leaderboard.",
        "📱 **Responsive Design**: Optimized for various screen sizes.",
        "🛣️ **Better Data**: Improved road branch detection (e.g., Obstgartenstrasse)."
      ],
      "rel_1_0_0_title": "Version 1.0.0",
      "rel_1_0_0_items": [
        "🚀 Initial release with Learn and Competition modes for Bassersdorf.",
        "🥇 Local leaderboard."
      ]
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'de',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
