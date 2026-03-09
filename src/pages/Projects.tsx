import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { projects } from '@/data/projects'
import { PageTransition } from '@/components/layout/PageTransition'

export default function Projects() {
  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto px-6 pt-20 pb-32">
        {/* Header */}
        <div className="mb-16">
          <span className="clip block mb-6">
            <motion.span
              initial={{ y: '105%' }}
              animate={{ y: '0%' }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="label block"
            >
              Work
            </motion.span>
          </span>
          <span className="clip block">
            <motion.h1
              initial={{ y: '105%' }}
              animate={{ y: '0%' }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.08 }}
              className="heading-lg"
            >
              All Projects
            </motion.h1>
          </span>
        </div>

        {/* Project List */}
        <div className="divide-y divide-border">
          {projects.map((project, i) => (
            <motion.div
              key={project.slug}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.1 + i * 0.04 }}
            >
              <Link
                to={`/projects/${project.slug}`}
                className="group grid grid-cols-[3rem_1fr_auto] gap-6 py-6 items-start hover:bg-surface transition-colors duration-200 -mx-4 px-4"
              >
                <span className="label pt-0.5">{String(i + 1).padStart(3, '0')}</span>

                <div>
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className="text-base font-medium group-hover:text-text-muted transition-colors duration-200">
                      {project.title}
                    </span>
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
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Archive link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="mt-16 pt-8 border-t border-border"
        >
          <Link
            to="/archive"
            className="mono text-text-muted hover:text-text transition-colors duration-200"
          >
            // Archive — Older Work →
          </Link>
        </motion.div>

      </div>
    </PageTransition>
  )
}
