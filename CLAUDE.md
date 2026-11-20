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

There's no root env template — a local `.env` needs `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_BRAVE_SEARCH_AGENT_URL`, `VITE_WEATHER_API_URL`, `VITE_MICROAGENT_WS_URL`, `VITE_DOCUMENT_SCANNER_URL`, `VITE_SNAKE_API_URL`, `VITE_LLM_INFERENCE_URL`, `VITE_GITHUB_STATS_URL` (same names used as GitHub Actions secrets in `deploy.yml`).

## Frontend architecture (`src/`)

**Routing** (`src/main.tsx`): `createBrowserRouter` + `RouterProvider`. `ClerkProvider` is mounted *inside* the router (as a wrapping route with an `Outlet`) specifically so Clerk can call `useNavigate()`. All pages are `React.lazy` + `Suspense`. Route tree, all under `RootLayout` (Navbar/Footer; it also marks the once-per-session entrance as played after 1.2s and scrolls to top on path change):
- `/`, `/about`, `/projects`, `/projects/:slug`, `/archive`, `/contact`
- `/projects/:slug/demo` — the only route wrapped in `ProtectedRoute` (Clerk `useAuth()`; redirects unauthenticated users to `/sign-in?redirect_url=...`)
- `/sign-in`, `/sign-in/sso-callback`, `/sign-up`, `/sign-up/sso-callback`
- `*` — `NotFound` (also the router's `errorElement`)

**Demo dispatch pattern**: `/projects/:slug/demo` doesn't have one route per demo — `src/pages/Demo.tsx` looks up `slug` in a `DEMOS` map to a component under `src/pages/demos/`. To add a new live demo: add to `DEMOS`, create `src/pages/demos/XDemo.tsx`, set `hasDemo: true` on the project in `src/data/projects.ts`, add a `VITE_*_URL` env var, and optionally a Worker proxy under `workers/`.

**Adding a project**: append an entry to `projects` in `src/data/projects.ts`. Required fields (`Project` in `src/types/index.ts`): `slug`, `title`, `description`, `year`, `tags`, `status`. Optional: `tagline` (140 characters or fewer; shown on rows and under the page title, rows fall back to `description`), `period`, `archived`, `results` (`{ value, label }` pairs shown as a results strip), `overview`/`challenge`/`approach`/`features`, `video`, `images`, `dataTables`, `links`, `hasDemo`. Each optional section on the detail page renders only when its field is present. Then add `https://owenbeckettjones.com/projects/<slug>` to `public/sitemap.xml`, which is a hand-maintained list.

**Data as CMS**: `src/data/projects.ts` holds the canonical `Project[]` — essay-length `overview`/`challenge`/`approach`/`features` strings live directly in this TS file (no headless CMS/MDX). It holds active and archived projects together: entries with `archived: true` are exported as `archivedProjects`, the rest as `activeProjects` (Home, Projects and the prev/next links on a project page use these). Three active entries (`so101-arm`, `deep-retrieval`, `agent-skills`) are short placeholders marked in progress. `src/data/profile.ts` is the single source for the owner's name, lead line, availability, location, email, links, the "now" list and the terms and courses; `cvHref` is `undefined` until a CV exists, and no CV link renders while it is. `src/data/archive.ts` holds four GitHub-only entries (`ArchiveProject`, defined locally there, not in `src/types`), shown under "Repositories" on the Archive page. `src/data/navigation.ts` holds nav links (Work, About, Contact). This is a portfolio site only — there is no blog/posts system despite `react-markdown` being a dependency (it's used once, to render AI answer text in `BraveSearchDemo.tsx`).

**Worker proxy integration**: most demos never call upstream demo backends directly — they go through a Cloudflare Worker proxy that injects secrets server-side. Of the 7 demos, 4 have their proxy source in this repo's `workers/`:
- `WeatherDemo.tsx` → `VITE_WEATHER_API_URL` → `workers/weather-proxy`
- `DocumentScannerDemo.tsx` → `VITE_DOCUMENT_SCANNER_URL` → `workers/document-scanner-proxy`
- `MicroagentDemo.tsx` → `VITE_MICROAGENT_WS_URL` (raw WebSocket) → `workers/microagent-proxy`
- `LlmFromScratchDemo.tsx` → `VITE_LLM_INFERENCE_URL` → `workers/llm-inference-proxy`, which fronts a RunPod Serverless endpoint (not Railway like the others) — see below
- `BraveSearchDemo.tsx` → `VITE_BRAVE_SEARCH_AGENT_URL` — worker lives in a separate repo
- `GeminiAudioDemo.tsx` — WebSocket URL is **hardcoded** (`wss://gemini-audio-agent.owenbeckettjones.workers.dev/ws`), not a `VITE_*` var like the others; worker also lives in a separate repo. Treat this as an inconsistency, not a pattern to copy.
- `SnakeDemo.tsx` → `VITE_SNAKE_API_URL` — calls the Railway-deployed FastAPI SSE endpoints directly; no Worker proxy exists or is needed, since that API requires no secret and already sets `CORS: *`.

