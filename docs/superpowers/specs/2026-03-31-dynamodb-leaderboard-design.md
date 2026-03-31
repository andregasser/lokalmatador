# DynamoDB Leaderboard — Design Spec

## Goal

Replace localStorage-based leaderboard, achievements, and known-streets persistence with a shared, server-backed architecture. All firefighters see the same global leaderboard. User authentication via AWS Cognito. All infrastructure managed by SST.

## Decisions

| Topic | Decision |
|-------|----------|
| Scope | Leaderboard + achievements + known streets — all in DynamoDB |
| Auth | AWS Cognito (email + password, self sign-up) |
| API | API Gateway v2 + Lambda (SST-native) |
| Leaderboard display | Top 10 individual round scores (unchanged) |
| Data migration | None — fresh start for all users |
| Offline support | None (Overpass API already requires connectivity) |

## Infrastructure (`sst.config.ts`)

### DynamoDB Tables

**`Leaderboard`**
| Field | Type | Role |
|-------|------|------|
| `id` | String (UUID) | Partition key |
| `userId` | String | Cognito user ID |
| `username` | String | Display name |
| `score` | Number | Round score |
| `date` | String (ISO 8601) | Timestamp |
| `type` | String (`"SCORE"`) | GSI partition key |

- GSI `byScore`: PK = `type`, SK = `score` (descending) — enables "top 10" query across all users in a single partition.
- GSI `byUser`: PK = `userId`, SK = `date` — enables per-user score queries.

**`UserData`**
| Field | Type | Role |
|-------|------|------|
| `userId` | String | Partition key (Cognito user ID) |
| `achievements` | String Set | Unlocked achievement IDs |
| `knownStreets` | String Set | Learned street IDs |

### Cognito

- User Pool with email login, self sign-up enabled.
- Display name set during registration (used as `username` in leaderboard).
- JWT Authorizer on API Gateway for all endpoints.

### API Gateway v2 + Lambda

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/leaderboard` | Submit a new round score |
| `GET` | `/leaderboard/top` | Get top 10 scores |
| `GET` | `/leaderboard/me` | Get own scores + total |
| `GET` | `/userdata` | Load achievements + known streets |
| `PUT` | `/userdata` | Save achievements + known streets |

All endpoints require Cognito JWT. SST links DynamoDB tables to Lambda functions (environment variables + IAM permissions).

### Resource Linking

SST automatically provides table names and IAM permissions to Lambdas:
- `Leaderboard` table linked to leaderboard handlers
- `UserData` table linked to userdata handlers
- API URL passed to `StaticSite` as `VITE_API_URL` environment variable

## Backend (`backend/`)

### Project Structure

```
backend/
  src/
    leaderboard/
      post.ts          # POST /leaderboard
      getTop.ts        # GET /leaderboard/top
      getMe.ts         # GET /leaderboard/me
    userdata/
      get.ts           # GET /userdata
      put.ts           # PUT /userdata
    lib/
      dynamo.ts        # DynamoDB DocumentClient helper
      auth.ts          # Extract userId + username from JWT claims
  package.json
  tsconfig.json
```

### Handler Pattern

Each handler:
1. Extracts `userId` from `requestContext.authorizer.jwt.claims.sub`
2. Validates input (where applicable)
3. Reads/writes DynamoDB via DocumentClient
4. Returns JSON response

**`POST /leaderboard`**: Accepts `{ score }`, writes `{ id (uuid), userId, username, score, date (ISO 8601), type: "SCORE" }`.

**`GET /leaderboard/top`**: Queries GSI `byScore` with `type = "SCORE"`, `ScanIndexForward: false`, `Limit: 10`.

**`GET /leaderboard/me`**: Queries GSI `byUser` with `userId`, returns entries + computed total.

**`GET /userdata`**: Gets item by `userId`, returns `{ achievements, knownStreets }`.

**`PUT /userdata`**: Accepts `{ achievements, knownStreets }`, puts item with `userId` as key.

## Frontend Changes

### New Files

**`frontend/src/auth.ts`** — Cognito auth wrapper (using `amazon-cognito-identity-js` or Amplify Auth standalone):
- `signUp(email, password, displayName)` — registration
- `signIn(email, password)` — login, returns JWT
- `signOut()` — logout
- `getSession()` — current session / token refresh

**`frontend/src/api.ts`** — API client:
- Sets `Authorization: Bearer <token>` header on all requests
- `submitScore(score)` — POST /leaderboard
- `getTopScores()` — GET /leaderboard/top
- `getMyScores()` — GET /leaderboard/me
- `getUserData()` — GET /userdata
- `saveUserData(achievements, knownStreets)` — PUT /userdata
- Base URL from `import.meta.env.VITE_API_URL`

### Changes to `App.tsx`

| Current (localStorage) | New (API) |
|------------------------|-----------|
| `localStorage.getItem('leaderboard')` | `getTopScores()` on leaderboard open |
| `localStorage.setItem('leaderboard', ...)` | `submitScore(score)` after round |
| `localStorage.getItem('achievements_*')` | `getUserData()` on app start |
| `localStorage.setItem('achievements_*', ...)` | `saveUserData(...)` on change |
| `localStorage.getItem('known_streets_*')` | `getUserData()` on app start |
| `localStorage.setItem('known_streets_*', ...)` | `saveUserData(...)` on change |
| `localStorage.getItem('user')` | Cognito session |
| Username text input | Login/registration form (email + password + display name) |

Add loading states for async API calls.

### Auth UI

Replace the current username input with:
- **Login form**: email + password
- **Registration form**: email + password + display name
- **Session persistence**: refresh token in localStorage, JWT in memory
- Toggle between login/register

## Security

- All API endpoints protected by Cognito JWT Authorizer
- Lambda IAM roles: least-privilege (only required DynamoDB operations on own tables)
- CORS: restricted to CloudFront domain
- Score trust: client-submitted (server-side validation out of scope for v1)

## New Dependencies

### Backend (`backend/package.json`)
- `@aws-sdk/client-dynamodb`
- `@aws-sdk/lib-dynamodb`
- `uuid`

### Frontend (`frontend/package.json`)
- `amazon-cognito-identity-js` (or `@aws-amplify/auth`)
