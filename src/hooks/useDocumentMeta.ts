import { useEffect } from 'react'

export const SITE_TITLE = 'Owen Jones · Reinforcement learning and robot learning'

export function useDocumentMeta(title: string, description?: string): void {
  useEffect(() => {
    document.title = title === SITE_TITLE ? SITE_TITLE : `${title} · Owen Jones`
    if (description === undefined) return
    const tag = document.querySelector('meta[name="description"]')
    if (!tag) throw new Error('meta description tag missing from index.html')
    tag.setAttribute('content', description)
  }, [title, description])
}
