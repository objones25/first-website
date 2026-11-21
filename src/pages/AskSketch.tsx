import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { profile } from '@/data/profile'
import { activeProjects } from '@/data/projects'
import { PageTransition } from '@/components/layout/PageTransition'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'

// DESIGN SKETCH, dev server only (registered under import.meta.env.DEV).
// It shows the layout and the interaction of an "ask the site" page. No model
// is called: each suggested question has a canned answer assembled from
// src/data, and typed questions get a fixed reply saying so. The real page
// would send the question to a worker that answers only from the site's own
// content and returns the pages it used.

interface Source {
  label: string
  to: string
}

interface Exchange {
  question: string
  answer: string
  sources: Source[]
}

const featured = activeProjects[0]

const CANNED: Exchange[] = [
  {
    question: 'What is he working on now?',
    answer: profile.now.join(' '),
    sources: [{ label: 'About', to: '/about' }],
  },
  {
    question: 'Which project shows reinforcement learning?',
    answer: `${featured.title}. ${featured.tagline ?? featured.description}`,
    sources: [{ label: featured.title, to: `/projects/${featured.slug}` }],
  },
  {
    question: 'Is he available for an internship?',
    answer: `${profile.availability}. He is based in ${profile.location}.`,
    sources: [{ label: 'Contact', to: '/contact' }],
  },
]

const MAX_QUESTION_CHARS = 500

export default function AskSketch() {
  useDocumentMeta('Ask (sketch)')
  const [log, setLog] = useState<Exchange[]>([])
  const [input, setInput] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' })
  }, [log])

  function ask(question: string) {
    const canned = CANNED.find(c => c.question === question)
    setLog(prev => [
      ...prev,
      canned ?? {
        question,
        answer:
          'This is a sketch, so typed questions are not answered. The real page would answer from the site’s own pages and say so when they do not cover the question.',
        sources: [],
      },
    ])
    setInput('')
  }

  const unused = CANNED.filter(c => !log.some(l => l.question === c.question))

  return (
    <PageTransition>
      {/* The page is a column as tall as the screen, so the input stays docked
          at the bottom and only the log scrolls. */}
      <div className="max-w-2xl mx-auto px-6 flex flex-col h-[calc(100dvh-3.5rem)]">
        <p role="note" className="mono mt-6 border border-accent px-4 py-3 text-text">
          Design sketch. Answers are canned from the site data and no model is called. This page
          exists only in the dev server.
        </p>

        <header className="pt-8 pb-4">
          <p className="section-label mb-3">// Ask</p>
          <h1 className="heading-lg">Ask about my work</h1>
          <p className="mt-3 text-text-muted leading-relaxed">
            Answers come only from the pages of this site, with links to where each one came from.
          </p>
        </header>

        <div role="log" aria-label="Conversation" className="flex-1 min-h-0 overflow-y-auto space-y-8 py-4">
          {log.map((entry, i) => (
            <div key={i} className="anim-rise">
              <p className="mono text-text-muted">
                <span aria-hidden="true">&gt; </span>
                {entry.question}
              </p>
              <p className="mt-2 leading-relaxed">{entry.answer}</p>
              {entry.sources.length > 0 && (
                <p className="mono text-text-muted mt-2 flex flex-wrap items-center gap-x-3">
                  <span>From</span>
                  {entry.sources.map(s => (
                    <Link
                      key={s.to}
                      to={s.to}
                      className="inline-flex min-h-11 items-center underline decoration-border-strong underline-offset-4 hover:text-text"
                    >
                      {s.label} →
                    </Link>
                  ))}
                </p>
              )}
            </div>
          ))}
          <div ref={endRef} />
        </div>

        {unused.length > 0 && (
          <ul aria-label="Suggested questions" className="flex gap-2 overflow-x-auto scroll-hide -mx-6 px-6 pb-3">
            {unused.map(c => (
              <li key={c.question} className="shrink-0">
                <button
                  type="button"
                  onClick={() => ask(c.question)}
                  className="mono inline-flex min-h-11 items-center whitespace-nowrap border border-border px-3 text-text-muted hover:text-text hover:border-border-strong transition-colors duration-200"
                >
                  {c.question}
                </button>
              </li>
            ))}
          </ul>
        )}

        <form
          onSubmit={e => {
            e.preventDefault()
            const question = input.trim()
            if (question) ask(question)
          }}
          className="flex gap-2 border-t border-border py-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          <label htmlFor="ask-input" className="sr-only">
            Your question
          </label>
          {/* 16px text: iOS zooms the page when a focused input is smaller. */}
          <input
            id="ask-input"
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            maxLength={MAX_QUESTION_CHARS}
            placeholder="Ask a question"
            autoComplete="off"
            className="min-w-0 flex-1 min-h-12 bg-surface border border-border-strong px-4 text-base text-text placeholder:text-text-dim focus:border-text"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="mono min-h-12 px-4 border border-border-strong uppercase tracking-wider text-text hover:border-accent disabled:opacity-40 transition-colors duration-200"
          >
            Ask
          </button>
        </form>
      </div>
    </PageTransition>
  )
}
