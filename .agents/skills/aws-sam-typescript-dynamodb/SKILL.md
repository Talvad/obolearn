---
name: aws-sam-typescript-dynamodb
description: Use for AWS SAM, Lambda, API Gateway, Cognito, DynamoDB, S3, CloudFront, IAM, or backend TypeScript work in this repository.
---

# AWS SAM, TypeScript, and DynamoDB

Use this skill for changes under `backend/` or to contracts shared with the frontend.

## Inspect and validate

- Read `backend/template.yaml`, the matching Lambda entry point and handler, shared helpers under `backend/src/lib/`, domain types, and related tests before changing behavior.
- Keep SAM resource definitions, environment variables, API routes, handler dispatch, and frontend API paths in sync.
- Use strict TypeScript and the existing AWS SDK v3 clients/helpers. Avoid adding dependencies or initializing AWS clients repeatedly per invocation.
- Test changes at the closest meaningful level; backend commands run from `backend/`:

```sh
npm test
npm run build
npm run lint
sam validate --lint
sam build
```

Only run commands supported by the local environment. A test that duplicates business logic instead of invoking the changed handler may not prove the integration behavior; prefer tests that exercise the production logic with mocked boundaries.

## Lambda and API Gateway

- The SAM template uses Node.js 22, arm64, 512 MB, and a 30-second default timeout. Treat these as initial settings, not universal targets. Adjust memory/timeout only against observed latency, memory use, and cost.
- Keep each Lambda's events, handler route dispatch, IAM policy, environment variables, and API contract aligned.
- Use API Gateway HTTP API's JWT authorizer for protected routes. Read user identity and groups from its validated claims; enforce admin, enrollment, ownership, and resource state in the handler for every protected operation.
- Frontend `proxy.ts`, UI guards, and locally decoded JWTs are not authorization controls.
- Validate path/query/body inputs and return the established response helpers in `backend/src/lib/response.ts`. Log unexpected failures server-side and return a non-success status; do not hide errors behind successful empty results.
- Keep HTTP handlers small and delegate data access to `backend/src/lib/dynamo.ts` or focused domain helpers. Do not log tokens, secrets, or sensitive payloads.

## DynamoDB access patterns

This project uses a single table with `PK`/`SK` and a reverse enrollment `GSI1`. Current entity patterns are documented in `backend/src/types/index.ts` and built by `Keys` in `backend/src/lib/dynamo.ts`:

| Entity | Partition key | Sort key |
|---|---|---|
| Course | `COURSE#<courseId>` | `#METADATA` |
| Lesson | `COURSE#<courseId>` | `LESSON#<paddedOrder>#<lessonId>` |
| Enrollment | `USER#<userId>` | `ENROLL#<courseId>` |
| Progress | `USER#<userId>` | `PROGRESS#<courseId>#<lessonId>` |
| User | `USER#<userId>` | `#METADATA` |

- Define the access pattern and key/index before writing a query. Prefer `GetItem` for known keys and `Query` with partition/sort-key conditions for collections.
- Avoid `Scan` on request paths. The current course catalog helper uses a scan as a Phase 1 simplification; don't copy it for a larger catalog. Assess a targeted index or another access design against expected volume and read/write cost.
- Add a GSI only for a proven access pattern. Account for index storage, write amplification, projection size, and eventual consistency.
- Use conditional writes or transactions when correctness depends on uniqueness or atomic changes. Keep retries/idempotency behavior explicit.
- Preserve key builders and entity types as the single source of truth; don't hand-build subtly different keys in handlers.

## Cognito, S3, CloudFront, and secrets

- Keep Cognito User Pool, JWT authorizer, and group assumptions consistent across SAM and backend handlers. Public endpoints should be explicitly public; protected ones should not accidentally opt out of authorization.
- Keep the S3 video bucket private and public access blocked. CloudFront should access the origin through OAC; protect paid/enrolled media with short-lived signed URLs.
- Issue short-lived S3 presigned uploads only after authorization; constrain object key, content type, size/expiry where supported, and permitted operation.
- Store private signing material in SSM Parameter Store as SecureString and grant only the required parameter read access. Never put private keys, credentials, or live values in source, committed SAM config, logs, or MCP settings.
- Use environment-specific values and `.env.example` placeholders. Do not guess or reuse real account IDs, tokens, domain names, or key identifiers.

## IAM, cost, and deployment guardrails

- Grant each Lambda only the actions and resources it requires. Review broad SAM policy templates and replace them with narrower policies when the feature needs less access.
- The table currently uses on-demand billing and retains data; preserve retention and recovery protections unless an explicit data-lifecycle decision is made.
- Avoid unbounded scans, oversized CloudWatch logs, provisioned concurrency, idle infrastructure, and unnecessary indexes. Measure invocation rate, duration, data transfer, and storage before optimizing.
- Keep incomplete S3 multipart-upload cleanup and CDN caching intentional; do not add invalidations or always-on services without a clear need.
- `sam build` and `sam validate` are local preparation. Never deploy or change a live stack, database, bucket, or secret unless the user explicitly requests it and the target environment is clear. Review change sets and destructive replacements before applying.
