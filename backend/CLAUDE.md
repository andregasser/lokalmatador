# Backend Architecture

Serverless backend on AWS, managed by SST v4 (Ion). All infrastructure defined in `sst.config.ts`.

## AWS Services

| Service | Resource | Purpose |
|---------|----------|---------|
| DynamoDB | `Leaderboard` table | Stores individual round scores. PK: `id`. GSIs: `byScore` (type + score), `byUser` (userId + date) |
| DynamoDB | `UserData` table | Stores achievements and known streets per user. PK: `userId` |
| Cognito | `UserPool` + `WebClient` | User registration/login via email + password (SRP protocol) |
| API Gateway v2 | `Api` (HTTP API) | Routes with JWT authorizer validating Cognito tokens |
| Lambda | 5 handlers | Business logic for leaderboard and userdata |
| S3 + CloudFront | `Frontend` StaticSite | Hosts the React SPA |

## API Routes

All routes require a valid Cognito JWT in the `Authorization: Bearer <token>` header.

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| POST | `/leaderboard` | `leaderboard/post.ts` | Submit a round score |
| GET | `/leaderboard/top` | `leaderboard/getTop.ts` | Get top 10 scores (byScore GSI, descending) |
| GET | `/leaderboard/me` | `leaderboard/getMe.ts` | Get own scores + total (byUser GSI) |
| GET | `/userdata` | `userdata/get.ts` | Load achievements + known streets |
| PUT | `/userdata` | `userdata/put.ts` | Save achievements + known streets |

## Shared Libraries (`src/lib/`)

- **`dynamo.ts`** — DynamoDB DocumentClient singleton with `removeUndefinedValues` marshalling
- **`auth.ts`** — Extracts `userId` (sub) and `username` (name or email) from JWT claims in the API Gateway event
- **`response.ts`** — `json(body, status)` and `error(message, status)` helpers for Lambda responses

## Key Patterns

- Handlers use `APIGatewayProxyEventV2WithJWTAuthorizer` type — JWT claims are pre-validated by API Gateway
- Table names are accessed via `Resource.TableName.name` (SST resource linking)
- No custom middleware — each handler is a standalone function
- Score entries use `type: "SCORE"` as partition key in the `byScore` GSI for efficient top-N queries
