import { useState, useRef, useEffect } from 'react'

const WS_BASE = import.meta.env.VITE_MICROAGENT_WS_URL as string
const WS_TOKEN = import.meta.env.VITE_MICROAGENT_TOKEN as string

// ── Server event types ────────────────────────────────────────────────────────

type ServerEvent =
  | { type: 'phase';             phase: string }
  | { type: 'text_delta';        text: string }
  | { type: 'test_generated';    content: string; test_count: number }
  | { type: 'write_line';        path: string; line: string; line_num: number }
  | { type: 'tool_call';         tool: string; passed: boolean | null; summary: string }
  | { type: 'coverage';          pct: number }
  | { type: 'awaiting_approval'; content: string }
  | { type: 'done';              success: boolean; message: string; solution?: string }
  | { type: 'error';             message: string }

function parseServerEvent(raw: unknown): ServerEvent | null {
  if (typeof raw !== 'object' || raw === null) return null
  const e = raw as Record<string, unknown>
  const type = e.type
  if (typeof type !== 'string') return null

  switch (type) {
    case 'phase':
      if (typeof e.phase !== 'string') return null
      return { type: 'phase', phase: e.phase }

    case 'text_delta':
      if (typeof e.text !== 'string') return null
      return { type: 'text_delta', text: e.text }

    case 'test_generated':
      if (typeof e.content !== 'string' || typeof e.test_count !== 'number') return null
      return { type: 'test_generated', content: e.content, test_count: e.test_count }

    case 'write_line':
      if (typeof e.path !== 'string' || typeof e.line !== 'string') return null
      return {
        type: 'write_line',
        path: e.path,
        line: e.line,
        line_num: typeof e.line_num === 'number' ? e.line_num : 0,
      }

    case 'tool_call':
      if (typeof e.tool !== 'string') return null
      return {
        type: 'tool_call',
        tool: e.tool,
        passed: typeof e.passed === 'boolean' ? e.passed : null,
        summary: typeof e.summary === 'string' ? e.summary : '',
      }

    case 'coverage':
      if (typeof e.pct !== 'number') return null
      return { type: 'coverage', pct: e.pct }

    case 'awaiting_approval':
      if (typeof e.content !== 'string') return null
      return { type: 'awaiting_approval', content: e.content }

    case 'done':
      if (typeof e.success !== 'boolean' || typeof e.message !== 'string') return null
      return {
        type: 'done',
        success: e.success,
        message: e.message,
        solution: typeof e.solution === 'string' ? e.solution : undefined,
      }

    case 'error':
      if (typeof e.message !== 'string') return null
      return { type: 'error', message: e.message }

    default:
      return null
  }
}

// ── UI log entry types ────────────────────────────────────────────────────────

type LogEntry =
  | { kind: 'phase';              phase: string }
  | { kind: 'thinking';           text: string }
  | { kind: 'test_generated';     content: string; test_count: number }
  | { kind: 'write';              path: string; lines: string[] }
  | { kind: 'tool_call';          tool: string; passed: boolean | null; summary: string }
  | { kind: 'coverage';           pct: number }
  | { kind: 'awaiting_approval';  content: string }
  | { kind: 'revision_approved' }
  | { kind: 'done';               success: boolean; message: string }
  | { kind: 'error_entry';        message: string }

// ── Demo ──────────────────────────────────────────────────────────────────────

type Status = 'idle' | 'running' | 'done' | 'error'

const EXAMPLES = [
  'Write a function that reverses a string',
  'Write a function that checks if a number is prime',
  'Write a function that computes Fibonacci numbers',
  'Write a function that encodes and decodes run-length encoding',
  'Write a function that finds all anagrams in a list of words',
]

