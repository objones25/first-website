# GitHub Stats Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add live GitHub repo stats (stars, last-commit date, commit count, primary language, open issues) to the `/projects` list, the `/archive` list, and each project's detail page, served through a new Cloudflare Worker (`workers/github-stats-proxy/`) backed by a KV cache — not called from the browser directly.

**Architecture:** A single-file Worker (mirroring the site's 4 existing proxies) exposes `GET /repo-stats?owner=&repo=`. It checks a KV cache (1hr TTL) first, otherwise makes one GitHub GraphQL query (commit count, last commit date, stars, primary language, open issues in one round trip), caches the result, and serves stale cache on any upstream failure rather than erroring. The frontend gets a `useGithubStats(githubUrl)` hook that parses `owner`/`repo` out of a GitHub URL already present in `projects.ts`/`archive.ts` and fails soft (renders nothing) on error.

**Tech Stack:** Cloudflare Workers, Cloudflare KV, GitHub GraphQL API v4, React 19, TypeScript, Vite.

**Spec:** `docs/superpowers/specs/2026-08-27-github-stats-backend-design.md`

## Global Constraints

- CORS origin check must echo the actual validated `Origin` (allow `https://owenbeckettjones.com` exactly, or `http(s)://localhost(:port)?` via regex) back as `Access-Control-Allow-Origin` — never a single hardcoded string. This is `workers/microagent-proxy/src/index.ts`'s pattern; `weather-proxy` and `document-scanner-proxy` use the hardcoded-string version, which is a known bug (blocks local dev), not the pattern to copy.
- No REST fallback if `GITHUB_TOKEN` is unset. A missing secret is a deploy-time misconfiguration to fix, not a runtime condition to handle gracefully — matches all 4 existing workers.
- GraphQL over REST, specifically because REST has no direct commit-count field.
- 1-hour KV cache TTL. On any upstream failure, serve stale cache if present rather than erroring.
- Frontend stats are supplementary, not core content: `useGithubStats` returns `{ data, loading, error }`, and every caller renders nothing extra when `error` is true or `data` is null — no error banners, no broken-looking placeholders.
- **No test runner exists in this repo** (frontend: no vitest/jest/lint script; workers: no test framework wired up yet — that's the separate Testing + schema refactor spec's job, explicitly out of scope here per the spec's "Out of scope" section). Every task's verification step is therefore `npx tsc --noEmit` (or root `npm run typecheck`) plus a concrete manual check (`curl` against `wrangler dev`, or a browser check against `npm run dev`) instead of an automated test. Do not invent a test framework to satisfy this plan's template — follow the manual-verification steps as written.
- Match the existing workers' exact file shape: `src/index.ts` single-file `fetch` handler, `wrangler.toml` with only `name`/`main`/`compatibility_date` (+ this worker's `kv_namespaces` block), `tsconfig.json` targeting `@cloudflare/workers-types`, `package.json` with `wrangler` as the only devDependency.
- D1, comments/guestbook/contact-form-inbox, and CORS retrofits on the 4 existing workers are explicitly out of scope for this plan (see spec's "Out of scope").

---

### Task 1: Scaffold `workers/github-stats-proxy/`

**Files:**
- Create: `workers/github-stats-proxy/package.json`
- Create: `workers/github-stats-proxy/tsconfig.json`
- Create: `workers/github-stats-proxy/wrangler.toml`
- Create: `workers/github-stats-proxy/.dev.vars.example`
- Create: `workers/github-stats-proxy/src/index.ts` (stub, replaced fully in Task 3)

**Interfaces:**
- Consumes: nothing (new project)
- Produces: an installable, typecheckable worker project skeleton other tasks build on

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "github-stats-proxy",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20250109.0",
    "wrangler": "^3.0.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "types": ["@cloudflare/workers-types"],
    "strict": true,
    "noEmit": true
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 3: Create `wrangler.toml`**

```toml
name = "github-stats-proxy"
main = "src/index.ts"
compatibility_date = "2025-01-01"
```

(Task 2 appends the `kv_namespaces` block once the namespace exists — don't invent an `id` here.)

- [ ] **Step 4: Create `.dev.vars.example`**

```
GITHUB_TOKEN=your-fine-grained-pat-here
```

- [ ] **Step 5: Create a stub `src/index.ts`**

```ts
export default {
  async fetch(): Promise<Response> {
    return new Response('not implemented', { status: 501 })
  },
}
```

- [ ] **Step 6: Install dependencies**

Run: `cd workers/github-stats-proxy && npm install`
Expected: `node_modules/` created, `package-lock.json` created, no errors.

- [ ] **Step 7: Verify the stub typechecks**

Run: `cd workers/github-stats-proxy && npx tsc --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 8: Commit**

```bash
git add workers/github-stats-proxy/package.json workers/github-stats-proxy/package-lock.json \
  workers/github-stats-proxy/tsconfig.json workers/github-stats-proxy/wrangler.toml \
  workers/github-stats-proxy/.dev.vars.example workers/github-stats-proxy/src/index.ts \
  workers/github-stats-proxy/.gitignore
git commit -m "scaffold: github-stats-proxy worker project"
```

(If `.gitignore` doesn't exist yet in the worker dir, add one with `node_modules/` and `.dev.vars` — copy `workers/weather-proxy/.gitignore` if present, otherwise create it with those two lines.)

---

### Task 2: Provision the KV namespace and `GITHUB_TOKEN` secret

This is Cloudflare account-side provisioning — there's nothing to unit test, only commands to run and outputs to record.

**Files:**
- Modify: `workers/github-stats-proxy/wrangler.toml` (add `kv_namespaces`)
- Create (untracked, local only): `workers/github-stats-proxy/.dev.vars`

**Interfaces:**
- Consumes: Task 1's scaffold
- Produces: a real KV namespace binding (`GITHUB_STATS_CACHE`) and a real `GITHUB_TOKEN` secret, both required by Task 3's worker code

- [ ] **Step 1: Create the KV namespace**

Run: `cd workers/github-stats-proxy && npx wrangler kv:namespace create GITHUB_STATS_CACHE`
Expected output includes a TOML snippet like:
```toml
[[kv_namespaces]]
binding = "GITHUB_STATS_CACHE"
id = "<some-hex-id>"
```
(If not already logged in, `wrangler` will prompt an OAuth login first — complete it, then re-run the command.)

- [ ] **Step 2: Append that snippet to `wrangler.toml`**

`workers/github-stats-proxy/wrangler.toml` should now read:

```toml
name = "github-stats-proxy"
main = "src/index.ts"
compatibility_date = "2025-01-01"

[[kv_namespaces]]
binding = "GITHUB_STATS_CACHE"
id = "<the id from Step 1>"
```

- [ ] **Step 3: Create a fine-grained GitHub PAT**

At https://github.com/settings/personal-access-tokens/new: no repository access needed beyond "Public Repositories (read-only)" — this token only ever reads public repo metadata via GraphQL. Copy the token value; it's shown once.

- [ ] **Step 4: Put the secret on the deployed worker**

Run: `npx wrangler secret put GITHUB_TOKEN`
Paste the token from Step 3 when prompted.
Expected: `Success! Uploaded secret GITHUB_TOKEN`.

- [ ] **Step 5: Create `.dev.vars` for local testing**

Create `workers/github-stats-proxy/.dev.vars` (git-ignored, never commit this):
```
GITHUB_TOKEN=<the same token from Step 3>
```

- [ ] **Step 6: Commit the wrangler.toml change only**

```bash
git add workers/github-stats-proxy/wrangler.toml
git commit -m "config: provision github-stats-proxy KV namespace"
```

(`.dev.vars` must NOT be committed — confirm `git status` doesn't list it. If it does, check the worker's `.gitignore` includes `.dev.vars` before committing anything else.)

---

### Task 3: Implement the worker's GraphQL + caching logic

**Files:**
- Modify: `workers/github-stats-proxy/src/index.ts` (replace the Task 1 stub entirely)

**Interfaces:**
- Consumes: `env.GITHUB_STATS_CACHE` (KV binding) and `env.GITHUB_TOKEN` (secret) from Task 2
- Produces: `GET /repo-stats?owner=<owner>&repo=<repo>` returning JSON body
  `{ commitCount: number, lastCommitDate: string, stars: number, primaryLanguage: string | null, openIssues: number }`
  on success, or `{ error: string }` with a non-2xx status on failure. This is the exact shape Task 6's `useGithubStats` hook parses.

- [ ] **Step 1: Replace `src/index.ts` with the full implementation**

```ts
const ALLOWED_ORIGIN = 'https://owenbeckettjones.com'
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

interface Env {
  GITHUB_STATS_CACHE: KVNamespace
  GITHUB_TOKEN: string
}

interface RepoStats {
  commitCount: number
  lastCommitDate: string
  stars: number
  primaryLanguage: string | null
  openIssues: number
}

interface CacheEntry {
  payload: RepoStats
  fetchedAt: number
}

interface GraphQLResponse {
  data?: {
    repository: {
      defaultBranchRef: {
        target: {
          history: { totalCount: number }
          committedDate: string
        }
      } | null
      stargazerCount: number
      primaryLanguage: { name: string } | null
      issues: { totalCount: number }
    } | null
  }
  errors?: { message: string }[]
}

const QUERY = `
  query($owner: String!, $repo: String!) {
    repository(owner: $owner, name: $repo) {
      defaultBranchRef {
        target {
          ... on Commit {
            history { totalCount }
            committedDate
          }
        }
      }
      stargazerCount
      primaryLanguage { name }
      issues(states: OPEN) { totalCount }
    }
  }
`

function isAllowedOrigin(origin: string): boolean {
  return origin === ALLOWED_ORIGIN || /^https?:\/\/localhost(:\d+)?$/.test(origin)
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': isAllowedOrigin(origin) ? origin : ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

function jsonResponse(body: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  })
}

async function fetchFromGitHub(owner: string, repo: string, token: string): Promise<RepoStats> {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      // GitHub's API rejects requests with no User-Agent.
      'User-Agent': 'owenbeckettjones-portfolio-github-stats-proxy',
    },
    body: JSON.stringify({ query: QUERY, variables: { owner, repo } }),
  })

  if (!res.ok) {
    throw new Error(`GitHub API responded ${res.status}`)
  }

  const json = await res.json<GraphQLResponse>()

  if (json.errors?.length) {
    throw new Error(json.errors[0].message)
  }

  const repository = json.data?.repository
  if (!repository) {
    throw new Error('repository not found')
  }

  return {
    commitCount: repository.defaultBranchRef?.target.history.totalCount ?? 0,
    lastCommitDate: repository.defaultBranchRef?.target.committedDate ?? '',
    stars: repository.stargazerCount,
    primaryLanguage: repository.primaryLanguage?.name ?? null,
    openIssues: repository.issues.totalCount,
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin') ?? ''
    const headers = corsHeaders(origin)

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers })
    }

    if (!isAllowedOrigin(origin)) {
      return new Response('Forbidden', { status: 403, headers })
    }

    const url = new URL(request.url)
    const owner = url.searchParams.get('owner')
    const repo = url.searchParams.get('repo')
    if (!owner || !repo) {
      return jsonResponse({ error: 'owner and repo query params are required' }, 400, headers)
    }

    const cacheKey = `${owner}/${repo}`
    const cached = await env.GITHUB_STATS_CACHE.get<CacheEntry>(cacheKey, 'json')

    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return jsonResponse(cached.payload, 200, headers)
    }

    try {
      const payload = await fetchFromGitHub(owner, repo, env.GITHUB_TOKEN)
      const entry: CacheEntry = { payload, fetchedAt: Date.now() }
      await env.GITHUB_STATS_CACHE.put(cacheKey, JSON.stringify(entry))
      return jsonResponse(payload, 200, headers)
    } catch (err) {
      if (cached) {
        // Stale data beats no data — the whole point of a 1hr TTL is that
        // slightly-old stats are fine, an error where a star count used to be isn't.
        return jsonResponse(cached.payload, 200, headers)
      }
      const message = err instanceof Error ? err.message : 'unknown error'
      return jsonResponse({ error: message }, 502, headers)
    }
  },
}
```

- [ ] **Step 2: Typecheck**

Run: `cd workers/github-stats-proxy && npx tsc --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 3: Start the worker locally**

