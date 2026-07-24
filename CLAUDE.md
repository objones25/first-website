# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Owen Jones's personal portfolio site (owenbeckettjones.com): a React 19 + TypeScript + Vite SPA, plus a handful of independent Cloudflare Worker proxies under `workers/` that front separately-hosted (Railway) demo backends.

## Commands

Frontend (run from repo root):
- `npm run dev` — Vite dev server on port 3000
- `npm run build` — production build to `dist/` (`vite build`)
- `npm run preview` — serve the production build locally, port 3000
- `npm run typecheck` — `tsc --noEmit`

There is **no lint script and no test runner** configured (no eslint/prettier/vitest/jest anywhere in the repo) — don't assume `npm test` or `npm run lint` exist.

Workers (each is an independent Wrangler project — run from inside `workers/<name>/`):
- `npm install && npm run dev` — `wrangler dev` for local testing
- `npm run deploy` — `wrangler deploy`; not wired into any CI, always manual
- Secrets (`TOKEN`, `WEATHER_API_KEY`) are Wrangler secrets (`wrangler secret put <NAME>`), never in `wrangler.toml`. `weather-proxy` has `.dev.vars.example`; the other two don't but need a local `.dev.vars` with `TOKEN=...`.

There's no root env template — a local `.env` needs `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_BRAVE_SEARCH_AGENT_URL`, `VITE_WEATHER_API_URL`, `VITE_MICROAGENT_WS_URL`, `VITE_DOCUMENT_SCANNER_URL` (same names used as GitHub Actions secrets in `deploy.yml`).

## Frontend architecture (`src/`)

**Routing** (`src/main.tsx`): `createBrowserRouter` + `RouterProvider`. `ClerkProvider` is mounted *inside* the router (as a wrapping route with an `Outlet`) specifically so Clerk can call `useNavigate()`. All pages are `React.lazy` + `Suspense`. Route tree, all under `RootLayout` (Navbar/Footer/`AnimatePresence`):
- `/`, `/about`, `/projects`, `/projects/:slug`, `/archive`, `/contact`
- `/projects/:slug/demo` — the only route wrapped in `ProtectedRoute` (Clerk `useAuth()`; redirects unauthenticated users to `/sign-in?redirect_url=...`)
- `/sign-in`, `/sign-in/sso-callback`, `/sign-up`, `/sign-up/sso-callback`

**Demo dispatch pattern**: `/projects/:slug/demo` doesn't have one route per demo — `src/pages/Demo.tsx` looks up `slug` in a `DEMOS` map to a component under `src/pages/demos/`. To add a new live demo: add to `DEMOS`, create `src/pages/demos/XDemo.tsx`, set `hasDemo: true` on the project in `src/data/projects.ts`, add a `VITE_*_URL` env var, and optionally a Worker proxy under `workers/`.

