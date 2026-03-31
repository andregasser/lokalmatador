# DynamoDB Leaderboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace localStorage persistence with a global DynamoDB-backed leaderboard, achievements, and known-streets system, authenticated via Cognito.

**Architecture:** SST-native fullstack — Cognito User Pool for auth, API Gateway v2 with JWT authorizer for routing, Lambda handlers for business logic, two DynamoDB tables for data. Frontend uses `amazon-cognito-identity-js` for auth and a thin `api.ts` client for API calls.

**Tech Stack:** SST v3, AWS DynamoDB, Cognito, API Gateway v2, Lambda (Node.js), TypeScript, React 19, amazon-cognito-identity-js

---

## File Structure

### New files

```
backend/
  package.json                      # AWS SDK, uuid, sst (types)
  tsconfig.json                     # TypeScript config for backend handlers
  src/
    lib/
      dynamo.ts                     # DynamoDB DocumentClient singleton
      auth.ts                       # Extract userId + username from JWT claims
      response.ts                   # HTTP JSON response helpers
    leaderboard/
      post.ts                       # POST /leaderboard — submit score
      getTop.ts                     # GET /leaderboard/top — top 10
      getMe.ts                      # GET /leaderboard/me — own scores + total
    userdata/
      get.ts                        # GET /userdata — load achievements + streets
      put.ts                        # PUT /userdata — save achievements + streets

frontend/src/
  auth.ts                           # Cognito auth wrapper (signUp, signIn, confirm, signOut, getSession)
  api.ts                            # API client (submitScore, getTopScores, getMyScores, getUserData, saveUserData)
```

### Modified files

```
sst.config.ts                       # Add DynamoDB tables, Cognito, API Gateway, Lambda functions
frontend/package.json               # Add amazon-cognito-identity-js
frontend/src/App.tsx                # Replace localStorage with API calls, new auth UI
frontend/src/i18n.ts                # Add auth-related translation keys
```

---

### Task 1: Backend project scaffold

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`

- [ ] **Step 1: Create backend/package.json**

```json
{
  "name": "lokalmatador-backend",
  "private": true,
  "type": "module",
  "dependencies": {
    "@aws-sdk/client-dynamodb": "^3.700.0",
    "@aws-sdk/lib-dynamodb": "^3.700.0",
    "uuid": "^11.1.0"
  },
  "devDependencies": {
    "@types/aws-lambda": "^8.10.147",
    "@types/uuid": "^10.0.0",
    "sst": "latest",
    "typescript": "^5.0.0"
  }
}
```

- [ ] **Step 2: Create backend/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Install backend dependencies**

Run: `cd backend && npm install`

Expected: `node_modules/` created, `package-lock.json` generated.

- [ ] **Step 4: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/tsconfig.json
git commit -m "chore: scaffold backend project with AWS SDK dependencies"
```

---

### Task 2: SST infrastructure

**Files:**
- Modify: `sst.config.ts`

- [ ] **Step 1: Update sst.config.ts with all resources**

Replace the entire file with:

