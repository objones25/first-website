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
