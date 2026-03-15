# Lokalmatador - Firefighter Local Knowledge App

Lokalmatador ist eine Webapplikation, die speziell für die Feuerwehr Bassersdorf entwickelt wurde, um die Ortskenntnis der Strassennamen und Hydranten spielerisch zu trainieren.

## Features
- 🗺️ **Lernmodus**: Interaktive Karte von Bassersdorf mit Strassennamen und Hydranten-Layer.
- 🏆 **Wettkampfmodus**: Teste dein Wissen unter Zeitdruck mit Speed-Bonus und Streak-Multiplikatoren.
- 🥇 **Leaderboard**: Hall of Fame mit den Top-Listen und Dienstgraden (vom Rekrut bis zur Legende).
- 🏅 **Achievements**: Sammle Abzeichen für besondere Leistungen wie "Blitz-Reaktion" oder "Nachtschicht".
- 🏠 **Hausnummern**: Präzise Orientierung durch integrierte Hausnummern ab Zoom-Level 18.
- 🌍 **Mehrsprachig**: Unterstützt Deutsch und Englisch.

---

## 🛠 Voraussetzungen
- **Node.js** (v18 oder höher)
- **AWS CLI** installiert und konfiguriert
- Ein AWS-Profil namens `private` für das Deployment

---

## 🚀 Lokale Entwicklung (Dev Mode)

Um die App lokal zu entwickeln und gleichzeitig mit der AWS-Infrastruktur verbunden zu sein:

1. **Repository klonen** (falls zutreffend) und in den Ordner navigieren.
2. **Abhängigkeiten installieren**:
   ```bash
   npm install
   cd frontend && npm install && cd ..
   ```
3. **SST Dev Modus starten**:
   ```bash
   npm run dev
   ```
   - Dies startet den Vite-Server für das Frontend (standardmäßig auf `http://localhost:5173`).
   - Gleichzeitig wird die Verbindung zur AWS-Cloud hergestellt (SST Tunnel).

---

## 📦 Deployment auf AWS

Die App wird als hochperformante statische Website über **Amazon S3** und **Amazon CloudFront** (CDN) bereitgestellt.

### Produktion-Deployment
Um die App für alle Nutzer unter einer HTTPS-URL bereitzustellen:

```bash
npm run deploy
```

Nach Abschluss des Prozesses wird SST dir eine URL ausgeben (z.B. `https://d123abc.cloudfront.net`). Unter dieser Adresse ist die App live erreichbar.

### Ressourcen entfernen
Um alle erstellten Ressourcen wieder aus deinem AWS-Account zu löschen:

```bash
npm run remove
```

---

## 📁 Projektstruktur
- `frontend/`: Das React (TypeScript) Frontend mit Vite und Leaflet.
- `sst.config.ts`: Definition der AWS-Infrastruktur (Infrastructure as Code).
- `SPEC.md`: Die detaillierte technische Spezifikation des Projekts.

---

## 📡 Datenquelle
Die Strassen- und Hydrantendaten werden live über die **OpenStreetMap Overpass API** bezogen. Aktualisierungen in OpenStreetMap fliessen nach einer kurzen Cache-Dauer automatisch in die App ein.