```typescript
/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "lokalmatador",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    // ── DynamoDB Tables ──────────────────────────────────────────
    const leaderboardTable = new sst.aws.Dynamo("Leaderboard", {
      fields: {
        id: "string",
        type: "string",
        score: "number",
        userId: "string",
        date: "string",
      },
      primaryIndex: { hashKey: "id" },
      globalIndexes: {
        byScore: { hashKey: "type", rangeKey: "score" },
        byUser: { hashKey: "userId", rangeKey: "date" },
      },
    });

    const userDataTable = new sst.aws.Dynamo("UserData", {
      fields: {
        userId: "string",
      },
      primaryIndex: { hashKey: "userId" },
    });

    // ── Cognito ──────────────────────────────────────────────────
    const userPool = new sst.aws.CognitoUserPool("UserPool", {
      usernames: ["email"],
    });
    const userPoolClient = userPool.addClient("WebClient");

    // ── API Gateway ──────────────────────────────────────────────
    const api = new sst.aws.ApiGatewayV2("Api", {
      cors: {
        allowOrigins: ["*"],
        allowMethods: ["GET", "POST", "PUT", "OPTIONS"],
        allowHeaders: ["Content-Type", "Authorization"],
      },
    });

    const authorizer = api.addAuthorizer({
      name: "cognitoAuthorizer",
      jwt: {
        issuer: $interpolate`https://cognito-idp.${aws.getRegionOutput().name}.amazonaws.com/${userPool.id}`,
        audiences: [userPoolClient.id],
      },
    });

    const authConfig = {
      auth: { jwt: { authorizer: authorizer.id } },
    };

    // ── Leaderboard Routes ───────────────────────────────────────
    api.route("POST /leaderboard", {
      handler: "backend/src/leaderboard/post.handler",
      link: [leaderboardTable],
    }, authConfig);

    api.route("GET /leaderboard/top", {
      handler: "backend/src/leaderboard/getTop.handler",
      link: [leaderboardTable],
    }, authConfig);

    api.route("GET /leaderboard/me", {
      handler: "backend/src/leaderboard/getMe.handler",
      link: [leaderboardTable],
    }, authConfig);

    // ── UserData Routes ──────────────────────────────────────────
    api.route("GET /userdata", {
      handler: "backend/src/userdata/get.handler",
      link: [userDataTable],
    }, authConfig);

    api.route("PUT /userdata", {
      handler: "backend/src/userdata/put.handler",
      link: [userDataTable],
    }, authConfig);

    // ── Frontend ─────────────────────────────────────────────────
    const site = new sst.aws.StaticSite("Frontend", {
      path: "frontend",
      build: {
        command: "npm run build",
        output: "dist",
      },
      environment: {
        VITE_APP_STAGE: $app.stage,
        VITE_API_URL: api.url,
        VITE_USER_POOL_ID: userPool.id,
        VITE_USER_POOL_CLIENT_ID: userPoolClient.id,
      },
    });

    return {
      url: site.url,
      api: api.url,
    };
  },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit -p sst.config.ts` or simply check that `npx sst dev` starts without config errors (cancel immediately after it validates). Alternatively, just verify there are no red squiggles in the editor.

- [ ] **Step 3: Commit**

```bash
git add sst.config.ts
git commit -m "feat: add DynamoDB, Cognito, and API Gateway infrastructure"
```

---

### Task 3: Backend shared libraries

**Files:**
- Create: `backend/src/lib/dynamo.ts`
- Create: `backend/src/lib/auth.ts`
- Create: `backend/src/lib/response.ts`

- [ ] **Step 1: Create DynamoDB client helper**

Create `backend/src/lib/dynamo.ts`:

```typescript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
export const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});
```

- [ ] **Step 2: Create auth helper**

Create `backend/src/lib/auth.ts`:

```typescript
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

export function getUserFromEvent(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const claims = event.requestContext.authorizer.jwt.claims;
  return {
    userId: claims.sub as string,
    username: (claims.name ?? claims.email ?? "Unknown") as string,
  };
}
```

- [ ] **Step 3: Create response helper**

Create `backend/src/lib/response.ts`:

```typescript
export function json(body: unknown, statusCode = 200) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export function error(message: string, statusCode = 400) {
  return json({ error: message }, statusCode);
}
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/lib/
git commit -m "feat: add backend shared libraries (dynamo, auth, response)"
```

---

### Task 4: Leaderboard Lambda handlers

**Files:**
- Create: `backend/src/leaderboard/post.ts`
- Create: `backend/src/leaderboard/getTop.ts`
- Create: `backend/src/leaderboard/getMe.ts`

- [ ] **Step 1: Create POST /leaderboard handler**

Create `backend/src/leaderboard/post.ts`:

```typescript
import { Resource } from "sst";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuid } from "uuid";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { docClient } from "../lib/dynamo.js";
import { getUserFromEvent } from "../lib/auth.js";
import { json, error } from "../lib/response.js";

export async function handler(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const { userId, username } = getUserFromEvent(event);

  if (!event.body) return error("Missing request body");

  const body = JSON.parse(event.body);
  const score = Number(body.score);

  if (!Number.isFinite(score) || score < 0) {
    return error("Invalid score");
  }

  const item = {
    id: uuid(),
    userId,
    username,
    score,
    date: new Date().toISOString(),
    type: "SCORE",
  };

  await docClient.send(new PutCommand({
    TableName: Resource.Leaderboard.name,
    Item: item,
  }));

  return json(item, 201);
}
```

- [ ] **Step 2: Create GET /leaderboard/top handler**

Create `backend/src/leaderboard/getTop.ts`:

```typescript
import { Resource } from "sst";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { docClient } from "../lib/dynamo.js";
import { json } from "../lib/response.js";

