import { PageTransition } from '@/components/layout/PageTransition'
import { ClipReveal, Reveal } from '@/components/motion/Reveal'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { profile } from '@/data/profile'

// Link values show the URL without its scheme and trailing slash.
const readableUrl = (href: string) => href.replace(/^https?:\/\//, '').replace(/\/$/, '')

export default function About() {
  useDocumentMeta('About', profile.lead)

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto px-6 pt-16 pb-24">
        <div className="mb-12">
          <ClipReveal className="section-label mb-4">About</ClipReveal>
          <ClipReveal as="h1" delay={0.08} className="heading-lg max-w-2xl">
            I work on reinforcement learning and robot learning.
          </ClipReveal>
        </div>

        <div className="space-y-12">
          <Reveal>
            <p className="lead max-w-2xl">
              I'm a first-year CS master's student at UC Santa Barbara, with an applied math degree from UCLA. The largest project on this site is a PPO agent for Pokemon Red, trained over nine runs, where most of the work was finding out what each reward term actually taught the agent. I'm now building an SO-101 arm to start on imitation learning with real hardware.
            </p>
          </Reveal>

          <Reveal delay={0.08}>
            <h2 className="section-label mb-4">// Now</h2>
            <div className="border border-border bg-surface p-5 max-w-2xl">
              <ul className="space-y-3 text-text">
                {profile.now.map(item => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="mono text-text-muted mt-4">Last updated {profile.nowUpdated}</p>
            </div>
          </Reveal>

          <Reveal delay={0.16}>
            <h2 className="section-label mb-4">// Coursework and teaching</h2>
            <div className="space-y-8 max-w-2xl">
              {profile.terms.map(({ term, courses }) => (
                <div key={term}>
                  <h3 className="mono text-text-muted mb-2">{term}</h3>
                  <ul className="divide-y divide-border border-t border-border">
                    {courses.map(course => (
                      <li
                        key={course.code}
                        className="py-3 flex flex-col gap-1 sm:grid sm:grid-cols-[8rem_1fr_auto] sm:gap-4 sm:items-baseline"
                      >
                        <span className="mono text-text">{course.code}</span>
                        <span className="text-text-muted">{course.title !== '' ? course.title : null}</span>
                        <span>
                          {course.role === 'TA' && (
                            <span className="mono inline-block border border-accent px-2 py-0.5">TA</span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal>
            <h2 className="section-label mb-4">// Outside work</h2>
            <p className="text-text-muted leading-relaxed max-w-2xl">
              Outside of work I train for Hyrox and DEKA, run, swim, surf and cook.
            </p>
          </Reveal>

          <Reveal>
            <h2 className="section-label mb-4">// Details</h2>
            <dl className="grid grid-cols-1 gap-y-3 sm:grid-cols-[8rem_1fr] sm:gap-x-4 max-w-2xl">
              <dt className="mono text-text-muted uppercase">Location</dt>
              <dd className="text-text break-words">{profile.location}</dd>
              <dt className="mono text-text-muted uppercase">Open to</dt>
              <dd className="text-text break-words">Summer 2027 internships</dd>
              <dt className="mono text-text-muted uppercase">Email</dt>
              <dd className="text-text break-words">
                <a href={`mailto:${profile.email}`} className="break-all underline underline-offset-4 inline-flex min-h-11 items-center">
                  {profile.email}
                </a>
              </dd>
              {profile.links.map(link => (
                <div key={link.label} className="contents">
                  <dt className="mono text-text-muted uppercase">{link.label}</dt>
                  <dd className="text-text break-words">
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all underline underline-offset-4 inline-flex min-h-11 items-center"
                    >
                      {readableUrl(link.href)}
                    </a>
                  </dd>
                </div>
              ))}
              {profile.cvHref && (
                <>
                  <dt className="mono text-text-muted uppercase">CV</dt>
                  <dd className="text-text break-words">
                    <a
                      href={profile.cvHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-4 inline-flex min-h-11 items-center"
                    >
                      Download
                    </a>
                  </dd>
                </>
              )}
            </dl>
          </Reveal>
        </div>
      </div>
    </PageTransition>
  )
}
