import { useState, useRef, useCallback, useEffect } from 'react'

const BASE_URL = import.meta.env.VITE_SNAKE_API_URL as string

type Mode = 'train' | 'play'
type Status = 'idle' | 'connecting' | 'streaming' | 'done' | 'error'

interface Board {
  grid_size: number
  snake_body: [number, number][]
  food: [number, number]
}

interface Frame {
  episode: number
  board: Board
  score: number
  reward: number
  done: boolean
  epsilon: number | null
}

function parseFrame(raw: unknown): Frame | null {
  if (typeof raw !== 'object' || raw === null) return null
  const f = raw as Record<string, unknown>
  if (typeof f.episode !== 'number') return null
  if (typeof f.score !== 'number') return null
  if (typeof f.reward !== 'number') return null
  if (typeof f.done !== 'boolean') return null
  if (typeof f.board !== 'object' || f.board === null) return null

  const b = f.board as Record<string, unknown>
  if (typeof b.grid_size !== 'number') return null
  if (!Array.isArray(b.snake_body)) return null
  if (!Array.isArray(b.food) || b.food.length !== 2) return null

  return {
    episode: f.episode,
    score: f.score,
    reward: f.reward,
    done: f.done,
    epsilon: typeof f.epsilon === 'number' ? f.epsilon : null,
    board: {
      grid_size: b.grid_size,
      snake_body: b.snake_body as [number, number][],
      food: b.food as [number, number],
    },
  }
}

type StreamResult = { ok: true } | { ok: false; message: string }

async function streamSnake(
  url: string,
  onFrame: (frame: Frame) => void,
  signal: AbortSignal,
): Promise<StreamResult> {
  let res: Response
  try {
    res = await fetch(url, { signal })
  } catch {
    return {
      ok: false,
      message: 'Connection failed — server may be waking up (Railway cold start), try again in a moment',
    }
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    const body = text.length > 300 ? text.slice(0, 300) + '…' : text
    return { ok: false, message: `${res.status}: ${body || res.statusText}` }
  }

  const reader = res.body?.getReader()
  if (!reader) return { ok: false, message: 'Response had no body' }

  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      const chunks = buffer.split('\n\n')
      buffer = chunks.pop() ?? ''

      for (const chunk of chunks) {
        const dataLine = chunk.split('\n').find((line) => line.startsWith('data: '))
        if (!dataLine) continue

        let parsed: unknown
        try {
          parsed = JSON.parse(dataLine.slice('data: '.length))
        } catch {
          continue
        }

        const frame = parseFrame(parsed)
        if (frame) onFrame(frame)
      }
    }
  } catch (err) {
    // Stop button aborts the controller mid-read, which rejects reader.read()
    // with an AbortError — that's an intentional, user-initiated cancellation,
    // not a stream failure, so swallow it instead of letting it surface as an
    // unhandled rejection. Any other read error still propagates.
    if (signal.aborted) return { ok: false, message: 'Stopped by user' }
    throw err
  }

  return { ok: true }
}

const GRID_SIZES = [10, 15, 20, 30] as const
const FPS_OPTIONS = [10, 30, 60] as const
const TRAIN_EPISODES = [5, 10, 15] as const
const PLAY_EPISODES = [5, 10, 15] as const
const CANVAS_SIZE = 480

const COLORS = {
  background: '#0A0A0A',
  grid: 'rgba(255, 255, 255, 0.07)',
  body: '#E8E8E4',
  head: '#FFFFFF',
  food: '#22c55e',
  danger: '#f87171',
}