export async function handler(_event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const result = await docClient.send(new QueryCommand({
    TableName: Resource.Leaderboard.name,
    IndexName: "byScore",
    KeyConditionExpression: "#type = :type",
    ExpressionAttributeNames: { "#type": "type" },
    ExpressionAttributeValues: { ":type": "SCORE" },
    ScanIndexForward: false,
    Limit: 10,
  }));

  return json(result.Items ?? []);
}
```

- [ ] **Step 3: Create GET /leaderboard/me handler**

Create `backend/src/leaderboard/getMe.ts`:

```typescript
import { Resource } from "sst";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { docClient } from "../lib/dynamo.js";
import { getUserFromEvent } from "../lib/auth.js";
import { json } from "../lib/response.js";

export async function handler(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const { userId } = getUserFromEvent(event);

  const result = await docClient.send(new QueryCommand({
    TableName: Resource.Leaderboard.name,
    IndexName: "byUser",
    KeyConditionExpression: "userId = :uid",
    ExpressionAttributeValues: { ":uid": userId },
    ScanIndexForward: false,
  }));

  const entries = result.Items ?? [];
  const totalScore = entries.reduce((sum, e) => sum + (e.score as number), 0);

  return json({ entries, totalScore });
}
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/leaderboard/
git commit -m "feat: add leaderboard Lambda handlers (post, getTop, getMe)"
```

---

### Task 5: UserData Lambda handlers

**Files:**
- Create: `backend/src/userdata/get.ts`
- Create: `backend/src/userdata/put.ts`

- [ ] **Step 1: Create GET /userdata handler**

Create `backend/src/userdata/get.ts`:

```typescript
import { Resource } from "sst";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { docClient } from "../lib/dynamo.js";
import { getUserFromEvent } from "../lib/auth.js";
import { json } from "../lib/response.js";

export async function handler(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const { userId } = getUserFromEvent(event);

  const result = await docClient.send(new GetCommand({
    TableName: Resource.UserData.name,
    Key: { userId },
  }));

  const item = result.Item ?? { userId, achievements: [], knownStreets: [] };

  return json({
    achievements: item.achievements ?? [],
    knownStreets: item.knownStreets ?? [],
  });
}
```

- [ ] **Step 2: Create PUT /userdata handler**

Create `backend/src/userdata/put.ts`:

```typescript
import { Resource } from "sst";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { docClient } from "../lib/dynamo.js";
import { getUserFromEvent } from "../lib/auth.js";
import { json, error } from "../lib/response.js";

export async function handler(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const { userId } = getUserFromEvent(event);

  if (!event.body) return error("Missing request body");

  const body = JSON.parse(event.body);

  if (!Array.isArray(body.achievements) || !Array.isArray(body.knownStreets)) {
    return error("achievements and knownStreets must be arrays");
  }

  await docClient.send(new PutCommand({
    TableName: Resource.UserData.name,
    Item: {
      userId,
      achievements: body.achievements,
      knownStreets: body.knownStreets,
    },
  }));

  return json({ success: true });
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/userdata/
git commit -m "feat: add userdata Lambda handlers (get, put)"
```

---

### Task 6: Deploy backend and smoke test

- [ ] **Step 1: Deploy to dev**

Run: `npx sst deploy --stage dev`

Expected: All resources created — 2 DynamoDB tables, Cognito User Pool + Client, API Gateway with 5 routes, 5 Lambda functions, StaticSite. Output includes `api` and `url` values.

- [ ] **Step 2: Verify API Gateway routes exist**

Run: `aws apigatewayv2 get-apis --profile private --query "Items[?Name=='dev-lokalmatador-Api'].ApiId" --output text`

Then: `aws apigatewayv2 get-routes --api-id <API_ID> --profile private --query "Items[].RouteKey"`

Expected: All 5 routes listed (POST /leaderboard, GET /leaderboard/top, GET /leaderboard/me, GET /userdata, PUT /userdata).

- [ ] **Step 3: Verify unauthenticated request is rejected**

Run: `curl -s <API_URL>/leaderboard/top`

Expected: 401 Unauthorized response (JWT authorizer blocks unauthenticated requests).

- [ ] **Step 4: Commit (if any fixes were needed)**

```bash
git add -A
git commit -m "fix: backend deployment fixes"
```

---

### Task 7: Frontend auth module and API client

**Files:**
- Modify: `frontend/package.json` (add dependency)
- Create: `frontend/src/auth.ts`
- Create: `frontend/src/api.ts`

- [ ] **Step 1: Install amazon-cognito-identity-js**

Run: `cd frontend && npm install amazon-cognito-identity-js`

- [ ] **Step 2: Create frontend/src/auth.ts**

```typescript
import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
  CognitoUserSession,
} from "amazon-cognito-identity-js";

