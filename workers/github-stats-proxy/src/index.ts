import { UpstreamTimeoutError, fetchWithTimeout, jsonError } from '../../shared/src/http'
import type { RateLimiter } from '../../shared/src/gate'
import { corsHeaders, isAllowedOrigin } from '../../shared/src/origin'

export const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour
// KV drops an entry this long after its last refresh. It is much longer than
// CACHE_TTL_MS on purpose: an entry past the refresh window is still served
// when GitHub is down, and this bounds how long an unused key lingers.
export const STALE_TTL_S = 30 * 24 * 60 * 60
const GITHUB_TIMEOUT_MS = 10_000
const OWNER_ALLOWLIST = new Set(['objones25'])

export interface Env {
  GITHUB_STATS_CACHE: KVNamespace
  GITHUB_TOKEN: string
  RATE_LIMITER: RateLimiter
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

async function fetchFromGitHub(owner: string, repo: string, token: string): Promise<RepoStats> {
  const res = await fetchWithTimeout('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      // GitHub's API rejects requests with no User-Agent.
      'User-Agent': 'owenbeckettjones-portfolio-github-stats-proxy',
    },
    body: JSON.stringify({ query: QUERY, variables: { owner, repo } }),
  }, GITHUB_TIMEOUT_MS)

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
    const headers = corsHeaders(origin, { methods: ['GET'], headers: ['Content-Type'] })

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers })
    }
    if (request.method !== 'GET') {
      return jsonError('Method not allowed', 405, { ...headers, Allow: 'GET, OPTIONS' })
    }

    const url = new URL(request.url)
    const owner = url.searchParams.get('owner')
    const repo = url.searchParams.get('repo')
    // Params are validated before the origin check (deliberately, not backwards) so a
    // no-Origin/no-params curl request gets 400, not 403, while any request that DOES
    // have valid params still gets rejected below if its Origin isn't allowed.
    if (!owner || !repo) {
      return jsonError('owner and repo query params are required', 400, headers)
    }

    if (!isAllowedOrigin(origin)) {
      return jsonError('Origin not allowed', 403, headers)
    }

    if (!OWNER_ALLOWLIST.has(owner) || !/^[A-Za-z0-9._-]{1,100}$/.test(repo)) {
      return jsonError('unsupported repository', 400, headers)
    }

    const cacheKey = `${owner}/${repo}`
    const cached = await env.GITHUB_STATS_CACHE.get<CacheEntry>(cacheKey, 'json')

    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return Response.json(cached.payload, { headers })
    }

    // This worker is public and the Origin header can be forged, so a script
    // could ask for endless made-up repository names and spend the GitHub
    // token's hourly quota. Only requests that would reach GitHub count against
    // the limit; cache hits above are free.
    const caller = request.headers.get('CF-Connecting-IP') ?? 'unknown'
    const { success } = await env.RATE_LIMITER.limit({ key: caller })
    if (!success) {
      return jsonError('Too many requests, try again in a minute', 429, { ...headers, 'Retry-After': '60' })
    }

    try {
      const payload = await fetchFromGitHub(owner, repo, env.GITHUB_TOKEN)
      const entry: CacheEntry = { payload, fetchedAt: Date.now() }
      await env.GITHUB_STATS_CACHE.put(cacheKey, JSON.stringify(entry), { expirationTtl: STALE_TTL_S })
      return Response.json(payload, { headers })
    } catch (err) {
      if (cached) {
        // Stale data beats no data — the whole point of a 1hr TTL is that
        // slightly-old stats are fine, an error where a star count used to be isn't.
        return Response.json(cached.payload, { headers })
      }
      // The reason stays in the worker's log (`wrangler tail`). GitHub's error
      // text can describe the token, so it is not sent to the browser.
      console.error('github-stats-proxy: GitHub lookup failed:', err instanceof Error ? err.message : err)
      const status = err instanceof UpstreamTimeoutError ? 504 : 502
      return jsonError('Could not load repository stats', status, headers)
    }
  },
}
