import { useEffect, useState } from 'react'

// Optional: without it the stats badges simply do not render.
const WORKER_URL: string | undefined = import.meta.env.VITE_GITHUB_STATS_URL

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

// One request per repository per page load. Home, Projects and the project page
// all show the same repositories, so without this each navigation refetches.
const inFlight = new Map<string, Promise<GithubStats>>()

function loadStats(workerUrl: string, owner: string, repo: string): Promise<GithubStats> {
  const key = `${owner}/${repo}`
  const cached = inFlight.get(key)
  if (cached) return cached

  const params = new URLSearchParams({ owner, repo })
  const request = fetch(`${workerUrl}/repo-stats?${params}`, { signal: AbortSignal.timeout(8000) })
    .then(res => {
      if (!res.ok) throw new Error(`status ${res.status}`)
      return res.json() as Promise<GithubStats>
    })
  // A failed request is dropped from the map so a later page can try again.
  request.catch(() => inFlight.delete(key))
  inFlight.set(key, request)
  return request
}

export function useGithubStats(githubUrl: string | undefined): UseGithubStatsResult {
  const enabled = !!githubUrl && !!WORKER_URL
  const [data, setData] = useState<GithubStats | null>(null)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!githubUrl || !WORKER_URL) {
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

    loadStats(WORKER_URL, parsed.owner, parsed.repo)
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
