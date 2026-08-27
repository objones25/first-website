# Site hygiene — design

## Scope

The remaining audit findings that don't fit the other three specs: zero
per-route SEO/social-preview support, no favicon/robots.txt/sitemap, a
real accessibility failure (`--color-text-dim` contrast) plus two
process gaps (`useReducedMotion` never wired, 5 of 7 demos missing
`aria-live`), and leftover dead code. Worker CORS/tsconfig consistency
and the CI gate are already claimed by the Testing + schema refactor
spec — not duplicated here.

This is the fourth of four specs decomposing a broader "improve the site"
request (the others: Testing + schema refactor, Backend + GitHub API,
Archive triage + project pages).

By far the largest piece here is prerendering (section 2) — it exists to
actually solve the original complaint (a project link pasted into Slack
looks identical to the homepage), not just make it look solved. A
client-side-only `document.title` fix was considered and explicitly
rejected: social unfurl bots (Slack, Twitter/X, Discord, iMessage) don't
execute JavaScript, so a React-only fix would pass a quick look in a
browser tab while leaving the actual complaint unfixed.

## 1. Per-route meta hook

New `src/hooks/useDocumentMeta.ts`: `useDocumentMeta({ title, description,
ogImage? })`, called from each page component (`Home`, `About`,
`ProjectDetail`, etc. — `ProjectDetail` derives `title`/`description` from
the current `project`). Sets `document.title` and upserts the relevant
`<meta>` tags (`description`, `og:title`, `og:description`, `og:image`,
`og:url`, `twitter:card`) on mount/update. No new dependency —
`react-helmet-async` isn't needed for a hook this small, and the site
otherwise avoids content-layer dependencies beyond what's already
installed.

This hook alone only fixes the browser tab and Google (Googlebot executes
JS and would pick up per-route titles even without section 2). It does
NOT fix social unfurls by itself — section 2 is what makes this visible to
non-JS crawlers.

## 2. Build-time prerendering

Given the site leans on Clerk (browser-oriented, doesn't SSR cleanly in
plain Node — `CLAUDE.md` notes `ClerkProvider` is deliberately mounted
inside the router specifically for `useNavigate()`, which is already a
non-trivial SSR interaction) and `framer-motion` (browser APIs at several
call sites), a Node-side SSG plugin (`renderToString`-based) would require
proving every component SSR-safe first. A headless-browser crawl-and-snapshot
avoids that entirely: it runs the already-working, already-tested client
bundle in a real browser and just saves what it rendered.

- New devDependencies: `puppeteer`, `tsx` (the latter so the prerender
  script can `import` `src/data/projects.ts` directly for the route list
  instead of hand-maintaining a duplicate one — the same reason `tsx` is
  useful, not because the app needs it at runtime).
- New `scripts/prerender.mjs`, run as `"build": "vite build && node
  scripts/prerender.mjs"` (prerendering needs the built `dist/` to already
  exist, since it crawls the real production bundle, not source).
- Logic: serve `dist/` locally (e.g. `vite preview`'s programmatic API),
  launch Puppeteer, visit every static route (`/`, `/about`, `/projects`,
  `/archive`, `/contact`) plus `/projects/:slug` for every slug imported
  from `projects.ts`, wait for render to settle, read
  `document.documentElement.outerHTML`, write it to
  `dist/<route>/index.html` — the file GitHub Pages needs present to serve
  that path directly instead of falling through to the existing
  `404.html` → `history.replaceState` redirect trick (which stays as the
  fallback for any URL prerendering doesn't cover, e.g. a since-removed
  project slug).
- `/projects/:slug/demo` (Clerk-gated) prerenders as its signed-out
  redirect state, since the crawl isn't authenticated — this is correct
  behavior (a bot shouldn't index gated content as if it were public), not
  something to special-case around.
- `src/main.tsx` changes from an unconditional `createRoot` to a
  conditional `hydrateRoot`/`createRoot` (hydrate when the root element
  already has prerendered children, create fresh otherwise — the standard
  pattern for an entry point that serves both a prerendered production
  build and `vite dev`'s empty root) to avoid a flash-of-unhydrated-content
  on first paint against the new prerendered markup.
- `og:image`: one generic `public/og-image.png` used across all routes for
  now. Distinct per-project social cards are a plausible future addition,
  not part of this spec — the site currently has real images for exactly
  one project (`llm-from-scratch`).

## 3. Favicon

A small SVG using the site's existing bracket/mono-terminal visual
language (the `[ Bracketed Buttons ]` pattern already used throughout),
saved to `public/favicon.svg`, referenced via `<link rel="icon">` in
`index.html`.

## 4. `robots.txt` + `sitemap.xml`

Both in `public/`. `sitemap.xml` is generated from the same route list
`scripts/prerender.mjs` already builds (a small shared route-list module,
or the sitemap write happens inside the same script) so it can't drift
from the actual set of prerendered routes.

## 5. Accessibility

- **`--color-text-dim` contrast fix** (the one real WCAG failure found,
  ~1.38:1 against the background): audit the real-content use sites —
  `DocumentScannerDemo.tsx` (assistant message text, file-type hints,
  message-role labels) and `MicroagentDemo.tsx` (line numbers, tool
  labels) — and switch those to `--color-text-muted` (already ~8.3:1,
  passing). Reserve `--color-text-dim` for genuinely decorative use only
  (it's already used correctly that way for the `——` separator in
  `Home.tsx:232`) — if every remaining use turns out to be decorative,
  its current value can stay; if any load-bearing use survives the audit,
  bump the token itself to a compliant value instead.
- **`aria-live` regions**: the 5 demos with zero `aria-`/`role` coverage
  (`BraveSearchDemo`, `GeminiAudioDemo`, `MicroagentDemo`, `SnakeDemo`,
  `WeatherDemo`) get `aria-live="polite"` on their streaming-content
  containers, so a screen reader announces new content as it arrives
  instead of staying silent through an entire streamed response.
- **`useReducedMotion` wiring**: rather than manually threading the
  existing (currently unused) hook through the 9 files that use
  `framer-motion`, wrap the app in framer-motion's own
  `<MotionConfig reducedMotion="user">` at `RootLayout` — this makes every
  `motion.*` component site-wide respect `prefers-reduced-motion`
  automatically. `src/hooks/useReducedMotion.ts` becomes dead code once
  this lands and gets deleted rather than left unused for a second reason.

## 6. Dead code cleanup

Delete `vercel.json` (no Vercel wiring exists anywhere else in the repo —
confirmed in the original audit and unchanged since) and `update-paths.js`
(vestigial pre-React-rewrite script, would error if run today, referenced
nowhere).

## 7. `GeminiAudioDemo.tsx` hardcoded URL

`const WS_URL = 'wss://gemini-audio-agent.owenbeckettjones.workers.dev/ws'`
→ `import.meta.env.VITE_GEMINI_AUDIO_WS_URL`, matching every other demo's
pattern. Added to `.env` (documented in `CLAUDE.md`) and
`.github/workflows/deploy.yml`'s build-step secrets, alongside the
existing 7 (soon 8, once the Backend + GitHub API spec's
`VITE_GITHUB_STATS_URL` lands) `VITE_*` vars.

## Out of scope

- Per-project OG images (one generic image for now, see section 2).
- Keyboard focus states and touch-target sizing — the audit flagged these
  as needing a live browser pass, not a static-analysis finding; worth a
  follow-up but not blocking this spec.
- Worker CORS/tsconfig consistency, the CI gate — Testing + schema
  refactor spec.
- Any new project content, archive decisions — Archive triage + project
  pages spec.
- GitHub stats display — Backend + GitHub API spec.
