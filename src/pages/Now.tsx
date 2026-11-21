import { Link } from 'react-router-dom'
import { PageTransition } from '@/components/layout/PageTransition'
import { ClipReveal, Reveal } from '@/components/motion/Reveal'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { pageMeta } from '@/data/pageMeta'
import { profile } from '@/data/profile'

const pad = (n: number) => String(n).padStart(3, '0')

// '2026-11-20' -> '20 November 2026'. Read as UTC so the day does not shift
// with the reader's time zone.
function formatDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) throw new Error(`profile.nowUpdated is not a date: ${isoDate}`)
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date)
}

const linkClass =
  'mono inline-flex min-h-11 items-center text-text-muted hover:text-text transition-colors duration-150'

export default function Now() {
  useDocumentMeta(pageMeta.now.title, pageMeta.now.description)

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto px-6 pt-16 pb-24">
        <div className="mb-12">
          <ClipReveal className="section-label mb-4">// Now</ClipReveal>
          <ClipReveal as="h1" delay={0.08} className="heading-lg">
            What I'm working on now
          </ClipReveal>
          <Reveal delay={0.12}>
            <p className="mono text-text-muted mt-4">
              Updated <time dateTime={profile.nowUpdated}>{formatDate(profile.nowUpdated)}</time>
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.16}>
          <ol className="max-w-2xl divide-y divide-border border-y border-border">
            {profile.now.map((item, i) => (
              <li key={item} className="flex gap-4 py-5">
                <span className="mono text-text-muted pt-1">{pad(i + 1)}</span>
                <span className="min-w-0 text-lg leading-relaxed">{item}</span>
              </li>
            ))}
          </ol>

          <div className="mt-8 flex flex-wrap gap-x-8">
            <Link to="/projects" className={linkClass}>Projects →</Link>
            <Link to="/about" className={linkClass}>About →</Link>
            <Link to="/contact" className={linkClass}>Contact →</Link>
          </div>
        </Reveal>
      </div>
    </PageTransition>
  )
}
