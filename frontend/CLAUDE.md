# Frontend Architecture

React 19 SPA with Vite 8, Tailwind CSS v4, and Leaflet maps.

## Core Modules

### `App.tsx` — Main Application
Single-file component containing all app modes and state. Modes:
- **Learn**: Interactive map with all streets, hydrants, POIs. Streets are color-coded (green = known, blue = unknown). Click to select and see name.
- **Compete**: 10-question quiz. A street/POI is highlighted on the map, user picks from 4 options. Scoring: base points (500) + time bonus + streak multiplier + discovery bonus.
- **Leaderboard**: Global top-10 from DynamoDB API, podium display for top 3, achievements grid.
- **Release Notes**: Versioned changelog.

### `auth.ts` — Cognito Authentication
Wraps `amazon-cognito-identity-js`. Provides:
- `signUp(email, password, displayName)` — register new user
- `confirmSignUp(email, code)` — verify email with code
- `signIn(email, password)` — authenticate, returns `AuthSession`
- `signOut()` — clear local session
- `getSession()` — restore session from Cognito's internal localStorage tokens

`AuthSession` contains: `token` (JWT), `userId` (Cognito sub), `displayName`, `email`.

### `api.ts` — API Client
Thin wrapper around `fetch` with automatic JWT injection from `auth.ts`. Endpoints:
- `submitScore(score)` → `POST /leaderboard`
- `getTopScores()` → `GET /leaderboard/top`
- `getMyScores()` → `GET /leaderboard/me`
- `getUserData()` → `GET /userdata` (achievements + known streets)
- `saveUserData(achievements, knownStreets)` → `PUT /userdata`

### `osmService.ts` — Map Data
Fetches geodata from OpenStreetMap Overpass API (public, no auth needed):
- `fetchBassersdorfStreets()` — all streets with coordinates
- `fetchBassersdorfHydrants()` — fire hydrant locations
- `fetchBassersdorfPOIs()` — restaurants, shops, public buildings

### `i18n.ts` — Translations
German (primary) and English via i18next. All user-facing strings must use `t('key')`.

### `LandingPage.tsx` — Landing Page
Static marketing page shown before login.

## Key Patterns

- **State**: React hooks only (`useState`, `useEffect`, `useMemo`, `useRef`). No Redux/Zustand.
- **Auth flow**: `AuthSession | null` as user state. Three auth views: login, register, confirm. Session auto-restores on mount via `getSession()`.
- **Data persistence**: All user data (scores, achievements, known streets) goes through `api.ts` → DynamoDB. No localStorage for app data (Cognito manages its own tokens internally).
- **Map rendering**: `react-leaflet` with custom `AnimatedPolyline` component that patches SVG styles after Leaflet renders (workaround for Leaflet overriding CSS animations).
- **Gamification**: Ranks (Rekrut → Legende based on total score), 10 achievements, streak multipliers, discovery bonuses.

## Build

```bash
npm run dev          # Vite dev server (port 5173)
npm run build        # tsc -b && vite build → dist/
npm run preview      # Preview production build
npm run lint         # ESLint
```
