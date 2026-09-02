export function formatRelativeTime(isoDate: string): string {
  const then = new Date(isoDate).getTime()
  if (Number.isNaN(then)) return ''

  const diffDays = Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24))
  if (diffDays <= 0) return 'today'
  if (diffDays === 1) return '1d ago'
  if (diffDays < 30) return `${diffDays}d ago`

  const diffMonths = Math.floor(diffDays / 30)
  if (diffDays < 365) return `${diffMonths}mo ago`

  return `${Math.floor(diffDays / 365)}y ago`
}