const userPool = new CognitoUserPool({
  UserPoolId: import.meta.env.VITE_USER_POOL_ID,
  ClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID,
});

export interface AuthSession {
  token: string;
  userId: string;
  displayName: string;
  email: string;
}

function sessionToAuth(session: CognitoUserSession): AuthSession {
  const idToken = session.getIdToken();
  const payload = idToken.decodePayload();
  return {
    token: idToken.getJwtToken(),
    userId: payload.sub as string,
    displayName: (payload.name ?? payload.email ?? "") as string,
    email: payload.email as string,
  };
}

export function signUp(
  email: string,
  password: string,
  displayName: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const attributes = [
      new CognitoUserAttribute({ Name: "name", Value: displayName }),
    ];
    userPool.signUp(email, password, attributes, [], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export function confirmSignUp(email: string, code: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const cognitoUser = new CognitoUser({ Username: email, Pool: userPool });
    cognitoUser.confirmRegistration(code, true, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export function signIn(
  email: string,
  password: string,
): Promise<AuthSession> {
  return new Promise((resolve, reject) => {
    const cognitoUser = new CognitoUser({ Username: email, Pool: userPool });
    const authDetails = new AuthenticationDetails({
      Username: email,
      Password: password,
    });
    cognitoUser.authenticateUser(authDetails, {
      onSuccess: (session) => resolve(sessionToAuth(session)),
      onFailure: (err) => reject(err),
    });
  });
}

export function signOut(): void {
  const user = userPool.getCurrentUser();
  if (user) user.signOut();
}

export function getSession(): Promise<AuthSession | null> {
  return new Promise((resolve) => {
    const user = userPool.getCurrentUser();
    if (!user) {
      resolve(null);
      return;
    }
    user.getSession(
      (err: Error | null, session: CognitoUserSession | null) => {
        if (err || !session || !session.isValid()) {
          resolve(null);
          return;
        }
        resolve(sessionToAuth(session));
      },
    );
  });
}
```

- [ ] **Step 3: Create frontend/src/api.ts**

```typescript
import { getSession } from "./auth";

const API_URL = import.meta.env.VITE_API_URL;

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const session = await getSession();
  if (!session) throw new Error("Not authenticated");

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }

  return res.json();
}

export interface LeaderboardEntry {
  id: string;
  userId: string;
  username: string;
  score: number;
  date: string;
}

export interface MyScoresResponse {
  entries: LeaderboardEntry[];
  totalScore: number;
}

export interface UserDataResponse {
  achievements: string[];
  knownStreets: string[];
}

export function submitScore(score: number): Promise<LeaderboardEntry> {
  return request("POST", "/leaderboard", { score });
}

export function getTopScores(): Promise<LeaderboardEntry[]> {
  return request("GET", "/leaderboard/top");
}

export function getMyScores(): Promise<MyScoresResponse> {
  return request("GET", "/leaderboard/me");
}

export function getUserData(): Promise<UserDataResponse> {
  return request("GET", "/userdata");
}

export function saveUserData(
  achievements: string[],
  knownStreets: string[],
): Promise<{ success: boolean }> {
  return request("PUT", "/userdata", { achievements, knownStreets });
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/auth.ts frontend/src/api.ts
git commit -m "feat: add Cognito auth module and API client"
```

---

### Task 8: Auth UI and i18n keys

**Files:**
- Modify: `frontend/src/i18n.ts`
- Modify: `frontend/src/App.tsx` (auth UI only — login/register/confirm forms)

- [ ] **Step 1: Add i18n keys for auth**

Add the following keys to the `de.translation` object in `frontend/src/i18n.ts`:

```typescript
"email": "E-Mail",
"password": "Passwort",
"display_name": "Anzeigename",
"register": "Registrieren",
"confirm_email": "E-Mail bestätigen",
"confirmation_code": "Bestätigungscode",
"confirm": "Bestätigen",
"no_account": "Noch kein Konto?",
"has_account": "Bereits registriert?",
"register_success": "Registrierung erfolgreich! Bitte bestätige deine E-Mail.",
"auth_error": "Authentifizierungsfehler",
```

And to the `en.translation` object:

```typescript
"email": "Email",
"password": "Password",
"display_name": "Display Name",
"register": "Register",
"confirm_email": "Confirm Email",
"confirmation_code": "Confirmation Code",
"confirm": "Confirm",
"no_account": "No account yet?",
"has_account": "Already registered?",
"register_success": "Registration successful! Please confirm your email.",
"auth_error": "Authentication error",
```

- [ ] **Step 2: Replace auth UI in App.tsx**

Replace the login form section (the block that renders when `!user && mode !== 'release_notes'` and `!showLanding`) with a new auth form. This is the section around lines 414-450 in the current file.

The new auth state management at the top of the `App` component (add alongside existing state):

```typescript
const [authView, setAuthView] = useState<'login' | 'register' | 'confirm'>('login');
const [authEmail, setAuthEmail] = useState('');
const [authError, setAuthError] = useState<string | null>(null);
const [authLoading, setAuthLoading] = useState(false);
```

Add imports at the top of the file:

```typescript
import { signUp, confirmSignUp, signIn, signOut, getSession, type AuthSession } from './auth';
```

Change the `user` state from `string | null` to `AuthSession | null`:

```typescript
const [user, setUser] = useState<AuthSession | null>(null);
```

Add a `useEffect` to restore session on mount (add right after the SVG_KEYFRAMES useEffect):

```typescript
useEffect(() => {
  getSession().then((session) => {
    if (session) {
      setUser(session);
      setShowLanding(false);
    }
  });
}, []);
```

Replace the `handleLogin` function with three new handlers:

```typescript
const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  setAuthError(null);
  setAuthLoading(true);
  try {
    const form = e.currentTarget;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;
    const session = await signIn(email, password);
    setUser(session);
  } catch (err: any) {
    setAuthError(err.message || t('auth_error'));
  } finally {
    setAuthLoading(false);
  }
};

const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  setAuthError(null);
  setAuthLoading(true);
  try {
    const form = e.currentTarget;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;
    const displayName = (form.elements.namedItem('displayName') as HTMLInputElement).value;
    await signUp(email, password, displayName);
    setAuthEmail(email);
    setAuthView('confirm');
  } catch (err: any) {
    setAuthError(err.message || t('auth_error'));
  } finally {
    setAuthLoading(false);
  }
};

const handleConfirm = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  setAuthError(null);
  setAuthLoading(true);
  try {
    const code = (e.currentTarget.elements.namedItem('code') as HTMLInputElement).value;
    await confirmSignUp(authEmail, code);
    setAuthView('login');
  } catch (err: any) {
    setAuthError(err.message || t('auth_error'));
  } finally {
    setAuthLoading(false);
  }
};
```

Replace `handleLogout`:

```typescript
const handleLogout = () => {
  signOut();
  setUser(null);
  setMode('learn');
  setShowLanding(true);
};
```

Replace the login form JSX (the `<form>` block inside the `!user && !showLanding` section) with:

```tsx
{authView === 'login' && (
  <form className="flex flex-col gap-4 md:gap-5 w-full max-w-[380px] mx-auto bg-[#1e293b]/50 backdrop-blur-2xl p-6 md:p-10 rounded-2xl md:rounded-[32px] border border-glass-border shadow-2xl" onSubmit={handleSignIn}>
    {authError && <div className="text-primary text-[0.8rem] font-bold text-center bg-primary/10 p-3 rounded-xl">{authError}</div>}
    <div className="relative flex items-center">
      <input name="email" type="email" placeholder={t('email')} required autoComplete="email" className="w-full py-3.5 md:py-4.5 px-4.5 rounded-xl md:rounded-2xl bg-[#0f172a]/60 border border-glass-border text-white text-base md:text-[1rem] font-semibold outline-none focus:border-primary/50 transition-all" />
    </div>
    <div className="relative flex items-center">
      <input name="password" type="password" placeholder={t('password')} required autoComplete="current-password" className="w-full py-3.5 md:py-4.5 px-4.5 rounded-xl md:rounded-2xl bg-[#0f172a]/60 border border-glass-border text-white text-base md:text-[1rem] font-semibold outline-none focus:border-primary/50 transition-all" />
    </div>
    <button type="submit" disabled={authLoading} className="py-3.5 md:py-4.5 bg-primary text-white border-none rounded-xl md:rounded-2xl cursor-pointer font-extrabold text-base md:text-[1.1rem] flex items-center justify-center gap-2 md:gap-3 transition-all duration-300 shadow-[0_10px_20px_-5px_var(--primary-glow)] hover:-translate-y-[3px] hover:brightness-110 active:scale-95 disabled:opacity-50">
      <span>{authLoading ? '...' : t('login')}</span><ChevronRight size={20} />
    </button>
    <button type="button" onClick={() => { setAuthView('register'); setAuthError(null); }} className="text-text-muted text-[0.85rem] font-bold hover:text-white transition-colors cursor-pointer bg-transparent border-none">
      {t('no_account')}
    </button>
  </form>
)}

