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

### AWS Account Structure

Each stage deploys to its own isolated AWS account via AWS Organizations + IAM Identity Center (SSO):

| Stage | AWS Account | SSO Profile | Domain |
|-------|-------------|-------------|--------|
| dev | `297088704837` | `andregasser-lokalmatador-dev` | `lokalmatador-dev.andregasser.dev` |
| production | `517506432410` | `andregasser-lokalmatador-prod` | `lokalmatador.andregasser.dev` |

Management account (`728419557070`, profile `andregasser-management`) hosts Route 53 DNS zones only.

### Deploy to Dev

```bash
# 1. SSO login (required once per session, opens browser)
aws sso login --profile andregasser-lokalmatador-dev

# 2. Deploy (always run from project root!)
npm run deploy:dev
```

### Deploy to Production

```bash
# 1. SSO login
aws sso login --profile andregasser-lokalmatador-prod

# 2. Deploy
npm run deploy:prod
```

### Install Dependencies (first time or after changes)

```bash
npm install                      # Root (SST CLI)
cd frontend && npm install       # Frontend
cd backend && npm install        # Backend
```

### Remove Stages

```bash
npm run remove:dev               # Remove dev stage
npm run remove:prod              # Remove production stage
```

### Important Notes

- **Always run deploy commands from the project root**, not from `frontend/` or `backend/`.
- SST version is pinned to `4.6.9` in both root and backend `package.json`. Keep these in sync — mismatches cause deploy failures.
- The `AWS_PROFILE` is set automatically by each npm script. Never override it manually.
- DNS (Route 53) and ACM certificates are managed outside of SST. Domain records point to CloudFront distributions in the respective accounts.
- SSO sessions expire after 8 hours. If a deploy fails with an auth error, re-run `aws sso login`.

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
