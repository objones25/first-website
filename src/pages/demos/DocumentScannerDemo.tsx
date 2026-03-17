import { useState, useRef, useEffect } from 'react'

const BASE_URL  = import.meta.env.VITE_DOCUMENT_SCANNER_URL  as string
const API_TOKEN = import.meta.env.VITE_DOCUMENT_SCANNER_TOKEN as string

if (!BASE_URL || !API_TOKEN) {
  throw new Error('VITE_DOCUMENT_SCANNER_URL and VITE_DOCUMENT_SCANNER_TOKEN must be set')
}
const ACCEPT = '.jpg,.jpeg,.png,.bmp,.tiff,.tif,.pdf,.docx,.txt,.md,.markdown'

// ── Types ─────────────────────────────────────────────────────────────────────

type InputMode    = 'file' | 'url'
type Provider     = 'anthropic' | 'gemini'
type OCREngine    = 'tesseract' | 'mistral'
type SummaryStyle = 'concise' | 'detailed' | 'bullet-points'
type Status       = 'idle' | 'uploading' | 'summarizing' | 'chatting'

interface Session { id: string; charCount: number; preview: string }
interface Message { role: 'user' | 'assistant'; text: string }

// ── Helpers ───────────────────────────────────────────────────────────────────

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  return { Authorization: `Bearer ${API_TOKEN}`, ...extra }
}

async function parseErrorDetail(res: Response): Promise<string> {
  try {
    const data = await res.json() as Record<string, unknown>
    return typeof data.detail === 'string' ? data.detail : res.statusText
  } catch {
    return res.statusText
  }
}

// ── SSE consumer ──────────────────────────────────────────────────────────────

async function consumeSSE(
  res: Response,
  onToken: (token: string) => void,
): Promise<string | null> {
  if (!res.body) return 'No response body'
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let isError = false

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (line === 'event: error') { isError = true; continue }
        if (!line.startsWith('data: ')) continue
        const payload = line.slice(6)
        if (payload === '[DONE]') return null
        if (isError) {
          try {
            const parsed = JSON.parse(payload) as Record<string, unknown>
            return typeof parsed.detail === 'string' ? parsed.detail : 'Streaming error'
          } catch { return 'Streaming error' }
        }
        onToken(payload.replace(/\\n/g, '\n'))
      }
    }
  } finally {
    await reader.cancel().catch(() => {})
  }
  return null
}

// ── Demo ──────────────────────────────────────────────────────────────────────