{authView === 'register' && (
  <form className="flex flex-col gap-4 md:gap-5 w-full max-w-[380px] mx-auto bg-[#1e293b]/50 backdrop-blur-2xl p-6 md:p-10 rounded-2xl md:rounded-[32px] border border-glass-border shadow-2xl" onSubmit={handleSignUp}>
    {authError && <div className="text-primary text-[0.8rem] font-bold text-center bg-primary/10 p-3 rounded-xl">{authError}</div>}
    <div className="relative flex items-center">
      <input name="displayName" type="text" placeholder={t('display_name')} required autoComplete="name" className="w-full py-3.5 md:py-4.5 px-4.5 rounded-xl md:rounded-2xl bg-[#0f172a]/60 border border-glass-border text-white text-base md:text-[1rem] font-semibold outline-none focus:border-primary/50 transition-all" />
    </div>
    <div className="relative flex items-center">
      <input name="email" type="email" placeholder={t('email')} required autoComplete="email" className="w-full py-3.5 md:py-4.5 px-4.5 rounded-xl md:rounded-2xl bg-[#0f172a]/60 border border-glass-border text-white text-base md:text-[1rem] font-semibold outline-none focus:border-primary/50 transition-all" />
    </div>
    <div className="relative flex items-center">
      <input name="password" type="password" placeholder={t('password')} required autoComplete="new-password" minLength={8} className="w-full py-3.5 md:py-4.5 px-4.5 rounded-xl md:rounded-2xl bg-[#0f172a]/60 border border-glass-border text-white text-base md:text-[1rem] font-semibold outline-none focus:border-primary/50 transition-all" />
    </div>
    <button type="submit" disabled={authLoading} className="py-3.5 md:py-4.5 bg-primary text-white border-none rounded-xl md:rounded-2xl cursor-pointer font-extrabold text-base md:text-[1.1rem] flex items-center justify-center gap-2 md:gap-3 transition-all duration-300 shadow-[0_10px_20px_-5px_var(--primary-glow)] hover:-translate-y-[3px] hover:brightness-110 active:scale-95 disabled:opacity-50">
      <span>{authLoading ? '...' : t('register')}</span><ChevronRight size={20} />
    </button>
    <button type="button" onClick={() => { setAuthView('login'); setAuthError(null); }} className="text-text-muted text-[0.85rem] font-bold hover:text-white transition-colors cursor-pointer bg-transparent border-none">
      {t('has_account')}
    </button>
  </form>
)}

