import { useGithubStats } from '@/hooks/useGithubStats'
import { formatRelativeTime } from '@/lib/formatRelativeTime'

export function GithubStatsBadge({ githubUrl }: { githubUrl?: string }) {
  const { data, error } = useGithubStats(githubUrl)

  if (!githubUrl || error || !data) return null

  const updated = formatRelativeTime(data.lastCommitDate)

  const parts = [data.stars > 0 ? `★ ${data.stars}` : '', updated ? `updated ${updated}` : ''].filter(Boolean)
  if (parts.length === 0) return null

  return <span className="mono text-text-muted text-xs block mt-2">{parts.join(' · ')}</span>
}
