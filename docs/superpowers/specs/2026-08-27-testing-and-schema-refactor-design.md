# Testing + schema refactor — design

## Scope

Establish a test suite and CI gate for a codebase that currently has zero
automated tests (frontend or the 4 `workers/`), no lint, and a `deploy.yml`
that ships straight to production on push to `main` off nothing stronger
than `vite build` (which does not run `tsc`). Combined with three targeted
refactors: replace the hand-written `Project`/`ArchiveProject` interfaces
with a Zod schema as the single source of truth, so the exact failure class
that risks recurring every time a project gains a new optional field (an
`images[].src` pointing at a file that doesn't exist, a `hasDemo: true`
with no matching `Demo.tsx` entry) is caught by a test instead of by luck;
turn `ProjectDetail.tsx`'s hand-written JSX section blocks into a
declarative, config-driven renderer (this was "Approach B" during
brainstorming, initially deferred as premature and now folded back in at
Owen's request), so each future optional field the other three specs add
is one object in a list instead of a new block in the middle of the
component; and close the drift that's accumulated across the 4 Worker
proxies (three different CORS/tsconfig/`.dev.vars.example` inconsistencies,
detailed in section 5) — also folded in at Owen's request, since writing
tests that just pin down each worker's *current*, drifted behavior would
mean encoding the inconsistency as correct instead of fixing it.

This is one of four specs decomposing a broader "improve the site" request
(the others: Backend + GitHub API, Archive triage + project pages, Site
hygiene). Out of scope here: SEO/meta tags, accessibility fixes, and any
new project content — those live in the Site-hygiene and Archive/pages
specs. `GeminiAudioDemo.tsx`'s hardcoded WebSocket URL is a related but
separate inconsistency (a frontend demo component pointing at a worker
that lives in a different repo, not one of the 4 `workers/` here) and
stays in Site-hygiene.

One item pulled in from Site-hygiene because it's a hard blocker for this
spec's e2e coverage: a Clerk local-dev auth bypass, since
`/projects/:slug/demo` is gated and Playwright can't exercise it without
one.

## 1. Schema refactor (`src/types/index.ts`)

- Replace the hand-written `ProjectLink`/`ProjectImage`/`Project` interfaces
  with Zod schemas (`ProjectLinkSchema`, `ProjectImageSchema`,
  `ProjectSchema`) and derive the exported types via `z.infer<...>`, so the
  type and the runtime-checkable shape can never drift apart.
- Same treatment for `ArchiveProject` (currently defined locally in
  `src/data/archive.ts`, per `CLAUDE.md` — move it into `src/types/index.ts`
  alongside the new `ArchiveProjectSchema` while doing this, since it's the
  same class of data and belongs with the rest of the schema).
- `NavLink` stays a plain interface — no data file validates against it and
  there's no drift risk to guard against.

## 2. Data invariant tests (`src/data/projects.test.ts`)

New test file, Vitest. For every entry in `projects.ts` and `archive.ts`:

- `ProjectSchema.parse(project)` / `ArchiveProjectSchema.parse(project)`
  succeeds.
- If `hasDemo === true`, `project.slug` is a key in `DEMOS` (requires
  exporting `DEMOS` from `src/pages/Demo.tsx:12`, currently module-private).
- Every `images[].src` resolves to a real file under `public/` (checked
  with Node's `fs.existsSync`, since Vitest runs in Node — this is exactly
  the check that would have caught a typo in the `llm-from-scratch` image
  paths added in commit `a3fa488`).
- Every `links[].href` matches `^https?://`.
- Every `slug` is unique across `projects.ts` (route collisions fail
  silently otherwise — `ProjectDetail.tsx` just renders whichever entry
  `findIndex` finds first).

## 3. `ProjectDetail` section-descriptor refactor

Currently `ProjectDetail.tsx:130-211` is six hand-written blocks in two
different shapes: Overview/Challenge/Approach/Key Features always render a
`Section`, falling back to `<Placeholder />` when the field is empty;
Evidence (images) and Live Demo CTA render nothing at all unless their data
is present. Both shapes collapse into one declarative list.

New file `src/pages/projectSections.tsx`:

```ts
interface ProjectSectionDef {
  key: string
  label: string
  showPlaceholderWhenEmpty: boolean
  hasContent: (project: Project) => boolean
  render: (project: Project, ctx: { isSignedIn: boolean | undefined }) => React.ReactNode
}

export const PROJECT_SECTIONS: ProjectSectionDef[] = [
  { key: 'overview', label: '// Overview', showPlaceholderWhenEmpty: true,
    hasContent: p => !!p.overview, render: p => <p ...>{p.overview}</p> },
  { key: 'challenge', label: '// The Challenge', showPlaceholderWhenEmpty: true, ... },
  { key: 'approach', label: '// The Approach', showPlaceholderWhenEmpty: true, ... },
  { key: 'features', label: '// Key Features', showPlaceholderWhenEmpty: true,
    hasContent: p => (p.features?.length ?? 0) > 0, render: p => <ul>...</ul> },
  { key: 'images', label: '// Evidence', showPlaceholderWhenEmpty: false,
    hasContent: p => (p.images?.length ?? 0) > 0, render: p => <div>...figures...</div> },
  { key: 'demo', label: '// Live Demo', showPlaceholderWhenEmpty: false,
    hasContent: p => p.hasDemo === true, render: (p, ctx) => <div>...Launch Demo...</div> },
]
```

`ProjectDetail.tsx` shrinks to: filter `PROJECT_SECTIONS` down to the ones
that will actually render (`hasContent(project) || showPlaceholderWhenEmpty`),
map over that filtered list computing each `Section`'s stagger `delay` from
its position (`0.1 + i * 0.05`) instead of a hardcoded literal per block —
this also fixes a latent bug where a hidden section (no images, no demo)
currently leaves a gap in the stagger sequence instead of the next visible
section closing it up. The header, breadcrumb, metadata row, and prev/next
nav are unaffected — they aren't optional per-project content and stay as
direct JSX.

Adding a future field (a `tradeoffs` field from the Archive/pages spec, a
GitHub-stats block from the Backend spec) becomes: add it to the Zod
schema from section 1, add one object to `PROJECT_SECTIONS`. No edits to
`ProjectDetail.tsx` itself.

## 4. Component tests (frontend)

Vitest + `@testing-library/react` + `jsdom`. One test file per demo under
`src/pages/demos/*.tsx` (7 files) covering: initial render, a mocked
success path (`fetch`/`EventSource`/`WebSocket` mocked, asserting the
UI reflects a received message), and a mocked failure path (asserting the
existing cold-start/error copy renders, not a crash). `ProtectedRoute` and
`Demo.tsx`'s dispatch (`DEMOS[slug]`) also get a test each: known slug
renders the right component, unknown slug redirects.

`ProjectDetail.test.tsx` tests the section-descriptor renderer from
section 3 directly against fixture `Project` objects: a minimal project
(only required fields) renders Overview/Challenge/Approach/Key Features as
placeholders and does not render an Evidence or Live Demo section at all;
a project with `images` renders exactly that many `<figure>` elements; a
project with `hasDemo: false` renders no Live Demo section regardless of
`isSignedIn`. Animation delay values themselves aren't asserted — timing
isn't a regression risk worth pinning down, only section presence, absence,
and order are.

## 5. Worker proxy consistency refactor

Each of the 4 `workers/<name>/` projects is an independent Wrangler
package with no shared code (per `CLAUDE.md` — this fix keeps that
architecture, it's a copy-paste-consistently fix across 4 independent
files, not a new shared package/monorepo restructuring, which would be a
bigger architectural change out of scope here). Four concrete
inconsistencies, confirmed by direct read of all 4 `workers/*/src/index.ts`:

- **CORS localhost allowance**: `microagent-proxy/src/index.ts:14` is the
  only one that allows a local origin
  (`origin === ALLOWED_ORIGIN || /^https?:\/\/localhost(:\d+)?$/.test(origin)`).
  `document-scanner-proxy/src/index.ts:2`, `llm-inference-proxy/src/index.ts:2`,
  and `weather-proxy/src/index.ts:2` all hardcode
  `ALLOWED_ORIGIN = 'https://owenbeckettjones.com'` with no local exception —
  meaning 3 of 4 demos can't be exercised against their real worker from
  `npm run dev`. Fix: apply `microagent-proxy`'s exact origin-check pattern
  to the other 3.
- **Missing `tsconfig.json`**: `weather-proxy` has none at all (confirmed —
  not just a missing field). `@cloudflare/workers-types` is installed as a
  devDependency but nothing references it. Fix: copy the identical
  `tsconfig.json` the other 3 workers already share.
- **Upstream CORS header leakage**: `document-scanner-proxy/src/index.ts:37-39`
  explicitly filters `access-control-*` keys out of the upstream response
  before merging its own CORS headers; `weather-proxy/src/index.ts:33`
  builds `{ ...Object.fromEntries(response.headers), ...CORS_HEADERS }`
  with no filter. This doesn't currently produce the literal duplicate-header
  bug (`CORS_HEADERS` spreads last and wins for any key upstream also
  sends), but any upstream header with no `CORS_HEADERS` equivalent — e.g.
  `Access-Control-Allow-Credentials` — leaks through unfiltered. Fix: apply
  `document-scanner-proxy`'s filter to `weather-proxy` for the same
  defense-in-depth, not because the literal bug reproduces today.
- **Missing `.dev.vars.example`**: only `weather-proxy` and
  `llm-inference-proxy` have one; `document-scanner-proxy` and
  `microagent-proxy` don't (this is the opposite of what `CLAUDE.md`
  currently claims). Fix: add one to each of the two missing workers,
  matching the `TOKEN=...` pattern the existing ones use.

