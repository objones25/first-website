# Testing + schema refactor — design

## Scope

Establish a test suite and CI gate for a codebase that currently has zero
automated tests (frontend or the 4 `workers/`), no lint, and a `deploy.yml`
that ships straight to production on push to `main` off nothing stronger
than `vite build` (which does not run `tsc`). Combined with a targeted
refactor: replace the hand-written `Project`/`ArchiveProject` interfaces
with a Zod schema as the single source of truth, so the exact failure class
that risks recurring every time a project gains a new optional field (an
`images[].src` pointing at a file that doesn't exist, a `hasDemo: true`
with no matching `Demo.tsx` entry) is caught by a test instead of by luck.

This is one of four specs decomposing a broader "improve the site" request
(the others: Backend + GitHub API, Archive triage + project pages, Site
hygiene). Out of scope here: SEO/meta tags, worker CORS/tsconfig
consistency fixes, accessibility fixes, and any new project content — those
live in the Site-hygiene and Archive/pages specs.

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

## 3. Component tests (frontend)

Vitest + `@testing-library/react` + `jsdom`. One test file per demo under
`src/pages/demos/*.tsx` (7 files) covering: initial render, a mocked
success path (`fetch`/`EventSource`/`WebSocket` mocked, asserting the
UI reflects a received message), and a mocked failure path (asserting the
existing cold-start/error copy renders, not a crash). `ProtectedRoute` and
`Demo.tsx`'s dispatch (`DEMOS[slug]`) also get a test each: known slug
renders the right component, unknown slug redirects.

## 4. Worker unit tests

Each of the 4 `workers/<name>/` projects is an independent package — each
gets its own `vitest` devDependency and a `src/index.test.ts` testing the
exported `fetch` handler directly with a mocked `fetch`/`env`, covering:
CORS allow (prod origin), CORS deny (arbitrary origin), and the
secret-injection header is present on the outbound request. These tests
pin down each worker's *current* behavior, including the known gap that
only `microagent-proxy` currently allows a `localhost` origin — that gap
gets a dedicated CORS-allow-localhost test for `microagent-proxy` now, and
the other 3 workers get the same test added once the Site-hygiene spec
fixes their CORS allowlist (not this spec's job to fix, just to test
whatever's actually there). `llm-inference-proxy`
additionally gets a test for the polling loop's chunk-forwarding logic
(the "each poll's `stream` array is only new chunks" behavior documented in
`CLAUDE.md` — this is exactly the class of bug that shipped once already
and unit tests are the right tool to pin it down).

## 5. Clerk local-dev bypass (pulled in from Site-hygiene)

Add a dev-only escape hatch to `ProtectedRoute` gated behind
`import.meta.env.DEV && import.meta.env.VITE_SKIP_AUTH === 'true'`, so it's
impossible to accidentally ship in a production build regardless of env
misconfiguration. Documented in `CLAUDE.md` as a local-only var, not added
to `deploy.yml`'s secrets or GitHub Actions. This unblocks Playwright e2e
on the demo route without weakening the real auth gate.

## 6. E2E tests (Playwright)

New `e2e/` directory at repo root. One spec per top-level route
(Home/About/Projects/Archive/Contact/ProjectDetail) plus one per demo,
using the `VITE_SKIP_AUTH` bypass from section 5 to reach
`/projects/:slug/demo` without real Clerk credentials. Network calls to
external APIs are mocked at the Playwright route level (`page.route(...)`)
so e2e runs don't depend on live Railway/RunPod backends being up. Assertion
bar per demo: mounts without a console error, reaches a "ready/connected"
state, and a mocked message round-trips into the UI — not full behavioral
coverage of each backend, since that's out of reach without live
integration tests (explicitly out of scope, see below).

## 7. CI restructure

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
- Any structural refactor of `ProjectDetail.tsx`'s section rendering
  (considered as "Approach B" during brainstorming and explicitly rejected
  for now — 5 conditional sections across 12 projects doesn't yet justify
  a config-driven renderer; revisit if the Archive/pages or Backend specs
  add enough new optional fields to make the JSX blocks unwieldy).
- SEO/meta tags, worker CORS consistency fixes beyond what section 4's
  tests require to pass, accessibility fixes — all Site-hygiene spec.
