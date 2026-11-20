import { Link } from 'react-router-dom'
import { profile } from '@/data/profile'
import { activeProjects } from '@/data/projects'
import { ProjectRow } from '@/components/ProjectRow'
import { Reveal, ClipReveal } from '@/components/motion/Reveal'
import { PageTransition } from '@/components/layout/PageTransition'
import { SITE_TITLE, useDocumentMeta } from '@/hooks/useDocumentMeta'

const DESCRIPTION =
  "CS master's student at UC Santa Barbara working on reinforcement learning and robot learning. Open to summer 2027 internships."

const buttonBase =
  'inline-flex min-h-12 items-center justify-center px-5 mono uppercase transition-colors duration-150'

export default function Home() {
  useDocumentMeta(SITE_TITLE, DESCRIPTION)

  const [featured, ...rest] = activeProjects

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto px-6">
        {/* ── Hero ── */}
        <section className="pt-16 pb-12 md:pt-24">
          <ClipReveal as="h1" className="display">{profile.name}</ClipReveal>
          <Reveal delay={0.08}>
            <p className="lead mt-6 max-w-2xl">{profile.lead}</p>
          </Reveal>
          <p className="mono text-text-muted mt-6 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="size-1.5 rounded-full bg-accent" />
            <span>{profile.availability}</span>
            <span>·</span>
            <span>{profile.location}</span>
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/projects"
              className={`${buttonBase} bg-accent text-background hover:bg-accent-hover`}
            >
              [ View work ]
            </Link>
            <a
              href={`mailto:${profile.email}`}
              className={`${buttonBase} border border-border-strong text-text hover:border-accent`}
            >
              [ Email me ]
            </a>
          </div>
        </section>

        {/* ── Featured ── */}
        {featured && (
          <section className="py-12 border-t border-border">
            <h2 className="section-label mb-6">// Featured</h2>
            <Link
              to={`/projects/${featured.slug}`}
              className="grid gap-6 md:grid-cols-2 md:items-center"
            >
              {featured.video && (
                <img
                  src={featured.video.poster}
                  alt="A frame from the agent's final run"
                  className="w-full border border-border [image-rendering:pixelated]"
                />
              )}
              <div className="min-w-0">
                <h3 className="heading-lg break-words">{featured.title}</h3>
                <p className="text-text-muted mt-3">
                  {featured.tagline ?? featured.description}
                </p>
                {featured.results && featured.results.length > 0 && (
                  <dl className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {featured.results.map(r => (
                      <div key={r.label} className="flex flex-col-reverse min-w-0">
                        <dt className="mono text-text-muted mt-1 break-words">{r.label}</dt>
                        <dd className="text-xl font-medium break-words">{r.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            </Link>
          </section>
        )}

        {/* ── Work ── */}
        <section className="py-12 border-t border-border">
          <div className="flex flex-wrap items-center justify-between gap-x-6 mb-2">
            <h2 className="section-label">// Work</h2>
            <Link
              to="/projects"
              className="inline-flex min-h-11 items-center mono text-text-muted hover:text-text"
            >
              All projects →
            </Link>
          </div>
          <div className="divide-y divide-border">
            {rest.map((project, i) => (
              <ProjectRow key={project.slug} project={project} index={i + 2} />
            ))}
          </div>
        </section>
      </div>
    </PageTransition>
  )
}
