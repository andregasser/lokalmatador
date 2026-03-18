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
      "wrong": "Falsch!",
      "time_expired": "Zeit abgelaufen!",
      "correct_is": "Korrekt ist {{name}}",
      "streak_bonus": "STREAK: {{count}} 🔥",
      "discovery_bonus_label": "+1000 ENTDECKER-BONUS! 🧭",
      "rank": "Rang",
      "name": "Name",
      "date": "Datum",
      "back_to_learn": "Zurück zum Lernen",
      "loading": "Lade Strassendaten von OpenStreetMap...",
      "map_stumm": "Karte (Stumm)",
      "map_osm": "Karte (OSM)",
      "map_sat": "Satellit (Swisstopo)",
      "legend_known": "Bekannt",
      "legend_unknown": "Unbekannt",
      "rules_title": "Wettkampfregeln",
      "rules_start": "JETZT STARTEN",
      "rule_base_title": "Basis-Punkte",
      "rule_base_desc": "Erhalte <strong>500 Punkte</strong> pro korrekte Strasse.",
      "rule_time_title": "Zeitlimit",
      "rule_time_desc": "Du hast <strong>20 Sekunden</strong> pro Frage.",
      "rule_speed_title": "Speed-Bonus",
      "rule_speed_desc": "Bis zu <strong>1000 Extra-Punkte</strong> für schnelle Antworten.",
      "rule_streak_title": "Combo-Streaks",
      "rule_streak_desc": "Multiplikatoren (bis zu 3x!) bei Serien.",
      "rule_discovery_title": "Entdecker-Bonus",
      "rule_discovery_desc": "Erhalte einmalig <strong>1000 Punkte</strong> beim ersten Mal finden!",
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
      "wrong": "Wrong!",
      "time_expired": "Time expired!",
      "correct_is": "Correct is {{name}}",
      "streak_bonus": "STREAK: {{count}} 🔥",
      "discovery_bonus_label": "+1000 DISCOVERY BONUS! 🧭",
      "rank": "Rank",
      "name": "Name",
      "date": "Date",
      "back_to_learn": "Back to Learning",
      "loading": "Loading street data from OpenStreetMap...",
      "map_stumm": "Map (Mute)",
      "map_osm": "Map (OSM)",
      "map_sat": "Satellite (Swisstopo)",
      "legend_known": "Known",
      "legend_unknown": "Unknown",
      "rules_title": "Competition Rules",
      "rules_start": "START NOW",
      "rule_base_title": "Base Points",
      "rule_base_desc": "Get <strong>500 points</strong> per correct street.",
      "rule_time_title": "Time Limit",
      "rule_time_desc": "You have <strong>20 seconds</strong> per question.",
      "rule_speed_title": "Speed Bonus",
      "rule_speed_desc": "Up to <strong>1000 extra points</strong> for fast answers.",
      "rule_streak_title": "Combo Streaks",
      "rule_streak_desc": "Multipliers (up to 3x!) for streaks.",
      "rule_discovery_title": "Discovery Bonus",
      "rule_discovery_desc": "Get a one-time <strong>1000 points</strong> bonus for discovery!",
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