Run: `cd workers/github-stats-proxy && npx wrangler dev` (leave running in this terminal for the rest of this task)
Expected: `Ready on http://localhost:8787` (or similar).

- [ ] **Step 4: Verify missing-params validation**

In another terminal: `curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:8787/repo-stats"`
Expected: `400`

- [ ] **Step 5: Verify CORS allows localhost**

Run: `curl -s -D - -o /dev/null -H "Origin: http://localhost:3000" "http://localhost:8787/repo-stats?owner=objones25&repo=microagent" | grep -i access-control-allow-origin`
Expected: `access-control-allow-origin: http://localhost:3000` (the echoed origin, not the hardcoded production string — this is the check that catches the weather-proxy/document-scanner-proxy bug from creeping back in).

- [ ] **Step 6: Verify CORS rejects an unrelated origin**

Run: `curl -s -o /dev/null -w "%{http_code}\n" -H "Origin: https://evil.example.com" "http://localhost:8787/repo-stats?owner=objones25&repo=microagent"`
Expected: `403`

- [ ] **Step 7: Verify a real end-to-end GraphQL round trip**

Run: `curl -s -H "Origin: http://localhost:3000" "http://localhost:8787/repo-stats?owner=objones25&repo=microagent" | python3 -m json.tool`
Expected: a JSON object with `commitCount` (number > 0), `lastCommitDate` (ISO 8601 string), `stars` (number), `primaryLanguage` (string, likely `"Python"`), `openIssues` (number) — all real values from the actual public `objones25/microagent` repo.

