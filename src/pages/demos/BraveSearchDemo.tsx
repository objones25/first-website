import { useState } from 'react'

const BASE_URL = import.meta.env.VITE_BRAVE_SEARCH_AGENT_URL as string

type Mode = 'search' | 'ai' | 'optimized' | 'agentic'
type Status = 'idle' | 'loading' | 'success' | 'error'

interface Options {
  count: number
  safesearch: 'off' | 'moderate' | 'strict'
  freshness: 'any' | 'pd' | 'pw' | 'pm' | 'py'
}

interface WebResult {
  title: string
  url: string
  description: string
  source: string
}

// search: { query, results: { webResults, newsResults, ... } }
interface SearchResponse {
  results?: { webResults?: WebResult[] }
}

// ai: { query, answer }
interface AiResponse {
  answer?: string
}

// optimized: { query, optimization: { optimizedQuery, ... }, results: { webResults, ... } }
interface OptimizedResponse {
  optimization?: { optimizedQuery?: string }
  results?: { webResults?: WebResult[] }
}

// agentic: { query, answer }
interface AgenticResponse {
  answer?: string
}

type Result = SearchResponse | AiResponse | OptimizedResponse | AgenticResponse | null

const MODE_LABELS: Record<Mode, string> = {
  search: 'SEARCH',
  ai: 'AI',
  optimized: 'OPTIMIZED',
  agentic: 'AGENTIC',
}

const MODE_DESCRIPTIONS: Record<Mode, string> = {
  search: 'Direct web search — raw Brave results',
  ai: 'Gemini synthesizes a single answer from search results',
  optimized: 'Gemini expands the query, fans out searches in parallel, merges results',
  agentic: 'Gemini calls Brave up to 5 times autonomously, synthesizes a cited answer',
}

