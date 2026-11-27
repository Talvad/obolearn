---
name: cost-efficient-app-bootstrap
description: Use when planning or bootstrapping a new app on Next.js 16, Tailwind CSS, AWS SAM, and managed AWS services with an emphasis on low operating cost and fast iteration.
---

# Cost-Efficient App Bootstrap

Use this skill to make deliberate architecture and delivery choices for a new app. Optimize for total cost of ownership and time-to-feedback, not the fewest AWS resources at any cost.

## 1. Establish the workload before choosing services

Write down:

- The user journey and smallest useful launch scope.
- Public versus personalized data, identity/roles, uploads/media, and retention needs.
- Expected request volume, payload/asset sizes, concurrency, regions, and latency/availability targets.
- Compliance, recovery, and access-control requirements.
- A rough cost ceiling and the assumptions used.

Call out unknowns rather than pretending a precise forecast is possible.

## 2. Prefer a small managed baseline

- Use Next.js App Router with server rendering and Server Components by default; add client JavaScript only for interaction.
- For Next.js 16, verify installed-version docs before selecting Cache Components, streaming, and deployment behavior.
- Use AWS SAM for discrete Lambda/API needs; avoid adding containers, queues, search, NAT gateways, provisioned concurrency, or a complex multi-account design until a measured requirement justifies them.
- Use a managed identity service for authentication rather than rolling password/token storage.
- Start DynamoDB with access patterns and key design. On-demand capacity is a reasonable starting point for uncertain or intermittent demand; compare provisioned capacity only when stable volume and observed utilization support it.
- Keep object storage private and add a CDN only when delivery requirements justify it. Apply lifecycle and retention rules intentionally.
- Avoid duplicating state across frontend, Lambda, and AWS services when one authoritative store suffices.

## 3. Make cost visible early

For each proposed service, identify the main meter: requests, duration/memory, provisioned idle time, storage, reads/writes/indexes, logs, egress, or cache invalidations. Use the AWS Pricing Calculator or current regional pricing for estimates; document traffic assumptions and include a low/base/high case when uncertainty is material.

Common cost surprises to check:

- DynamoDB scans, oversized item projections, hot partitions, and unnecessary GSIs.
- Large or frequent CloudWatch logs and excessive retention.
- Video/image egress, duplicate assets, and overly broad invalidation patterns.
- NAT gateways and other resources billed while idle.
- Lambda memory/timeouts or provisioned concurrency set without measurement.
- Development/test resources left running or populated with production-scale data.

Do not make an architecture less secure, durable, accessible, or reliable just to reduce a small line item. Compare the operational cost of the simpler and cheaper option too.

## 4. Design contracts and security before implementation

- Define API request/response types and error behavior before parallel frontend/backend work.
- Separate public catalog data from per-user data and state where it is authorized.
- Enforce permissions at the backend/resource boundary; client-side route protection improves UX only.
- Use least-privilege IAM, private buckets, managed secrets, short-lived credentials/URLs, and explicit environment separation.
- Decide what must never be cached, logged, or exposed to the browser.
- Make data-retention, recovery, deletion, and backup behavior explicit.

## 5. Optimize the feedback loop

- Start with a thin vertical slice and one end-to-end user journey.
- Keep local builds, unit tests, mocks, and contract checks fast and deterministic. Use cloud integration tests only for behavior that local tests cannot verify.
- Add lint/type-check/test scripts early and run the narrowest relevant checks on each change.
- Use SAM local build/invoke or API tooling where available; do not require a live cloud deployment for routine iteration.
- Measure before optimizing. Capture build time, cold/warm latency, error rate, memory, query volume, cache hit rate, and monthly cost drivers.
- Keep infrastructure changes reviewable and isolated from application changes where practical.

## 6. Define a deployment and operations baseline

Before a real deployment, establish environments, budgets/alerts, tags, log retention, alarms, backup/recovery, rollback, and ownership. Review IAM and the infrastructure change set. Require explicit user authorization before creating, modifying, or deleting live resources.

## Deliverable checklist

- Architecture and service choices tied to workload requirements.
- Data access patterns and API contracts documented.
- Explicit cost assumptions, likely cost drivers, and an optimization/measurement plan.
- Security, retention, recovery, and operations decisions captured.
- A fast local validation path and a tested vertical slice.