**Styling**: Tailwind CSS 4 via `@tailwindcss/vite` — config lives in `src/index.css` (`@theme` block), there is no `tailwind.config.js`. Tokens: `--color-background` `#0A0A0A`, `surface`, `surface-raised`, `text` `#E8E8E4`, `text-muted` `#A8A8A4`, `text-dim` `#7B7B78` (a readable grey, safe to use as text), `border`, `border-strong`, `accent` `#FFB200` and `accent-hover`. Fonts are `Inter` (sans) and `JetBrains Mono` (mono), loaded from Google Fonts in `index.html`. Custom `@layer utilities` classes: `.display`, `.heading-lg`, `.lead`, `.mono` (12px), `.mono-lg`, `.section-label` (12px uppercase mono, written as `// LABEL`), `.clip`, `.scroll-hide`. The look is a monospace "terminal" feel (`// LABELS`, `[ Bracketed Buttons ]`, padded numeric indices). The accent is for state marks only: the active nav underline, the status dot, the TA badge, the demo marker, the open-row toggle and focus rings (the one other use is the filled primary button on Home and Contact). No icon library is used despite `lucide-react` being installed. `cn()` (`src/lib/utils.ts`, `clsx` + `tailwind-merge`) is the className helper, though most components still use plain strings/template literals.

**Phone first**: default (unprefixed) styles are the phone layout; `sm:`/`md:`/`lg:` only add to it. Nothing may be `shrink-0` or `whitespace-nowrap` beside a heading below `md` (use `md:shrink-0`), long strings get `break-words`/`break-all` and `min-w-0`, and interactive targets are at least 44px tall (`min-h-11`, or `min-h-12` on primary buttons). The About page is a single column at every width; the featured results list on Home is one column below `sm`.

**Motion**: `src/lib/entrance.ts` exports the shared easing `EASE` (`[0.16, 1, 0.3, 1]`) and a once-per-session flag (`hasEntrancePlayed` / `markEntrancePlayed`, backed by `sessionStorage`, falling back to "play again" if storage throws). `src/components/motion/Reveal.tsx` provides `Reveal` (fade and 8px rise, optional `inView`) and `ClipReveal` (heading clip reveal, `y: '105%' → '0%'`); delays are capped at 0.24s. `PageTransition` is a short fade. After the first entrance, all three render in their final state with no animation. `main.tsx` wraps the app in `<MotionConfig reducedMotion="user">`, and `index.css` also shortens CSS animations and transitions under `prefers-reduced-motion`. There is no `AnimatePresence` route transition.

**Page metadata**: each page calls `useDocumentMeta(title, description?)` (`src/hooks/useDocumentMeta.ts`), which sets `document.title` to `<title> · Owen Jones` (the site title is used as is) and updates the `meta[name="description"]` tag. `index.html` carries the static title, description, Open Graph and Twitter tags, canonical link, `theme-color` and favicon (`public/favicon.svg`); `public/robots.txt` and `public/sitemap.xml` sit alongside `404.html`. The Open Graph and Twitter tags are static, so they are the same for every route.

**Components**: `src/components/ProjectRow.tsx` is the stacked project row used on Home, Projects and Archive (index, title, year, tagline, tags, optional demo marker, GitHub stats badge). Expandable data-table rows on the project page use a real `<button>` in the marker cell.

**Installed but currently unused**: `cmdk`, `@radix-ui/react-dialog`, `lucide-react`, `react-syntax-highlighter` — no command palette, dialog, icons, or syntax highlighting exist yet in `src/`. If asked to build any of those, these are the intended libraries already in `package.json`. 

Path alias `@/*` → `src/*` is configured in both `vite.config.ts` and `tsconfig.json` — keep them in sync if either changes.

## Content rules

- Copy states only facts the owner has supplied. They live in `src/data/profile.ts` and the project entries in `src/data/projects.ts`; do not invent claims, numbers, dates or courses. The owner's email is `profile.email`; never write the address elsewhere.
- Taglines are 140 characters or fewer.
- No text under 12px.
- The phone layout is the default; see "Phone first" above. Nothing sits `shrink-0` or `whitespace-nowrap` beside a heading below `md`, and interactive targets are at least 44px tall.
- The accent is for state marks only.
- Course codes use the `CMPSC` prefix (`CMPSC 291A`), not `CS`.
- A new project slug must be added to `public/sitemap.xml`.

## Worker proxies (`workers/`)

