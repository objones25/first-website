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
