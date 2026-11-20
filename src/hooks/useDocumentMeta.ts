import { useEffect } from 'react'

export const SITE_TITLE = 'Owen Jones · Reinforcement learning and robot learning'
export const SITE_DESCRIPTION =
  "CS master's student at UC Santa Barbara working on reinforcement learning and robot learning. Open to summer 2027 internships."

function setDescription(content: string): void {
  const tag = document.querySelector('meta[name="description"]')
  if (!tag) throw new Error('meta description tag missing from index.html')
  tag.setAttribute('content', content)
}

export function useDocumentMeta(title: string, description?: string): void {
  useEffect(() => {
    document.title = title === SITE_TITLE ? SITE_TITLE : `${title} · Owen Jones`
    setDescription(description ?? SITE_DESCRIPTION)
    // Routes that do not call this hook (demo, sign-in) fall back to the site defaults.
    return () => {
      document.title = SITE_TITLE
      setDescription(SITE_DESCRIPTION)
    }
  }, [title, description])
}
