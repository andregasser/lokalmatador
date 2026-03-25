---
globs: sst.config.ts, .sst/**
---

# AWS & Infrastructure Rules

## SST (Serverless Stack)
- Infrastructure defined in `sst.config.ts`
- Deploys a `StaticSite` resource: S3 bucket + CloudFront distribution
- Stage-based: `production` retains resources on removal, other stages auto-remove

## Deployment
- Command: `npx sst deploy --stage <stage>`
- Build: `npm run build` in `frontend/` (output: `frontend/dist`)
- Environment variable `VITE_APP_STAGE` is injected at build time

## Constraints
- No backend services currently — all logic runs client-side
- No secrets or API keys in the build (Overpass API is public)
- Don't add Lambda functions, databases, or API Gateway unless explicitly requested
