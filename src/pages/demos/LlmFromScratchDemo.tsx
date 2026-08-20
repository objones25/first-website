import { useState, useRef, useCallback, useEffect } from 'react'

const BASE_URL = import.meta.env.VITE_LLM_INFERENCE_URL as string

type Role = 'user' | 'assistant'
interface Message {
  role: Role
  content: string
}

type Status = 'idle' | 'connecting' | 'streaming' | 'error'
type Mode = 'greedy' | 'creative'

const TEMPERATURES: Record<Mode, number> = {
  greedy: 0.0,
  creative: 0.8,
}

interface Chunk {
  token?: string
  done?: boolean
  error?: string
}

function isChunk(value: unknown): value is Chunk {
  return typeof value === 'object' && value !== null
}

// The inference API doesn't document a fixed separator between streamed JSON
// objects (could be newline-delimited or simply concatenated), so scan for
// balanced top-level {...} objects instead of splitting on a fixed token.
function extractJsonObjects(buffer: string): { objects: Chunk[]; rest: string } {
  const objects: Chunk[] = []
  let start = -1
  let depth = 0
  let inString = false
  let escape = false
  let i = 0

  for (; i < buffer.length; i++) {
    const ch = buffer[i]
    if (start === -1) {
      if (ch === '{') {
        start = i
        depth = 1
      }
      continue
    }
    if (inString) {
      if (escape) escape = false
      else if (ch === '\\') escape = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') {
      inString = true
    } else if (ch === '{') {
      depth++
    } else if (ch === '}') {
      depth--
      if (depth === 0) {
        const slice = buffer.slice(start, i + 1)
        try {
          const parsed: unknown = JSON.parse(slice)
          if (isChunk(parsed)) objects.push(parsed)
        } catch {
          // malformed fragment, drop it
        }
        start = -1
      }
    }
  }

  const rest = start === -1 ? '' : buffer.slice(start)
  return { objects, rest }
}

type StreamResult = { ok: true; error?: string } | { ok: false; message: string }

async function streamChat(
  url: string,
  body: unknown,
  onToken: (token: string) => void,
  signal: AbortSignal,
): Promise<StreamResult> {
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    })
  } catch {
    return {
      ok: false,
      message: 'Connection failed — the model may be cold-starting (first request can take 100-120s), try again in a moment',
    }
  }

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '')
    const short = text.length > 300 ? text.slice(0, 300) + '…' : text
    return { ok: false, message: `${res.status}: ${short || res.statusText}` }
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      const { objects, rest } = extractJsonObjects(buffer)
      buffer = rest

      for (const chunk of objects) {
        if (chunk.error) return { ok: false, message: chunk.error }
        if (typeof chunk.token === 'string') onToken(chunk.token)
        if (chunk.done) return { ok: true }
      }
    }
  } catch (err) {
    if (signal.aborted) return { ok: false, message: 'Stopped by user' }
    throw err
  }

  return { ok: true }
}

const MAX_TOKENS_OPTIONS = [64, 150, 300] as const

