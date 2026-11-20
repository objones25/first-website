import { Link } from 'react-router-dom'
import { archiveProjects } from '@/data/archive'
import { archivedProjects } from '@/data/projects'
import { PageTransition } from '@/components/layout/PageTransition'
import { GithubStatsBadge } from '@/components/GithubStatsBadge'
import { ProjectRow } from '@/components/ProjectRow'
import { ClipReveal, Reveal } from '@/components/motion/Reveal'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'

const REPO_ROW_CLASS =
  'block py-6 -mx-4 px-4 md:grid md:grid-cols-[3rem_1fr_auto] md:gap-6'
const REPO_LINK_CLASS = `${REPO_ROW_CLASS} hover:bg-surface transition-colors duration-150`

export default function Archive() {
  useDocumentMeta('Archive', 'Earlier projects.')

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto px-6 pt-20 pb-32">
        <Link
          to="/projects"
          className="mono inline-flex min-h-11 items-center text-text-muted hover:text-text transition-colors duration-150"
        >
          ← All Projects
        </Link>

        <div className="mt-6 mb-16">
          <div className="mb-6">
            <ClipReveal className="section-label">Archive</ClipReveal>
          </div>
          <div className="mb-6">
            <ClipReveal as="h1" delay={0.08} className="heading-lg">
              Older Work
            </ClipReveal>
          </div>
          <Reveal delay={0.16}>
            <p className="lead text-text-muted max-w-xl">
              Earlier projects.
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.1}>
          <h2 className="section-label mb-4">// Project pages</h2>
          <div className="divide-y divide-border mb-16">
            {archivedProjects.map((project, i) => (
              <ProjectRow key={project.slug} project={project} index={i + 1} showDemoMarker />
            ))}
          </div>

          <h2 className="section-label mb-4">// Repositories</h2>
          <div className="divide-y divide-border">
            {archiveProjects.map((project, i) => {
              const inner = (
                <>
                  <div className="mono text-text-muted mb-2 md:mb-0 md:pt-1">
                    <span>{String(i + 1).padStart(3, '0')}</span>
                    <span className="md:hidden"> · {project.year}</span>
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="text-lg font-medium break-words min-w-0">
                        {project.title}
                      </span>
                      <span className="mono text-text-muted hidden md:inline">{project.year}</span>
                    </div>
                    <p className="text-sm text-text-muted leading-relaxed mt-1.5">
                      {project.description}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5 md:hidden">
                      <RepoTags tags={project.tags} />
                    </div>
                    <GithubStatsBadge githubUrl={project.href} />
                  </div>

                  <div className="hidden md:flex md:flex-wrap md:justify-end md:content-start md:gap-1.5 md:max-w-56">
                    <RepoTags tags={project.tags} />
                  </div>
                </>
              )

              return project.href ? (
                <a
                  key={project.title}
                  href={project.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={REPO_LINK_CLASS}
                >
                  {inner}
                </a>
              ) : (
                <div key={project.title} className={REPO_ROW_CLASS}>
                  {inner}
                </div>
              )
            })}
          </div>
        </Reveal>
      </div>
    </PageTransition>
  )
}

function RepoTags({ tags }: { tags: string[] }) {
  return (
    <>
      {tags.map(tag => (
        <span key={tag} className="mono text-text-muted border border-border px-2 py-0.5">
          {tag}
        </span>
      ))}
    </>
  )
}
