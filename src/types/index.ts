export interface Project {
  slug: string
  title: string
  description: string
  year: string
  tags: string[]
  status: 'active' | 'stable' | 'complete' | 'planned'
  href?: string
}

export interface NavLink {
  label: string
  href: string
}
