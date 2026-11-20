import { useState } from 'react'
import { motion } from 'framer-motion'
import { hasEntrancePlayed } from '@/lib/entrance'

interface Props {
  children: React.ReactNode
}

export function PageTransition({ children }: Props) {
  const [play] = useState(() => !hasEntrancePlayed())

  return (
    <motion.div
      initial={play ? { opacity: 0 } : false}
      animate={{ opacity: 1, transition: { duration: 0.2, ease: 'easeOut' } }}
    >
      {children}
    </motion.div>
  )
}
