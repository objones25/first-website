import { useState, useRef, useEffect } from 'react'
import { useSessionToken } from '@/hooks/useSessionToken'

const WS_BASE = import.meta.env.VITE_MICROAGENT_WS_URL as string
const MAX_PROMPT_LENGTH = 1000

// ── Server event types ────────────────────────────────────────────────────────
// Mirrors api/protocol.py — see the microagent repo's API.md for the full reference.

type ServerEvent =
  | { type: 'phase'; run_id: string; phase: 'test_generation' | 'implementation' }
  | { type: 'tool_call'; run_id: string; tool: string }
  | {
      type: 'done'
      run_id: string
      passed: boolean
      failure_category: string | null
      solution: string | null
      total_cost_usd: number | null
    }
  | { type: 'error'; run_id: string; message: string }

function parseServerEvent(raw: unknown): ServerEvent | null {
  if (typeof raw !== 'object' || raw === null) return null
  const e = raw as Record<string, unknown>
  const type = e.type
  if (typeof type !== 'string' || typeof e.run_id !== 'string') return null
  const run_id = e.run_id

  switch (type) {
    case 'phase':
      if (e.phase !== 'test_generation' && e.phase !== 'implementation') return null
      return { type: 'phase', run_id, phase: e.phase }

    case 'tool_call':
      if (typeof e.tool !== 'string') return null
      return { type: 'tool_call', run_id, tool: e.tool }

    case 'done':
      if (typeof e.passed !== 'boolean') return null
      return {
        type: 'done',
        run_id,
        passed: e.passed,
        failure_category: typeof e.failure_category === 'string' ? e.failure_category : null,
        solution: typeof e.solution === 'string' ? e.solution : null,
        total_cost_usd: typeof e.total_cost_usd === 'number' ? e.total_cost_usd : null,
      }

    case 'error':
      if (typeof e.message !== 'string') return null
      return { type: 'error', run_id, message: e.message }

    default:
      return null
  }
}

// ── UI log entry types ────────────────────────────────────────────────────────

type LogEntry =
  | { kind: 'phase'; phase: 'test_generation' | 'implementation' }
  | { kind: 'tool_call'; tool: string }

type Status = 'idle' | 'running' | 'done' | 'error'

