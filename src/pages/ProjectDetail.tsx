import { useParams, Navigate } from 'react-router-dom'
import { projects, activeProjects, archivedProjects } from '@/data/projects'
import { ProjectPage } from '@/components/project/ProjectPage'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'

export default function ProjectDetail() {
  const { slug } = useParams<{ slug: string }>()
  const project = projects.find(p => p.slug === slug)

  // Hooks run before the early return, so pass fallbacks while project is undefined.
  useDocumentMeta(project?.title ?? 'Project', project?.tagline ?? project?.description)

  if (!project) return <Navigate to="/projects" replace />

  const group = project.archived ? archivedProjects : activeProjects
  const groupIndex = group.findIndex(p => p.slug === project.slug)

  return (
    <ProjectPage
      // Remount per project so table and video state never carries over.
      key={project.slug}
      project={project}
      indexLabel={project.archived ? '// Archive' : `// ${String(groupIndex + 1).padStart(3, '0')}`}
      back={project.archived ? { to: '/archive', label: 'Archive' } : { to: '/projects', label: 'All projects' }}
      prev={group[groupIndex - 1]}
      next={group[groupIndex + 1]}
    />
  )
}
