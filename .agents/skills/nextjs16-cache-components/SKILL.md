---
name: nextjs16-cache-components
description: Use when building or changing this Next.js 16 App Router frontend, especially Cache Components, streaming, Tailwind CSS, or UI behavior.
---

# Next.js 16 and Tailwind CSS

Use this skill for changes under `frontend/`. Follow the installed framework version, not remembered Next.js behavior from older releases.

## Inspect before changing

- Read `frontend/AGENTS.md` and the nearest page/component/API client.
- Read the relevant guide under `frontend/node_modules/next/dist/docs/` before using an unfamiliar Next.js API. In particular, consult the local Cache Components and `use cache` documentation.
- Check the current scripts and package versions in `frontend/package.json`; don't add packages for functionality already provided by Next.js, React, or Tailwind.

## App Router and server/client boundaries

- Pages and components are Server Components by default. Keep data fetching, secrets, and server-only SDKs on the server.
- Add `"use client"` only for a real browser interaction, state, effect, or browser-only dependency; keep the client boundary as small as practical.
- In Next.js 16 request interception is implemented in `frontend/proxy.ts`; do not introduce legacy `middleware.ts` patterns without checking the local migration docs.
- Treat `proxy.ts` checks and decoded browser/server token claims as navigation or presentation logic, not proof of identity. The backend API Gateway JWT authorizer and server-side authorization checks are the security boundary.
- `cookies()`, `headers()`, and other request-specific values belong in dynamic request-time code. Keep them outside shared cached functions/components and pass only safe serializable values when needed.
- Put request-time regions behind Suspense where this lets Cache Components produce a useful static shell and stream dynamic content independently.

## Cache Components: safe defaults

`frontend/next.config.ts` enables `cacheComponents` and `partialPrefetching`. Do not change these flags or add route-segment caching directives based on older Next.js conventions without checking the installed docs.

- Data is dynamic unless explicitly cached. Add `"use cache"` only to deterministic work whose output is safe to share for identical inputs.
- Good candidate: the published public course catalog. Bad candidates: a user's enrollment list, progress, token, or any result that varies by authenticated identity unless identity isolation is an explicit, reviewed cache design.
- Keep data-fetch cache tags aligned with invalidation calls. This repo uses `revalidateTag(tag, "max")` in `frontend/lib/actions/revalidate.ts` for stale-while-revalidate behavior. Use `updateTag` only when an immediate read-your-own-writes result is required in a Server Action and confirm the local API constraints.
- Choose cache lifetime and invalidation from freshness requirements. Do not add a remote cache or longer persistence merely to improve a benchmark without measuring the origin load, latency, and cost.
- Test both the cached public path and a request-specific authenticated path after changing cache boundaries. Ensure cache tags cover every affected public view.

Example shape for public data:

```ts
async function getPublicCourses() {
  "use cache";
  return listPublicCourses({ tags: ["public-courses"] });
}
```

Example boundary for personalized data:

```tsx
export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardForCurrentRequest />
    </Suspense>
  );
}
```

Read cookies and fetch user-specific data inside the request-time region; do not cache it as if it were public catalog data.

## Tailwind CSS and visual design

- This app uses Tailwind CSS 4: global styles import `tailwindcss`, and the frontend uses its configured Turbopack integration. Follow the existing setup rather than adding a v3-style configuration or directives by habit.
- Use semantic HTML, reusable components in `frontend/components/`, and existing color/type conventions where they serve the page.
- Make visual choices that fit the actual product and audience; avoid generic SaaS/card/gradient treatments when they do not communicate useful hierarchy. Spend visual emphasis on one intentional focal point and keep supporting UI disciplined.
- Use concise, user-facing labels and active verbs. Empty and error states should explain what happened or what action is available.
- Verify responsive layout, visible keyboard focus, readable contrast, and reduced-motion behavior for interactive UI. Motion should clarify a state transition rather than decorate every element.
- Keep Tailwind class values discoverable; do not construct class names dynamically in ways the compiler cannot see.

## Validation

From the repository root:

```sh
npm run build
```

Run any focused tests available for the changed behavior. Inspect the rendered page at desktop and mobile widths when changing layout or visual hierarchy. Report tests that cannot be run rather than implying success.