const MODELS = [
  { value: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5' },
  { value: 'claude-sonnet-4-6', label: 'Sonnet 4.6' },
]

const EXAMPLES = [
  'Write a function that reverses a string',
  'Write a function that checks if a number is prime',
  'Write a function that computes Fibonacci numbers',
  'Write a function that encodes and decodes run-length encoding',
  'Write a function that finds all anagrams in a list of words',
]

const CLOSE_CODE_MESSAGES: Record<number, string> = {
  1008: 'Server rejected the connection (auth) — this is a proxy misconfiguration, not something you can fix here.',
  1009: 'A message was too large for the proxy, or too many were sent before the server connected.',
  1003: 'Server rejected the request — the prompt may be empty, over 1000 characters, or max turns is outside 1–20.',
}

export function MicroagentDemo() {
  const getToken = useSessionToken()
  const [prompt, setPrompt] = useState('')
  const [model, setModel] = useState(MODELS[0].value)
  const [maxTurns, setMaxTurns] = useState(10)

  const [status, setStatus] = useState<Status>('idle')
  const [log, setLog] = useState<LogEntry[]>([])
  const [result, setResult] = useState<{
    passed: boolean
    failure_category: string | null
    solution: string | null
    total_cost_usd: number | null
  } | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [connError, setConnError] = useState('')

  const wsRef = useRef<WebSocket | null>(null)
  const finishedRef = useRef(false)
  const logEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [log])

  useEffect(() => () => { wsRef.current?.close() }, [])

  function pushLog(entry: LogEntry) {
    setLog(prev => [...prev, entry])
  }

  function processEvent(event: ServerEvent) {
    switch (event.type) {
      case 'phase':
        pushLog({ kind: 'phase', phase: event.phase })
        return
      case 'tool_call':
        pushLog({ kind: 'tool_call', tool: event.tool })
        return
      case 'done':
        setResult({
          passed: event.passed,
          failure_category: event.failure_category,
          solution: event.solution,
          total_cost_usd: event.total_cost_usd,
        })
        return
      case 'error':
        setErrorMessage(event.message)
        return
    }
  }

  async function run() {
    const trimmed = prompt.trim()
    if (!trimmed || trimmed.length > MAX_PROMPT_LENGTH || status === 'running') return

    setStatus('running')
    setLog([])
    setResult(null)
    setErrorMessage('')
    setConnError('')
    finishedRef.current = false

    // A WebSocket cannot carry an Authorization header, so the short-lived
    // session token goes in the query string; the proxy strips it.
    let token: string
    try {
      token = await getToken()
    } catch (err) {
      finishedRef.current = true
      setConnError(err instanceof Error ? err.message : 'Could not get a sign-in token')
      setStatus('error')
      return
    }
    if (finishedRef.current) return // cancelled while the token was loading

    const ws = new WebSocket(`${WS_BASE}/ws/run?auth=${encodeURIComponent(token)}`)
    wsRef.current = ws

    ws.onopen = () => {
      ws.send(JSON.stringify({
        protocol_version: '1',
        task_prompt: trimmed,
        model,
        max_turns: maxTurns,
      }))
    }

    ws.onmessage = (e) => {
      if (typeof e.data !== 'string') return
      let parsed: unknown
      try { parsed = JSON.parse(e.data) } catch { return }

      const event = parseServerEvent(parsed)
      if (!event) return

      processEvent(event)

      if (event.type === 'done' || event.type === 'error') {
        finishedRef.current = true
        setStatus(event.type === 'done' ? (event.passed ? 'done' : 'error') : 'error')
        ws.close()
      }
    }

    ws.onclose = (e) => {
      wsRef.current = null
      if (finishedRef.current) return
      // Raw close with no terminal event: either a deliberate rejection (1008/1003) or a dropped connection.
      finishedRef.current = true
      setConnError(CLOSE_CODE_MESSAGES[e.code] ?? 'Connection closed unexpectedly — server may be starting up, try again in a moment')
      setStatus('error')
    }

    ws.onerror = () => {
      finishedRef.current = true
      setConnError('WebSocket connection failed — server may be starting up, try again in a moment')
      setStatus('error')
    }
  }

  function cancel() {
    finishedRef.current = true
    wsRef.current?.close()
    wsRef.current = null
    setStatus('idle')
  }

  function downloadFile(filename: string, content: string) {
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const isRunning = status === 'running'
  const promptTooLong = prompt.trim().length > MAX_PROMPT_LENGTH

  return (
    <div className="max-w-4xl mx-auto px-6 pt-16 pb-32">
      <span className="section-label block mb-4">// Live Demo — Microagent</span>
      <h1 className="display pb-[0.3em] mb-2">Microagent</h1>
      <p className="mono text-text-muted text-sm mb-12">
        Test-first AI coding agent. Describe a function — Claude generates a locked pytest file, then iterates on an implementation until all tests pass. Verified by an independent pytest run, not the model's own claim.
      </p>

      <div className="space-y-6">
        {/* Examples */}
        <div>
          <span className="section-label block mb-3">// EXAMPLES</span>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map(ex => (
              <button
                key={ex}
                type="button"
                disabled={isRunning}
                onClick={() => setPrompt(ex)}
                className="mono text-xs border border-border-strong text-text-muted px-3 py-1.5 hover:border-text hover:text-text transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        {/* Prompt */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="section-label">// PROMPT</span>
            <span className={`mono text-xs ${promptTooLong ? 'text-red-400' : 'text-text-dim'}`}>
              {prompt.trim().length} / {MAX_PROMPT_LENGTH}
            </span>
          </div>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            disabled={isRunning}
            placeholder="Describe the function to implement..."
            rows={3}
            className="w-full bg-transparent border border-border-strong mono text-sm px-4 py-3 text-text placeholder:text-text-muted focus:outline-none focus:border-text resize-none disabled:opacity-60"
          />
        </div>

        {/* Config row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <span className="section-label block mb-3">// MODEL</span>
            <div className="flex gap-2">
              {MODELS.map(m => (
                <button
                  key={m.value}
                  type="button"
                  disabled={isRunning}
                  onClick={() => setModel(m.value)}
                  className={`mono text-xs px-4 py-2 border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    model === m.value
                      ? 'border-text bg-text text-background'
                      : 'border-border-strong text-text-muted hover:border-text hover:text-text'
                  }`}
                >
                  [ {m.label} ]
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="section-label block mb-3">// MAX TURNS</span>
            <div className="flex gap-2">
              {[5, 10, 15, 20].map(n => (
                <button
                  key={n}
                  type="button"
                  disabled={isRunning}
                  onClick={() => setMaxTurns(n)}
                  className={`mono text-xs px-4 py-2 border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    maxTurns === n
                      ? 'border-text bg-text text-background'
                      : 'border-border-strong text-text-muted hover:border-text hover:text-text'
                  }`}
                >
                  [ {n} ]
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => void run()}
            disabled={isRunning || !prompt.trim() || promptTooLong}
            className="mono text-sm border border-text px-6 py-3 hover:bg-text hover:text-background transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isRunning ? '[ Running... ]' : '[ Run Agent ] →'}
          </button>
          {isRunning && (
            <button
              onClick={cancel}
              className="mono text-xs border border-border-strong text-text-muted px-4 py-2 hover:border-text hover:text-text transition-colors"
            >
              [ Cancel ]
            </button>
          )}
        </div>

        {connError && (
          <p className="mono text-xs text-text-muted border border-dashed border-border-strong px-4 py-3">
            // {connError}
          </p>
        )}
      </div>

      {/* Output log */}
      {log.length > 0 && (
        <div className="mt-16">
          <div className="flex items-center justify-between mb-4">
            <span className="section-label">// OUTPUT</span>
            {isRunning && (
              <span className="mono text-xs text-text-muted flex items-center gap-2">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-text-muted animate-pulse" />
                running
              </span>
            )}
          </div>

          <div className="border border-border-strong divide-y divide-[rgba(255,255,255,0.04)]">
            {log.map((entry, i) => (
              <LogEntryView key={i} entry={entry} />
            ))}
            {errorMessage && <ErrorEntry message={errorMessage} />}
            {result && <ResultEntry {...result} />}
          </div>

          <div ref={logEndRef} />
        </div>
      )}

      {/* Downloads */}
      {result?.solution && (
        <div className="mt-10">
          <span className="section-label block mb-4">// DOWNLOAD</span>
          <p className="mono text-xs text-text-dim mb-3">
            The generated test file isn't returned by the API — only the final implementation is.
          </p>
          <button
            onClick={() => downloadFile('solution.py', result.solution!)}
            className="mono text-sm border border-text px-5 py-2.5 hover:bg-text hover:text-background transition-colors"
          >
            [ solution.py ] ↓
          </button>
        </div>
      )}
    </div>
  )
}

// ── Log entry dispatcher ──────────────────────────────────────────────────────

function LogEntryView({ entry }: { entry: LogEntry }) {
  switch (entry.kind) {
    case 'phase':
      return <PhaseEntry phase={entry.phase} />
    case 'tool_call':
      return <ToolCallEntry tool={entry.tool} />
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PhaseEntry({ phase }: { phase: 'test_generation' | 'implementation' }) {
  const label = phase === 'test_generation' ? 'PHASE 1 — TEST GENERATION' : 'PHASE 2 — IMPLEMENTATION (test file locked)'
  return (
    <div className="px-5 py-4 bg-surface flex items-center gap-4">
      <span className="section-label text-text">// {label}</span>
      <div className="flex-1 h-px bg-border-strong" />
    </div>
  )
}

function ToolCallEntry({ tool }: { tool: string }) {
  return (
    <div className="px-5 py-2.5 flex items-center gap-4">
      <span className="mono text-xs text-text-dim">[ tool call ]</span>
      <span className="mono text-xs text-text-muted flex-1">{tool}</span>
    </div>
  )
}

function ResultEntry({
  passed,
  failure_category,
  total_cost_usd,
}: {
  passed: boolean
  failure_category: string | null
  solution: string | null
  total_cost_usd: number | null
}) {
  return (
    <div className={`px-5 py-5 space-y-1 ${passed ? 'bg-[rgba(34,197,94,0.05)]' : 'bg-[rgba(239,68,68,0.05)]'}`}>
      <span className={`section-label block ${passed ? 'text-green-500' : 'text-red-400'}`}>
        // {passed ? 'PASSED' : 'FAILED'}{failure_category ? ` — ${failure_category}` : ''}
      </span>
      {total_cost_usd !== null && (
        <span className="mono text-xs text-text-dim block">
          cost: ${total_cost_usd.toFixed(4)}
        </span>
      )}
    </div>
  )
}

function ErrorEntry({ message }: { message: string }) {
  return (
    <div className="px-5 py-4 space-y-2">
      <span className="section-label text-text-muted block">// ERROR</span>
      <p className="mono text-xs text-text-muted leading-relaxed">{message}</p>
    </div>
  )
}
