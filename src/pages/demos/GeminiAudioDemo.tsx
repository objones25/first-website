import { useState, useRef, useEffect } from 'react'

const WS_URL = 'wss://gemini-audio-agent.owenbeckettjones.workers.dev/ws'

const WORKLET_SRC = `
class PcmProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs[0]?.[0];
    if (ch) {
      const i16 = new Int16Array(ch.length);
      for (let i = 0; i < ch.length; i++)
        i16[i] = Math.max(-32768, Math.min(32767, ch[i] * 32767));
      this.port.postMessage(i16.buffer, [i16.buffer]);
    }
    return true;
  }
}
registerProcessor('pcm-processor', PcmProcessor);
`

type Voice = 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Aoede' | 'Zephyr' | 'Leda'
type ConnStatus = 'idle' | 'connecting' | 'ready' | 'error'

interface TranscriptEntry {
  id: number
  role: 'user' | 'aria'
  text: string
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let b = ''
  for (let i = 0; i < bytes.length; i++) b += String.fromCharCode(bytes[i])
  return btoa(b)
}

function parseSampleRate(mimeType: string): number {
  const m = /rate=(\d+)/.exec(mimeType)
  return m ? parseInt(m[1], 10) : 24000
}

export function GeminiAudioDemo() {
  const [voice, setVoice] = useState<Voice>('Kore')
  const [status, setStatus] = useState<ConnStatus>('idle')
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
  const [textInput, setTextInput] = useState('')
  const [error, setError] = useState('')

  const wsRef = useRef<WebSocket | null>(null)
  const captureCtxRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<AudioWorkletNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const playbackCtxRef = useRef<AudioContext | null>(null)
  const nextStartRef = useRef(0)
  const workletUrlRef = useRef<string | null>(null)
  const entryIdRef = useRef(0)

  useEffect(() => {
    const blob = new Blob([WORKLET_SRC], { type: 'application/javascript' })
    workletUrlRef.current = URL.createObjectURL(blob)
    return () => {
      if (workletUrlRef.current) URL.revokeObjectURL(workletUrlRef.current)
    }
  }, [])

  useEffect(() => {
    return () => {
      wsRef.current?.close()
      stopPlayback()
    }
  }, [])

  function addTranscript(role: 'user' | 'aria', text: string) {
    setTranscript(prev => [...prev, { id: entryIdRef.current++, role, text }])
  }

  function getPlaybackCtx(): AudioContext {
    if (!playbackCtxRef.current || playbackCtxRef.current.state === 'closed') {
      playbackCtxRef.current = new AudioContext()
      nextStartRef.current = playbackCtxRef.current.currentTime
    }
    return playbackCtxRef.current
  }

  function scheduleAudioChunk(base64: string, mimeType: string) {
    try {
      const sampleRate = parseSampleRate(mimeType)
      const raw = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
      const int16 = new Int16Array(raw.buffer)
      const ctx = getPlaybackCtx()
      const buf = ctx.createBuffer(1, int16.length, sampleRate)
      const ch = buf.getChannelData(0)
      for (let i = 0; i < int16.length; i++) ch[i] = int16[i] / 32768
      const src = ctx.createBufferSource()
      src.buffer = buf
      src.connect(ctx.destination)
      const startTime = Math.max(ctx.currentTime + 0.08, nextStartRef.current)
      src.start(startTime)
      nextStartRef.current = startTime + buf.duration
    } catch { /* ignore playback errors */ }
  }

  function stopPlayback() {
    playbackCtxRef.current?.close()
    playbackCtxRef.current = null
    nextStartRef.current = 0
  }

  function stopCapture(sendEnd = true) {
    processorRef.current?.disconnect()
    streamRef.current?.getTracks().forEach(t => t.stop())
    captureCtxRef.current?.close()
    processorRef.current = null
    streamRef.current = null
    captureCtxRef.current = null
    if (sendEnd && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'audio_end' }))
    }
    setIsRecording(false)
  }

  function connect() {
    if (wsRef.current) return
    setStatus('connecting')
    setError('')
    setTranscript([])

    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'setup',
        voice,
        inputTranscription: true,
        outputTranscription: true,
      }))
    }

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data as string)
      switch (msg.type) {
        case 'ready':
          setStatus('ready')
          break
        case 'audio':
          scheduleAudioChunk(msg.data as string, msg.mimeType as string)
          break
        case 'input_transcript':
          addTranscript('user', msg.text as string)
          break
        case 'output_transcript':
          addTranscript('aria', msg.text as string)
          break
        case 'interrupted':
          stopPlayback()
          break
        case 'error':
          setError(`[${msg.code as string}] ${msg.message as string}`)
          break
      }
    }

    ws.onclose = () => {
      wsRef.current = null
      setStatus('idle')
      stopCapture(false)
      stopPlayback()
    }

    ws.onerror = () => {
      setError('Connection failed — check browser console')
      setStatus('error')
    }
  }

  function disconnect() {
    stopCapture(false)
    stopPlayback()
    wsRef.current?.close()
    wsRef.current = null
    setStatus('idle')
  }

  async function startCapture() {
    if (!workletUrlRef.current) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      streamRef.current = stream
      const ctx = new AudioContext({ sampleRate: 16000 })
      captureCtxRef.current = ctx
      await ctx.audioWorklet.addModule(workletUrlRef.current)
      const source = ctx.createMediaStreamSource(stream)
      const processor = new AudioWorkletNode(ctx, 'pcm-processor')
      processorRef.current = processor

      const CHUNK = 1600
      let buf = new Int16Array(CHUNK)
      let offset = 0

      processor.port.onmessage = (e) => {
        const ws = wsRef.current
        if (!ws || ws.readyState !== WebSocket.OPEN) return
        const incoming = new Int16Array(e.data as ArrayBuffer)
        let src = 0
        while (src < incoming.length) {
          const toCopy = Math.min(incoming.length - src, CHUNK - offset)
          buf.set(incoming.subarray(src, src + toCopy), offset)
          offset += toCopy
          src += toCopy
          if (offset >= CHUNK) {
            ws.send(JSON.stringify({ type: 'audio', data: arrayBufferToBase64(buf.buffer) }))
            buf = new Int16Array(CHUNK)
            offset = 0
          }
        }
      }

      source.connect(processor)
      setIsRecording(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Microphone error')
    }
  }

  async function toggleRecording() {
    if (isRecording) {
      stopCapture()
    } else {
      await startCapture()
    }
  }

  function sendText() {
    const text = textInput.trim()
    if (!text || wsRef.current?.readyState !== WebSocket.OPEN) return
    wsRef.current.send(JSON.stringify({ type: 'text', text }))
    addTranscript('user', text)
    setTextInput('')
  }

  const isConnected = status === 'ready'

  const statusLabel: Record<ConnStatus, string> = {
    idle: '○  disconnected',
    connecting: '◌  connecting...',
    ready: '●  ready',
    error: '●  error',
  }

  return (
    <div className="max-w-4xl mx-auto px-6 pt-16 pb-32">
      <span className="section-label block mb-4">// Live Demo — Gemini Audio Agent</span>
      <h1 className="display mb-2">Aria</h1>
      <p className="mono text-text-muted text-sm mb-12">
        Real-time voice conversation via Gemini Live API. Speak or type — Aria responds in audio.
      </p>

      <div className="space-y-8">
        {/* Voice selector */}
        <div>
          <span className="section-label block mb-3">// VOICE</span>
          <div className="flex flex-wrap gap-2">
            {(['Kore', 'Puck', 'Charon', 'Fenrir', 'Aoede', 'Zephyr', 'Leda'] as Voice[]).map(v => (
              <button
                key={v}
                type="button"
                disabled={status !== 'idle'}
                onClick={() => setVoice(v)}
                className={`mono text-xs px-3 py-1.5 border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  voice === v
                    ? 'border-text bg-text text-background'
                    : 'border-border-strong text-text-muted hover:border-text hover:text-text'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Status + connect */}
        <div className="flex items-center gap-6">
          <span className={`mono text-xs ${isConnected ? 'text-text' : 'text-text-muted'}`}>
            // {statusLabel[status]}
          </span>
          {status === 'idle' || status === 'error' ? (
            <button
              onClick={connect}
              className="mono text-sm border border-text px-6 py-3 hover:bg-text hover:text-background transition-colors"
            >
              [ Connect ] →
            </button>
          ) : (
            <button
              onClick={disconnect}
              className="mono text-sm border border-border-strong text-text-muted px-6 py-3 hover:border-text hover:text-text transition-colors"
            >
              [ Disconnect ]
            </button>
          )}
        </div>

        {error && (
          <p className="mono text-xs text-text-muted border border-dashed border-border-strong px-4 py-3">
            // {error}
          </p>
        )}

        {/* Record + text input */}
        {isConnected && (
          <div className="space-y-4">
            <button
              onClick={toggleRecording}
              className={`mono text-sm px-6 py-3 border transition-colors ${
                isRecording
                  ? 'border-text bg-text text-background'
                  : 'border-border-strong text-text-muted hover:border-text hover:text-text'
              }`}
            >
              {isRecording ? '[ ■ Stop ]' : '[ ● Record ]'}
            </button>

            <div className="flex gap-3">
              <input
                type="text"
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendText()}
                placeholder="Or type a message..."
                className="flex-1 bg-transparent border border-border-strong mono text-sm px-4 py-2 text-text placeholder:text-text-muted focus:outline-none focus:border-text"
              />
              <button
                onClick={sendText}
                disabled={!textInput.trim()}
                className="mono text-sm border border-border-strong text-text-muted px-4 py-2 hover:border-text hover:text-text transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Send →
              </button>
            </div>
          </div>
        )}

        {/* Transcript */}
        {transcript.length > 0 && (
          <div>
            <span className="section-label block mb-4">// TRANSCRIPT</span>
            <div className="space-y-4">
              {transcript.map(entry => (
                <div key={entry.id} className="flex gap-4">
                  <span className="mono text-xs text-text-muted shrink-0 mt-0.5 w-12 text-right">
                    {entry.role === 'user' ? 'YOU' : 'ARIA'}
                  </span>
                  <span className="mono text-xs text-text-muted shrink-0 mt-0.5">——</span>
                  <p className="mono text-sm text-text leading-relaxed">{entry.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
