# Repository guide for coding agents

## What this repository is

OboLearn is a small monorepo for a course-learning application:

| Area | Stack | Source |
|---|---|---|
| Web app | Next.js 16.4, React 19, TypeScript, Tailwind CSS 4 | `frontend/` |
| Serverless API | AWS SAM, Node.js 22, TypeScript, API Gateway HTTP API, Lambda | `backend/` |
| Identity | Amazon Cognito User Pools and API Gateway JWT authorizer | `backend/template.yaml`, `frontend/lib/auth/` |
| Data | DynamoDB single-table design | `backend/src/lib/dynamo.ts`, `backend/src/types/` |
| Video | Private S3 bucket, CloudFront OAC, signed URLs, SSM-held private key | `backend/template.yaml`, `backend/src/functions/video/` |

The root npm workspace contains the frontend. The backend has its own package and test scripts; it is not an npm workspace.

## Start here

1. Read this file, then the relevant skill:
   - Next.js pages, components, caching, or styling: `.agents/skills/nextjs16-cache-components/SKILL.md`
   - Lambda, SAM, DynamoDB, Cognito, S3, or CloudFront: `.agents/skills/aws-sam-typescript-dynamodb/SKILL.md`
   - New app architecture, cost/performance trade-offs, or service selection: `.agents/skills/cost-efficient-app-bootstrap/SKILL.md`
   - MCP selection or server implementation planning: `MCP.md`
2. Inspect the nearest existing implementation and tests before changing patterns.
3. For Next.js 16 behavior, consult the installed docs at `frontend/node_modules/next/dist/docs/` first. The generated `frontend/AGENTS.md` contains an important version-specific rule; keep its generated block intact.
4. Make the smallest complete change, test the affected layer, and report any validation not run.

## Repository map

```text
frontend/
  app/                 App Router pages, layouts, route handlers, route groups
  components/          Reusable UI grouped by domain
  lib/api/              Backend API client
  lib/auth/             Cognito and cookie-session helpers
  lib/actions/          Server actions, including cache revalidation
  proxy.ts              Next.js 16 request interception for route UX
backend/
  template.yaml         SAM resources, permissions, environment, and API routes
  src/functions/        Lambda entry points and domain handlers
  src/lib/              DynamoDB, auth-claim, and HTTP response helpers
  src/types/            Domain types and DynamoDB entity contracts
```

## Local commands

Run commands from the repository root unless noted.

| Goal | Command |
|---|---|
| Start frontend | `npm run dev` |
| Build frontend | `npm run build` |
| Build SAM application | `npm run build:backend` |
| Type-check backend | `cd backend && npm run build` |
| Test backend | `cd backend && npm test` |
| Lint backend | `cd backend && npm run lint` |

Run the narrowest relevant check first. For infrastructure changes, also run `cd backend && sam validate --lint` when SAM CLI is available. Do not deploy, modify a live AWS stack, or run cost-incurring cloud operations unless the user explicitly asks.

## Shared engineering rules

- Preserve strict TypeScript and existing module boundaries. Avoid weakening types or introducing `any` to make a change pass.
- Keep server-only secrets and AWS SDK calls out of client components. `NEXT_PUBLIC_*` values are public.
- Use server-side authorization as the security boundary. A route redirect or decoded token in the frontend is not backend verification; protected API operations must rely on API Gateway's JWT authorizer and handler-level role/resource checks.
- Cache only data safe to share across requests. Never put a user's cookie, token, enrollment, or progress into shared public cache entries.
- Prefer DynamoDB key-based `Query`/`Get` access and deliberate indexes over table scans. Do not add a GSI until the access pattern and expected cost justify it.
- Keep S3 private, use CloudFront OAC for origin access, and use short-lived signed URLs or presigned uploads for protected media.
- Scope IAM permissions to the resources and actions a function requires. Keep secrets in AWS-managed secret storage such as SSM Parameter Store SecureString, not source, templates, logs, or MCP configuration.
- Favor managed, pay-per-use services and right-sized functions, but do not trade away authorization, durability, accessibility, or required availability to save a small amount.
- Do not add dependencies, AWS resources, background services, or agent/MCP integrations without a demonstrated need. Consider total operating cost, including logs, data transfer, indexes, and idle resources.
- Surface failures with the repository's normal logging and response conventions. Do not silently convert errors into successful or empty results unless that behavior is deliberate and documented.

## Changes to this guidance

Keep portable guidance in this file and `.agents/skills/`. Keep client-specific MCP syntax in `MCP.md` examples clearly marked as illustrative. Do not overwrite or remove generated framework instructions in `frontend/AGENTS.md`.