- [ ] **Step 8: Verify the cache actually short-circuits the second call**

Run the same command from Step 7 again immediately after.
Expected: same payload, and no delay (GraphQL round trip is ~200-500ms; a cache hit should feel instant — this isn't a precise timing assertion, just confirm it doesn't visibly hang).

- [ ] **Step 9: Stop `wrangler dev`, commit**

```bash
git add workers/github-stats-proxy/src/index.ts
git commit -m "feat: implement github-stats-proxy GraphQL + KV caching"
```

---

### Task 4: Deploy the worker

**Files:** none (deploy only)

**Interfaces:**
- Consumes: Task 3's implementation, Task 2's provisioned KV + secret
- Produces: a live worker URL — record it, Task 5 needs it

- [ ] **Step 1: Deploy**

Run: `cd workers/github-stats-proxy && npx wrangler deploy`
Expected output includes a line like:
```
Published github-stats-proxy (X.XX sec)
  https://github-stats-proxy.owenbeckettjones.workers.dev
```
Record that URL — it's `VITE_GITHUB_STATS_URL`'s value in Task 5.

- [ ] **Step 2: Verify the live worker**

Run: `curl -s "https://github-stats-proxy.owenbeckettjones.workers.dev/repo-stats?owner=objones25&repo=microagent" -H "Origin: https://owenbeckettjones.com" | python3 -m json.tool`
Expected: same JSON shape as Task 3 Step 7, served by the real deployed worker this time.

