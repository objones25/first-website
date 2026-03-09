import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { archiveProjects } from '@/data/archive'
import { PageTransition } from '@/components/layout/PageTransition'

export default function Archive() {
  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto px-6 pt-20 pb-32">

        {/* Header */}
        <div className="mb-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <Link
              to="/projects"
              className="mono text-text-muted hover:text-text transition-colors duration-200"
            >
              ← All Projects
            </Link>
          </motion.div>
        </div>

        <div className="mb-16">
          <span className="clip block mb-6">
            <motion.span
              initial={{ y: '105%' }}
              animate={{ y: '0%' }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="label block"
            >
              Archive
            </motion.span>
          </span>
          <span className="clip block mb-6">
            <motion.h1
              initial={{ y: '105%' }}
              animate={{ y: '0%' }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.08 }}
              className="heading-lg"
            >
              Older Work
            </motion.h1>
          </span>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-text-muted max-w-xl leading-relaxed"
          >
            Older projects I still find interesting but don't need on the main page.
          </motion.p>
        </div>

        {/* Archive List */}
        <div className="divide-y divide-border">
          {archiveProjects.map((project, i) => {
            const inner = (
              <>
                <span className="label pt-0.5">{String(i + 1).padStart(3, '0')}</span>

                <div>
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className="text-base font-medium">{project.title}</span>
                    <span className="text-xs text-text-muted">{project.year}</span>
                  </div>
                  <p className="text-sm text-text-muted leading-relaxed">
                    {project.description}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5 justify-end pt-0.5">
                  {project.tags.map(tag => (
                    <span
                      key={tag}
                      className="text-xs text-text-muted border border-border px-2 py-0.5"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </>
            )

            return (
              <motion.div
                key={project.title}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.1 + i * 0.04 }}
              >
                {project.href ? (
                  <a
                    href={project.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="grid grid-cols-[3rem_1fr_auto] gap-6 py-6 items-start hover:bg-surface transition-colors duration-200 -mx-4 px-4"
                  >
                    {inner}
                  </a>
                ) : (
                  <div className="grid grid-cols-[3rem_1fr_auto] gap-6 py-6 items-start">
                    {inner}
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>

      </div>
    </PageTransition>
  )
}
