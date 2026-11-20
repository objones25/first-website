import { Fragment, useEffect, useId, useRef, useState } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import { useAuth } from '@clerk/react-router'
import { projects, activeProjects, archivedProjects } from '@/data/projects'
import { PageTransition } from '@/components/layout/PageTransition'
import { Reveal, ClipReveal } from '@/components/motion/Reveal'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { useGithubStats } from '@/hooks/useGithubStats'
import { formatRelativeTime } from '@/lib/formatRelativeTime'
import type { DataTable, ProjectVideo } from '@/types'

const statusLabel: Record<string, string> = {
  active:   'Active',
  stable:   'Stable',
  complete: 'Complete',
  planned:  'Planned',
  paused:   'Paused',
}

export default function ProjectDetail() {
  const { slug } = useParams<{ slug: string }>()
  const { isSignedIn } = useAuth()
  const project = projects.find(p => p.slug === slug)

  // Hooks run before the early return, so pass fallbacks while project is undefined.
  useDocumentMeta(project?.title ?? 'Project', project?.tagline ?? project?.description)

  if (!project) return <Navigate to="/projects" replace />

  const group = project.archived ? archivedProjects : activeProjects
  const groupIndex = group.findIndex(p => p.slug === project.slug)
  const prev = group[groupIndex - 1]
  const next = group[groupIndex + 1]
  const indexLabel = project.archived
    ? '// Archive'
    : `// ${String(groupIndex + 1).padStart(3, '0')}`

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto px-6 pt-10 md:pt-16 pb-24 md:pb-32">

        {/* ── Back nav ── */}
        <Reveal className="mb-8 md:mb-16">
          <Link
            to={project.archived ? '/archive' : '/projects'}
            className="mono inline-flex min-h-11 items-center text-text-muted hover:text-text transition-colors duration-200"
          >
            {project.archived ? '← Archive' : '← All Projects'}
          </Link>
        </Reveal>

        {/* ── Header ── */}
        <div className="mb-12 md:mb-16 border-b border-border pb-10 md:pb-12">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between md:gap-8 mb-8">
            <div className="min-w-0">
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
            </div>

            {/* Links */}
            {project.links && project.links.length > 0 && (
              <Reveal delay={0.18} className="flex flex-col items-start gap-1 md:shrink-0 md:pt-2">
                {project.links.map(link => (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mono inline-flex min-h-11 items-center text-text-muted hover:text-text transition-colors duration-200 uppercase tracking-wider"
                  >
                    [ {link.label} ↗ ]
                  </a>
                ))}
                <GithubStatsFull
                  githubUrl={project.links.find(l => l.label === 'GitHub')?.href}
                />
              </Reveal>
            )}
          </div>

          {/* Metadata row */}
          <Reveal delay={0.24} className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="section-label">Year</span>
              <span className="mono text-text-muted">——</span>
              <span className="mono min-w-0 break-words text-text-muted">{project.year}</span>
            </div>

            {project.period && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="section-label">Period</span>
                <span className="mono text-text-muted">——</span>
                <span className="mono min-w-0 break-words text-text-muted">{project.period}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <span className="section-label">Status</span>
              <span className="mono text-text-muted">——</span>
              <span className="flex min-w-0 items-center gap-2 break-words mono text-text-muted">
                <span
                  aria-hidden="true"
                  className={`inline-block size-2 rounded-full ${
                    project.status === 'active' ? 'bg-accent' : 'bg-text-muted'
                  }`}
                />
                {statusLabel[project.status]}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="section-label">Stack</span>
              <span className="mono text-text-muted">——</span>
              {project.tags.map(tag => (
                <span key={tag} className="mono text-text-muted border border-border px-1.5 py-0.5 break-words">
                  {tag}
                </span>
              ))}
            </div>
          </Reveal>
        </div>

        {/* ── Results strip ── */}
        {project.results && project.results.length > 0 && (
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12 md:mb-16">
            {project.results.map(r => (
              <div key={r.label} className="flex flex-col-reverse">
                <dt className="mono text-text-muted mt-1">{r.label}</dt>
                <dd className="text-3xl font-medium tracking-tight break-words">{r.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {/* ── Content sections ── */}
        <div className="space-y-16 md:space-y-20">

          {/* Video */}
          {project.video && (
            <Section label="// The Run">
              <ProjectVideoBlock video={project.video} />
            </Section>
          )}

          {project.overview && (
            <Section label="// Overview">
              <p className="text-text-muted leading-relaxed max-w-2xl">{project.overview}</p>
            </Section>
          )}

          {project.challenge && (
            <Section label="// The Challenge">
              <p className="text-text-muted leading-relaxed max-w-2xl">{project.challenge}</p>
            </Section>
          )}

          {project.approach && (
            <Section label="// The Approach">
              <p className="text-text-muted leading-relaxed max-w-2xl">{project.approach}</p>
            </Section>
          )}

          {project.features && project.features.length > 0 && (
            <Section label="// Key Features">
              <ul className="space-y-3 max-w-2xl">
                {project.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-4">
                    <span className="mono text-text-muted shrink-0">
                      {String(i + 1).padStart(2, '0')} ——
                    </span>
                    <span className="min-w-0 text-text-muted leading-relaxed">{f}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Visual Evidence */}
          {project.images && project.images.length > 0 && (
            <Section label="// Evidence">
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
                      <img
                        src={img.src}
                        alt={img.alt}
                        loading="lazy"
                        className="w-full border border-border"
                      />
                    </a>
                    <figcaption className="mt-3 flex items-start gap-4">
                      <span className="mono text-text-muted shrink-0">
                        {String(i + 1).padStart(2, '0')} ——
                      </span>
                      <span className="min-w-0 text-sm text-text-muted leading-relaxed">
                        {img.caption}
                      </span>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </Section>
          )}

          {/* Data */}
          {project.dataTables && project.dataTables.length > 0 && (
            <Section label="// Data">
              <div className="space-y-12">
                {project.dataTables.map((table) => (
                  <DataTableBlock key={table.title} table={table} />
                ))}
              </div>
            </Section>
          )}

          {/* Live Demo CTA */}
          {project.hasDemo && (
            <Section label="// Live Demo">
              <div className="flex flex-col gap-3">
                <Link
                  to={`/projects/${project.slug}/demo`}
                  className="mono inline-flex min-h-11 items-center border border-border px-4 hover:border-border-strong transition-colors duration-200 w-fit"
                >
                  [ Launch Demo ] →
                </Link>
                {!isSignedIn && (
                  <p className="mono text-text-muted">
                    Sign in with GitHub required.
                  </p>
                )}
              </div>
            </Section>
          )}

        </div>

        {/* ── Prev / Next navigation ── */}
        <div className="mt-24 md:mt-32 pt-8 border-t border-border flex flex-col gap-4 sm:flex-row sm:justify-between">
          {prev ? (
            <Link
              to={`/projects/${prev.slug}`}
              className="group flex min-h-11 min-w-0 flex-col gap-1"
            >
              <span className="mono text-text-muted group-hover:text-text transition-colors duration-200">← Prev</span>
              <span className="mono min-w-0 break-words text-text-muted group-hover:text-text transition-colors duration-200 uppercase tracking-wider">{prev.title}</span>
            </Link>
          ) : null}

          {next ? (
            <Link
              to={`/projects/${next.slug}`}
              className="group flex min-h-11 min-w-0 flex-col gap-1 sm:ml-auto sm:items-end sm:text-right"
            >
              <span className="mono text-text-muted group-hover:text-text transition-colors duration-200">Next →</span>
              <span className="mono min-w-0 break-words text-text-muted group-hover:text-text transition-colors duration-200 uppercase tracking-wider">{next.title}</span>
            </Link>
          ) : null}
        </div>

      </div>
    </PageTransition>
  )
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Reveal inView>
      <h2 className="section-label mb-6">{label}</h2>
      {children}
    </Reveal>
  )
}

// ── Video block ───────────────────────────────────────────────────────────────
function formatTimestamp(totalS: number) {
  const s = Math.floor(totalS)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

function ProjectVideoBlock({ video }: { video: ProjectVideo }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [currentS, setCurrentS] = useState(0)

  let activeIndex = -1
  video.chapters.forEach((c, i) => { if (c.timeS <= currentS) activeIndex = i })

  function seek(timeS: number) {
    const el = ref.current
    if (!el) return
    const go = () => {
      el.currentTime = timeS
      // Autoplay policy can reject play() (NotAllowedError), and a pause or
      // navigation while play is pending interrupts it (AbortError). In both
      // the seek still happened. Anything else is a real error.
      el.play().catch((err: unknown) => {
        const benign = err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'AbortError')
        if (!benign) throw err
      })
    }
    // With preload="metadata" the duration may not be known yet on first click;
    // setting currentTime before metadata loads is ignored by some browsers.
    if (el.readyState === 0) {
      el.addEventListener('loadedmetadata', go, { once: true })
      el.load()
    } else {
      go()
    }
  }

  return (
    <div className="grid min-w-0 gap-6 lg:gap-8 lg:grid-cols-[minmax(0,1fr)_16rem] items-start">
      <figure className="min-w-0">
        <div className="relative">
          <video
            ref={ref}
            src={video.src}
            poster={video.poster}
            controls
            preload="metadata"
            playsInline
            onTimeUpdate={e => setCurrentS(e.currentTarget.currentTime)}
            className="w-full max-h-[75dvh] object-contain border border-border bg-black [image-rendering:pixelated]"
          />
          {video.speedLabel && (
            <span
              aria-hidden="true"
              className="absolute right-2 top-2 mono bg-background/70 px-1.5 py-0.5 text-text pointer-events-none"
            >
              {video.speedLabel}
            </span>
          )}
        </div>
        {video.speedLabel && (
          <span className="sr-only">Playback speed {video.speedLabel}</span>
        )}
        <figcaption className="mt-3 text-sm text-text-muted leading-relaxed max-w-2xl">
          {video.caption}
        </figcaption>
      </figure>

      <ol className="flex gap-2 overflow-x-auto scroll-hide pb-2 lg:block lg:space-y-1 lg:max-h-[36rem] lg:overflow-y-auto lg:pb-0">
        {video.chapters.map((c, i) => (
          <li key={c.label} className="shrink-0 lg:shrink">
            <button
              type="button"
              onClick={() => seek(c.timeS)}
              aria-current={i === activeIndex ? 'true' : undefined}
              className={`mono inline-flex min-h-11 items-center gap-2 whitespace-nowrap px-3 border border-border lg:w-full lg:border-0 lg:px-0 lg:whitespace-normal lg:text-left transition-colors duration-200 hover:text-text ${
                i === activeIndex ? 'text-accent' : 'text-text-muted'
              }`}
            >
              <span className="shrink-0 tabular-nums">{formatTimestamp(c.timeS)} ——</span>
              <span>{c.label}</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  )
}

// ── Data table block ──────────────────────────────────────────────────────────
function DataTableBlock({ table }: { table: DataTable }) {
  const [rows, setRows] = useState(table.rows ?? null)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const hasDetail = !!table.detailFields?.length
  const tableId = useId()

  useEffect(() => {
    // Each DataTableBlock is keyed by table.title in the parent, so this
    // instance is remounted (not re-rendered in place) if the table changes.
    if (rows || !table.loadRows) return
    let cancelled = false
    table.loadRows().then(loaded => {
      if (!cancelled) setRows(loaded)
    })
    return () => { cancelled = true }
  }, [])

  function toggle(rowIndex: number) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(rowIndex)) next.delete(rowIndex)
      else next.add(rowIndex)
      return next
    })
  }

  return (
    <div>
      <p className="mono text-text text-sm mb-1">{table.title}</p>
      {table.description && (
        <p className="text-sm text-text-muted leading-relaxed mb-4 max-w-2xl">
          {table.description}
        </p>
      )}
      {!rows ? (
        <p className="mono text-text-muted">[ loading… ]</p>
      ) : (
        <div className="border border-border-strong overflow-x-auto lg:max-h-[36rem] lg:overflow-y-auto">
          <table className="w-full text-xs mono border-collapse">
            <thead className="sticky top-0 bg-surface">
              <tr>
                {hasDetail && <th className="border-b border-border-strong w-8" />}
                {table.columns.map(col => (
                  <th
                    key={col.key}
                    className={`text-text-muted font-normal uppercase tracking-wider px-4 py-3 border-b border-border-strong whitespace-nowrap ${
                      col.align === 'right' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row, i) => {
                const isOpen = expanded.has(i)
                const detailId = `${tableId}-detail-${i}`
                return (
                  <Fragment key={i}>
                    <tr
                      onClick={hasDetail ? () => toggle(i) : undefined}
                      className={`hover:bg-surface transition-colors ${hasDetail ? 'cursor-pointer' : ''}`}
                    >
                      {hasDetail && (
                        <td className="px-0 align-top">
                          <button
                            type="button"
                            aria-expanded={isOpen}
                            aria-controls={detailId}
                            aria-label={isOpen ? 'Hide details' : 'Show details'}
                            onClick={e => {
                              e.stopPropagation()
                              toggle(i)
                            }}
                            className={`inline-flex min-h-11 min-w-11 items-center justify-center ${isOpen ? 'text-accent' : 'text-text-muted'}`}
                          >
                            {isOpen ? '−' : '+'}
                          </button>
                        </td>
                      )}
                      {table.columns.map(col => (
                        <td
                          key={col.key}
                          className={`text-text-muted px-4 py-3 align-top ${
                            col.align === 'right' ? 'text-right whitespace-nowrap' : 'text-left'
                          }`}
                        >
                          {row[col.key]}
                        </td>
                      ))}
                    </tr>
                    {hasDetail && isOpen && (
                      <tr id={detailId}>
                        <td colSpan={table.columns.length + 1} className="px-4 py-4 bg-background space-y-4">
                          {table.detailFields!.map(field => (
                            <div key={field.key}>
                              <span className="text-text-muted uppercase tracking-wider block mb-1.5">
                                {field.label}
                              </span>
                              {field.code ? (
                                <pre className="text-text-muted border border-border p-3 overflow-x-auto leading-relaxed whitespace-pre">
                                  {row[field.key]}
                                </pre>
                              ) : (
                                <p className="text-text-muted leading-relaxed whitespace-pre-wrap">
                                  {row[field.key]}
                                </p>
                              )}
                            </div>
                          ))}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Full GitHub stats block ───────────────────────────────────────────────────
function GithubStatsFull({ githubUrl }: { githubUrl?: string }) {
  const { data, error } = useGithubStats(githubUrl)

  if (!githubUrl || error || !data) return null

  const updated = formatRelativeTime(data.lastCommitDate)

  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1 mono text-text-muted text-xs mt-3">
      {data.stars > 0 && <span>★ {data.stars}</span>}
      <span>{data.commitCount} commits</span>
      {data.primaryLanguage && <span>{data.primaryLanguage}</span>}
      {data.openIssues > 0 && <span>{data.openIssues} open issues</span>}
      {updated && <span>updated {updated}</span>}
    </div>
  )
}