function drawBoard(canvas: HTMLCanvasElement, frame: Frame, flash: boolean) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const dpr = window.devicePixelRatio || 1
  if (canvas.width !== CANVAS_SIZE * dpr) {
    canvas.width = CANVAS_SIZE * dpr
    canvas.height = CANVAS_SIZE * dpr
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  const cell = CANVAS_SIZE / frame.board.grid_size

  ctx.fillStyle = COLORS.background
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

  ctx.strokeStyle = COLORS.grid
  ctx.lineWidth = 1
  for (let i = 0; i <= frame.board.grid_size; i++) {
    const pos = Math.round(i * cell) + 0.5
    ctx.beginPath()
    ctx.moveTo(pos, 0)
    ctx.lineTo(pos, CANVAS_SIZE)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(0, pos)
    ctx.lineTo(CANVAS_SIZE, pos)
    ctx.stroke()
  }

  const [foodX, foodY] = frame.board.food
  ctx.fillStyle = COLORS.food
  ctx.fillRect(foodX * cell, foodY * cell, cell, cell)

  frame.board.snake_body.forEach(([x, y], i) => {
    const isHead = i === frame.board.snake_body.length - 1
    ctx.fillStyle = isHead ? COLORS.head : COLORS.body
    ctx.fillRect(x * cell, y * cell, cell, cell)
    if (isHead) {
      ctx.strokeStyle = COLORS.body
      ctx.lineWidth = 2
      ctx.strokeRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2)
    }
  })

  if (flash) {
    ctx.strokeStyle = COLORS.danger
    ctx.lineWidth = 4
    ctx.strokeRect(2, 2, CANVAS_SIZE - 4, CANVAS_SIZE - 4)
  }
}