{authView === 'confirm' && (
  <form className="flex flex-col gap-4 md:gap-5 w-full max-w-[380px] mx-auto bg-[#1e293b]/50 backdrop-blur-2xl p-6 md:p-10 rounded-2xl md:rounded-[32px] border border-glass-border shadow-2xl" onSubmit={handleConfirm}>
    <p className="text-text-muted text-[0.85rem] font-medium text-center">{t('register_success')}</p>
    {authError && <div className="text-primary text-[0.8rem] font-bold text-center bg-primary/10 p-3 rounded-xl">{authError}</div>}
    <div className="relative flex items-center">
      <input name="code" type="text" placeholder={t('confirmation_code')} required autoComplete="one-time-code" className="w-full py-3.5 md:py-4.5 px-4.5 rounded-xl md:rounded-2xl bg-[#0f172a]/60 border border-glass-border text-white text-base md:text-[1rem] font-semibold outline-none focus:border-primary/50 transition-all text-center tracking-[0.3em]" />
    </div>
    <button type="submit" disabled={authLoading} className="py-3.5 md:py-4.5 bg-primary text-white border-none rounded-xl md:rounded-2xl cursor-pointer font-extrabold text-base md:text-[1.1rem] flex items-center justify-center gap-2 transition-all duration-300 shadow-[0_10px_20px_-5px_var(--primary-glow)] hover:-translate-y-[3px] hover:brightness-110 active:scale-95 disabled:opacity-50">
      <span>{authLoading ? '...' : t('confirm')}</span>
    </button>
  </form>
)}
```

- [ ] **Step 3: Update all references to `user` (string) in App.tsx**

The `user` state is now `AuthSession | null` instead of `string | null`. Update all references:

- `user` (the truthy check) — stays the same (works for objects)
- Any place using `user` as a string (display name) — change to `user.displayName`
- Any place comparing `entry.user === user` — change to `entry.userId === user.userId` (for leaderboard highlighting)
- Remove `localStorage.getItem('user')` and `localStorage.setItem('user', ...)` — session is managed by Cognito

Key locations to update:

| Pattern | Replace with |
|---------|-------------|
| `{user}` in header username display | `{user.displayName}` |
| `entry.user === user` in leaderboard | `entry.userId === user.userId` |
| `localStorage.getItem('user')` in useState init | `null` (session restored via useEffect) |
| `useState(!user)` for showLanding init | `useState(true)` (landing shown until session check) |

- [ ] **Step 4: Verify the frontend compiles**

Run: `cd frontend && npm run build`

Expected: Build succeeds. (API calls will fail at runtime since env vars aren't set locally, but the code compiles.)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/i18n.ts frontend/src/App.tsx frontend/package.json frontend/package-lock.json
git commit -m "feat: add Cognito auth UI with login, register, and confirm flows"
```

