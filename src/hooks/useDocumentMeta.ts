import { useEffect } from 'react'
import { SITE_DESCRIPTION, SITE_TITLE, fullTitle } from '@/data/pageMeta'

function setDescription(content: string): void {
  const tag = document.querySelector('meta[name="description"]')
  if (!tag) throw new Error('meta description tag missing from index.html')
  tag.setAttribute('content', content)
}

export function useDocumentMeta(title: string, description?: string): void {
  useEffect(() => {
    document.title = fullTitle(title)
    setDescription(description ?? SITE_DESCRIPTION)
    // Routes that do not call this hook (demo, sign-in) fall back to the site defaults.
    return () => {
      document.title = SITE_TITLE
      setDescription(SITE_DESCRIPTION)
    }
  }, [title, description])
}
