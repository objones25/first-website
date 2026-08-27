# GitHub stats + backend platform — design

## Scope

Add live GitHub repository stats (last commit date, commit count, stars,
primary language, open issue count) to the `/projects` list cards and each
project's detail page, fetched through a new Cloudflare Worker rather than
called directly from the browser. Alongside the immediate feature, this
spec settles the broader "should this site have a real backend" question
Owen raised: the answer is Cloudflare Workers + KV (cache) + D1 (future
persistent storage) as the standing platform, not a dedicated always-on
service (Railway, etc.) like the demo backends use. That decision is
scoped here; provisioning D1 and writing any schema is explicitly deferred
until a concrete feature needs it (see "Out of scope").

This is the second of four specs decomposing a broader "improve the site"
request (the others: Testing + schema refactor, Archive triage + project
pages, Site hygiene). This spec's GitHub-stats display slots naturally
into the `PROJECT_SECTIONS` config-driven renderer from the
Testing + schema refactor spec if that one ships first — not a hard
dependency, just cleaner sequencing if the order works out that way.

## 1. Why not a dedicated backend service (the platform decision)

The site's 4 existing Worker proxies already establish a "stateless
proxy + injected secret" pattern for Railway-hosted demo backends. Those
demo backends (weather API, document scanner, etc.) are real always-on
services because they run actual compute (model inference, OCR) that
Workers can't host. GitHub stats has no such requirement — it's read,
cache, serve. Cloudflare Workers + KV covers that fully, and Cloudflare D1
(SQLite-compatible, same `wrangler` tooling, same deploy story) covers
the "some persistent storage, not sure what yet" future case Owen flagged,
without taking on a second hosting provider, a database to operate, or an
always-on process to pay for, for a portfolio site's traffic level.

## 2. New worker: `workers/github-stats-proxy/`

Mirrors the existing 4 workers' exact shape — `src/index.ts` single-file
`fetch` handler, `wrangler.toml`, `tsconfig.json` with
`@cloudflare/workers-types`, `.dev.vars.example`, `package.json` with
`wrangler` as the only devDependency. CORS restricted to
`https://owenbeckettjones.com` + a `localhost` regex from day one
(following `microagent-proxy/src/index.ts:14`'s pattern, not the 3 workers
that need retrofitting in the Testing + schema refactor spec).

Bindings, both configured in `wrangler.toml`:
- KV namespace `GITHUB_STATS_CACHE` (created via `wrangler kv:namespace create`)
- Secret `GITHUB_TOKEN` (`wrangler secret put`, a fine-grained PAT scoped
  to public-repo read access only)

Endpoint: `GET /repo-stats?owner=<owner>&repo=<repo>`. The worker holds no
project→repo mapping of its own — `projects.ts`'s existing
`links: [{ label: 'GitHub', href: '...' }]` is already that mapping, so
the frontend parses `owner`/`repo` out of the href it already has and
passes them as query params.

## 3. Data flow

```
1. Frontend requests GET /repo-stats?owner=objones25&repo=llm-from-scratch
2. Worker checks GITHUB_STATS_CACHE for key `${owner}/${repo}`
   - Fresh (timestamp < 1hr old): return cached payload directly
   - Missing or stale: continue to step 3
3. Worker sends one GraphQL query to https://api.github.com/graphql,
   Authorization: Bearer ${GITHUB_TOKEN}, requesting in one round trip:
     - defaultBranchRef.target.history.totalCount   (commit count)
     - defaultBranchRef.target.committedDate          (last commit date)
     - stargazerCount
     - primaryLanguage.name
     - issues(states: OPEN) { totalCount }
4. On success: write { payload, fetchedAt } to KV, return payload
5. On failure (rate-limited, network error, repo not found):
     - If a stale KV entry exists, serve it anyway (better a slightly-old
       star count than nothing)
     - Otherwise return a typed error response
```

GraphQL over REST specifically because REST has no direct commit-count
field (the standard workaround is paginating with `per_page=1` and reading
the `Link` header's last-page number) — GraphQL's `history.totalCount`
gets it in the same query as everything else. This requires
authentication regardless (GitHub's GraphQL API has no unauthenticated
tier), which is what makes the `GITHUB_TOKEN` secret non-optional here,
unlike some of the other workers' secrets which exist for convenience
rather than a hard requirement.

No REST fallback if `GITHUB_TOKEN` is ever unset — that's a deploy-time
misconfiguration to fix, not a runtime condition to paper over, matching
how the other 4 workers already treat a missing secret (they don't
fallback either, they just fail).

The 1-hour KV TTL keeps worst-case GitHub call volume at 12 GraphQL calls
per cache-refresh cycle (one per project) regardless of visitor traffic,
far under the 5,000/hr authenticated ceiling — this is what actually makes
a shared server-side proxy viable; an unauthenticated 60/hr limit shared
across all site visitors would not survive even light traffic.

## 4. Frontend integration

New `src/hooks/useGithubStats.ts`: `useGithubStats(githubUrl: string)`
parses `owner`/`repo` from the URL, fetches
`${VITE_GITHUB_STATS_URL}/repo-stats?...`, returns
`{ data, loading, error }`. On `error`, callers render nothing extra for
that stat block rather than an error state — this is supplementary
information, not core page content, so it fails soft.

Display split:
- **`/projects` list cards**: minimal inline stat — star count + relative
  last-updated ("★ 3 · updated 2d ago") — so the grid doesn't get
  cluttered with 12 cards' worth of stats.
- **Project detail pages**: fuller set — the above plus commit count,
  primary language, open issue count — near the existing GitHub link.

New env var `VITE_GITHUB_STATS_URL`, added everywhere the existing 7 are:
`.env` (documented in `CLAUDE.md`), `.github/workflows/deploy.yml`'s
build-step secrets.

## Out of scope

- **D1 schema/migrations/tables.** This spec's D1 role is the
  architectural decision (Workers + KV + D1 is the platform), not a
  provisioned-ahead-of-need resource — there's no concrete consumer to
  design a schema against yet. The first feature that actually needs
  persistent storage (a contact-form inbox, a guestbook, cached
  analytics-over-time) creates and migrates its own D1 database then.
- **Comments, guestbook, contact-form inbox, or any other stateful
  feature.** These are what the platform decision unlocks, not what this
  spec builds.
- **Testing for `github-stats-proxy`.** Covered by the Testing + schema
  refactor spec's worker-unit-test pattern once this worker exists —
  written before this worker did, so its text only enumerates the 4
  workers that existed at the time, but the same pattern (mocked
  `fetch`/`env`, CORS allow/deny, secret-injection assertion) applies here
  too when this spec's implementation lands.
- **Retrofitting CORS/tsconfig consistency onto the 4 existing workers.**
  That's the Testing + schema refactor spec's job; this worker is written
  correctly from the start instead.
