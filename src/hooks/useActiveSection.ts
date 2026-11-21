import { useEffect, useState } from 'react'

// Returns the id of the section currently near the top of the viewport, for
// highlighting an on-page contents list. `ids` must be in page order.
export function useActiveSection(ids: readonly string[]): string | undefined {
  const [active, setActive] = useState<string | undefined>(ids[0])
  const key = ids.join('|')

  useEffect(() => {
    const visible = new Set<string>()
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id)
          else visible.delete(entry.target.id)
        }
        // Several sections can sit in the band at once; the lowest one is the
        // one whose heading most recently reached the top of the screen.
        const current = [...ids].reverse().find(id => visible.has(id))
        if (current) setActive(current)
      },
      // A band from just under the navbar to a fifth of the way down the screen.
      { rootMargin: '-72px 0px -80% 0px' }
    )
    for (const id of ids) {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
    // `key` stands in for `ids`, which is a new array on every render.
  }, [key])

  return active
}