---

### Task 9: Replace localStorage with API calls

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Add API imports**

Add at the top of `App.tsx`:

```typescript
import { submitScore, getTopScores, getMyScores, getUserData, saveUserData } from './api';
import type { LeaderboardEntry } from './api';
```

- [ ] **Step 2: Add state for API-loaded data**

Replace the current inline leaderboard computation (lines 395-401 in the current file that parse localStorage) with state:

```typescript
const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
const [userTotalScore, setUserTotalScore] = useState(0);
const [leaderboardLoading, setLeaderboardLoading] = useState(false);
```

Remove these lines:
```typescript
// DELETE these lines:
const leaderboardData = JSON.parse(localStorage.getItem('leaderboard') || '[]');
const sortedLeaderboard = [...leaderboardData].sort((a: any, b: any) => b.score - a.score).slice(0, 10);
const userTotalScore = leaderboardData.filter((entry: any) => entry.user === user).reduce((sum: number, entry: any) => sum + entry.score, 0);
```

Replace with computed values:
```typescript
const sortedLeaderboard = leaderboardData;
const userRank = getRank(userTotalScore);
const topThree = sortedLeaderboard.slice(0, 3);
const restOfList = sortedLeaderboard.slice(3);
```

- [ ] **Step 3: Load user data from API on login**

In the `useEffect` that fires when `user` changes (the one that loads streets/hydrants/POIs), replace the localStorage reads with API calls:

```typescript
useEffect(() => {
  if (!user) return;
  setShowLanding(false);

  // Load user data from API
  getUserData()
    .then((data) => {
      setUnlockedAchievements(data.achievements);
      setKnownStreetIds(data.knownStreets);
    })
    .catch((err) => console.error("Failed to load user data:", err));

  // Load leaderboard
  Promise.all([getTopScores(), getMyScores()])
    .then(([top, my]) => {
      setLeaderboardData(top);
      setUserTotalScore(my.totalScore);
    })
    .catch((err) => console.error("Failed to load leaderboard:", err));

  // Load map data
  const loadData = async () => {
    setLoading(true);
    try {
      const [streetData, hydrantData, poiData] = await Promise.all([
        fetchBassersdorfStreets(),
        fetchBassersdorfHydrants(),
        fetchBassersdorfPOIs(),
      ]);
      setStreets(streetData);
      setHydrants(hydrantData);
      setPois(poiData);
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  };
  loadData();
}, [user]);
```

- [ ] **Step 4: Replace score submission in handleAnswer**

In the `handleAnswer` function, replace the localStorage leaderboard write (around lines 358-363) with:

```typescript
if (totalQuestions >= 10) {
  const finalCorrectCount = isCorrect ? correctCount + 1 : correctCount;
  const finalScore = score + roundPoints;

  const newRoundsCount = roundsPlayedInSession + 1;
  setRoundsPlayedInSession(newRoundsCount);
  if (newRoundsCount >= 5) unlockAchievement('marathon');
  if (finalScore >= 15000) unlockAchievement('high_score_round');

  if (finalCorrectCount === 10) {
    unlockAchievement('perfect_round');
    confetti({ particleCount: 300, spread: 100, origin: { y: 0.5 } });
  }
  const hour = new Date().getHours();
  if (hour >= 22 || hour < 5) unlockAchievement('night_shift');
  if (hour >= 5 && hour < 9) unlockAchievement('early_bird');

  // Submit score to API
  submitScore(finalScore)
    .then(() => {
      // Refresh leaderboard data
      return Promise.all([getTopScores(), getMyScores()]);
    })
    .then(([top, my]) => {
      setLeaderboardData(top);
      setUserTotalScore(my.totalScore);
      if (my.totalScore >= 100000) unlockAchievement('local_hero');
    })
    .catch((err) => console.error("Failed to submit score:", err));
}
```

