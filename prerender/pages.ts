import { SITE_TITLE, fullTitle, pageMeta, projectMeta, type PageMeta } from '../src/data/pageMeta.ts'
import { profile } from '../src/data/profile.ts'
import { projects } from '../src/data/projects.ts'
import type { PageHead } from './pageHtml.ts'

// The one list of routes that get their own HTML file, sitemap entry and share
// image. Used by the build (plugin.ts) and by scripts/og-images.ts.

export interface SitePage extends PageMeta {
  // Small label above the heading on the share image.
  kicker: string
  // Heading on the share image.
  heading: string
  // Optional picture on the share image, as a path under public/.
  picture?: string
}

export function sitePages(): SitePage[] {
  const featured = projects.find(p => !p.archived)
  const statics: SitePage[] = Object.values(pageMeta).map(meta => ({
    ...meta,
    kicker: meta.path === '/' ? profile.location : meta.path.slice(1),
    heading: meta.title === SITE_TITLE ? profile.name : meta.title,
    picture: meta.path === '/' ? featured?.video?.poster : undefined,
  }))
  const projectPages: SitePage[] = projects.map(project => ({
    ...projectMeta(project),
    kicker: project.archived ? `archive · ${project.year}` : `project · ${project.year}`,
    heading: project.title,
    picture: project.video?.poster,
  }))
  return [...statics, ...projectPages]
}

// '/' -> '/og/home.png', '/projects/x' -> '/og/projects-x.png'
export function shareImageFor(path: string): string {
  const name = path === '/' ? 'home' : path.slice(1).replaceAll('/', '-')
  return `/og/${name}.png`
}

export function indexedHeads(): PageHead[] {
  return sitePages().map(page => ({
    path: page.path,
    title: fullTitle(page.title),
    description: page.description,
    image: shareImageFor(page.path),
  }))
}

// Routes behind sign-in. They get a file so the address answers with a 200
// instead of the 404 fallback, but search engines are told to skip them.
export function shellHeads(): PageHead[] {
  const shell = (path: string, title: string): PageHead => ({
    path,
    title: fullTitle(title),
    description: pageMeta.home.description,
    image: shareImageFor('/'),
    noindex: true,
  })
  return [
    shell('/sign-in', 'Sign in'),
    shell('/sign-up', 'Sign up'),
    ...projects.filter(p => p.hasDemo).map(p => shell(`/projects/${p.slug}/demo`, `${p.title} demo`)),
  ]
}
