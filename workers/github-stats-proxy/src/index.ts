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

    const url = new URL(request.url)
    const owner = url.searchParams.get('owner')
    const repo = url.searchParams.get('repo')
    if (!owner || !repo) {
      return jsonResponse({ error: 'owner and repo query params are required' }, 400, headers)
    }

    if (!isAllowedOrigin(origin)) {
      return new Response('Forbidden', { status: 403, headers })
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
