import { useGithubStats } from '@/hooks/useGithubStats'
import { formatRelativeTime } from '@/lib/formatRelativeTime'

export function GithubStatsBadge({ githubUrl }: { githubUrl?: string }) {
  const { data, error } = useGithubStats(githubUrl)

  if (!githubUrl || error || !data) return null

  const updated = formatRelativeTime(data.lastCommitDate)

  return (
    <span className="mono text-text-muted text-xs whitespace-nowrap">
      ★ {data.stars}{updated && ` · updated ${updated}`}
    </span>
  )
}