export function MicroagentDemo() {
  const [prompt, setPrompt] = useState('')
  const [maxIter, setMaxIter] = useState(10)
  const [allowRevision, setAllowRevision] = useState(false)
  const [autoApprove, setAutoApprove] = useState(false)

  const [status, setStatus] = useState<Status>('idle')
  const [log, setLog] = useState<LogEntry[]>([])
  const [testContent, setTestContent] = useState<string | null>(null)
  const [solutionContent, setSolutionContent] = useState<string | null>(null)
  const [connError, setConnError] = useState('')
  const [pendingApproval, setPendingApproval] = useState<string | null>(null)

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

      case 'text_delta':
        setLog(prev => {
          const last = prev[prev.length - 1]
          if (last?.kind === 'thinking') {
            return [...prev.slice(0, -1), { ...last, text: last.text + event.text }]
          }
          return [...prev, { kind: 'thinking', text: event.text }]
        })
        return

      case 'test_generated':
        setTestContent(event.content)
        pushLog({ kind: 'test_generated', content: event.content, test_count: event.test_count })
        return

      case 'write_line':
        setLog(prev => {
          const last = prev[prev.length - 1]
          if (last?.kind === 'write' && last.path === event.path) {
            return [...prev.slice(0, -1), { ...last, lines: [...last.lines, event.line] }]
          }
          return [...prev, { kind: 'write', path: event.path, lines: [event.line] }]
        })
        return

      case 'tool_call':
        pushLog({ kind: 'tool_call', tool: event.tool, passed: event.passed, summary: event.summary })
        return

      case 'coverage':
        pushLog({ kind: 'coverage', pct: event.pct })
        return

      case 'awaiting_approval':
        setPendingApproval(event.content)
        pushLog({ kind: 'awaiting_approval', content: event.content })
        return

      case 'done':
        if (event.solution) setSolutionContent(event.solution)
        pushLog({ kind: 'done', success: event.success, message: event.message })
        return

      case 'error':
        pushLog({ kind: 'error_entry', message: event.message })
        return
    }
  }

  function run() {
    if (!prompt.trim() || status === 'running') return

    setStatus('running')
    setLog([])
    setTestContent(null)
    setSolutionContent(null)
    setConnError('')
    setPendingApproval(null)
    finishedRef.current = false

    const ws = new WebSocket(`${WS_BASE}/ws/run?token=${WS_TOKEN}`)
    wsRef.current = ws

    ws.onopen = () => {
      ws.send(JSON.stringify({
        prompt: prompt.trim(),
        config: {
          max_iterations: maxIter,
          allow_test_revision: allowRevision,
          auto_approve_revision: autoApprove,
        },
      }))
    }

    ws.onmessage = (e) => {
      if (typeof e.data !== 'string') return
      let parsed: unknown
      try { parsed = JSON.parse(e.data) } catch { return }

      const event = parseServerEvent(parsed)
      if (!event) return

      processEvent(event)

      if (event.type === 'done') {
        finishedRef.current = true
        setStatus(event.success ? 'done' : 'error')
        ws.close()
      } else if (event.type === 'error') {
        finishedRef.current = true
        setStatus('error')
        ws.close()
      }
    }

    ws.onclose = () => {
      wsRef.current = null
      if (!finishedRef.current) setStatus('idle')
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
    setPendingApproval(null)
  }

  function approveRevision() {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return
    wsRef.current.send(JSON.stringify({ type: 'hint', hint: null }))
    setPendingApproval(null)
    pushLog({ kind: 'revision_approved' })
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
  const canDownload = solutionContent !== null && testContent !== null

  return (
    <div className="max-w-4xl mx-auto px-6 pt-16 pb-32">
      <span className="section-label block mb-4">// Live Demo — Microagent</span>
      <h1 className="display mb-2">Microagent</h1>
      <p className="mono text-text-muted text-sm mb-12">
        Test-first AI coding agent. Describe a function — Claude generates a locked test suite, then iterates on an implementation until all tests pass.
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
          <span className="section-label block mb-3">// PROMPT</span>
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
            <span className="section-label block mb-3">// MAX ITERATIONS</span>
            <div className="flex gap-2">
              {[5, 10, 15, 20].map(n => (
                <button
                  key={n}
                  type="button"
                  disabled={isRunning}
                  onClick={() => setMaxIter(n)}
                  className={`mono text-xs px-4 py-2 border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    maxIter === n
                      ? 'border-text bg-text text-background'
                      : 'border-border-strong text-text-muted hover:border-text hover:text-text'
                  }`}
                >
                  [ {n} ]
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="section-label block mb-3">// TEST REVISION</span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={isRunning}
                onClick={() => {
                  const next = !allowRevision
                  setAllowRevision(next)
                  if (!next) setAutoApprove(false)
                }}
                className={`mono text-xs px-4 py-2 border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  allowRevision
                    ? 'border-text bg-text text-background'
                    : 'border-border-strong text-text-muted hover:border-text hover:text-text'
                }`}
              >
                [ Allow ]
              </button>
              <button
                type="button"
                disabled={isRunning || !allowRevision}
                onClick={() => setAutoApprove(v => !v)}
                className={`mono text-xs px-4 py-2 border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  autoApprove && allowRevision
                    ? 'border-text bg-text text-background'
                    : 'border-border-strong text-text-muted hover:border-text hover:text-text'
                }`}
              >
                [ Auto Approve ]
              </button>
            </div>
            {allowRevision && !autoApprove && (
              <p className="mono text-xs text-text-muted mt-2">
                You will be prompted to approve test changes.
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <button
            onClick={run}
            disabled={isRunning || !prompt.trim()}
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
              <LogEntryView
                key={i}
                entry={entry}
                isPendingApproval={entry.kind === 'awaiting_approval' && pendingApproval !== null}
                onApprove={approveRevision}
              />
            ))}
          </div>

          <div ref={logEndRef} />
        </div>
      )}

      {/* Downloads */}
      {canDownload && (
        <div className="mt-10">
          <span className="section-label block mb-4">// DOWNLOAD FILES</span>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => downloadFile('solution.py', solutionContent!)}
              className="mono text-sm border border-text px-5 py-2.5 hover:bg-text hover:text-background transition-colors"
            >
              [ solution.py ] ↓
            </button>
            <button
              onClick={() => downloadFile('solution_test.py', testContent!)}
              className="mono text-sm border border-border-strong text-text-muted px-5 py-2.5 hover:border-text hover:text-text transition-colors"
            >
              [ solution_test.py ] ↓
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Log entry dispatcher ──────────────────────────────────────────────────────

function LogEntryView({
  entry,
  isPendingApproval,
  onApprove,
}: {
  entry: LogEntry
  isPendingApproval: boolean
  onApprove: () => void
}) {
  switch (entry.kind) {
    case 'phase':
      return <PhaseEntry phase={entry.phase} />
    case 'thinking':
      return <ThinkingEntry text={entry.text} />
    case 'test_generated':
      return <TestGeneratedEntry content={entry.content} test_count={entry.test_count} />
    case 'write':
      return <WriteEntry path={entry.path} lines={entry.lines} />
    case 'tool_call':
      return <ToolCallEntry tool={entry.tool} passed={entry.passed} summary={entry.summary} />
    case 'coverage':
      return <CoverageEntry pct={entry.pct} />
    case 'awaiting_approval':
      return <AwaitingApprovalEntry content={entry.content} pending={isPendingApproval} onApprove={onApprove} />
    case 'revision_approved':
      return <RevisionApprovedEntry />
    case 'done':
      return <DoneEntry success={entry.success} message={entry.message} />
    case 'error_entry':
      return <ErrorEntry message={entry.message} />
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PhaseEntry({ phase }: { phase: string }) {
  return (
    <div className="px-5 py-4 bg-surface flex items-center gap-4">
      <span className="section-label text-text">// {phase.replace(/_/g, ' ').toUpperCase()}</span>
      <div className="flex-1 h-px bg-border-strong" />
    </div>
  )
}

function ThinkingEntry({ text }: { text: string }) {
  return (
    <div className="px-5 py-4">
      <p className="mono text-xs text-text-muted leading-relaxed whitespace-pre-wrap">{text}</p>
    </div>
  )
}

function TestGeneratedEntry({ content, test_count }: { content: string; test_count: number }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="px-5 py-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="section-label text-text">// TESTS GENERATED — {test_count} tests</span>
        <button
          onClick={() => setExpanded(v => !v)}
          className="mono text-xs text-text-muted hover:text-text transition-colors"
        >
          {expanded ? '[ collapse ]' : '[ view file ]'}
        </button>
      </div>
      {expanded && (
        <pre className="mono text-xs text-text-muted border border-border-strong p-4 overflow-auto max-h-80 leading-relaxed bg-surface">
          {content}
        </pre>
      )}
    </div>
  )
}

function WriteEntry({ path, lines }: { path: string; lines: string[] }) {
  return (
    <div className="px-5 py-4">
      <div className="flex items-center gap-3 mb-3">
        <span className="mono text-xs text-text-dim">[ write ]</span>
        <span className="mono text-xs text-text">{path}</span>
        <span className="mono text-xs text-text-dim">{lines.length} lines</span>
      </div>
      <div className="border border-border overflow-auto max-h-64 bg-surface">
        {lines.map((line, i) => (
          <div key={i} className="flex items-start hover:bg-surface-raised transition-colors">
            <span className="mono text-xs text-text-dim select-none w-10 shrink-0 text-right pr-3 py-0.5 border-r border-border leading-5">
              {i + 1}
            </span>
            <span className="mono text-xs text-text-muted px-3 py-0.5 whitespace-pre leading-5 flex-1">
              {line || ' '}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ToolCallEntry({ tool, passed, summary }: { tool: string; passed: boolean | null; summary: string }) {
  const icon = passed === true ? '✓' : passed === false ? '✗' : '·'
  const iconColor = passed === true ? 'text-green-500' : passed === false ? 'text-red-400' : 'text-text-muted'
  return (
    <div className="px-5 py-2.5 flex items-start gap-4">
      <span className="mono text-xs text-text-dim shrink-0 w-32">[ {tool} ]</span>
      <span className="mono text-xs text-text-muted flex-1 leading-relaxed">{summary}</span>
      <span className={`mono text-xs shrink-0 font-bold ${iconColor}`}>{icon}</span>
    </div>
  )
}

function CoverageEntry({ pct }: { pct: number }) {
  return (
    <div className="px-5 py-3">
      <span className="section-label text-text-muted">// COVERAGE — {pct.toFixed(1)}%</span>
    </div>
  )
}

function AwaitingApprovalEntry({
  content,
  pending,
  onApprove,
}: {
  content: string
  pending: boolean
  onApprove: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="px-5 py-5 space-y-4 border-l-2 border-text">
      <div className="flex items-center justify-between">
        <span className="section-label text-text">// REVISION PROPOSED — review test changes</span>
        <button
          onClick={() => setExpanded(v => !v)}
          className="mono text-xs text-text-muted hover:text-text transition-colors"
        >
          {expanded ? '[ collapse ]' : '[ view proposed file ]'}
        </button>
      </div>
      {expanded && (
        <pre className="mono text-xs text-text-muted border border-border-strong p-4 overflow-auto max-h-80 leading-relaxed bg-surface">
          {content}
        </pre>
      )}
      {pending && (
        <button
          onClick={onApprove}
          className="mono text-sm border border-text px-5 py-2 hover:bg-text hover:text-background transition-colors"
        >
          [ Approve Revision ] →
        </button>
      )}
    </div>
  )
}

function RevisionApprovedEntry() {
  return (
    <div className="px-5 py-3">
      <span className="section-label text-text-muted">// REVISION APPROVED — continuing</span>
    </div>
  )
}

function DoneEntry({ success, message }: { success: boolean; message: string }) {
  return (
    <div className={`px-5 py-5 ${success ? 'bg-[rgba(34,197,94,0.05)]' : 'bg-[rgba(239,68,68,0.05)]'}`}>
      <span className={`section-label ${success ? 'text-green-500' : 'text-red-400'}`}>
        // {success ? 'SUCCESS' : 'FAILED'} — {message}
      </span>
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
