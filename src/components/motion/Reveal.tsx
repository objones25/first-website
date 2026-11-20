import { useState } from 'react'
import { motion } from 'framer-motion'
import { EASE, hasEntrancePlayed } from '@/lib/entrance'

const DELAY_MAX_S = 0.24

interface RevealProps {
  children: React.ReactNode
  delay?: number
  className?: string
  inView?: boolean
}

export function Reveal({ children, delay = 0, className, inView = false }: RevealProps) {
  const [play] = useState(() => !hasEntrancePlayed())
  const target = { opacity: 1, y: 0 }

  return (
    <motion.div
      className={className}
      initial={play ? { opacity: 0, y: 8 } : false}
      animate={inView && play ? undefined : target}
      whileInView={inView && play ? target : undefined}
      viewport={inView && play ? { once: true, margin: '-40px' } : undefined}
      transition={{ duration: 0.3, delay: Math.min(delay, DELAY_MAX_S), ease: EASE }}
    >
      {children}
    </motion.div>
  )
}

const CLIP_TAGS = { h1: motion.h1, h2: motion.h2, span: motion.span }

interface ClipRevealProps {
  children: React.ReactNode
  as?: keyof typeof CLIP_TAGS
  delay?: number
  className?: string
}

export function ClipReveal({ children, as = 'span', delay = 0, className }: ClipRevealProps) {
  const [play] = useState(() => !hasEntrancePlayed())
  const Tag = CLIP_TAGS[as]

  return (
    <div className="clip">
      <Tag
        className={className ? `${className} block` : 'block'}
        initial={play ? { y: '105%' } : false}
        animate={{ y: '0%' }}
        transition={{ duration: 0.5, delay: Math.min(delay, DELAY_MAX_S), ease: EASE }}
      >
        {children}
      </Tag>
    </div>
  )
}