- [ ] **Step 3: Nothing to commit**

(Deployment is not tracked in git — `wrangler deploy` ships whatever's already committed. If Step 1 fails because of uncommitted changes, go back and commit Task 3 first.)

---

### Task 5: Wire `VITE_GITHUB_STATS_URL` everywhere the existing 7 vars live

**Files:**
- Modify (local only, untracked): `.env`
- Modify: `CLAUDE.md:24`
- Modify: `.github/workflows/deploy.yml:37-44`

**Interfaces:**
- Consumes: Task 4's live worker URL
- Produces: `import.meta.env.VITE_GITHUB_STATS_URL` available to the frontend build, locally and in CI — Task 6 reads it

- [ ] **Step 1: Add to local `.env`**

Append to `/Users/theelusivegerbilfish/Website/.env`:
```
VITE_GITHUB_STATS_URL=https://github-stats-proxy.owenbeckettjones.workers.dev
```
(Use the exact URL from Task 4 Step 1 — don't guess the subdomain.)

- [ ] **Step 2: Update `CLAUDE.md`'s documented env var list**

In `CLAUDE.md`, find this line (currently line 24):
```
There's no root env template — a local `.env` needs `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_BRAVE_SEARCH_AGENT_URL`, `VITE_WEATHER_API_URL`, `VITE_MICROAGENT_WS_URL`, `VITE_DOCUMENT_SCANNER_URL`, `VITE_SNAKE_API_URL`, `VITE_LLM_INFERENCE_URL` (same names used as GitHub Actions secrets in `deploy.yml`).
```
Replace it with:
```
There's no root env template — a local `.env` needs `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_BRAVE_SEARCH_AGENT_URL`, `VITE_WEATHER_API_URL`, `VITE_MICROAGENT_WS_URL`, `VITE_DOCUMENT_SCANNER_URL`, `VITE_SNAKE_API_URL`, `VITE_LLM_INFERENCE_URL`, `VITE_GITHUB_STATS_URL` (same names used as GitHub Actions secrets in `deploy.yml`).
```

- [ ] **Step 3: Add a GitHub Actions repo secret**

In the GitHub repo's Settings → Secrets and variables → Actions, add a new secret named `VITE_GITHUB_STATS_URL` with the same value as Step 1. (This is a manual step in the GitHub UI — there's no CLI command to script here without `gh secret set`, which is fine to use instead if preferred: `gh secret set VITE_GITHUB_STATS_URL --body "https://github-stats-proxy.owenbeckettjones.workers.dev"`.)

- [ ] **Step 4: Add to `deploy.yml`'s build-step secrets**

In `.github/workflows/deploy.yml`, the build step currently reads:
```yaml
      - name: Build
        run: npm run build
        env:
          VITE_CLERK_PUBLISHABLE_KEY: ${{ secrets.VITE_CLERK_PUBLISHABLE_KEY }}
          VITE_BRAVE_SEARCH_AGENT_URL: ${{ secrets.VITE_BRAVE_SEARCH_AGENT_URL }}
          VITE_WEATHER_API_URL: ${{ secrets.VITE_WEATHER_API_URL }}
          VITE_MICROAGENT_WS_URL: ${{ secrets.VITE_MICROAGENT_WS_URL }}
          VITE_DOCUMENT_SCANNER_URL: ${{ secrets.VITE_DOCUMENT_SCANNER_URL }}
          VITE_SNAKE_API_URL: ${{ secrets.VITE_SNAKE_API_URL }}
          VITE_LLM_INFERENCE_URL: ${{ secrets.VITE_LLM_INFERENCE_URL }}
```
Add one line so it reads:
```yaml
      - name: Build
        run: npm run build
        env:
          VITE_CLERK_PUBLISHABLE_KEY: ${{ secrets.VITE_CLERK_PUBLISHABLE_KEY }}
          VITE_BRAVE_SEARCH_AGENT_URL: ${{ secrets.VITE_BRAVE_SEARCH_AGENT_URL }}
          VITE_WEATHER_API_URL: ${{ secrets.VITE_WEATHER_API_URL }}
          VITE_MICROAGENT_WS_URL: ${{ secrets.VITE_MICROAGENT_WS_URL }}
          VITE_DOCUMENT_SCANNER_URL: ${{ secrets.VITE_DOCUMENT_SCANNER_URL }}
          VITE_SNAKE_API_URL: ${{ secrets.VITE_SNAKE_API_URL }}
          VITE_LLM_INFERENCE_URL: ${{ secrets.VITE_LLM_INFERENCE_URL }}
          VITE_GITHUB_STATS_URL: ${{ secrets.VITE_GITHUB_STATS_URL }}
```

- [ ] **Step 5: Verify Vite picks up the local var**

Run: `npm run dev`, then in another terminal: `curl -s http://localhost:3000/ > /dev/null && echo "server up"` (just confirms dev server starts without error after the `.env` edit — the var itself is exercised in Task 6).
Stop the dev server after.

- [ ] **Step 6: Commit (excluding `.env`, which is git-ignored)**

```bash
git add CLAUDE.md .github/workflows/deploy.yml
git commit -m "docs: wire VITE_GITHUB_STATS_URL env var"
```

---

### Task 6: `useGithubStats` hook + `GithubStatsBadge` + wire into `Projects.tsx`

**Files:**
- Create: `src/lib/formatRelativeTime.ts`
- Create: `src/hooks/useGithubStats.ts`
- Create: `src/components/GithubStatsBadge.tsx`
- Modify: `src/pages/Projects.tsx`

**Interfaces:**
- Consumes: `VITE_GITHUB_STATS_URL` (Task 5), the worker's `RepoStats` JSON shape (Task 3), `Project.links` (existing, `src/types/index.ts`)
- Produces:
  - `formatRelativeTime(isoDate: string): string` — exported from `src/lib/formatRelativeTime.ts`
  - `useGithubStats(githubUrl: string | undefined): { data: GithubStats | null; loading: boolean; error: boolean }` and the exported `GithubStats` interface — from `src/hooks/useGithubStats.ts`. Tasks 7 and 8 both import this hook directly.
  - `GithubStatsBadge({ githubUrl }: { githubUrl?: string })` — from `src/components/GithubStatsBadge.tsx`, the compact "★ N · updated Xd ago" variant. Task 7 imports this directly.

- [ ] **Step 1: Create `src/lib/formatRelativeTime.ts`**

```ts
export function formatRelativeTime(isoDate: string): string {
  const then = new Date(isoDate).getTime()
  if (Number.isNaN(then)) return ''

  const diffDays = Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24))
  if (diffDays <= 0) return 'today'
  if (diffDays === 1) return '1d ago'
  if (diffDays < 30) return `${diffDays}d ago`

  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths < 12) return `${diffMonths}mo ago`

  return `${Math.floor(diffDays / 365)}y ago`
}
```

- [ ] **Step 2: Create `src/hooks/useGithubStats.ts`**

```ts
import { useEffect, useState } from 'react'

const WORKER_URL = import.meta.env.VITE_GITHUB_STATS_URL as string

export interface GithubStats {
  commitCount: number
  lastCommitDate: string
  stars: number
  primaryLanguage: string | null
  openIssues: number
}

interface UseGithubStatsResult {
  data: GithubStats | null
  loading: boolean
  error: boolean
}

function parseOwnerRepo(githubUrl: string): { owner: string; repo: string } | null {
  const match = githubUrl.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+?)\/?$/)
  if (!match) return null
  return { owner: match[1], repo: match[2] }
}

export function useGithubStats(githubUrl: string | undefined): UseGithubStatsResult {
  const [data, setData] = useState<GithubStats | null>(null)
  const [loading, setLoading] = useState(!!githubUrl)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!githubUrl) {
      setLoading(false)
      return
    }

    const parsed = parseOwnerRepo(githubUrl)
    if (!parsed) {
      setLoading(false)
      setError(true)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(false)

    fetch(`${WORKER_URL}/repo-stats?owner=${parsed.owner}&repo=${parsed.repo}`)
      .then(res => {
        if (!res.ok) throw new Error(`status ${res.status}`)
        return res.json() as Promise<GithubStats>
      })
      .then(json => {
        if (cancelled) return
        setData(json)
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setError(true)
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [githubUrl])

  return { data, loading, error }
}
```

- [ ] **Step 3: Create `src/components/GithubStatsBadge.tsx`**

```tsx
import { useGithubStats } from '@/hooks/useGithubStats'
import { formatRelativeTime } from '@/lib/formatRelativeTime'

export function GithubStatsBadge({ githubUrl }: { githubUrl?: string }) {
  const { data, error } = useGithubStats(githubUrl)

  if (!githubUrl || error || !data) return null

  return (
    <span className="mono text-text-dim text-xs whitespace-nowrap">
      ★ {data.stars} · updated {formatRelativeTime(data.lastCommitDate)}
    </span>
  )
}
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: no output, exit code 0.

- [ ] **Step 5: Wire into `src/pages/Projects.tsx`**

Add the import at the top of the file (after the existing imports):
```tsx
import { GithubStatsBadge } from '@/components/GithubStatsBadge'
```

Find this block (currently around line 49-59):
```tsx
                <div>
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className="text-base font-medium group-hover:text-text-muted transition-colors duration-200">
                      {project.title}
                    </span>
                    <span className="text-xs text-text-muted">{project.year}</span>
                  </div>
                  <p className="text-sm text-text-muted leading-relaxed">
                    {project.description}
                  </p>
                </div>
```
Replace it with (adds the badge on its own line under the description, reading `project.links` for the GitHub URL the same way `ProjectDetail.tsx` already does):
```tsx
                <div>
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className="text-base font-medium group-hover:text-text-muted transition-colors duration-200">
                      {project.title}
                    </span>
                    <span className="text-xs text-text-muted">{project.year}</span>
                  </div>
                  <p className="text-sm text-text-muted leading-relaxed mb-1.5">
                    {project.description}
                  </p>
                  <GithubStatsBadge
                    githubUrl={project.links?.find(l => l.label === 'GitHub')?.href}
                  />
                </div>
```

- [ ] **Step 6: Typecheck again**

Run: `npm run typecheck`
Expected: no output, exit code 0.

- [ ] **Step 7: Visual verification**

Run: `npm run dev`, open `http://localhost:3000/projects` in a browser.
Expected: each project card with a GitHub link shows "★ N · updated Xd ago" in small dim text under its description, within a second or two of page load (network round trip to the worker). Cards without a GitHub link show nothing extra — no empty space, no error text. Stop the dev server after.

- [ ] **Step 8: Commit**

```bash
git add src/lib/formatRelativeTime.ts src/hooks/useGithubStats.ts \
  src/components/GithubStatsBadge.tsx src/pages/Projects.tsx
git commit -m "feat: live GitHub stats badge on /projects list"
```

---

### Task 7: Wire `GithubStatsBadge` into `Archive.tsx`

`archive.ts`'s `ArchiveProject` has a plain `href?: string` (not the `links: ProjectLink[]` array `Project` uses), so the badge is wired up directly against `project.href` here — same component, different data shape than Task 6.

**Files:**
- Modify: `src/pages/Archive.tsx`

**Interfaces:**
- Consumes: `GithubStatsBadge` from Task 6, `ArchiveProject.href` (existing, `src/data/archive.ts:6`)

- [ ] **Step 1: Add the import**

At the top of `src/pages/Archive.tsx`, after the existing imports:
```tsx
import { GithubStatsBadge } from '@/components/GithubStatsBadge'
```

- [ ] **Step 2: Add the badge to the row layout**

Find this block (currently around line 65-73):
```tsx
                <div>
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className="text-base font-medium">{project.title}</span>
                    <span className="text-xs text-text-muted">{project.year}</span>
                  </div>
                  <p className="text-sm text-text-muted leading-relaxed">
                    {project.description}
                  </p>
                </div>
```
Replace it with:
```tsx
                <div>
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className="text-base font-medium">{project.title}</span>
                    <span className="text-xs text-text-muted">{project.year}</span>
                  </div>
                  <p className="text-sm text-text-muted leading-relaxed mb-1.5">
                    {project.description}
                  </p>
                  <GithubStatsBadge githubUrl={project.href} />
                </div>
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: no output, exit code 0.

- [ ] **Step 4: Visual verification**

Run: `npm run dev`, open `http://localhost:3000/archive` in a browser.
Expected: every row (all 12 currently have an `href`) shows "★ N · updated Xd ago" under its description, same styling as the `/projects` page. Stop the dev server after.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Archive.tsx
git commit -m "feat: live GitHub stats badge on /archive list"
```

---

### Task 8: Full stat block on `ProjectDetail.tsx`

**Files:**
- Modify: `src/pages/ProjectDetail.tsx`

**Interfaces:**
- Consumes: `useGithubStats` and `GithubStats` from Task 6 (`src/hooks/useGithubStats.ts`), `formatRelativeTime` from Task 6 (`src/lib/formatRelativeTime.ts`), `Project.links` (existing)

- [ ] **Step 1: Add imports**

At the top of `src/pages/ProjectDetail.tsx`, after the existing imports:
```tsx
import { useGithubStats } from '@/hooks/useGithubStats'
import { formatRelativeTime } from '@/lib/formatRelativeTime'
```

- [ ] **Step 2: Add the `GithubStatsFull` component**

Add this near the other small components at the bottom of the file (alongside `Section`/`Placeholder`/`DataTableBlock`):

```tsx
// ── Full GitHub stats block ───────────────────────────────────────────────────
function GithubStatsFull({ githubUrl }: { githubUrl?: string }) {
  const { data, error } = useGithubStats(githubUrl)

  if (!githubUrl || error || !data) return null

  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1 mono text-text-muted text-xs mt-3">
      <span>★ {data.stars}</span>
      <span>{data.commitCount} commits</span>
      {data.primaryLanguage && <span>{data.primaryLanguage}</span>}
      <span>{data.openIssues} open issues</span>
      <span>updated {formatRelativeTime(data.lastCommitDate)}</span>
    </div>
  )
}
```

- [ ] **Step 3: Render it near the existing GitHub link**

Find this block in the header (currently around line 73-92):
```tsx
            {/* Links */}
            {project.links && project.links.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="flex flex-col gap-2 shrink-0 pt-2"
              >
                {project.links.map(link => (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mono text-text-muted hover:text-text transition-colors duration-200 uppercase tracking-wider"
                  >
                    [ {link.label} ↗ ]
                  </a>
                ))}
              </motion.div>
            )}