**Data as CMS**: `src/data/projects.ts` holds the canonical `Project[]` — essay-length `overview`/`challenge`/`approach`/`features` strings live directly in this TS file (no headless CMS/MDX). `src/data/archive.ts` is a separate, simpler `ArchiveProject` shape (defined locally there, not in `src/types`) for older GitHub-only projects. `src/data/navigation.ts` holds nav links. This is a portfolio site only — there is no blog/posts system despite `react-markdown` being a dependency (it's used once, to render AI answer text in `BraveSearchDemo.tsx`).

**Worker proxy integration**: the frontend never calls upstream demo backends directly — only the Cloudflare Worker proxies, which inject secrets server-side. Of the 5 demos, only 3 have their proxy source in this repo's `workers/`:
- `WeatherDemo.tsx` → `VITE_WEATHER_API_URL` → `workers/weather-proxy`
- `DocumentScannerDemo.tsx` → `VITE_DOCUMENT_SCANNER_URL` → `workers/document-scanner-proxy`
- `MicroagentDemo.tsx` → `VITE_MICROAGENT_WS_URL` (raw WebSocket) → `workers/microagent-proxy`
- `BraveSearchDemo.tsx` → `VITE_BRAVE_SEARCH_AGENT_URL` — worker lives in a separate repo
- `GeminiAudioDemo.tsx` — WebSocket URL is **hardcoded** (`wss://gemini-audio-agent.owenbeckettjones.workers.dev/ws`), not a `VITE_*` var like the others; worker also lives in a separate repo. Treat this as an inconsistency, not a pattern to copy.

**Styling**: Tailwind CSS 4 via `@tailwindcss/vite` — config lives in `src/index.css` (`@theme` block), there is no `tailwind.config.js`. Custom design tokens (`--color-background/surface/text/border...`, `Inter` + `Space Mono` fonts) and custom `@layer utilities` classes (`.display`, `.heading-lg`, `.mono`, `.clip`, marquee classes) implement a monospace "terminal" aesthetic (`// LABELS`, `[ Bracketed Buttons ]`, padded numeric indices) — no icon library is actually used despite `lucide-react` being installed. `cn()` (`src/lib/utils.ts`, `clsx` + `tailwind-merge`) is the className helper, though most components still use plain strings/template literals. `framer-motion` is used pervasively with a shared entrance easing curve `[0.16, 1, 0.3, 1]` and clip-reveal (`y: '105%' → '0%'`) heading animations; route transitions go through `AnimatePresence` in `RootLayout`.

**Installed but currently unused**: `cmdk`, `@radix-ui/react-dialog`, `lucide-react`, `react-syntax-highlighter` — no command palette, dialog, icons, or syntax highlighting exist yet in `src/`. If asked to build any of those, these are the intended libraries already in `package.json`. Similarly `src/hooks/useReducedMotion.ts` is written but never imported — animations aren't currently gated by `prefers-reduced-motion`.

Path alias `@/*` → `src/*` is configured in both `vite.config.ts` and `tsconfig.json` — keep them in sync if either changes.

## Worker proxies (`workers/`)

Three fully independent Wrangler projects (own `package.json`/`package-lock.json`/`node_modules`, no shared code, no workspace) with an identical shape: `src/index.ts` single-file `fetch` handler, `wrangler.toml` (name/main/compatibility_date only), `tsconfig.json` targeting `@cloudflare/workers-types` (missing on `weather-proxy` — never backfilled after being added elsewhere). Each exists purely to (a) inject a secret server-side that must not ship in the client bundle, and (b) enforce CORS/Origin restricted to `https://owenbeckettjones.com` (+ localhost) — a pattern hardcoded identically (not shared) in all three source files.

- `weather-proxy` — HTTP proxy → Railway weather API, injects `X-API-Key`.
- `document-scanner-proxy` — HTTP proxy → Railway doc-scanner service, injects `Authorization: Bearer`, and strips upstream `Access-Control-*` response headers before applying its own CORS headers (prevents duplicate headers).
- `microagent-proxy` — **WebSocket** relay → Railway microagent service, appends `?token=` to the outbound URL. Buffers client→upstream messages while the outbound socket is still in `CONNECTING` state and flushes them on `open` (fixed a message-drop bug); propagates close/error codes both directions.

Known inconsistency worth knowing about: `weather-proxy` does *not* strip upstream CORS headers before adding its own (unlike `document-scanner-proxy`), so it could exhibit the duplicate-header bug the other two were fixed for — if touching CORS handling here, apply the same filter for consistency.

## Deployment

**GitHub Pages via `.github/workflows/deploy.yml` is the authoritative deploy path** (triggered on push to `main` or manual dispatch; builds with `VITE_*` secrets, uploads `dist/` via `actions/upload-pages-artifact`, deploys via `actions/deploy-pages`). Two other files look deploy-related but are not:
- `vercel.json` is stale/inactive — no Vercel wiring exists anywhere else in the repo; don't assume Vercel is in the loop.
- Root-level `CNAME` (`owenbeckettjones.com`) is *not* copied into `dist/` (Vite only copies `public/`), so it has no effect on the Actions-based deploy — the actual custom-domain binding lives in GitHub repo Settings → Pages, independent of this file.

`public/.nojekyll` and `public/404.html` implement the standard GitHub Pages SPA-on-a-static-host trick (404.html redirects to `/?p=<path>`; an inline script in `index.html` restores the real path via `history.replaceState` before React Router mounts). Cloudflare Workers are deployed completely separately and manually (`npm run deploy` per worker dir) — nothing in CI touches `workers/`.

`update-paths.js` at repo root is a vestigial one-off migration script from before the React rewrite (rewrote old static `src/*.html` files); it isn't referenced anywhere and would error if run today since `src/*.html` no longer exists.