export function BraveSearchDemo() {
  const [mode, setMode] = useState<Mode>('search')
  const [query, setQuery] = useState('')
  const [options, setOptions] = useState<Options>({
    count: 10,
    safesearch: 'moderate',
    freshness: 'any',
  })
  const [showOptions, setShowOptions] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<Result>(null)
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    if (!query.trim()) return

    setStatus('loading')
    setResult(null)
    setErrorMsg('')

    const body: Record<string, unknown> = { query: query.trim() }
    if (mode !== 'agentic') {
      body.options = options
    }

    try {
      const res = await fetch(`${BASE_URL}/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(`${res.status} ${res.statusText}: ${text}`)
      }

      const data = await res.json()
      setResult(data)
      setStatus('success')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error')
      setStatus('error')
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 pt-16 pb-32">
      <span className="section-label block mb-4">// Live Demo — Brave Search Agent</span>
      <h1 className="display mb-2">Brave Search Agent</h1>
      <p className="mono text-text-muted text-sm mb-12">
        Four search modes powered by Brave Search + Gemini. Choose cost vs. quality.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Mode selector */}
        <div>
          <span className="section-label block mb-3">// MODE</span>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(MODE_LABELS) as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`mono text-xs px-4 py-2 border transition-colors ${
                  mode === m
                    ? 'border-text bg-text text-background'
                    : 'border-border-strong text-text-muted hover:border-text hover:text-text'
                }`}
              >
                [ {MODE_LABELS[m]} ]
              </button>
            ))}
          </div>
          <p className="mono text-text-muted text-xs mt-2">{MODE_DESCRIPTIONS[mode]}</p>
        </div>

        {/* Query input */}
        <div>
          <span className="section-label block mb-3">// QUERY</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter search query..."
            className="w-full bg-transparent border border-border-strong mono text-sm px-4 py-3 text-text placeholder:text-text-muted focus:outline-none focus:border-text"
          />
        </div>

        {/* Options (hidden for agentic) */}
        {mode !== 'agentic' && (
          <div>
            <button
              type="button"
              onClick={() => setShowOptions((v) => !v)}
              className="section-label text-text-muted hover:text-text transition-colors"
            >
              // OPTIONS {showOptions ? '▲' : '▼'}
            </button>

            {showOptions && (
              <div className="mt-3 border border-border-strong p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="mono text-xs text-text-muted block mb-2">COUNT</label>
                  <select
                    value={options.count}
                    onChange={(e) => setOptions((o) => ({ ...o, count: Number(e.target.value) }))}
                    className="w-full bg-background border border-border-strong mono text-sm px-3 py-2 text-text focus:outline-none focus:border-text"
                  >
                    {[5, 10, 20].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mono text-xs text-text-muted block mb-2">SAFESEARCH</label>
                  <select
                    value={options.safesearch}
                    onChange={(e) =>
                      setOptions((o) => ({
                        ...o,
                        safesearch: e.target.value as Options['safesearch'],
                      }))
                    }
                    className="w-full bg-background border border-border-strong mono text-sm px-3 py-2 text-text focus:outline-none focus:border-text"
                  >
                    {['off', 'moderate', 'strict'].map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mono text-xs text-text-muted block mb-2">FRESHNESS</label>
                  <select
                    value={options.freshness}
                    onChange={(e) =>
                      setOptions((o) => ({
                        ...o,
                        freshness: e.target.value as Options['freshness'],
                      }))
                    }
                    className="w-full bg-background border border-border-strong mono text-sm px-3 py-2 text-text focus:outline-none focus:border-text"
                  >
                    {[
                      { value: 'any', label: 'any time' },
                      { value: 'pd', label: 'past day' },
                      { value: 'pw', label: 'past week' },
                      { value: 'pm', label: 'past month' },
                      { value: 'py', label: 'past year' },
                    ].map(({ value, label }) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={status === 'loading' || !query.trim()}
          className="mono text-sm border border-text px-6 py-3 hover:bg-text hover:text-background transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {status === 'loading' ? '[ Running... ]' : '[ Run Search ] →'}
        </button>
      </form>

      {/* Results */}
      <div className="mt-12">
        {status === 'loading' && <LoadingSkeleton />}
        {status === 'error' && <ErrorPane message={errorMsg} />}
        {status === 'success' && result && <ResultsPane mode={mode} result={result} />}
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-3 bg-border-strong w-1/3" />
      <div className="h-3 bg-border-strong w-full" />
      <div className="h-3 bg-border-strong w-5/6" />
      <div className="h-3 bg-border-strong w-2/3" />
    </div>
  )
}

function ErrorPane({ message }: { message: string }) {
  return (
    <div className="border border-dashed border-border-strong p-4">
      <span className="section-label text-text-muted block mb-2">// ERROR</span>
      <p className="mono text-sm text-text-muted break-all">{message}</p>
    </div>
  )
}

function ResultsPane({ mode, result }: { mode: Mode; result: NonNullable<Result> }) {
  if (mode === 'search') {
    const r = result as SearchResponse
    const results = r.results?.webResults ?? []
    return (
      <div>
        <span className="section-label block mb-4">
          // RESULTS — {results.length} web results
        </span>
        <WebResultList results={results} />
      </div>
    )
  }

  if (mode === 'ai') {
    const r = result as AiResponse
    return (
      <div className="space-y-8">
        {r.answer && (
          <div>
            <span className="section-label block mb-3">// ANSWER</span>
            <p className="mono text-sm text-text leading-relaxed whitespace-pre-wrap">{r.answer}</p>
          </div>
        )}
      </div>
    )
  }

  if (mode === 'optimized') {
    const r = result as OptimizedResponse
    const results = r.results?.webResults ?? []
    return (
      <div className="space-y-8">
        {r.optimization?.optimizedQuery && (
          <div>
            <span className="section-label block mb-2">// REWRITTEN QUERY</span>
            <p className="mono text-sm text-text">{r.optimization.optimizedQuery}</p>
          </div>
        )}
        <div>
          <span className="section-label block mb-4">// RESULTS — {results.length}</span>
          <WebResultList results={results} />
        </div>
      </div>
    )
  }

  if (mode === 'agentic') {
    const r = result as AgenticResponse
    return (
      <div className="space-y-8">
        {r.answer && (
          <div>
            <span className="section-label block mb-3">// ANSWER</span>
            <p className="mono text-sm text-text leading-relaxed whitespace-pre-wrap">{r.answer}</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <pre className="mono text-xs text-text-muted overflow-auto border border-border-strong p-4">
      {JSON.stringify(result, null, 2)}
    </pre>
  )
}

function WebResultList({ results }: { results: WebResult[] }) {
  if (results.length === 0) {
    return <p className="mono text-text-muted text-sm">No results.</p>
  }
  return (
    <div className="space-y-5">
      {results.map((r, i) => (
        <div key={i} className="border-l border-border-strong pl-4">
          <div className="flex items-start gap-2 mb-1">
            <span className="mono text-xs text-text-muted shrink-0">
              {String(i + 1).padStart(3, '0')} ——
            </span>
            {r.url ? (
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mono text-sm text-text hover:underline leading-tight"
              >
                {r.title ?? r.url}
              </a>
            ) : (
              <span className="mono text-sm text-text leading-tight">{r.title}</span>
            )}
          </div>
          {r.url && r.title && (
            <p className="mono text-xs text-text-muted ml-9 truncate">{r.url}</p>
          )}
          {r.description && (
            <p className="mono text-xs text-text-muted ml-9 mt-1 leading-relaxed">
              {r.description}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
