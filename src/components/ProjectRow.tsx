import { Link } from 'react-router-dom'
import type { Project } from '@/types'
import { GithubStatsBadge } from '@/components/GithubStatsBadge'

interface ProjectRowProps {
  project: Project
  index: number
  showDemoMarker?: boolean
}

export function ProjectRow({ project, index, showDemoMarker = false }: ProjectRowProps) {
  return (
    <Link
      to={`/projects/${project.slug}`}
      className="block py-6 -mx-4 px-4 hover:bg-surface transition-colors duration-150 md:grid md:grid-cols-[3rem_1fr_auto] md:gap-6"
    >
      <div className="mono text-text-muted mb-2 md:mb-0 md:pt-1">
        <span>{String(index).padStart(3, '0')}</span>
        <span className="md:hidden"> · {project.year}</span>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-lg font-medium break-words min-w-0">{project.title}</span>
          <span className="mono text-text-muted hidden md:inline">{project.year}</span>
        </div>
        <p className="text-sm text-text-muted leading-relaxed mt-1.5">
          {project.tagline ?? project.description}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5 md:hidden">
          <RowTags project={project} showDemoMarker={showDemoMarker} />
        </div>
        <GithubStatsBadge githubUrl={project.links?.find(l => l.label === 'GitHub')?.href} />
      </div>

      <div className="hidden md:flex md:flex-wrap md:justify-end md:content-start md:gap-1.5 md:max-w-56">
        <RowTags project={project} showDemoMarker={showDemoMarker} />
      </div>
    </Link>
  )
}

function RowTags({ project, showDemoMarker }: { project: Project; showDemoMarker: boolean }) {
  return (
    <>
      {showDemoMarker && project.hasDemo && (
        <span className="mono border border-accent text-text px-2 py-0.5">demo</span>
      )}
      {project.tags.map(tag => (
        <span key={tag} className="mono text-text-muted border border-border px-2 py-0.5">
          {tag}
        </span>
      ))}
    </>
  )
}
