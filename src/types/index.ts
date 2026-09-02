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

export interface DataTableDetailField {
  key: string
  label: string
  // renders in a monospace <pre> block instead of wrapped prose
  code?: boolean
}

export type DataTableRow = Record<string, string | number>

export interface DataTable {
  title: string
  description?: string
  columns: DataTableColumn[]
  // Small tables can inline their rows directly. Large ones (e.g. a full raw
  // export) should use loadRows instead so the data is code-split into its own
  // chunk and only fetched when this table actually renders — not bundled into
  // every page that imports the projects list (Home, Projects, ProjectDetail
  // all statically import '@/data/projects').
  rows?: DataTableRow[]
  loadRows?: () => Promise<DataTableRow[]>
  // fields shown in a per-row expand panel rather than as a table column —
  // for content too long/structured (code, prose) to put in a cell
  detailFields?: DataTableDetailField[]
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
