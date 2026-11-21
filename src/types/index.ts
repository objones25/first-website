export interface ProjectLink {
  label: string
  href: string
}

export interface ProjectFigure {
  src: string
  alt: string
  caption: string
}

// Stands in for a picture that does not exist yet. `placeholder` says what
// will go there; the page draws a frame that is plainly unfinished.
export interface PlaceholderImage {
  placeholder: string
}

export type ProjectImage = ProjectFigure | PlaceholderImage

// The small picture on a project's row (Home, Projects).
export type ProjectThumb = { src: string; alt: string; pixelated?: boolean } | PlaceholderImage

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

export interface VideoChapter {
  label: string
  timeS: number
}

export interface ProjectVideo {
  src: string
  poster: string
  caption: string
  // must be sorted by timeS ascending — the active chapter is the last one
  // whose timeS <= the video's currentTime
  chapters: VideoChapter[]
  speedLabel?: string
  // A few silent seconds cut from the video, played on a loop on Home.
  loop?: string
}

export interface ProjectResult {
  value: string
  label: string
}

// A labelled row in the facts sheet, e.g. { label: 'Compute', value: 'One rented A100' }.
export interface ProjectFact {
  label: string
  value: string
}

// Something that was tried and did not work, and what it showed.
export interface ProjectFailure {
  title: string
  detail: string
}

// Work this project builds on or borrows from.
export interface ProjectCredit {
  label: string
  href?: string
  note: string
}

export interface Project {
  slug: string
  title: string
  // <= 140 characters; shown on cards and under the page title
  tagline?: string
  description: string
  year: string
  period?: string
  tags: string[]
  status: 'active' | 'stable' | 'complete' | 'planned' | 'paused'
  archived?: boolean
  results?: ProjectResult[]
  // Extra rows for the facts sheet (role, team, compute, cost). Year, period,
  // status and stack are added automatically.
  facts?: ProjectFact[]
  // Detail page sections. Each renders only when present; see
  // docs/project-template.md for what belongs in each. Prose fields may hold
  // several paragraphs separated by a blank line.
  overview?: string   // "Summary"
  challenge?: string  // "Problem"
  approach?: string   // "Approach"
  features?: string[] // "Highlights"
  failures?: ProjectFailure[]
  limits?: string[]
  next?: string[]
  credits?: ProjectCredit[]
  video?: ProjectVideo
  images?: ProjectImage[]
  thumb?: ProjectThumb
  dataTables?: DataTable[]
  links?: ProjectLink[]
  hasDemo?: boolean
}

export interface NavLink {
  label: string
  href: string
}
