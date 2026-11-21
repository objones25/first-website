import { useState } from 'react'
import { PageTransition } from '@/components/layout/PageTransition'
import { ClipReveal, Reveal } from '@/components/motion/Reveal'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { profile } from '@/data/profile'
import { pageMeta } from '@/data/pageMeta'

const rowClass = 'flex min-h-12 items-center justify-between gap-4 py-3 border-b border-border group'

export default function Contact() {
  useDocumentMeta(pageMeta.contact.title, pageMeta.contact.description)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(profile.email)
      setCopyState('copied')
    } catch {
      // The clipboard can be refused (permissions, insecure context). The
      // address is on screen beside the button, so say so and stop.
      setCopyState('failed')
    }
  }

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
          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href={`mailto:${profile.email}`}
              className="flex min-h-12 w-full items-center justify-center px-5 mono bg-accent text-background hover:bg-accent-hover sm:w-fit"
            >
              <span className="break-all">{profile.email}</span>
            </a>
            <button
              type="button"
              onClick={copyEmail}
              className="flex min-h-12 w-full items-center justify-center px-5 mono uppercase border border-border-strong text-text hover:border-accent transition-colors duration-150 sm:w-fit"
            >
              <span aria-live="polite">
                {copyState === 'idle' ? '[ Copy address ]' : copyState === 'copied' ? '[ Copied ]' : '[ Copy failed ]'}
              </span>
            </button>
          </div>

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