- [ ] **Step 5: Replace achievement and knownStreets persistence**

In `unlockAchievement`, replace localStorage with API:

```typescript
const unlockAchievement = (id: string) => {
  if (!unlockedAchievements.includes(id)) {
    const updated = [...unlockedAchievements, id];
    setUnlockedAchievements(updated);
    saveUserData(updated, knownStreetIds).catch((err) =>
      console.error("Failed to save achievements:", err)
    );
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#ff5252', '#38bdf8', '#fbbf24'] });
    triggerEmergencyEffect();
  }
};
```

In `handleAnswer`, where `knownStreetIds` is updated (the discovery bonus section), replace localStorage with API:

```typescript
if (isCorrect && currentStreet && !knownStreetIds.includes(currentStreet.id)) {
  discoveryBonus = 1000;
  setLastDiscoveryBonus(true);
  const updatedKnown = [...knownStreetIds, currentStreet.id];
  setKnownStreetIds(updatedKnown);
  saveUserData(unlockedAchievements, updatedKnown).catch((err) =>
    console.error("Failed to save known streets:", err)
  );
  if (updatedKnown.length >= 100) unlockAchievement('master_explorer');
}
```

- [ ] **Step 6: Refresh leaderboard on tab switch**

Add a refresh when the user navigates to the leaderboard tab. In the leaderboard nav button's onClick:

```typescript
onClick={() => {
  setMode('leaderboard');
  setLeaderboardLoading(true);
  Promise.all([getTopScores(), getMyScores()])
    .then(([top, my]) => {
      setLeaderboardData(top);
      setUserTotalScore(my.totalScore);
    })
    .catch((err) => console.error("Failed to refresh leaderboard:", err))
    .finally(() => setLeaderboardLoading(false));
}}
```

- [ ] **Step 7: Update leaderboard display for new data shape**

The leaderboard entries now come from the API as `LeaderboardEntry` objects (`{ id, userId, username, score, date }`). Update the JSX references:

| Old | New |
|-----|-----|
| `entry.user` | `entry.username` |
| `entry.user === user` (highlight check) | `entry.userId === user?.userId` |
| `leaderboardData.filter((ld: any) => ld.user === entry.user)` (total score calc in podium) | Remove — total score already available in `userTotalScore` for current user; for other users, use the entry score directly (individual round scores) |

For the podium, the rank display should use the entry's individual score since we're displaying individual rounds:

```tsx
// In topThree.map: replace the totalS calculation
// Old:
const totalS = leaderboardData.filter((ld: any) => ld.user === entry.user).reduce((sum: number, ld: any) => sum + ld.score, 0);
const rank = getRank(totalS);
// New:
const rank = getRank(entry.score);
```

Same for the `restOfList` rows.

- [ ] **Step 8: Remove all remaining localStorage references**

Search App.tsx for any remaining `localStorage` calls and remove them. The only localStorage usage should be in `amazon-cognito-identity-js` (which manages its own tokens internally).

- [ ] **Step 9: Verify the frontend compiles**

Run: `cd frontend && npm run build`

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 10: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat: replace localStorage with DynamoDB API calls"
```

---

### Task 10: End-to-end verification

- [ ] **Step 1: Deploy to dev**

Run: `npx sst deploy --stage dev`

Expected: Frontend + backend deployed together. API URL and site URL printed.

- [ ] **Step 2: Open the app and test registration**

Open the site URL. Verify:
1. Landing page loads
2. Click through to login form
3. Switch to register
4. Register with email, password (8+ chars), display name
5. Email received with confirmation code
6. Enter code on confirmation screen
7. Redirected to login
8. Login with email + password
9. App loads, map appears

- [ ] **Step 3: Test competition and leaderboard**

1. Start a competition round
2. Answer 10 questions
3. Score is submitted to API (verify no console errors)
4. Navigate to leaderboard — score appears
5. Open in a different browser/incognito — same leaderboard is visible after login

- [ ] **Step 4: Test achievements and known streets**

1. Play a round — discover new streets
2. Log out, log back in — known streets and achievements are preserved
3. Switch to learn mode — known streets are highlighted in green

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: end-to-end testing fixes"
```
