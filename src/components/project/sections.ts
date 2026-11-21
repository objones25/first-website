import type { Project } from '@/types'

// Section ids double as the anchor ids on the page, in page order.
export const SECTION_LABELS = {
  summary: 'Summary',
  problem: 'Problem',
  approach: 'Approach',
  highlights: 'Highlights',
  failed: 'What failed',
  limits: 'Limits',
  evidence: 'Evidence',
  data: 'Data',
  next: 'Next',
  credits: 'Credits',
  demo: 'Demo',
} as const

export type SectionId = keyof typeof SECTION_LABELS

export interface SectionDef {
  id: SectionId
  label: string
}

const has = (list: unknown[] | undefined) => !!list && list.length > 0

// The sections a project page shows. A section exists only when its field has
// content, so a short project gets a short page.
export function projectSections(p: Project): SectionDef[] {
  const present: Record<SectionId, boolean> = {
    summary: !!p.overview,
    problem: !!p.challenge,
    approach: !!p.approach,
    highlights: has(p.features),
    failed: has(p.failures),
    limits: has(p.limits),
    evidence: has(p.images),
    data: has(p.dataTables),
    next: has(p.next),
    credits: has(p.credits),
    demo: !!p.hasDemo,
  }
  return (Object.keys(SECTION_LABELS) as SectionId[])
    .filter(id => present[id])
    .map(id => ({ id, label: SECTION_LABELS[id] }))
}
