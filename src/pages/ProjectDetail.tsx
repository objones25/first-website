import { useState } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import { useAuth } from '@clerk/react-router'
import { motion } from 'framer-motion'
import { projects } from '@/data/projects'
import { PageTransition } from '@/components/layout/PageTransition'
import type { DataTable } from '@/types'

const ease = [0.16, 1, 0.3, 1] as const

const statusLabel: Record<string, string> = {
  active:   'Active',
  stable:   'Stable',
  complete: 'Complete',
  planned:  'Planned',
}

export default function ProjectDetail() {
  const { slug } = useParams<{ slug: string }>()
  const { isSignedIn } = useAuth()
  const index = projects.findIndex(p => p.slug === slug)
  const project = projects[index]

  if (!project) return <Navigate to="/projects" replace />

  const prev = projects[index - 1]
  const next = projects[index + 1]

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto px-6 pt-16 pb-32">

        {/* ── Back nav ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="mb-16"
        >
          <Link
            to="/projects"
            className="mono text-text-muted hover:text-text transition-colors duration-200"
          >
            ← All Projects
          </Link>
        </motion.div>

        {/* ── Header ── */}
        <div className="mb-16 border-b border-border pb-12">
          <div className="flex items-start justify-between gap-8 mb-8">
            <div>
              <span className="clip block mb-4">
                <motion.span
                  initial={{ y: '105%' }}
                  animate={{ y: '0%' }}
                  transition={{ duration: 0.9, ease }}
                  className="section-label block"
                >
                  // {String(index + 1).padStart(3, '0')} ——
                </motion.span>
              </span>
              <span className="clip block">
                <motion.h1
                  initial={{ y: '105%' }}
                  animate={{ y: '0%' }}
                  transition={{ duration: 0.9, ease, delay: 0.06 }}
                  className="display pb-[0.3em]"
                >
                  {project.title}
                </motion.h1>
              </span>
            </div>

            {/* Links */}
            {project.links && project.links.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="flex flex-col gap-2 shrink-0 pt-2"
              >
                {project.links.map(link => (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mono text-text-muted hover:text-text transition-colors duration-200 uppercase tracking-wider"
                  >
                    [ {link.label} ↗ ]
                  </a>
                ))}
              </motion.div>
            )}
          </div>

          {/* Metadata row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-wrap items-center gap-6"
          >
            <div className="flex items-center gap-2">
              <span className="section-label">Year</span>
              <span className="mono text-text-muted">——</span>
              <span className="mono text-text-muted">{project.year}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="section-label">Status</span>
              <span className="mono text-text-muted">——</span>
              <span className="mono text-text-muted">{statusLabel[project.status]}</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="section-label">Stack</span>
              <span className="mono text-text-muted">——</span>
              {project.tags.map(tag => (
                <span key={tag} className="mono text-text-muted border border-border px-1.5 py-0.5">
                  {tag}
                </span>
              ))}
            </div>
          </motion.div>
        </div>

        {/* ── Content sections ── */}
        <div className="space-y-20">

          {/* Overview */}
          <Section label="// Overview" delay={0.1}>
            {project.overview
              ? <p className="text-text-muted leading-relaxed max-w-2xl">{project.overview}</p>
              : <Placeholder />}
          </Section>

          {/* Challenge */}
          <Section label="// The Challenge" delay={0.15}>
            {project.challenge
              ? <p className="text-text-muted leading-relaxed max-w-2xl">{project.challenge}</p>
              : <Placeholder />}
          </Section>

          {/* Approach */}
          <Section label="// The Approach" delay={0.2}>
            {project.approach
              ? <p className="text-text-muted leading-relaxed max-w-2xl">{project.approach}</p>
              : <Placeholder />}
          </Section>

          {/* Key Features */}
          <Section label="// Key Features" delay={0.25}>
            {project.features && project.features.length > 0 ? (
              <ul className="space-y-3 max-w-2xl">
                {project.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-4">
                    <span className="mono text-text-muted shrink-0">
                      {String(i + 1).padStart(2, '0')} ——
                    </span>
                    <span className="text-text-muted leading-relaxed">{f}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <Placeholder />
            )}
          </Section>

          {/* Visual Evidence */}
          {project.images && project.images.length > 0 && (
            <Section label="// Evidence" delay={0.27}>
              <div className="space-y-10 max-w-2xl">
                {project.images.map((img, i) => (
                  <figure key={img.src}>
                    <img
                      src={img.src}
                      alt={img.alt}
                      loading="lazy"
                      className="w-full border border-border"
                    />
                    <figcaption className="mt-3 flex items-start gap-4">
                      <span className="mono text-text-muted shrink-0">
                        {String(i + 1).padStart(2, '0')} ——
                      </span>
                      <span className="mono text-text-muted text-xs leading-relaxed">
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
            <Section label="// Data" delay={0.28}>
              <div className="space-y-12">
                {project.dataTables.map((table) => (
                  <DataTableBlock key={table.title} table={table} />
                ))}
              </div>
            </Section>
          )}

          {/* Live Demo CTA */}
          {project.hasDemo && (
            <Section label="// Live Demo" delay={0.3}>
              <div className="flex flex-col gap-3">
                <Link
                  to={`/projects/${project.slug}/demo`}
                  className="mono border border-border px-4 py-2 hover:border-border-strong transition-colors duration-200 inline-block w-fit"
                >
                  [ Launch Demo ] →
                </Link>
                {!isSignedIn && (
                  <p className="mono text-text-muted text-xs">
                    Sign in required — free account, no card needed.
                  </p>
                )}
              </div>
            </Section>
          )}

        </div>

        {/* ── Prev / Next navigation ── */}
        <div className="mt-32 pt-8 border-t border-border flex items-center justify-between">
          {prev ? (
            <Link
              to={`/projects/${prev.slug}`}
              className="group flex flex-col gap-1"
            >
              <span className="mono text-text-muted group-hover:text-text transition-colors duration-200">← Prev</span>
              <span className="mono text-text-muted group-hover:text-text transition-colors duration-200 uppercase tracking-wider">{prev.title}</span>
            </Link>
          ) : <div />}

          {next ? (
            <Link
              to={`/projects/${next.slug}`}
              className="group flex flex-col items-end gap-1"
            >
              <span className="mono text-text-muted group-hover:text-text transition-colors duration-200">Next →</span>
              <span className="mono text-text-muted group-hover:text-text transition-colors duration-200 uppercase tracking-wider">{next.title}</span>
            </Link>
          ) : <div />}
        </div>

      </div>
    </PageTransition>
  )
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({
  label,
  delay,
  children,
}: {
  label: string
  delay: number
  children: React.ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
    >
      <span className="section-label block mb-6">{label}</span>
      {children}
    </motion.div>
  )
}

// ── Data table block ──────────────────────────────────────────────────────────
const TRUNCATE_AT = 90

function DataTableBlock({ table }: { table: DataTable }) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

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
        <p className="mono text-text-dim text-xs leading-relaxed mb-4 max-w-2xl">
          {table.description}
        </p>
      )}
      <div className="border border-border-strong overflow-x-auto max-h-[32rem] overflow-y-auto">
        <table className="w-full text-xs mono border-collapse">
          <thead className="sticky top-0 bg-surface">
            <tr>
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
            {table.rows.map((row, i) => (
              <tr key={i} className="hover:bg-surface transition-colors">
                {table.columns.map(col => {
                  const value = row[col.key]
                  const isExpandable = table.expandableKey === col.key && typeof value === 'string'
                  const isLong = isExpandable && value.length > TRUNCATE_AT
                  const isOpen = expanded.has(i)
                  return (
                    <td
                      key={col.key}
                      className={`text-text-muted px-4 py-3 align-top ${
                        col.align === 'right' ? 'text-right whitespace-nowrap' : 'text-left'
                      } ${isExpandable ? 'min-w-[24rem]' : ''}`}
                    >
                      {isExpandable ? (
                        <>
                          <span className={isOpen ? '' : 'line-clamp-1'}>{value}</span>
                          {isLong && (
                            <button
                              type="button"
                              onClick={() => toggle(i)}
                              className="block mt-1 text-text-dim hover:text-text-muted transition-colors"
                            >
                              {isOpen ? '[ collapse ]' : '[ expand ]'}
                            </button>
                          )}
                        </>
                      ) : (
                        value
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Placeholder block ─────────────────────────────────────────────────────────
function Placeholder() {
  return (
    <div className="border border-dashed border-border-strong rounded-none p-8 max-w-2xl">
      <span className="mono text-text-muted">[ Content coming soon ]</span>
    </div>
  )
}
