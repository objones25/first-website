export interface ProjectLink {
  label: string
  href: string
}

export interface ProjectImage {
  src: string
  alt: string
  caption: string
}

export interface DataTableColumn {
  key: string
  label: string
  align?: 'left' | 'right'
}

export interface DataTable {
  title: string
  description?: string
  columns: DataTableColumn[]
  rows: Record<string, string | number>[]
  // key of the column whose value is long-form text, collapsed by default with a per-row toggle
  expandableKey?: string
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
  dataTables?: DataTable[]
  links?: ProjectLink[]
  hasDemo?: boolean
}

export interface NavLink {
  label: string
  href: string
}
