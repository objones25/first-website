import { motion } from 'framer-motion'
import { PageTransition } from '@/components/layout/PageTransition'

const ease = [0.16, 1, 0.3, 1] as const

export default function Contact() {
  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto px-6 pt-20 pb-32">
        {/* Header */}
        <div className="mb-24">
          <span className="clip block mb-6">
            <motion.span
              initial={{ y: '105%' }}
              animate={{ y: '0%' }}
              transition={{ duration: 0.8, ease }}
              className="label block"
            >
              Contact
            </motion.span>
          </span>
          <span className="clip block">
            <motion.h1
              initial={{ y: '105%' }}
              animate={{ y: '0%' }}
              transition={{ duration: 0.8, ease, delay: 0.08 }}
              className="heading-lg max-w-2xl"
            >
              Let's work together.
            </motion.h1>
          </span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-16"
        >
          <div>
            <p className="text-text-muted leading-relaxed mb-8">
              I'm open to interesting projects, collaborations, and opportunities. Whether you have a project in mind or just want to connect, feel free to reach out.
            </p>
            <a
              href="mailto:hello@owenjones.dev"
              className="text-lg text-text hover:text-text-muted transition-colors duration-200"
            >
              hello@owenjones.dev →
            </a>
          </div>

          <div className="space-y-6">
            <div>
              <span className="label block mb-3">Elsewhere</span>
              <div className="space-y-2">
                {[
                  { label: 'GitHub', href: 'https://github.com/' },
                  { label: 'LinkedIn', href: 'https://linkedin.com/' },
                  { label: 'Twitter / X', href: 'https://twitter.com/' },
                ].map(({ label, href }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between py-3 border-b border-border group"
                  >
                    <span className="text-sm text-text-muted group-hover:text-text transition-colors duration-200">
                      {label}
                    </span>
                    <span className="text-text-muted group-hover:text-text transition-colors duration-200">↗</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </PageTransition>
  )
}