Five fully independent Wrangler projects (own `package.json`/`package-lock.json`/`node_modules`, no shared code, no workspace). Four share an identical shape: `src/index.ts` single-file `fetch` handler, `wrangler.toml` (name/main/compatibility_date only), `tsconfig.json` targeting `@cloudflare/workers-types` (missing on `weather-proxy` — never backfilled after being added elsewhere). Each of those four exists purely to (a) inject a secret server-side that must not ship in the client bundle, and (b) restrict CORS to `https://owenbeckettjones.com` — `ALLOWED_ORIGIN` is hardcoded (not shared) in each source file. Only `microagent-proxy` and `github-stats-proxy` also accept `http(s)://localhost[:port]` (regex origin check); `weather-proxy`, `document-scanner-proxy` and `llm-inference-proxy` send only the production origin in `Access-Control-Allow-Origin`, so a local dev frontend cannot call them through a browser. `github-stats-proxy` is the exception: its `wrangler.toml` also has a `[[kv_namespaces]]` block, and it's a KV-backed cache/backend rather than a proxy fronting an existing upstream service.

- `weather-proxy` — HTTP proxy → Railway weather API, injects `X-API-Key`.
- `document-scanner-proxy` — HTTP proxy → Railway doc-scanner service, injects `Authorization: Bearer`, and strips upstream `Access-Control-*` response headers before applying its own CORS headers (prevents duplicate headers).
- `microagent-proxy` — **WebSocket** relay → Railway microagent service, appends `?token=` to the outbound URL. Buffers client→upstream messages while the outbound socket is still in `CONNECTING` state and flushes them on `open` (fixed a message-drop bug); propagates close/error codes both directions.
- `llm-inference-proxy` — HTTP proxy → the `llm-from-scratch` RunPod Serverless inference API (not Railway). Injects `Authorization: Bearer` with a `RUNPOD_API_KEY` secret. Single `POST /` handler: submits `{ input: <client body> }` to RunPod's `/run`, then polls `GET /stream/{id}` in a loop (`POLL_INTERVAL_MS`, 400ms) and forwards new chunks to the client as they arrive, until `status` reaches a terminal value. This isn't optional — RunPod's `/stream/{id}` is **not** a held-open connection despite what its own docs imply; a fetch right after `/run` returns and closes immediately with an empty/in-progress snapshot. Also non-obvious: each poll's `stream` array holds only the chunks produced *since the previous poll*, not the full history — forwarding must not slice by a running total, or tokens get silently dropped (this exact bug shipped and was caught via `wrangler tail` against the live endpoint). The client never talks to RunPod directly. Cold starts (scale-to-zero) take ~100-120s; `MAX_POLL_MS` (150s) leaves headroom for that.
- `github-stats-proxy` — not a proxy in the same sense as the other four: it's a KV-cached read-through backend. `GET /repo-stats?owner=&repo=` queries the GitHub GraphQL API (commit count, last commit date, stars, primary language, open issue count) for a single repo, caches the result in KV for 1 hour, and serves stale cache on upstream failure rather than erroring. Injects `GITHUB_TOKEN` (a fine-grained PAT, public-repo read-only) server-side, same secret-injection rationale as the others. Restricted to an `objones25`-owner allowlist server-side, not just relying on the frontend only ever asking for this site's own repos.

Known inconsistency worth knowing about: `weather-proxy` does *not* strip upstream CORS headers before adding its own (unlike `document-scanner-proxy`), so it could exhibit the duplicate-header bug the other two were fixed for — if touching CORS handling here, apply the same filter for consistency.

## Deployment

**GitHub Pages via `.github/workflows/deploy.yml` is the authoritative deploy path** (triggered on push to `main` or manual dispatch; builds with `VITE_*` secrets, uploads `dist/` via `actions/upload-pages-artifact`, deploys via `actions/deploy-pages`). Two other files look deploy-related but are not:
- `vercel.json` is stale/inactive — no Vercel wiring exists anywhere else in the repo; don't assume Vercel is in the loop.
- Root-level `CNAME` (`owenbeckettjones.com`) is *not* copied into `dist/` (Vite only copies `public/`), so it has no effect on the Actions-based deploy — the actual custom-domain binding lives in GitHub repo Settings → Pages, independent of this file.

`public/.nojekyll` and `public/404.html` implement the standard GitHub Pages SPA-on-a-static-host trick (404.html redirects to `/?p=<path>`; an inline script in `index.html` restores the real path via `history.replaceState` before React Router mounts). Cloudflare Workers are deployed completely separately and manually (`npm run deploy` per worker dir) — nothing in CI touches `workers/`.

`update-paths.js` at repo root is a vestigial one-off migration script from before the React rewrite (rewrote old static `src/*.html` files); it isn't referenced anywhere and would error if run today since `src/*.html` no longer exists.
