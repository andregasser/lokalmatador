# Lokalmatador

Gamified street-knowledge training app for the Bassersdorf fire department (Feuerwehr Bassersdorf), Switzerland. Firefighters learn street names, hydrant locations, and POIs through an interactive map.

## Architecture

- **Fullstack SPA** — React frontend + serverless AWS backend
- Frontend: React 19 + TypeScript, Vite 8, Tailwind CSS v4
- Backend: SST v4 (Ion), AWS Lambda (Node.js), DynamoDB, Cognito, API Gateway v2
- Maps: Leaflet + react-leaflet, Overpass API (OpenStreetMap) for geodata
- i18next for translations (DE/EN, fallback: DE)
- Auth: AWS Cognito (email/password, SRP protocol)
- Data persistence: DynamoDB (leaderboard scores, user achievements, known streets)
- Hosting: S3 + CloudFront via SST StaticSite

### Project Structure

```
/
  CLAUDE.md              # This file — project overview
  sst.config.ts          # SST infrastructure (DynamoDB, Cognito, API GW, Lambda, CloudFront)
  package.json           # Root — SST CLI, deploy scripts
  frontend/
    CLAUDE.md            # Frontend architecture details
    package.json
    vite.config.ts
    src/
      main.tsx           # Entry point
      App.tsx            # Main app (auth, learn, compete, leaderboard, release notes)
      LandingPage.tsx    # Landing page
      auth.ts            # Cognito auth wrapper (signUp, signIn, confirm, signOut, getSession)
      api.ts             # API client (leaderboard, userdata)
      osmService.ts      # Overpass API service (streets, hydrants, POIs)
      i18n.ts            # Translations (DE/EN)
      index.css          # Global styles, Tailwind @theme, custom animations
  backend/
    CLAUDE.md            # Backend architecture details
    package.json
    src/
      lib/
        dynamo.ts        # DynamoDB DocumentClient singleton
        auth.ts          # Extract userId + username from JWT claims
        response.ts      # HTTP JSON response helpers
      leaderboard/
        post.ts          # POST /leaderboard — submit score
        getTop.ts        # GET /leaderboard/top — top 10
        getMe.ts         # GET /leaderboard/me — own scores + total
      userdata/
        get.ts           # GET /userdata — load achievements + streets
        put.ts           # PUT /userdata — save achievements + streets
```

## Development

```bash
# Frontend (Vite dev server)
cd frontend && npm install && npm run dev

# Backend (SST dev mode — deploys live to AWS, hot-reloads Lambdas)
npm run dev
```

## Build & Deploy

**CRITICAL: Deployments use separate AWS accounts via SSO profiles.** Dev deploys to `andregasser-lokalmatador-dev` (account 297088704837), prod to `andregasser-lokalmatador-prod` (account 517506432410). This is enforced in both npm scripts and `sst.config.ts`.

```bash
# SSO login (required once per session, opens browser)
aws sso login --profile andregasser-lokalmatador-dev

# Install dependencies
npm install                      # Root (SST CLI)
cd frontend && npm install       # Frontend
cd backend && npm install        # Backend

# Deploy
npm run deploy:dev               # Dev stage → andregasser-lokalmatador-dev account
npm run deploy:prod              # Production → andregasser-lokalmatador-prod account

# Remove
npm run remove:dev               # Remove dev stage
npm run remove:prod              # Remove production stage
```

SST version is pinned to `4.6.9` in both root and backend `package.json`. Keep these in sync — mismatches cause deploy failures.

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

## Code Conventions

- Code, comments, variable names: **English**
- User-facing text: **German** (primary) and **English** via i18n — never hardcode strings
- Commit messages: **English**

## Don'ts

- Don't introduce additional state management libraries (React hooks only)
- Don't break mobile responsiveness
- Don't add npm dependencies without discussing first
- Don't hardcode DE/EN strings — always use i18n keys
- Don't deploy with any AWS profile other than `private`
