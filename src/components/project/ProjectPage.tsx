import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PageTransition } from '@/components/layout/PageTransition'
import { Reveal, ClipReveal } from '@/components/motion/Reveal'
import { useActiveSection } from '@/hooks/useActiveSection'
import { useGithubStats } from '@/hooks/useGithubStats'
import { formatRelativeTime } from '@/lib/formatRelativeTime'
import type { Project } from '@/types'
import { DataTableBlock } from './DataTableBlock'
import { ProjectVideoBlock } from './ProjectVideoBlock'
import { projectSections, SECTION_LABELS, type SectionDef, type SectionId } from './sections'

const statusLabel: Record<Project['status'], string> = {
  active:   'Active',
  stable:   'Stable',
  complete: 'Complete',
  planned:  'Planned',
  paused:   'Paused',
}

// Writing notes shown under a heading. Only the template preview passes these.
export type ProjectGuide = Partial<Record<SectionId | 'header' | 'results' | 'media' | 'facts', string>>

interface ProjectPageProps {
  project: Project
  // Shown above the title, e.g. "// 001" or "// Archive".
  indexLabel: string
  back: { to: string; label: string }
  prev?: Project
  next?: Project
  guide?: ProjectGuide
  banner?: ReactNode
}

export function ProjectPage({ project, indexLabel, back, prev, next, guide, banner }: ProjectPageProps) {
  const sections = projectSections(project)
  const githubUrl = project.links?.find(l => l.label === 'GitHub')?.href
  const demoHref = `/projects/${project.slug}/demo`

  return (
    <PageTransition>
      <article className="max-w-6xl mx-auto px-6 pt-10 md:pt-16 pb-24 md:pb-32">
        {banner}

        <Reveal className="mb-8 md:mb-12">
          <Link
            to={back.to}
            className="mono inline-flex min-h-11 items-center text-text-muted hover:text-text transition-colors duration-200"
          >
            ← {back.label}
          </Link>
        </Reveal>

        {/* ── Header: what it is, then where to go ── */}
        <header className="mb-10 md:mb-14">
          <ClipReveal as="span" className="section-label mb-4">
            {indexLabel}
          </ClipReveal>
          <ClipReveal as="h1" delay={0.06} className="display break-words pb-[0.15em]">
            {project.title}
          </ClipReveal>
          {project.tagline && (
            <Reveal delay={0.12}>
              <p className="lead mt-4 max-w-2xl">{project.tagline}</p>
            </Reveal>
          )}
          <GuideNote text={guide?.header} />

          <Reveal delay={0.18} className="mt-6">
            <div className="flex flex-wrap gap-x-3 gap-y-2">
              {project.hasDemo && (
                <Link to={demoHref} className={buttonClass}>
                  [ Launch demo → ]
                </Link>
              )}
              {project.links?.map(link => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonClass}
                >
                  [ {link.label} ↗ ]
                </a>
              ))}
            </div>
            {project.hasDemo && (
              <p className="mono text-text-muted mt-2">The demo needs a GitHub sign-in.</p>
            )}
            <GithubStatsLine githubUrl={githubUrl} />
          </Reveal>
        </header>

        {/* ── Results: the numbers, before any prose ── */}
        {project.results && project.results.length > 0 && (
          <div className="mb-10 md:mb-14">
            <dl className="grid grid-cols-1 border border-border-strong divide-y divide-border-strong sm:grid-flow-col sm:auto-cols-fr sm:divide-y-0 sm:divide-x">
              {project.results.map(r => (
                <div key={r.label} className="flex flex-col-reverse px-5 py-4 sm:py-5">
                  <dt className="mono text-text-muted mt-1">{r.label}</dt>
                  <dd className="text-2xl sm:text-3xl font-medium tracking-tight break-words">{r.value}</dd>
                </div>
              ))}
            </dl>
            <GuideNote text={guide?.results} />
          </div>
        )}

        {/* ── Media: the thing itself, before the explanation ── */}
        {project.video && (
          <div className="mb-12 md:mb-16">
            <ProjectVideoBlock video={project.video} />
            <GuideNote text={guide?.media} />
          </div>
        )}

        <div className="lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-16">
          {/* ── Rail: contents and facts. Sticky beside the text on desktop,
               stacked above it on a phone. ── */}
          <aside className="mb-12 lg:mb-0">
            <div className="lg:sticky lg:top-24 space-y-8">
              {sections.length > 1 && <Contents sections={sections} />}
              <Facts project={project} />
              <GuideNote text={guide?.facts} />
            </div>
          </aside>

          <div className="min-w-0 space-y-14 md:space-y-16">
            {project.overview && (
              <Section id="summary" guide={guide}>
                <Prose text={project.overview} lead />
              </Section>
            )}

            {project.challenge && (
              <Section id="problem" guide={guide}>
                <Prose text={project.challenge} />
              </Section>
            )}

            {project.approach && (
              <Section id="approach" guide={guide}>
                <Prose text={project.approach} />
              </Section>
            )}

            {project.features && project.features.length > 0 && (
              <Section id="highlights" guide={guide}>
                <NumberedList items={project.features} />
              </Section>
            )}

            {project.failures && project.failures.length > 0 && (
              <Section id="failed" guide={guide}>
                <ol className="max-w-2xl divide-y divide-border border-y border-border">
                  {project.failures.map((f, i) => (
                    <li key={f.title} className="flex items-start gap-4 py-4">
                      <span className="mono text-text-muted shrink-0 pt-1">{pad(i + 1)}</span>
                      <div className="min-w-0">
                        <h3 className="font-medium">{f.title}</h3>
                        <p className="mt-1 text-text-muted leading-relaxed">{f.detail}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </Section>
            )}

            {project.limits && project.limits.length > 0 && (
              <Section id="limits" guide={guide}>
                <DashList items={project.limits} />
              </Section>
            )}

            {project.images && project.images.length > 0 && (
              <Section id="evidence" guide={guide}>
                <div className="space-y-10 max-w-2xl">
                  {project.images.map((img, i) => (
                    <figure key={img.src}>
                      <a
                        href={img.src}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open full-size figure: ${img.alt}`}
                        className="block"
                      >
                        <img src={img.src} alt={img.alt} loading="lazy" className="w-full border border-border" />
                      </a>
                      <figcaption className="mt-3 flex items-start gap-4">
                        <span className="mono text-text-muted shrink-0">{pad(i + 1)} ——</span>
                        <span className="min-w-0 text-sm text-text-muted leading-relaxed">{img.caption}</span>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </Section>
            )}

            {project.dataTables && project.dataTables.length > 0 && (
              <Section id="data" guide={guide}>
                <div className="space-y-12">
                  {project.dataTables.map(table => (
                    <DataTableBlock key={table.title} table={table} />
                  ))}
                </div>
              </Section>
            )}

            {project.next && project.next.length > 0 && (
              <Section id="next" guide={guide}>
                <DashList items={project.next} />
              </Section>
            )}

            {project.credits && project.credits.length > 0 && (
              <Section id="credits" guide={guide}>
                <ul className="max-w-2xl space-y-3">
                  {project.credits.map(c => (
                    <li key={c.label} className="min-w-0">
                      {c.href ? (
                        <a
                          href={c.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-11 items-center underline decoration-border-strong underline-offset-4 hover:decoration-text transition-colors duration-200 break-words"
                        >
                          {c.label} ↗
                        </a>
                      ) : (
                        <span>{c.label}</span>
                      )}
                      <p className="text-text-muted leading-relaxed">{c.note}</p>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {project.hasDemo && (
              <Section id="demo" guide={guide}>
                <Link to={demoHref} className={buttonClass}>
                  [ Launch demo → ]
                </Link>
                <p className="mono text-text-muted mt-2">The demo needs a GitHub sign-in.</p>
              </Section>
            )}
          </div>
        </div>

        {/* ── Prev / Next ── */}
        {(prev || next) && (
          <nav
            aria-label="More projects"
            className="mt-24 md:mt-32 pt-8 border-t border-border flex flex-col gap-4 sm:flex-row sm:justify-between"
          >
            {prev && (
              <Link to={`/projects/${prev.slug}`} className="group flex min-h-11 min-w-0 flex-col gap-1">
                <span className="mono text-text-muted group-hover:text-text transition-colors duration-200">← Prev</span>
                <span className="mono min-w-0 break-words text-text-muted group-hover:text-text transition-colors duration-200 uppercase tracking-wider">{prev.title}</span>
              </Link>
            )}
            {next && (
              <Link
                to={`/projects/${next.slug}`}
                className="group flex min-h-11 min-w-0 flex-col gap-1 sm:ml-auto sm:items-end sm:text-right"
              >
                <span className="mono text-text-muted group-hover:text-text transition-colors duration-200">Next →</span>
                <span className="mono min-w-0 break-words text-text-muted group-hover:text-text transition-colors duration-200 uppercase tracking-wider">{next.title}</span>
              </Link>
            )}
          </nav>
        )}
      </article>
    </PageTransition>
  )
}

const buttonClass =
  'mono inline-flex min-h-11 items-center border border-border-strong px-3 uppercase tracking-wider text-text-muted hover:text-text hover:border-accent transition-colors duration-200'

const pad = (n: number) => String(n).padStart(2, '0')

// ── Section: a heading the contents list can link to ─────────────────────────
function Section({ id, guide, children }: { id: SectionId; guide?: ProjectGuide; children: ReactNode }) {
  const label = SECTION_LABELS[id]
  return (
    // scroll-mt keeps the heading clear of the fixed navbar when jumped to.
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-24">
      <Reveal inView>
        <h2 id={`${id}-heading`} className="section-label mb-5">
          {`// ${label}`}
        </h2>
        <GuideNote text={guide?.[id]} className="-mt-2 mb-5" />
        {children}
      </Reveal>
    </section>
  )
}

function GuideNote({ text, className = 'mt-3' }: { text?: string; className?: string }) {
  if (!text) return null
  return (
    <p className={`mono max-w-2xl border-l-2 border-accent pl-3 text-text-muted ${className}`}>
      Writing note: {text}
    </p>
  )
}

// ── Prose: paragraphs are separated by a blank line in the data ──────────────
function Prose({ text, lead = false }: { text: string; lead?: boolean }) {
  const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
  return (
    <div className="max-w-2xl space-y-4">
      {paragraphs.map((p, i) => (
        <p key={i} className={lead && i === 0 ? 'text-text leading-relaxed' : 'text-text-muted leading-relaxed'}>
          {p}
        </p>
      ))}
    </div>
  )
}

function NumberedList({ items }: { items: string[] }) {
  return (
    <ol className="space-y-3 max-w-2xl">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-4">
          <span className="mono text-text-muted shrink-0 pt-1">{pad(i + 1)} ——</span>
          <span className="min-w-0 text-text-muted leading-relaxed">{item}</span>
        </li>
      ))}
    </ol>
  )
}

function DashList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3 max-w-2xl">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-4">
          <span aria-hidden="true" className="mono text-text-muted shrink-0 pt-1">——</span>
          <span className="min-w-0 text-text-muted leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  )
}

// ── Contents: a scrolling row on a phone, a list in the rail on desktop ──────
function Contents({ sections }: { sections: SectionDef[] }) {
  const active = useActiveSection(sections.map(s => s.id))
  return (
    <nav aria-label="On this page">
      <p className="section-label mb-2 hidden lg:block">// Contents</p>
      <ol className="flex gap-2 overflow-x-auto scroll-hide -mx-6 px-6 lg:mx-0 lg:block lg:px-0 lg:overflow-visible">
        {sections.map(s => (
          <li key={s.id} className="shrink-0">
            {/* A router link, not a plain anchor: a native hash jump reaches the
                router as a history pop, and its scroll restoration then puts the
                page back where it was. `replace` keeps Back leaving the page. */}
            <Link
              to={`#${s.id}`}
              replace
              aria-current={s.id === active ? 'location' : undefined}
              className={`mono inline-flex min-h-11 items-center whitespace-nowrap border px-3 uppercase tracking-wider transition-colors duration-200 hover:text-text lg:min-h-9 lg:w-full lg:border-0 lg:border-l lg:px-3 focus-visible:-outline-offset-2 ${
                s.id === active ? 'border-accent text-text' : 'border-border text-text-muted'
              }`}
            >
              {s.label}
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  )
}

// ── Facts sheet ──────────────────────────────────────────────────────────────
function Facts({ project }: { project: Project }) {
  return (
    <dl className="border-t border-border">
      <FactRow label="Year">{project.period ?? project.year}</FactRow>
      <FactRow label="Status">
        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden="true"
            className={`inline-block size-2 rounded-full ${project.status === 'active' ? 'bg-accent' : 'bg-text-muted'}`}
          />
          {statusLabel[project.status]}
        </span>
      </FactRow>
      {project.facts?.map(f => (
        <FactRow key={f.label} label={f.label}>{f.value}</FactRow>
      ))}
      <FactRow label="Stack">{project.tags.join(', ')}</FactRow>
    </dl>
  )
}

function FactRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-4 border-b border-border py-2.5 lg:block">
      <dt className="section-label w-20 shrink-0 lg:w-auto lg:mb-1">{label}</dt>
      <dd className="mono min-w-0 break-words text-text">{children}</dd>
    </div>
  )
}

function GithubStatsLine({ githubUrl }: { githubUrl?: string }) {
  const { data, error } = useGithubStats(githubUrl)
  if (!githubUrl || error || !data) return null

  const updated = formatRelativeTime(data.lastCommitDate)

  return (
    <p className="flex flex-wrap gap-x-5 gap-y-1 mono text-text-muted mt-3">
      {data.stars > 0 && <span>★ {data.stars}</span>}
      <span>{data.commitCount} commits</span>
      {data.primaryLanguage && <span>{data.primaryLanguage}</span>}
      {data.openIssues > 0 && <span>{data.openIssues} open issues</span>}
      {updated && <span>updated {updated}</span>}
    </p>
  )
}
