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

The frontend has **no lint script and no test runner** (no eslint/prettier/vitest/jest at the root), so don't assume a root `npm test` or `npm run lint`. The workers do have tests; see below. `.github/workflows/ci.yml` runs the site typecheck and build and the worker typecheck and tests on every branch push and pull request.

Workers (`workers/` is one npm workspace: one `package.json`, one lockfile, shared code in `workers/shared/`):
- From `workers/`: `npm install` once, `npm test` (vitest), `npm run typecheck`, `npm run build:check` (`wrangler deploy --dry-run` for each worker)
- From `workers/<name>/`: `npm run dev` (`wrangler dev`), `npm run deploy` (`wrangler deploy`; never run by CI, always manual)
- Secrets are Wrangler secrets (`wrangler secret put <NAME>` from the worker's folder), never in `wrangler.toml`: `WEATHER_API_KEY`, `TOKEN` (document scanner, microagent), `RUNPOD_API_KEY`, `GITHUB_TOKEN`. Every worker folder has a `.dev.vars.example` naming what `wrangler dev` needs.

There's no root env template — a local `.env` needs `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_BRAVE_SEARCH_AGENT_URL`, `VITE_WEATHER_API_URL`, `VITE_MICROAGENT_WS_URL`, `VITE_DOCUMENT_SCANNER_URL`, `VITE_SNAKE_API_URL`, `VITE_LLM_INFERENCE_URL`, `VITE_GITHUB_STATS_URL` (same names used as GitHub Actions secrets in `deploy.yml`).

## Frontend architecture (`src/`)

**Routing** (`src/main.tsx`): `createBrowserRouter` + `RouterProvider`, with two route trees. The public tree sits under `RootLayout` (Navbar/Footer; it also marks the once-per-session entrance as played after 1.2s and renders react-router's `<ScrollRestoration />`, which scrolls to top on new locations and restores position on back/forward). The auth tree sits under `ClerkLayout` (`src/components/auth/ClerkLayout.tsx`), a lazy chunk that mounts `ClerkProvider` and then the same `RootLayout`. **Nothing in the public tree may import from `@clerk/*`**: that is what keeps Clerk out of the first load (538 kB to 303 kB when this was done). All pages are `React.lazy` + `Suspense`.
- Public: `/`, `/about`, `/projects`, `/projects/:slug`, `/skills`, `/archive`, `/contact`, `*` (`NotFound`, also the `errorElement`). `/projects/agent-skills` redirects to `/skills`.
- Auth (Clerk loaded): `/projects/:slug/demo` (wrapped in `ProtectedRoute`, which redirects signed-out users to `/sign-in?redirect_url=...`), `/sign-in`, `/sign-in/sso-callback`, `/sign-up`, `/sign-up/sso-callback`. `SignIn` passes `redirect_url` through `safeRedirectPath` (`src/lib/safeRedirect.ts`), which accepts only same-site paths.
- Dev server only: `/projects/_template`, the project page format with every section filled by placeholder text (`src/data/projectTemplate.ts`). It is registered under `import.meta.env.DEV`, so it is not in the production build.
- The public navbar has no sign-in link; sign-in is reached by launching a demo. `Navbar` takes an `account` slot that `ClerkLayout` fills.

**Demo dispatch pattern**: `/projects/:slug/demo` doesn't have one route per demo. `src/pages/Demo.tsx` looks up `slug` in a `DEMOS` map of `lazy()` components under `src/pages/demos/`, so each demo is its own chunk. To add a live demo: add a `lazy()` entry to `DEMOS`, create `src/pages/demos/XDemo.tsx` (named export), set `hasDemo: true` on the project in `src/data/projects.ts`, add a `VITE_*_URL` env var, and optionally a Worker proxy under `workers/`. A demo that calls a gated worker gets its token from `useSessionToken()` (`src/hooks/useSessionToken.ts`) right before each request and reads error bodies with `readErrorMessage` (`src/lib/workerError.ts`).

**Adding a project**: append an entry to `projects` in `src/data/projects.ts`. Required fields (`Project` in `src/types/index.ts`): `slug`, `title`, `description`, `year`, `tags`, `status`. Everything else is optional and each page section renders only when its field is present: `tagline` (140 characters or fewer), `period`, `archived`, `results`, `facts`, `video`, `overview` (Summary), `challenge` (Problem), `approach`, `features` (Highlights), `failures` (What failed), `limits`, `images` (Evidence), `dataTables` (Data), `next`, `credits`, `links`, `hasDemo`. Prose fields may hold several paragraphs separated by `\n\n`. `docs/project-template.md` says what belongs in each field and has a blank entry to copy; run `npm run dev` and open `/projects/_template` to see every section filled. Then add `https://owenbeckettjones.com/projects/<slug>` to `public/sitemap.xml`, which is a hand-maintained list.

**Data as CMS**: `src/data/projects.ts` holds the canonical `Project[]`; essay-length strings live directly in this TS file (no headless CMS/MDX). It holds active and archived projects together: entries with `archived: true` are exported as `archivedProjects`, the rest as `activeProjects` (Home, Projects and the prev/next links on a project page use these). Two active entries (`so101-arm`, `deep-retrieval`) are short placeholders marked in progress. `src/data/profile.ts` is the single source for the owner's name, lead line, availability, location, email, links, the "now" list and the terms and courses; `cvHref` is `undefined` until a CV exists, and no CV link renders while it is. `src/data/skills.ts` backs the `/skills` page and is **generated**: every string in it was copied by script from `github.com/objones25/my-skills` at the commit named in `skillsSource` (README lines, script docstrings, `SKILL.md` excerpts, and the output of running each script). Do not hand-edit quotes or numbers there; regenerate from the repository. `src/data/archive.ts` holds four GitHub-only entries (`ArchiveProject`, defined locally there, not in `src/types`), shown under "Repositories" on the Archive page. `src/data/navigation.ts` holds nav links (Work, Skills, About, Contact). This is a portfolio site only; there is no blog/posts system despite `react-markdown` being a dependency (it's used once, to render AI answer text in `BraveSearchDemo.tsx`). The project data and template as they stood before the 2026-11-21 rework are in `docs/backups/2026-11-21-project-pages/` and at the tag `backup/project-pages-2026-11-21`.

**Worker proxy integration**: most demos never call upstream demo backends directly. They go through a Cloudflare Worker proxy that checks the caller and injects the upstream secret server-side. The four gated workers require a Clerk session token: `Authorization: Bearer <token>` on HTTP, `?auth=<token>` on the WebSocket. Of the 7 demos, 4 have their proxy source in this repo's `workers/`:
- `WeatherDemo.tsx` → `VITE_WEATHER_API_URL` → `workers/weather-proxy`
- `DocumentScannerDemo.tsx` → `VITE_DOCUMENT_SCANNER_URL` → `workers/document-scanner-proxy`
- `MicroagentDemo.tsx` → `VITE_MICROAGENT_WS_URL` (raw WebSocket) → `workers/microagent-proxy`
- `LlmFromScratchDemo.tsx` → `VITE_LLM_INFERENCE_URL` → `workers/llm-inference-proxy`, which fronts a RunPod Serverless endpoint (not Railway like the others) — see below
- `BraveSearchDemo.tsx` → `VITE_BRAVE_SEARCH_AGENT_URL` — worker lives in a separate repo
- `GeminiAudioDemo.tsx` — WebSocket URL is **hardcoded** (`wss://gemini-audio-agent.owenbeckettjones.workers.dev/ws`), not a `VITE_*` var like the others; worker also lives in a separate repo. Treat this as an inconsistency, not a pattern to copy.
- `SnakeDemo.tsx` → `VITE_SNAKE_API_URL` — calls the Railway-deployed FastAPI SSE endpoints directly; no Worker proxy exists or is needed, since that API requires no secret and already sets `CORS: *`.

**Styling**: Tailwind CSS 4 via `@tailwindcss/vite` — config lives in `src/index.css` (`@theme` block), there is no `tailwind.config.js`. Tokens: `--color-background` `#0A0A0A`, `surface`, `surface-raised`, `text` `#E8E8E4`, `text-muted` `#A8A8A4`, `text-dim` `#7B7B78` (a readable grey, safe to use as text), `border`, `border-strong`, `accent` `#FFB200` and `accent-hover`. Fonts are `Inter Variable` (sans) and `JetBrains Mono Variable` (mono), self-hosted through the `@fontsource-variable/*` packages imported in `main.tsx`; nothing loads from Google Fonts. Custom `@layer utilities` classes: `.display`, `.heading-lg`, `.lead`, `.mono` (12px), `.mono-lg`, `.section-label` (12px uppercase mono, written as `// LABEL`), `.clip`, `.scroll-hide`, and the animation classes `.anim-rise`, `.anim-clip`, `.anim-fade`, `.anim-wave`. The look is a monospace "terminal" feel (`// LABELS`, `[ Bracketed Buttons ]`, padded numeric indices). The accent is for state marks only: the active nav underline, the status dot, the availability dot, the TA badge, the demo marker, the open-row toggle, the active video chapter, the active contents link and demo tab, `::selection`, the hover border on the secondary button and focus rings (the one other use is the filled primary button on Home and Contact). No icon library is used. `clsx` is available for conditional class names; most components use plain strings/template literals.

**Phone first**: default (unprefixed) styles are the phone layout; `sm:`/`md:`/`lg:` only add to it. Nothing may be `shrink-0` or `whitespace-nowrap` beside a heading below `md` (use `md:shrink-0`), long strings get `break-words`/`break-all` and `min-w-0`, and interactive targets are at least 44px tall (`min-h-11`, or `min-h-12` on primary buttons). The About page is a single column at every width; the featured results list on Home is one column below `sm`.

**Motion**: all animation is CSS; there is no animation library. `src/index.css` defines the keyframe classes (`.anim-rise`: fade and 8px rise, `.anim-clip`: heading clip reveal, `.anim-fade`: page fade) and the easing token `--ease-out-expo`. `src/components/motion/Reveal.tsx` provides `Reveal` (optional `inView`, which waits for an `IntersectionObserver`) and `ClipReveal`; they only decide whether to add those classes. Delays are capped at 0.24s. `src/lib/entrance.ts` holds the once-per-session flag (`hasEntrancePlayed` / `markEntrancePlayed`, backed by `sessionStorage`, falling back to "play again" if storage throws); after the first entrance, `Reveal`, `ClipReveal` and `PageTransition` render in their final state with no animation. `index.css` shortens animations and transitions and removes delays under `prefers-reduced-motion`. There is no route transition.

**Page metadata**: Home, About, Projects, ProjectDetail, Skills, Archive, Contact and NotFound call `useDocumentMeta(title, description?)` (`src/hooks/useDocumentMeta.ts`), which sets `document.title` to `<title> · Owen Jones` (the site title is used as is) and updates the `meta[name="description"]` tag, using `SITE_DESCRIPTION` when none is passed. Its effect cleanup restores the site title and description, which is how Demo, SignIn and SignUp (they do not call the hook) get them. `index.html` carries the static title, description, Open Graph and Twitter tags, `theme-color` and favicon (`public/favicon.svg`); `public/robots.txt` and `public/sitemap.xml` sit alongside `404.html`. The Open Graph and Twitter tags are static, so they are the same for every route.

**Components**: `src/components/ProjectRow.tsx` is the stacked project row used on Home, Projects and Archive (index, title, year, tagline, tags, optional demo marker, GitHub stats badge). The project page is `src/components/project/ProjectPage.tsx` (header and buttons, results strip, media, a rail with an on-page contents list and a facts sheet, then the sections); `sections.ts` beside it is the one list of section ids, labels and order, `ProjectVideoBlock.tsx` and `DataTableBlock.tsx` are the video-with-chapters and expandable-table blocks. `src/pages/ProjectDetail.tsx` only looks the project up and passes it in. The contents list uses router `Link`s with a hash, not plain anchors: a native hash jump reaches the router as a history pop and its scroll restoration then undoes the jump. `useGithubStats` keeps one request per repository per page load and renders nothing when `VITE_GITHUB_STATS_URL` is unset.

Path alias `@/*` → `src/*` is configured in both `vite.config.ts` and `tsconfig.json` — keep them in sync if either changes.

## Content rules

- Copy states only facts the owner has supplied. They live in `src/data/profile.ts` and the project entries in `src/data/projects.ts`; do not invent claims, numbers, dates or courses. The owner's email is `profile.email`; never write the address elsewhere.
- Placeholder or example text lives only in `src/data/projectTemplate.ts`, which the production build does not include. Never copy it into a real project entry.
- `src/data/skills.ts` is copied from the skills repository by script; its quotes, counts and script output are not to be edited by hand.
- Taglines are 140 characters or fewer.
- No text under 12px outside `src/pages/demos`.
- The phone layout is the default; see "Phone first" above. Nothing sits `shrink-0` or `whitespace-nowrap` beside a heading below `md`, and interactive targets are at least 44px tall.
- The accent is for state marks only.
- Course codes use the `CMPSC` prefix (`CMPSC 291A`), not `CS`.
- A new project slug must be added to `public/sitemap.xml`.

## Worker proxies (`workers/`)

One npm workspace with five workers. Each keeps its own `wrangler.toml`, `src/index.ts` and tests under `test/`; they share `workers/shared/src/`:
- `origin.ts`: one origin policy for all five, `https://owenbeckettjones.com` plus `http(s)://localhost[:port]`, and the CORS headers.
- `auth.ts`: verifies a Clerk session JWT with `jose` (RS256 only, issuer, `exp`/`nbf`, non-empty `sub`, and `azp` against the allowed origins when present). The key set comes from `<CLERK_ISSUER>/.well-known/jwks.json`; `CLERK_ISSUER` is a public value under `[vars]` in each gated `wrangler.toml`.
- `gate.ts`: the checks every gated worker runs before touching an upstream, in order: origin (403), preflight, method (405), token (401), per-user rate limit (429 with `Retry-After`). It fails closed.
- `http.ts`, `proxy.ts`: JSON errors (`{ "error": "..." }`), body caps, upstream timeouts, header allowlists. Upstream 4xx passes through; upstream 5xx becomes a generic 502, and upstream error bodies are never echoed.

`workers/README.md` has the per-worker table. In short:
- `weather-proxy`: `GET /v1/weather` only, with `location`, `unit_group`, `include`; injects `X-API-Key`. 30 requests a minute per user.
- `document-scanner-proxy`: `POST /api/sessions` (multipart, 10 MB cap), `POST /api/sessions/{id}/summary` and `/chat` (JSON), `DELETE /api/sessions/{id}`; injects `Authorization: Bearer`. 30 a minute per user.
- `llm-inference-proxy`: `POST /` with exactly `{ messages, max_new_tokens, temperature }`, validated in `src/validate.ts` (1 to 50 messages, content up to 4000 characters, `max_new_tokens` 1 to 300, `temperature` 0 to 1; anything else is a 422, not clamped). It fronts the `llm-from-scratch` RunPod Serverless endpoint: submits `{ input }` to `/run`, then polls `GET /stream/{id}` every 400ms and forwards new chunks as NDJSON until a terminal status. This polling isn't optional: RunPod's `/stream/{id}` is **not** a held-open connection, and each poll's `stream` array holds only the chunks produced *since the previous poll*, so forwarding must not slice by a running total (that bug shipped once and was caught with `wrangler tail`). When the client disconnects or the 150s deadline passes, the worker cancels the job (`POST /cancel/{id}`). Cold starts take about 100-120s. 15 a minute per user, and the demo's page-open warm-up counts.
- `microagent-proxy`: WebSocket relay for `GET /ws/run`. The session token arrives as `?auth=` (a WebSocket cannot carry an `Authorization` header) and is stripped before the upstream connection, which still needs the service token as `?token=`. Messages sent before the upstream connects are buffered, up to 8 messages and 64 KB in total; past that, or for any single message over 64 KB, the socket closes with 1009. Close and error codes propagate both ways. 5 connections a minute per user.
- `github-stats-proxy`: public, no token (unauthenticated pages call it). `GET /repo-stats?owner=&repo=` reads the GitHub GraphQL API for one repository, caches it in KV for an hour (with a KV expiry), and serves the stale copy if GitHub fails. Owner is restricted to `objones25` server-side.

Rate limits use Cloudflare's `[[ratelimits]]` binding (needs wrangler 4.36 or later; the workspace pins 4.x), keyed on the token's `sub`. They are counted per Cloudflare location, so treat them as a brake, not an exact quota.

Not covered by tests: the WebSocket relay after the upgrade (Node has no `WebSocketPair`), and anything against the real Clerk, Railway, RunPod or GitHub services.

**Deploying workers and the site together**: the gated workers reject any request without a token, and the frontend before this change sends none. Deploy the four gated workers and merge the frontend in the same sitting, or the demos return 401 in between. `github-stats-proxy` can deploy at any time.

## Deployment

**GitHub Pages via `.github/workflows/deploy.yml` is the authoritative deploy path** (triggered on push to `main` or manual dispatch; runs the typecheck, builds with `VITE_*` secrets, uploads `dist/` via `actions/upload-pages-artifact`, deploys via `actions/deploy-pages`). Two other files look deploy-related but are not:
- `vercel.json` is stale/inactive — no Vercel wiring exists anywhere else in the repo; don't assume Vercel is in the loop.
- Root-level `CNAME` (`owenbeckettjones.com`) is *not* copied into `dist/` (Vite only copies `public/`), so it has no effect on the Actions-based deploy — the actual custom-domain binding lives in GitHub repo Settings → Pages, independent of this file.

`public/.nojekyll` and `public/404.html` implement the standard GitHub Pages SPA-on-a-static-host trick (404.html redirects to `/?p=<path>`; an inline script in `index.html` restores the real path via `history.replaceState` before React Router mounts). Cloudflare Workers are deployed completely separately and manually (`npm run deploy` per worker dir) — nothing in CI touches `workers/`.

`update-paths.js` at repo root is a vestigial one-off migration script from before the React rewrite (rewrote old static `src/*.html` files); it isn't referenced anywhere and would error if run today since `src/*.html` no longer exists.
