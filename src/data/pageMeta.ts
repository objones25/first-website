import { profile } from './profile.ts'
import type { Project } from '@/types'

// Titles and descriptions for every public page, in one place: the pages set
// them at run time (useDocumentMeta) and the build writes them into a static
// HTML file per route (prerender/plugin.ts), so both always agree.
//
// The imports here carry a .ts extension because build scripts load this file
// with plain Node, which does not guess extensions.

export const SITE_URL = 'https://owenbeckettjones.com'
export const SITE_TITLE = 'Owen Jones · Reinforcement learning and robot learning'
export const SITE_DESCRIPTION =
  "CS master's student at UC Santa Barbara working on reinforcement learning and robot learning. Open to summer 2027 internships."

export interface PageMeta {
  // Route path with no trailing slash; home is '/'.
  path: string
  title: string
  description: string
}

// The text of the <title> tag. The site title is used as is.
export function fullTitle(title: string): string {
  return title === SITE_TITLE ? SITE_TITLE : `${title} · ${profile.name}`
}

export const pageMeta = {
  home: { path: '/', title: SITE_TITLE, description: SITE_DESCRIPTION },
  about: { path: '/about', title: 'About', description: profile.lead },
  projects: {
    path: '/projects',
    title: 'Projects',
    description: 'Projects in reinforcement learning, robot learning and language models.',
  },
  skills: {
    path: '/skills',
    title: 'Skills',
    description: 'Claude Code skills I develop and maintain, shown with the output of the scripts they ship.',
  },
  now: { path: '/now', title: 'Now', description: 'What Owen Jones is working on at the moment.' },
  archive: { path: '/archive', title: 'Archive', description: 'Earlier projects.' },
  contact: {
    path: '/contact',
    title: 'Contact',
    description: 'Email and links for Owen Jones. Open to summer 2027 internships.',
  },
} satisfies Record<string, PageMeta>

export function projectMeta(project: Project): PageMeta {
  return {
    path: `/projects/${project.slug}`,
    title: project.title,
    description: project.tagline ?? project.description,
  }
}
