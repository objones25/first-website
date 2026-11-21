import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { hasEntrancePlayed } from '@/lib/entrance'

// The animations themselves are CSS keyframes in index.css (.anim-rise,
// .anim-clip). These components only decide whether to play them: once per
// session, and for `inView` only after the element scrolls into view.
const DELAY_MAX_S = 0.24

function delayStyle(delay: number): CSSProperties | undefined {
  if (delay <= 0) return undefined
  return { animationDelay: `${Math.min(delay, DELAY_MAX_S)}s` }
}

interface RevealProps {
  children: ReactNode
  delay?: number
  className?: string
  inView?: boolean
}

export function Reveal({ children, delay = 0, className, inView = false }: RevealProps) {
  const [play] = useState(() => !hasEntrancePlayed())
  const waitForView = play && inView
  const [seen, setSeen] = useState(!waitForView)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (seen || !el) return
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) setSeen(true)
      },
      { rootMargin: '-40px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [seen])

  const state = !play ? '' : seen ? 'anim-rise' : 'opacity-0'

  return (
    <div ref={ref} className={[className, state].filter(Boolean).join(' ') || undefined} style={play ? delayStyle(delay) : undefined}>
      {children}
    </div>
  )
}

interface ClipRevealProps {
  children: ReactNode
  as?: 'h1' | 'h2' | 'span'
  delay?: number
  className?: string
}

export function ClipReveal({ children, as: Tag = 'span', delay = 0, className }: ClipRevealProps) {
  const [play] = useState(() => !hasEntrancePlayed())

  return (
    <div className="clip">
      <Tag
        className={[className, 'block', play && 'anim-clip'].filter(Boolean).join(' ')}
        style={play ? delayStyle(delay) : undefined}
      >
        {children}
      </Tag>
    </div>
  )
}
