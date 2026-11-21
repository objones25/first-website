import { useId, useState } from 'react'
import { skills, skillsSource, type Skill, type SkillDemo } from '@/data/skills'
import { PageTransition } from '@/components/layout/PageTransition'
import { ClipReveal, Reveal } from '@/components/motion/Reveal'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'

const pad = (n: number) => String(n).padStart(3, '0')

export default function Skills() {
  useDocumentMeta(
    'Skills',
    'Claude Code skills I develop and maintain, shown with the output of the scripts they ship.',
  )

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto px-6 pt-16 md:pt-20 pb-24 md:pb-32">
        <header className="mb-12 md:mb-16">
          <ClipReveal className="section-label mb-4">// Skills</ClipReveal>
          <ClipReveal as="h1" delay={0.06} className="display pb-[0.15em]">
            Skills
          </ClipReveal>
          <Reveal delay={0.12}>
            <p className="lead mt-4 max-w-2xl">{skillsSource.intro}</p>
            <p className="mt-4 max-w-2xl text-text-muted leading-relaxed">
              The repository holds {skillsSource.skillCount}. Six are shown here, each with the output
              of a script it ships. Everything quoted on this page was copied from the repository at
              commit <span className="mono text-text">{skillsSource.commit}</span> ({skillsSource.commitDate}).
            </p>
            <a
              href={skillsSource.repo}
              target="_blank"
              rel="noopener noreferrer"
              className="mono mt-6 inline-flex min-h-11 items-center border border-border-strong px-3 uppercase tracking-wider text-text-muted hover:text-text hover:border-accent transition-colors duration-200"
            >
              [ Repository ↗ ]
            </a>
          </Reveal>
        </header>

        <section aria-labelledby="install-heading" className="mb-14 md:mb-20 max-w-2xl">
          <h2 id="install-heading" className="section-label mb-4">// Install one</h2>
          <CodeBlock text={skillsSource.install} prompt copyLabel="Copy install commands" />
        </section>

        <div className="space-y-16 md:space-y-24">
          {skills.map((skill, i) => (
            <SkillEntry key={skill.name} skill={skill} index={i + 1} />
          ))}
        </div>
      </div>
    </PageTransition>
  )
}

function SkillEntry({ skill, index }: { skill: Skill; index: number }) {
  return (
    <section aria-labelledby={`${skill.name}-heading`} className="border-t border-border pt-8 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12">
      <div className="min-w-0">
        <p className="mono text-text-muted mb-2">{pad(index)}</p>
        <h2 id={`${skill.name}-heading`} className="heading-lg break-words">
          {skill.name}
        </h2>
        <p className="mt-3 text-text-muted leading-relaxed">{skill.summary}</p>

        <p className="mono text-text-muted mt-4 flex flex-wrap gap-x-4 gap-y-1">
          {skill.counts.map(c => (
            <span key={c.label}>
              <span className="text-text">{c.value}</span> {c.label}
            </span>
          ))}
        </p>

        <a
          href={skill.href}
          target="_blank"
          rel="noopener noreferrer"
          className="mono mt-2 inline-flex min-h-11 items-center text-text-muted hover:text-text transition-colors duration-200 uppercase tracking-wider"
        >
          [ Source ↗ ]
        </a>

        <details className="mt-2 border-t border-border">
          <summary className="mono flex min-h-11 cursor-pointer items-center text-text-muted hover:text-text uppercase tracking-wider">
            Scripts ({skill.scripts.length})
          </summary>
          <ul className="pb-4 space-y-3">
            {skill.scripts.map(s => (
              <li key={s.file} className="min-w-0">
                <span className="mono text-text break-all">{s.file}</span>
                <p className="text-sm text-text-muted leading-relaxed">{s.purpose}</p>
              </li>
            ))}
          </ul>
        </details>

        {skill.records.length > 0 && (
          <details className="border-t border-border">
            <summary className="mono flex min-h-11 cursor-pointer items-center text-text-muted hover:text-text uppercase tracking-wider">
              Recorded in the repository
            </summary>
            <dl className="pb-4 space-y-4">
              {skill.records.map(r => (
                <div key={r.label}>
                  <dt className="mono text-text-muted">
                    {r.label}, {r.date}
                  </dt>
                  <dd className="mt-1 text-sm leading-relaxed break-words">{r.quote}</dd>
                  <dd className="mono text-text-muted mt-1 break-all">{r.source}</dd>
                </div>
              ))}
            </dl>
          </details>
        )}
      </div>

      <div className="mt-8 min-w-0 space-y-8 lg:mt-0">
        <DemoPanel skill={skill} />
        <figure>
          <figcaption className="mono text-text-muted mb-2 break-all">{skill.excerpt.source}</figcaption>
          <blockquote className="border-l-2 border-border-strong pl-4 text-sm text-text-muted leading-relaxed whitespace-pre-wrap break-words">
            {skill.excerpt.text}
          </blockquote>
        </figure>
      </div>
    </section>
  )
}