export function LlmFromScratchDemo() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [mode, setMode] = useState<Mode>('greedy')
  const [maxTokens, setMaxTokens] = useState<number>(150)
  const [streamingReply, setStreamingReply] = useState('')

  const controllerRef = useRef<AbortController | null>(null)
  const listEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => () => {
    controllerRef.current?.abort()
    controllerRef.current = null
  }, [])

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ block: 'nearest' })
  }, [messages, streamingReply])

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || status === 'connecting' || status === 'streaming') return

    if (!BASE_URL) {
      setStatus('error')
      setErrorMsg('Demo not configured — VITE_LLM_INFERENCE_URL is missing')
      return
    }

    const nextMessages: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(nextMessages)
    setInput('')
    setStreamingReply('')
    setStatus('connecting')
    setErrorMsg('')

    const controller = new AbortController()
    controllerRef.current = controller

    let reply = ''
    const result = await streamChat(
      BASE_URL,
      {
        messages: nextMessages,
        max_new_tokens: maxTokens,
        temperature: TEMPERATURES[mode],
      },
      (token) => {
        setStatus('streaming')
        reply += token
        setStreamingReply(reply)
      },
      controller.signal,
    )

    if (controllerRef.current !== controller) return // stopped or superseded

    controllerRef.current = null

    if (result.ok) {
      setStatus('idle')
      setStreamingReply('')
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
    } else {
      setStatus('error')
      setErrorMsg(result.message)
    }
  }, [input, status, messages, mode, maxTokens])

  function stop() {
    controllerRef.current?.abort()
    controllerRef.current = null
    setStatus('idle')
  }

  const isActive = status === 'connecting' || status === 'streaming'

  return (
    <div className="max-w-4xl mx-auto px-6 pt-16 pb-32">
      <span className="section-label block mb-4">// Live Demo — LLM From Scratch</span>
      <h1 className="display pb-[0.3em] mb-2">LLM From Scratch</h1>
      <p className="mono text-text-muted text-sm mb-12">
        478.6M-parameter transformer, pretrained + SFT'd + DPO-tuned from scratch, served from a
        scale-to-zero RunPod endpoint — the first reply can take 100-120s while it wakes up.
      </p>

      <div className="space-y-6">
        <div>
          <span className="section-label block mb-3">// SAMPLING</span>
          <div className="flex gap-2">
            {(['greedy', 'creative'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                disabled={isActive}
                onClick={() => setMode(m)}
                className={`mono text-xs px-4 py-2 border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  mode === m
                    ? 'border-text bg-text text-background'
                    : 'border-border-strong text-text-muted hover:border-text hover:text-text'
                }`}
              >
                [ {m === 'greedy' ? 'Greedy (temp 0)' : 'Creative (temp 0.8)'} ]
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="section-label block mb-3">// MAX TOKENS</span>
          <div className="flex gap-2">
            {MAX_TOKENS_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                disabled={isActive}
                onClick={() => setMaxTokens(n)}
                className={`mono text-xs px-4 py-2 border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  maxTokens === n
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

      <div className="mt-12 border border-border-strong">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-strong">
          <span className="section-label">// CHAT</span>
          {isActive && (
            <span className="mono text-xs text-text-muted flex items-center gap-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-text-muted animate-pulse" />
              {status === 'connecting' ? 'connecting' : 'streaming'}
            </span>
          )}
        </div>

        <div className="max-h-[480px] overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && !streamingReply && (
            <p className="mono text-xs text-text-muted">// no messages yet — ask it something</p>
          )}
          {messages.map((m, i) => (
            <ChatBubble key={i} role={m.role} content={m.content} />
          ))}
          {streamingReply && <ChatBubble role="assistant" content={streamingReply} />}
          <div ref={listEndRef} />
        </div>

        <div className="flex items-center gap-2 px-4 py-3 border-t border-border-strong">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void send()
              }
            }}
            disabled={isActive}
            placeholder="Ask the model something..."
            className="flex-1 bg-transparent border border-border-strong mono text-sm px-4 py-3 text-text placeholder:text-text-muted focus:outline-none focus:border-text disabled:opacity-40"
          />
          <button
            type="button"
            onClick={() => void send()}
            disabled={isActive || !input.trim()}
            className="mono text-sm border border-text px-6 py-3 hover:bg-text hover:text-background transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isActive ? '[ ... ]' : '[ Send ] →'}
          </button>
          {isActive && (
            <button
              type="button"
              onClick={stop}
              className="mono text-xs border border-border-strong text-text-muted px-4 py-2 hover:border-text hover:text-text transition-colors"
            >
              [ Stop ]
            </button>
          )}
        </div>
      </div>

      {status === 'error' && (
        <p className="mono text-xs text-text-muted border border-dashed border-border-strong px-4 py-3 mt-4 break-all">
          // {errorMsg}
        </p>
      )}
    </div>
  )
}

function ChatBubble({ role, content }: { role: Role; content: string }) {
  const isUser = role === 'user'
  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
      <span className="mono text-[10px] text-text-muted mb-1">
        {isUser ? '// USER' : '// MODEL'}
      </span>
      <p
        className={`mono text-sm px-4 py-3 max-w-[80%] whitespace-pre-wrap break-words border ${
          isUser ? 'border-text bg-text text-background' : 'border-border-strong text-text'
        }`}
      >
        {content || '…'}
      </p>
    </div>
  )
}
