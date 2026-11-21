import { ProjectPage } from '@/components/project/ProjectPage'
import { templateGuide, templateProject } from '@/data/projectTemplate'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'

// Dev-only preview of the project page format with every section filled in.
// The route is registered in main.tsx under import.meta.env.DEV, so neither
// this page nor its placeholder text is in the production build.
export default function ProjectTemplatePreview() {
  useDocumentMeta('Project page template')

  return (
    <ProjectPage
      project={templateProject}
      indexLabel="// Template"
      back={{ to: '/projects', label: 'All projects' }}
      guide={templateGuide}
      banner={
        <p role="note" className="mono mb-8 border border-accent px-4 py-3 text-text">
          Template preview. Every sentence and number on this page is invented placeholder text, and
          the video and figure are borrowed from other pages. This page exists only in the dev server.
        </p>
      }
    />
  )
}
