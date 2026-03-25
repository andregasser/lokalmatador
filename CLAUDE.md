# Lokalmatador

Gamified street-knowledge training app for the Bassersdorf fire department (Feuerwehr Bassersdorf), Switzerland. Firefighters learn street names, hydrant locations, and POIs through an interactive map.

## Architecture

- **Frontend-only SPA** — no backend, all logic is client-side
- React 19 + TypeScript, Vite 8, Tailwind CSS v4
- Leaflet + react-leaflet for maps, Overpass API (OpenStreetMap) for data
- i18next for translations (DE/EN, fallback: DE)
- localStorage for persistence (user, leaderboard, achievements, known streets)
- SST on AWS (S3 + CloudFront) for hosting

### Project Structure

```
/
  CLAUDE.md              # This file
  sst.config.ts          # SST infrastructure config (AWS S3 + CloudFront)
  frontend/
    package.json
    vite.config.ts
    src/
      main.tsx           # Entry point
      App.tsx            # Main app (learn, compete, leaderboard, release notes)
      LandingPage.tsx    # Landing page
      osmService.ts      # Overpass API service (streets, hydrants, POIs)
      i18n.ts            # Translations (DE/EN)
      index.css          # Global styles, Tailwind @theme, custom animations
```

## Design Principles

### Mobile-First (CRITICAL)
- The app MUST look and work great on mobile devices. This is a primary requirement.
- Always start with mobile styles, add `md:` breakpoints for desktop.
- Touch targets: min 44x44px. Use `h-[100dvh]` for full-height layouts.
- Test all UI changes for both mobile (320px-428px) and desktop viewports.
- Avoid hover-only interactions — everything must work with touch.

### Visual Style
- Dark theme: bg `#0f172a`, surfaces `#1e293b`
- Colors: primary `#ff5252` (red), accent `#38bdf8` (blue), success `#4ade80` (green)
- Glass-morphism: `backdrop-blur`, semi-transparent backgrounds, borders `rgba(255,255,255,0.1)`
- Typography: Inter, font-black headings, uppercase + tracking-widest labels
- Animations: subtle CSS animations (pulse, float, fade-in), not JS-driven

## Development

```bash
cd frontend
npm install
npm run dev          # Vite dev server
npm run build        # tsc -b && vite build
npm run preview      # Preview production build
npm run lint         # ESLint
```

## Deployment (AWS via SST)

```bash
npx sst deploy --stage dev           # Dev stage (auto-removed on deletion)
npx sst deploy --stage production    # Production (retained on deletion)
```

- Build output: `frontend/dist`
- No secrets or API keys needed (Overpass API is public)

## Code Conventions

- Code, comments, variable names: **English**
- User-facing text: **German** (primary) and **English** via i18n — never hardcode strings
- Commit messages: **English**

## Don'ts

- Don't add a backend unless explicitly requested
- Don't introduce additional state management libraries (hooks only)
- Don't break mobile responsiveness
- Don't add npm dependencies without discussing first
- Don't hardcode DE/EN strings — always use i18n keys