export function SnakeDemo() {
  const [mode, setMode] = useState<Mode>('play')
  const [gridSize, setGridSize] = useState<number>(20)
  const [fps, setFps] = useState<number>(30)
  const [trainEpisodes, setTrainEpisodes] = useState<number>(10)
  const [playEpisodes, setPlayEpisodes] = useState<number>(10)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [frame, setFrame] = useState<Frame | null>(null)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const controllerRef = useRef<AbortController | null>(null)

  useEffect(() => () => {
    controllerRef.current?.abort()
    controllerRef.current = null
  }, [])

  const nEpisodes = mode === 'train' ? trainEpisodes : playEpisodes
  const episodeOptions = mode === 'train' ? TRAIN_EPISODES : PLAY_EPISODES
  const setEpisodes = mode === 'train' ? setTrainEpisodes : setPlayEpisodes

  const start = useCallback(async () => {
    if (status === 'connecting' || status === 'streaming') return

    if (!BASE_URL) {
      setStatus('error')
      setErrorMsg('Demo not configured — VITE_SNAKE_API_URL is missing')
      return
    }

    setStatus('connecting')
    setErrorMsg('')
    setFrame(null)

    const controller = new AbortController()
    controllerRef.current = controller

    const params = new URLSearchParams({
      grid_size: String(gridSize),
      fps: String(fps),
      n_episodes: String(nEpisodes),
      use_shield: 'true',
    })
    const url = `${BASE_URL}/${mode}?${params}`

    const result = await streamSnake(
      url,
      (f) => {
        setStatus('streaming')
        setFrame(f)
        if (canvasRef.current) {
          const isDeath = f.reward === -10
          drawBoard(canvasRef.current, f, isDeath)
          if (isDeath) {
            setTimeout(() => {
              if (canvasRef.current) drawBoard(canvasRef.current, f, false)
            }, 400)
          }
        }
      },
      controller.signal,
    )

    if (controllerRef.current !== controller) return // stopped or superseded by a new run

    controllerRef.current = null
    if (result.ok) {
      setStatus('done')
    } else {
      setStatus('error')
      setErrorMsg(result.message)
    }
  }, [status, mode, gridSize, fps, nEpisodes])

  function stop() {
    controllerRef.current?.abort()
    controllerRef.current = null
    setStatus('idle')
  }

  const isActive = status === 'connecting' || status === 'streaming'

  return (
    <div className="max-w-4xl mx-auto px-6 pt-16 pb-32">
      <span className="section-label block mb-4">// Live Demo — Snake Q-Learning</span>
      <h1 className="display pb-[0.3em] mb-2">Snake Q-Learning</h1>
      <p className="mono text-text-muted text-sm mb-12">
        Tabular Q-learning agent playing Snake, streamed live frame-by-frame from the agent running on Railway.
      </p>

      <div className="space-y-6">
        <div>
          <span className="section-label block mb-3">// MODE</span>
          <div className="flex gap-2">
            {(['play', 'train'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                disabled={isActive}
                onClick={() => { setMode(m); setFrame(null) }}
                className={`mono text-xs px-4 py-2 border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  mode === m
                    ? 'border-text bg-text text-background'
                    : 'border-border-strong text-text-muted hover:border-text hover:text-text'
                }`}
              >
                [ {m === 'play' ? 'Play (pretrained)' : 'Train (from scratch)'} ]
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="section-label block mb-3">// GRID SIZE</span>
          <div className="flex gap-2">
            {GRID_SIZES.map((g) => (
              <button
                key={g}
                type="button"
                disabled={isActive}
                onClick={() => { setGridSize(g); setFrame(null) }}
                className={`mono text-xs px-4 py-2 border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  gridSize === g
                    ? 'border-text bg-text text-background'
                    : 'border-border-strong text-text-muted hover:border-text hover:text-text'
                }`}
              >
                [ {g}x{g} ]
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="section-label block mb-3">// EPISODES</span>
          <div className="flex gap-2">
            {episodeOptions.map((n) => (
              <button
                key={n}
                type="button"
                disabled={isActive}
                onClick={() => { setEpisodes(n); setFrame(null) }}
                className={`mono text-xs px-4 py-2 border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  nEpisodes === n
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
          <span className="section-label block mb-3">// SPEED (FPS)</span>
          <div className="flex gap-2">
            {FPS_OPTIONS.map((f) => (
              <button
                key={f}
                type="button"
                disabled={isActive}
                onClick={() => { setFps(f); setFrame(null) }}
                className={`mono text-xs px-4 py-2 border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  fps === f
                    ? 'border-text bg-text text-background'
                    : 'border-border-strong text-text-muted hover:border-text hover:text-text'
                }`}
              >
                [ {f} ]
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={start}
            disabled={isActive}
            className="mono text-sm border border-text px-6 py-3 hover:bg-text hover:text-background transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isActive ? '[ Streaming... ]' : status === 'error' ? '[ Retry ] →' : '[ Start ] →'}
          </button>
          {isActive && (
            <button
              onClick={stop}
              className="mono text-xs border border-border-strong text-text-muted px-4 py-2 hover:border-text hover:text-text transition-colors"
            >
              [ Stop ]
            </button>
          )}
        </div>

        {status === 'error' && (
          <p className="mono text-xs text-text-muted border border-dashed border-border-strong px-4 py-3 break-all">
            // {errorMsg}
          </p>
        )}
      </div>

      <div className="mt-16">
        <div className="flex items-center justify-between mb-4">
          <span className="section-label">// BOARD</span>
          {status === 'streaming' && (
            <span className="mono text-xs text-text-muted flex items-center gap-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-text-muted animate-pulse" />
              streaming
            </span>
          )}
        </div>

        <canvas
          ref={canvasRef}
          className="w-full max-w-[480px] aspect-square border border-border-strong bg-background"
        />

        {frame && (
          <div className={`grid grid-cols-2 ${frame.epsilon !== null ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} gap-px border border-border-strong border-t-0 max-w-[480px]`}>
            <Stat label="EPISODE" value={`${frame.episode + 1} / ${nEpisodes}`} />
            <Stat label="SCORE" value={String(frame.score)} />
            {frame.epsilon !== null && <Stat label="EPSILON" value={frame.epsilon.toFixed(3)} />}
            <Stat label="STATUS" value={status.toUpperCase()} />
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4">
      <span className="mono text-xs text-text-muted block mb-1">{label}</span>
      <span className="mono text-lg text-text">{value}</span>
    </div>
  )
}