`CLAUDE.md`'s "Worker proxies" section gets corrected alongside the code
fix — its `.dev.vars.example` and CORS-localhost claims are currently
wrong in ways this section's fixes make newly true (CORS) or that were
already false (`.dev.vars.example`).

## 6. Worker unit tests

Each of the 4 `workers/<name>/` projects gets its own `vitest`
devDependency and a `src/index.test.ts` testing the exported `fetch`
handler directly with a mocked `fetch`/`env`, covering: CORS allow (prod
origin), CORS allow (localhost — uniform across all 4 now that section 5
has landed), CORS deny (arbitrary origin), and the secret-injection header
is present on the outbound request. `llm-inference-proxy`
additionally gets a test for the polling loop's chunk-forwarding logic
(the "each poll's `stream` array is only new chunks" behavior documented in
`CLAUDE.md` — this is exactly the class of bug that shipped once already
and unit tests are the right tool to pin it down).

## 7. Clerk local-dev bypass (pulled in from Site-hygiene)

Add a dev-only escape hatch to `ProtectedRoute` gated behind
`import.meta.env.DEV && import.meta.env.VITE_SKIP_AUTH === 'true'`, so it's
impossible to accidentally ship in a production build regardless of env
misconfiguration. Documented in `CLAUDE.md` as a local-only var, not added
to `deploy.yml`'s secrets or GitHub Actions. This unblocks Playwright e2e
on the demo route without weakening the real auth gate.

