import { Link } from 'react-router-dom'
import { activeProjects } from '@/data/projects'
import { PageTransition } from '@/components/layout/PageTransition'
import { ProjectRow } from '@/components/ProjectRow'
import { ClipReveal, Reveal } from '@/components/motion/Reveal'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'

export default function Projects() {
  useDocumentMeta(
    'Projects',
    'Projects in reinforcement learning, robot learning and language models.',
  )

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto px-6 pt-20 pb-32">
        <div className="mb-16">
          <div className="mb-6">
            <ClipReveal className="section-label">Work</ClipReveal>
          </div>
          <ClipReveal as="h1" delay={0.08} className="heading-lg">
            Projects
          </ClipReveal>
        </div>

        <Reveal delay={0.1}>
          <div className="divide-y divide-border">
            {activeProjects.map((project, i) => (
              <ProjectRow key={project.slug} project={project} index={i + 1} />
            ))}
          </div>
        </Reveal>

        <div className="mt-16 pt-8 border-t border-border">
          <Link
            to="/archive"
            className="mono inline-flex min-h-11 items-center text-text-muted hover:text-text transition-colors duration-150"
          >
            // Archive: earlier work →
          </Link>
        </div>
      </div>
    </PageTransition>
  )
}
