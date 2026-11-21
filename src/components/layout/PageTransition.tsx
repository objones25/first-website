import { useState, type ReactNode } from 'react'
import { hasEntrancePlayed } from '@/lib/entrance'

export function PageTransition({ children }: { children: ReactNode }) {
  const [play] = useState(() => !hasEntrancePlayed())
  return <div className={play ? 'anim-fade' : undefined}>{children}</div>
}
