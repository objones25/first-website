import { useState, useRef, useCallback, useEffect } from 'react'
import { useSessionToken } from '@/hooks/useSessionToken'
import { readErrorMessage } from '@/lib/workerError'

const BASE_URL = import.meta.env.VITE_LLM_INFERENCE_URL as string
const MAX_HISTORY = 49
// The proxy rejects a message longer than this.
const MAX_MESSAGE_CHARS = 4000

type Role = 'user' | 'assistant'
interface Message {
  role: Role
  content: string
}

type Status = 'idle' | 'connecting' | 'streaming' | 'error'
type WarmStatus = 'warming' | 'ready' | 'error'

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
  getToken: () => Promise<string>,
  body: unknown,
  onToken: (token: string) => void,
  signal: AbortSignal,
): Promise<StreamResult> {
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await getToken()}` },
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
    return { ok: false, message: `${res.status}: ${await readErrorMessage(res)}` }
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

// A minimal, invisible generation used purely to wake the RunPod worker before
// the user can type — not part of the visible conversation or its history.
function warmupChat(url: string, getToken: () => Promise<string>, signal: AbortSignal): Promise<StreamResult> {
  return streamChat(
    url,
    getToken,
    { messages: [{ role: 'user', content: 'Hi' }], max_new_tokens: 1, temperature: 0 },
    () => {},
    signal,
  )
}

function WaveText({ text, className = '' }: { text: string; className?: string }) {
  return (
    <span className={className} aria-label={text}>
      {text.split('').map((ch, i) => (
        <span key={i} className="anim-wave" style={{ animationDelay: `${i * 0.06}s` }}>
          {ch === ' ' ? ' ' : ch}
        </span>
      ))}
    </span>
  )
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  display,
  caption,
  disabled,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  display: string
  caption: string
  disabled?: boolean
  onChange: (value: number) => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="section-label">// {label}</span>
        <span className="mono text-xs text-text">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-4 bg-transparent appearance-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed
          [&::-webkit-slider-runnable-track]:h-px [&::-webkit-slider-runnable-track]:bg-border-strong
          [&::-moz-range-track]:h-px [&::-moz-range-track]:bg-border-strong
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:mt-[-7px]
          [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-text
          [&::-webkit-slider-thumb]:rounded-none [&::-webkit-slider-thumb]:cursor-pointer
          [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4
          [&::-moz-range-thumb]:bg-text [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:rounded-none
          [&::-moz-range-thumb]:cursor-pointer"
      />
      <p className="mono text-[10px] text-text-muted mt-2">// {caption}</p>
    </div>
  )
}

export function LlmFromScratchDemo() {
  const getToken = useSessionToken()
  const [warmStatus, setWarmStatus] = useState<WarmStatus>('warming')
  const [warmErrorMsg, setWarmErrorMsg] = useState('')
  const [warmElapsed, setWarmElapsed] = useState(0)

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [temperature, setTemperature] = useState(0)
  const [maxTokens, setMaxTokens] = useState(150)
  const [streamingReply, setStreamingReply] = useState('')

  const controllerRef = useRef<AbortController | null>(null)
  const warmControllerRef = useRef<AbortController | null>(null)
  const listEndRef = useRef<HTMLDivElement | null>(null)

  const attemptWarmup = useCallback(async () => {
    if (!BASE_URL) {
      setWarmStatus('error')
      setWarmErrorMsg('Demo not configured — VITE_LLM_INFERENCE_URL is missing')
      return
    }

    setWarmStatus('warming')
    setWarmErrorMsg('')

    const controller = new AbortController()
    warmControllerRef.current = controller

    const result = await warmupChat(BASE_URL, getToken, controller.signal)

    if (warmControllerRef.current !== controller) return // unmounted or superseded

    warmControllerRef.current = null
    setWarmStatus(result.ok ? 'ready' : 'error')
    if (!result.ok) setWarmErrorMsg(result.message)
  }, [getToken])

  useEffect(() => {
    void attemptWarmup()
    return () => {
      warmControllerRef.current?.abort()
      warmControllerRef.current = null
    }
  }, [attemptWarmup])

  useEffect(() => {
    if (warmStatus !== 'warming') return
    const start = Date.now()
    setWarmElapsed(0)
    const id = setInterval(() => setWarmElapsed(Math.floor((Date.now() - start) / 1000)), 1000)
    return () => clearInterval(id)
  }, [warmStatus])

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
      getToken,
      {
        // The proxy accepts at most 50 messages. An odd count keeps the window
        // starting on a user turn.
        messages: nextMessages.slice(-MAX_HISTORY),
        max_new_tokens: maxTokens,
        temperature,
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

    if (result.ok && reply !== '') {
      setStatus('idle')
      setStreamingReply('')
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
    } else {
      // Take the unanswered message back out of the history and return it to
      // the input. Left in, it would be resent with every later message: a
      // message the proxy rejected would be rejected again each time, and an
      // empty reply would be stored as an empty assistant turn, which the
      // proxy also rejects.
      setMessages(messages)
      setInput(text)
      setStreamingReply('')
      setStatus('error')
      setErrorMsg(result.ok ? 'The model returned an empty reply. Try again.' : result.message)
    }
  }, [input, status, messages, temperature, maxTokens, getToken])

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
        scale-to-zero RunPod endpoint.
      </p>

      {warmStatus !== 'ready' ? (
        <div className="border border-border-strong flex flex-col items-center justify-center gap-4 px-4 py-24">
          {warmStatus === 'warming' ? (
            <>
              <WaveText text="WAKING MODEL" className="mono text-lg tracking-[0.3em] text-text" />
              <p className="mono text-xs text-text-muted">
                {warmElapsed}s elapsed
                {warmElapsed >= 15 ? ' — cold start can take 100-120s, hang tight' : ''}
              </p>
            </>
          ) : (
            <>
              <p className="mono text-xs text-text-muted border border-dashed border-border-strong px-4 py-3 max-w-md text-center break-words">
                // {warmErrorMsg}
              </p>
              <button
                type="button"
                onClick={() => void attemptWarmup()}
                className="mono text-sm border border-text px-6 py-3 hover:bg-text hover:text-background transition-colors"
              >
                [ Retry ] →
              </button>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-6">
            <Slider
              label="TEMPERATURE"
              value={temperature}
              min={0}
              max={1}
              step={0.1}
              display={temperature.toFixed(1)}
              caption="0.0 = deterministic — 1.0 = more creative"
              disabled={isActive}
              onChange={setTemperature}
            />
            <Slider
              label="MAX TOKENS"
              value={maxTokens}
              min={32}
              max={300}
              step={1}
              display={String(maxTokens)}
              caption="reply length cap"
              disabled={isActive}
              onChange={setMaxTokens}
            />
          </div>

          <div className="mt-12 border border-border-strong">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-strong">
              <span className="section-label">// CHAT</span>
              {status === 'connecting' && (
                <WaveText text="THINKING" className="mono text-xs tracking-[0.2em] text-text-muted" />
              )}
              {status === 'streaming' && (
                <span className="mono text-xs text-text-muted flex items-center gap-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-text-muted animate-pulse" />
                  streaming
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
                maxLength={MAX_MESSAGE_CHARS}
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
        </>
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