// A short name for a demo's tab: the script, plus its first argument when two
// demos of one skill run the same script.
function demoLabel(demo: SkillDemo, all: SkillDemo[]): string {
  const [script, firstArg] = demo.command.replace(/^python /, '').split(/\s+/)
  const sameScript = all.filter(d => d.command.includes(script)).length > 1
  return sameScript && firstArg ? `${script} ${firstArg}` : script
}

function DemoPanel({ skill }: { skill: Skill }) {
  const [selected, setSelected] = useState(0)
  const [showInput, setShowInput] = useState(false)
  const demo = skill.demos[selected]
  const panelId = useId()
  const inputId = useId()

  return (
    <div>
      {skill.demos.length > 1 && (
        <div role="tablist" aria-label={`${skill.name} demonstrations`} className="flex flex-wrap gap-2 mb-3">
          {skill.demos.map((d, i) => (
            <button
              key={d.command}
              type="button"
              role="tab"
              aria-selected={i === selected}
              aria-controls={panelId}
              onClick={() => {
                setSelected(i)
                setShowInput(false)
              }}
              className={`mono inline-flex min-h-11 items-center border px-3 transition-colors duration-200 hover:text-text ${
                i === selected ? 'border-accent text-text' : 'border-border text-text-muted'
              }`}
            >
              {demoLabel(d, skill.demos)}
            </button>
          ))}
        </div>
      )}

      <div id={panelId} role={skill.demos.length > 1 ? 'tabpanel' : undefined} className="border border-border-strong bg-surface">
        <p className="mono border-b border-border px-4 py-3 text-text break-words">
          <span aria-hidden="true" className="text-text-muted select-none">$ </span>
          {demo.command}
        </p>

        {demo.input && (
          <div className="border-b border-border">
            <button
              type="button"
              aria-expanded={showInput}
              aria-controls={inputId}
              onClick={() => setShowInput(v => !v)}
              className="mono flex min-h-11 w-full items-center justify-between gap-4 px-4 text-left text-text-muted hover:text-text transition-colors duration-200 focus-visible:-outline-offset-2"
            >
              <span className="min-w-0 break-all">{demo.input.name} (written for this page)</span>
              <span aria-hidden="true" className={showInput ? 'text-accent' : undefined}>{showInput ? '−' : '+'}</span>
            </button>
            {showInput && (
              <pre id={inputId} className="mono overflow-x-auto border-t border-border px-4 py-3 text-text-muted leading-relaxed">
                {demo.input.text}
              </pre>
            )}
          </div>
        )}

        {demo.repoInput && (
          <p className="mono border-b border-border px-4 text-text-muted">
            <a
              href={demo.repoInput.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center break-all hover:text-text transition-colors duration-200"
            >
              {demo.repoInput.name} (from the repository) ↗
            </a>
          </p>
        )}

        <Output text={demo.output} />

        <p className="mono border-t border-border px-4 py-3 text-text-muted">
          exit {demo.exitCode}
          {demo.exitCode !== 0 && ', which these scripts use to mean findings were reported'}
        </p>
      </div>
    </div>
  )
}

// Column-aligned output keeps its alignment and scrolls sideways; anything else
// wraps, so a long finding can be read on a phone without scrolling.
function Output({ text }: { text: string }) {
  const tabular = text.includes('-+-')
  return (
    <pre
      tabIndex={tabular ? 0 : undefined}
      aria-label="Script output"
      className={`mono px-4 py-3 text-text leading-relaxed ${
        tabular ? 'overflow-x-auto whitespace-pre' : 'whitespace-pre-wrap break-words'
      }`}
    >
      {text}
    </pre>
  )
}

function CodeBlock({ text, prompt = false, copyLabel }: { text: string; prompt?: boolean; copyLabel: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setState('copied')
    } catch {
      // Clipboard access can be refused (permissions, insecure context). The
      // text is on screen to select by hand, so say so instead of failing silently.
      setState('failed')
    }
  }

  return (
    <div className="border border-border-strong bg-surface">
      <pre className="mono overflow-x-auto px-4 py-3 text-text leading-relaxed">
        {text.split('\n').map(line => (
          <span key={line} className="block">
            {prompt && <span aria-hidden="true" className="text-text-muted select-none">$ </span>}
            {line}
          </span>
        ))}
      </pre>
      <button
        type="button"
        onClick={copy}
        aria-label={copyLabel}
        className="mono flex min-h-11 w-full items-center border-t border-border px-4 text-text-muted hover:text-text transition-colors duration-200 uppercase tracking-wider focus-visible:-outline-offset-2"
      >
        <span aria-live="polite">
          {state === 'idle' ? '[ Copy ]' : state === 'copied' ? '[ Copied ]' : '[ Copy failed, select the text instead ]'}
        </span>
      </button>
    </div>
  )
}