export function DocumentScannerDemo() {
  // Input
  const [inputMode, setInputMode] = useState<InputMode>('file')
  const [file, setFile]           = useState<File | null>(null)
  const [url, setUrl]             = useState('')
  const [provider, setProvider]   = useState<Provider>('anthropic')
  const [ocrEngine, setOcrEngine] = useState<OCREngine>('tesseract')
  const [dragOver, setDragOver]   = useState(false)

  // Session
  const [session, setSession]             = useState<Session | null>(null)
  const [summaryStyle, setSummaryStyle]   = useState<SummaryStyle>('concise')
  const [summaryText, setSummaryText]     = useState('')

  // Chat
  const [messages, setMessages]           = useState<Message[]>([])
  const [chatInput, setChatInput]         = useState('')
  const [streamingText, setStreamingText] = useState('')

  // Status
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError]   = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const sessionIdRef = useRef<string | null>(null)
  const bottomRef    = useRef<HTMLDivElement>(null)

  // Keep ref in sync so unmount cleanup always has the latest id
  useEffect(() => { sessionIdRef.current = session?.id ?? null }, [session?.id])

  // Delete session on unmount
  useEffect(() => () => {
    if (sessionIdRef.current) {
      void fetch(`${BASE_URL}/api/sessions/${sessionIdRef.current}`, {
        method: 'DELETE',
        headers: authHeaders(),
        credentials: 'include',
      }).catch(() => {})
    }
  }, [])

  // Auto-scroll during streaming
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [messages, streamingText, summaryText])

  // ── Handlers ────────────────────────────────────────────────────────────────

  async function handleExtract() {
    if (status !== 'idle') return
    if (inputMode === 'file' && !file) return
    if (inputMode === 'url' && !url.trim()) return

    setStatus('uploading')
    setError('')

    const form = new FormData()
    if (inputMode === 'file') {
      form.append('file', file!)
      form.append('ocr_engine', ocrEngine)
    } else {
      form.append('url', url.trim())
    }
    form.append('provider', provider)

    try {
      const res = await fetch(`${BASE_URL}/api/sessions`, {
        method: 'POST',
        headers: authHeaders(),
        body: form,
        credentials: 'include',
      })
      if (!res.ok) throw new Error(await parseErrorDetail(res))
      const data = await res.json() as { session_id: string; char_count: number; preview: string }
      setSession({ id: data.session_id, charCount: data.char_count, preview: data.preview })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setStatus('idle')
    }
  }

  async function handleSummary() {
    if (!session || status !== 'idle') return
    setStatus('summarizing')
    setSummaryText('')
    setError('')

    try {
      const res = await fetch(`${BASE_URL}/api/sessions/${session.id}/summary`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ style: summaryStyle }),
        credentials: 'include',
      })
      if (!res.ok) throw new Error(await parseErrorDetail(res))
      const streamError = await consumeSSE(res, token => setSummaryText(prev => prev + token))
      if (streamError) throw new Error(streamError)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Summary failed')
    } finally {
      setStatus('idle')
    }
  }

  async function handleChat(e?: React.SyntheticEvent) {
    e?.preventDefault()
    const message = chatInput.trim()
    if (!message || !session || status !== 'idle') return

    setChatInput('')
    setMessages(prev => [...prev, { role: 'user', text: message }])
    setStatus('chatting')
    setStreamingText('')
    setError('')

    let accumulated = ''

    try {
      const res = await fetch(`${BASE_URL}/api/sessions/${session.id}/chat`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ message }),
        credentials: 'include',
      })
      if (!res.ok) throw new Error(await parseErrorDetail(res))
      const streamError = await consumeSSE(res, token => {
        accumulated += token
        setStreamingText(accumulated)
      })
      if (streamError) throw new Error(streamError)
      setMessages(prev => [...prev, { role: 'assistant', text: accumulated }])
      setStreamingText('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chat failed')
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setStatus('idle')
    }
  }

  function handleReset() {
    if (session) {
      void fetch(`${BASE_URL}/api/sessions/${session.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
        credentials: 'include',
      }).catch(() => {})
    }
    setSession(null)
    setSummaryText('')
    setMessages([])
    setChatInput('')
    setStreamingText('')
    setFile(null)
    setUrl('')
    setError('')
    setStatus('idle')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const isActive   = status !== 'idle'
  const hasSession = session !== null

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto px-6 pt-16 pb-32">
      <span className="section-label block mb-4">// Live Demo — Document Scanner</span>
      <h1 className="display pb-[0.3em] mb-2">Document Scanner</h1>
      <p className="mono text-text-muted text-sm mb-12">
        Upload a document or URL — extract text, generate a summary, then ask anything about the content.
      </p>

      {!hasSession ? (
        // ── Phase 1: input ──────────────────────────────────────────────────
        <div className="space-y-6">

          {/* Source */}
          <div>
            <span className="section-label block mb-3">// SOURCE</span>
            <div className="flex gap-2 mb-4">
              {(['file', 'url'] as InputMode[]).map(m => (
                <button key={m} type="button" disabled={isActive}
                  onClick={() => setInputMode(m)}
                  className={`mono text-xs px-4 py-2 border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    inputMode === m
                      ? 'border-text bg-text text-background'
                      : 'border-border-strong text-text-muted hover:border-text hover:text-text'
                  }`}
                >[ {m.toUpperCase()} ]</button>
              ))}
            </div>

            {inputMode === 'file' ? (
              <div
                role="button" tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => {
                  e.preventDefault()
                  setDragOver(false)
                  const f = e.dataTransfer.files[0]
                  if (f) setFile(f)
                }}
                className={`border border-dashed px-6 py-10 text-center cursor-pointer transition-colors ${
                  dragOver ? 'border-text' : 'border-border-strong hover:border-text'
                }`}
              >
                <input ref={fileInputRef} type="file" accept={ACCEPT} className="hidden"
                  onChange={e => setFile(e.target.files?.[0] ?? null)} />
                {file ? (
                  <div>
                    <span className="section-label block mb-2 text-text">// FILE SELECTED</span>
                    <p className="mono text-sm text-text">{file.name}</p>
                    <p className="mono text-xs text-text-muted mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div>
                    <p className="mono text-xs text-text-muted mb-1">Drop a file here or click to browse</p>
                    <p className="mono text-xs text-text-dim">PDF · DOCX · Images · TXT · Markdown</p>
                  </div>
                )}
              </div>
            ) : (
              <input type="url" value={url} onChange={e => setUrl(e.target.value)}
                disabled={isActive} placeholder="https://example.com/article"
                className="w-full bg-transparent border border-border-strong mono text-sm px-4 py-3 text-text placeholder:text-text-muted focus:outline-none focus:border-text disabled:opacity-60"
              />
            )}
          </div>

          {/* Provider */}
          <div>
            <span className="section-label block mb-3">// PROVIDER</span>
            <div className="flex gap-2">
              {(['anthropic', 'gemini'] as Provider[]).map(p => (
                <button key={p} type="button" disabled={isActive}
                  onClick={() => setProvider(p)}
                  className={`mono text-xs px-4 py-2 border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    provider === p
                      ? 'border-text bg-text text-background'
                      : 'border-border-strong text-text-muted hover:border-text hover:text-text'
                  }`}
                >[ {p.toUpperCase()} ]</button>
              ))}
            </div>
          </div>

          {/* OCR engine — file only */}
          {inputMode === 'file' && (
            <div>
              <span className="section-label block mb-3">// OCR ENGINE</span>
              <div className="flex gap-2 mb-2">
                {(['tesseract', 'mistral'] as OCREngine[]).map(e => (
                  <button key={e} type="button" disabled={isActive}
                    onClick={() => setOcrEngine(e)}
                    className={`mono text-xs px-4 py-2 border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                      ocrEngine === e
                        ? 'border-text bg-text text-background'
                        : 'border-border-strong text-text-muted hover:border-text hover:text-text'
                    }`}
                  >[ {e.toUpperCase()} ]</button>
                ))}
              </div>
              <p className="mono text-xs text-text-muted">
                {ocrEngine === 'tesseract'
                  ? 'Local OCR — fast, good for clean printed text'
                  : 'Mistral OCR — better for handwriting and complex layouts'}
              </p>
            </div>
          )}

          {/* Submit */}
          <button onClick={handleExtract}
            disabled={isActive || (inputMode === 'file' ? !file : !url.trim())}
            className="mono text-sm border border-text px-6 py-3 hover:bg-text hover:text-background transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {status === 'uploading' ? '[ Extracting... ]' : '[ Extract Document ] →'}
          </button>

          {error && (
            <p className="mono text-xs text-text-muted border border-dashed border-border-strong px-4 py-3">
              // {error}
            </p>
          )}
        </div>
      ) : (
        // ── Phase 2: session ────────────────────────────────────────────────
        <div className="space-y-10">

          {/* Document info */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="section-label">// DOCUMENT</span>
              <button onClick={handleReset}
                className="mono text-xs text-text-muted hover:text-text transition-colors">
                [ New Document ] ×
              </button>
            </div>
            <div className="border border-border-strong p-4 space-y-3">
              <span className="mono text-xs text-text-muted">
                {session.charCount.toLocaleString()} characters extracted
              </span>
              {session.preview && (
                <p className="mono text-xs text-text-dim leading-relaxed border-t border-border pt-3 line-clamp-3">
                  "{session.preview}"
                </p>
              )}
            </div>
          </div>

          {/* Summary */}
          <div>
            <span className="section-label block mb-3">// SUMMARY</span>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {(['concise', 'detailed', 'bullet-points'] as SummaryStyle[]).map(s => (
                <button key={s} type="button" disabled={isActive}
                  onClick={() => setSummaryStyle(s)}
                  className={`mono text-xs px-4 py-2 border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    summaryStyle === s
                      ? 'border-text bg-text text-background'
                      : 'border-border-strong text-text-muted hover:border-text hover:text-text'
                  }`}
                >[ {s.replace('-', ' ').toUpperCase()} ]</button>
              ))}
              <button onClick={handleSummary} disabled={isActive}
                className="mono text-xs border border-text px-4 py-2 hover:bg-text hover:text-background transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {status === 'summarizing' ? '[ Generating... ]' : '[ Generate ] →'}
              </button>
            </div>

            {(summaryText || status === 'summarizing') && (
              <div className="border border-border-strong p-5 bg-surface">
                <p className="mono text-xs text-text-muted leading-relaxed whitespace-pre-wrap">
                  {summaryText}
                  {status === 'summarizing' && (
                    <span className="inline-block w-0.5 h-[0.85em] bg-text-muted ml-0.5 align-text-bottom animate-pulse" />
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Conversation */}
          <div>
            <span className="section-label block mb-4">// CONVERSATION</span>

            {(messages.length > 0 || streamingText) && (
              <div className="border border-border-strong divide-y divide-[rgba(255,255,255,0.04)] mb-4">
                {messages.map((msg, i) => (
                  <div key={i} className="px-5 py-4 flex gap-5 items-start">
                    <span className={`mono text-xs shrink-0 w-8 text-right leading-5 ${
                      msg.role === 'user' ? 'text-text' : 'text-text-dim'
                    }`}>
                      {msg.role === 'user' ? 'YOU' : 'AI'}
                    </span>
                    <span className="mono text-xs text-text-dim shrink-0 leading-5">——</span>
                    <p className="mono text-xs text-text-muted leading-relaxed whitespace-pre-wrap flex-1">
                      {msg.text}
                    </p>
                  </div>
                ))}
                {streamingText && (
                  <div className="px-5 py-4 flex gap-5 items-start">
                    <span className="mono text-xs text-text-dim shrink-0 w-8 text-right leading-5">AI</span>
                    <span className="mono text-xs text-text-dim shrink-0 leading-5">——</span>
                    <p className="mono text-xs text-text-muted leading-relaxed whitespace-pre-wrap flex-1">
                      {streamingText}
                      <span className="inline-block w-0.5 h-[0.85em] bg-text-muted ml-0.5 align-text-bottom animate-pulse" />
                    </p>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleChat} className="flex gap-3">
              <input type="text" value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                disabled={isActive}
                placeholder={messages.length === 0 ? 'Ask anything about the document...' : 'Ask a follow-up...'}
                className="flex-1 bg-transparent border border-border-strong mono text-sm px-4 py-3 text-text placeholder:text-text-muted focus:outline-none focus:border-text disabled:opacity-60"
              />
              <button type="submit" disabled={isActive || !chatInput.trim()}
                className="mono text-sm border border-text px-5 py-3 hover:bg-text hover:text-background transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                {status === 'chatting' ? '...' : 'Send →'}
              </button>
            </form>

            {error && (
              <p className="mono text-xs text-text-muted border border-dashed border-border-strong px-4 py-3 mt-4">
                // {error}
              </p>
            )}
          </div>

          <div ref={bottomRef} />
        </div>
      )}
    </div>
  )
}
