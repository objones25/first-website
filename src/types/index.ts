export interface ProjectLink {
  label: string
  href: string
}

export interface ProjectImage {
  src: string
  alt: string
  caption: string
}

export interface Project {
  slug: string
  title: string
  description: string
  year: string
  tags: string[]
  status: 'active' | 'stable' | 'complete' | 'planned'
  // Detail page fields — all optional until content is added
  overview?: string
  challenge?: string
  approach?: string
  features?: string[]
  images?: ProjectImage[]
  links?: ProjectLink[]
  hasDemo?: boolean
}

export interface NavLink {
  label: string
  href: string
}