```
Replace it with (adds the stats block right under the link list, inside the same `motion.div` so it visually sits directly under "[ GitHub ↗ ]"):
```tsx
            {/* Links */}
            {project.links && project.links.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="flex flex-col gap-2 shrink-0 pt-2"
              >
                {project.links.map(link => (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mono text-text-muted hover:text-text transition-colors duration-200 uppercase tracking-wider"
                  >
                    [ {link.label} ↗ ]
                  </a>
                ))}
                <GithubStatsFull
                  githubUrl={project.links.find(l => l.label === 'GitHub')?.href}
                />
              </motion.div>
            )}
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: no output, exit code 0.

- [ ] **Step 5: Visual verification**

Run: `npm run dev`, open `http://localhost:3000/projects/microagent` (or any project with a GitHub link) in a browser.
Expected: under the "[ GitHub ↗ ]" link, a row of stats appears — star count, commit count, primary language, open issue count, and "updated Xd ago" — within a second or two. Stop the dev server after.

- [ ] **Step 6: Commit**

```bash
git add src/pages/ProjectDetail.tsx
git commit -m "feat: full GitHub stats block on project detail pages"
```

---

## Self-Review Notes

- **Spec coverage:** §2 (worker shape) → Task 1; bindings → Task 2; §3 (data flow: cache check, GraphQL query, cache write, stale-on-failure) → Task 3; §4 (hook, display split, env var) → Tasks 5-8. "Out of scope" items (D1, comments/guestbook, worker tests, retrofitting the other 4 workers) are not touched by any task.
- **User-specified coverage beyond the spec text:** the spec's own wording only mentions `/projects` list cards and detail pages. Owen explicitly asked this plan also cover `src/data/archive.ts` — Task 7 does that as its own reviewable unit rather than folding it into Task 6, so it can't be silently dropped.
- **No placeholders:** every step has real, complete code or an exact command + expected output — no "add error handling" or "similar to Task N" shortcuts.
- **Type consistency:** `GithubStats` (Task 6) matches the worker's `RepoStats` (Task 3) field-for-field (`commitCount`, `lastCommitDate`, `stars`, `primaryLanguage`, `openIssues`). `GithubStatsBadge`/`GithubStatsFull` both take `{ githubUrl?: string }` and both call `useGithubStats` the same way.
