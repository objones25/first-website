import { motion } from 'framer-motion'

interface Props {
  children: React.ReactNode
}

export function PageTransition({ children }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.3, ease: 'easeOut' } }}
      exit={{ opacity: 0, transition: { duration: 0.15, ease: 'easeIn' } }}
    >
      {children}
    </motion.div>
  )
}