## 8. E2E tests (Playwright)

New `e2e/` directory at repo root. One spec per top-level route
(Home/About/Projects/Archive/Contact/ProjectDetail) plus one per demo,
using the `VITE_SKIP_AUTH` bypass from section 7 to reach
`/projects/:slug/demo` without real Clerk credentials. Network calls to
external APIs are mocked at the Playwright route level (`page.route(...)`)
so e2e runs don't depend on live Railway/RunPod backends being up. Assertion
bar per demo: mounts without a console error, reaches a "ready/connected"
state, and a mocked message round-trips into the UI — not full behavioral
coverage of each backend, since that's out of reach without live
integration tests (explicitly out of scope, see below).

## 9. CI restructure

New `.github/workflows/ci.yml`, triggered on `pull_request` and on push to
`main` (running independently of, and before, `deploy.yml` — not a
`needs:` dependency between the two workflows, since `deploy.yml`'s trigger
and job structure stay untouched per the scope note above). Jobs:

- `typecheck` — `npm run typecheck`
- `lint` — new: adds ESLint (flat config, `typescript-eslint` +
  `eslint-plugin-react-hooks`), since there is currently no lint
  configuration anywhere in the repo and this is cheap to add alongside
  the rest of this spec's tooling work
- `test` — `npm run test` (Vitest, frontend) plus one step per worker
  running that worker's own `npm test`
- `e2e` — Playwright, runs last since it's the slowest

Gating actual merges to `main` on this workflow passing requires a GitHub
branch-protection rule (a repo settings change, not a code change) —
flagged as a decision to make together, not something this spec's
implementation touches unilaterally.

## Explicitly out of scope

- Visual regression testing (no tooling proposed — not warranted for a
  personal site at this scale).
- Live integration tests against the real Railway/RunPod backends (only
  the Worker proxy logic and mocked frontend paths are covered).
- Adding any *new* optional `Project` field (a `tradeoffs` field, GitHub
  stats, SEO preview data) — section 3's refactor makes that cheap, but
  deciding what those fields actually are belongs to the Archive/pages and
  Backend specs, not this one.
- SEO/meta tags and accessibility fixes — Site-hygiene spec.
- `GeminiAudioDemo.tsx`'s hardcoded WebSocket URL — Site-hygiene spec (see
  Scope note above on why this one stays out despite being adjacent to
  section 5's worker-consistency fixes).
- Any shared-package/monorepo restructuring of the 4 workers — section 5
  keeps them independent, copy-paste-consistent files, matching the
  existing architecture.
