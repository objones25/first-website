import { PageTransition } from '@/components/layout/PageTransition'
import { ClipReveal, Reveal } from '@/components/motion/Reveal'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { profile } from '@/data/profile'

const rowClass = 'flex min-h-12 items-center justify-between gap-4 py-3 border-b border-border group'

export default function Contact() {
  useDocumentMeta('Contact', 'Email and links for Owen Jones. Open to summer 2027 internships.')

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto px-6 pt-16 pb-24">
        <div className="mb-12">
          <ClipReveal className="section-label mb-4">Contact</ClipReveal>
          <ClipReveal as="h1" delay={0.08} className="heading-lg max-w-3xl">
            I'm looking for a summer 2027 internship in reinforcement learning or robot learning.
          </ClipReveal>
        </div>

        <Reveal className="max-w-2xl">
          <p className="text-text-muted leading-relaxed mb-6">Email is the best way to reach me.</p>
          <a
            href={`mailto:${profile.email}`}
            className="flex min-h-12 w-full items-center justify-center px-5 mono bg-accent text-background hover:bg-accent-hover sm:w-fit"
          >
            <span className="break-all">{profile.email}</span>
          </a>

          <h2 className="section-label mt-12 mb-3">Elsewhere</h2>
          <div>
            {profile.links.map(({ label, href }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" className={rowClass}>
                <span className="text-text-muted group-hover:text-text transition-colors duration-200">{label}</span>
                <span className="text-text-muted group-hover:text-text transition-colors duration-200">↗</span>
              </a>
            ))}
            {profile.cvHref && (
              <a href={profile.cvHref} target="_blank" rel="noopener noreferrer" className={rowClass}>
                <span className="text-text-muted group-hover:text-text transition-colors duration-200">CV</span>
                <span className="text-text-muted group-hover:text-text transition-colors duration-200">↗</span>
              </a>
            )}
          </div>

          <p className="mono text-text-muted mt-8">{profile.location}</p>
        </Reveal>
      </div>
    </PageTransition>
  )
}
