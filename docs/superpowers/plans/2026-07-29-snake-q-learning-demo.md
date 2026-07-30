# Snake Q-Learning Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a live, canvas-rendered demo of the `snake-q-learning` project's `/train` and `/play` SSE endpoints to the portfolio site, plus a project card for it.

**Architecture:** A single new page component (`SnakeDemo.tsx`) opens a `fetch()`-based SSE stream directly against the Railway-deployed FastAPI backend (no Worker proxy — the API needs no secret and already allows CORS from anywhere), manually parses `data: ` frames, and redraws an HTML canvas imperatively on every frame rather than pushing per-cell state through React.

**Tech Stack:** React 19 + TypeScript, native `fetch`/`ReadableStream` (not `EventSource` — see Task 3 note), HTML Canvas 2D, Tailwind CSS 4 utility classes matching existing demo pages.

## Global Constraints

- No lint script and no test runner exist in this repo (`CLAUDE.md`) — verification is `npm run typecheck` plus manual browser testing via a running dev server, not automated tests.
- Path alias `@/*` → `src/*` is available but existing demo pages under `src/pages/demos/` import only from `react`, so `SnakeDemo.tsx` should do the same (no need to introduce `@/` imports for this file).
- `tsconfig.json` has `strict`, `noUnusedLocals`, and `noUnusedParameters` on — every declared variable/param must be used.
- Weather API demo removal is out of scope. Do not touch `WeatherDemo.tsx`, `workers/weather-proxy`, or the `weather-api` entry in `projects.ts`.
- Deployed API base URL: `https://web-production-be2c0.up.railway.app`. Confirmed live and matching the documented frame shape via `curl -N "https://web-production-be2c0.up.railway.app/play?n_episodes=1&grid_size=8&fps=30"` during planning — frames look like:
  `data: {"episode": 0, "board": {"grid_size": 8, "snake_body": [[5, 4]], "food": [6, 6]}, "score": 1, "reward": 0, "done": false, "epsilon": null}`

---

### Task 1: Wire up `VITE_SNAKE_API_URL`

**Files:**
- Modify: `.env` (local, gitignored — not committed)
- Modify: `.github/workflows/deploy.yml`
- Modify: `CLAUDE.md`

**Interfaces:**
- Produces: the env var `VITE_SNAKE_API_URL`, read in Task 3 as `import.meta.env.VITE_SNAKE_API_URL as string`.

- [ ] **Step 1: Add the var to local `.env`**

Append this line to `.env` (create the file's existing content is untouched — just add a new line at the end):

```
VITE_SNAKE_API_URL=https://web-production-be2c0.up.railway.app
```

- [ ] **Step 2: Add the var to the deploy workflow's build secrets**

In `.github/workflows/deploy.yml`, in the `Build` step's `env:` block, add a line after `VITE_DOCUMENT_SCANNER_URL`:

```yaml
      - name: Build
        run: npm run build
        env:
          VITE_CLERK_PUBLISHABLE_KEY: ${{ secrets.VITE_CLERK_PUBLISHABLE_KEY }}
          VITE_BRAVE_SEARCH_AGENT_URL: ${{ secrets.VITE_BRAVE_SEARCH_AGENT_URL }}
          VITE_WEATHER_API_URL: ${{ secrets.VITE_WEATHER_API_URL }}
          VITE_MICROAGENT_WS_URL: ${{ secrets.VITE_MICROAGENT_WS_URL }}
          VITE_DOCUMENT_SCANNER_URL: ${{ secrets.VITE_DOCUMENT_SCANNER_URL }}
          VITE_SNAKE_API_URL: ${{ secrets.VITE_SNAKE_API_URL }}
```

- [ ] **Step 3: Update `CLAUDE.md`'s env var list**

Find this sentence:

```
There's no root env template — a local `.env` needs `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_BRAVE_SEARCH_AGENT_URL`, `VITE_WEATHER_API_URL`, `VITE_MICROAGENT_WS_URL`, `VITE_DOCUMENT_SCANNER_URL` (same names used as GitHub Actions secrets in `deploy.yml`).
```

Replace with:

```
There's no root env template — a local `.env` needs `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_BRAVE_SEARCH_AGENT_URL`, `VITE_WEATHER_API_URL`, `VITE_MICROAGENT_WS_URL`, `VITE_DOCUMENT_SCANNER_URL`, `VITE_SNAKE_API_URL` (same names used as GitHub Actions secrets in `deploy.yml`).
```

- [ ] **Step 4: Update `CLAUDE.md`'s "Worker proxy integration" section**

Find this block:

```
**Worker proxy integration**: the frontend never calls upstream demo backends directly — only the Cloudflare Worker proxies, which inject secrets server-side. Of the 5 demos, only 3 have their proxy source in this repo's `workers/`:
- `WeatherDemo.tsx` → `VITE_WEATHER_API_URL` → `workers/weather-proxy`
- `DocumentScannerDemo.tsx` → `VITE_DOCUMENT_SCANNER_URL` → `workers/document-scanner-proxy`
- `MicroagentDemo.tsx` → `VITE_MICROAGENT_WS_URL` (raw WebSocket) → `workers/microagent-proxy`
- `BraveSearchDemo.tsx` → `VITE_BRAVE_SEARCH_AGENT_URL` — worker lives in a separate repo
- `GeminiAudioDemo.tsx` — WebSocket URL is **hardcoded** (`wss://gemini-audio-agent.owenbeckettjones.workers.dev/ws`), not a `VITE_*` var like the others; worker also lives in a separate repo. Treat this as an inconsistency, not a pattern to copy.
```

Replace with:

```
**Worker proxy integration**: most demos never call upstream demo backends directly — they go through a Cloudflare Worker proxy that injects secrets server-side. Of the 6 demos, only 3 have their proxy source in this repo's `workers/`:
- `WeatherDemo.tsx` → `VITE_WEATHER_API_URL` → `workers/weather-proxy`
- `DocumentScannerDemo.tsx` → `VITE_DOCUMENT_SCANNER_URL` → `workers/document-scanner-proxy`
- `MicroagentDemo.tsx` → `VITE_MICROAGENT_WS_URL` (raw WebSocket) → `workers/microagent-proxy`
- `BraveSearchDemo.tsx` → `VITE_BRAVE_SEARCH_AGENT_URL` — worker lives in a separate repo
- `GeminiAudioDemo.tsx` — WebSocket URL is **hardcoded** (`wss://gemini-audio-agent.owenbeckettjones.workers.dev/ws`), not a `VITE_*` var like the others; worker also lives in a separate repo. Treat this as an inconsistency, not a pattern to copy.
- `SnakeDemo.tsx` → `VITE_SNAKE_API_URL` — calls the Railway-deployed FastAPI SSE endpoints directly; no Worker proxy exists or is needed, since that API requires no secret and already sets `CORS: *`.
```

- [ ] **Step 5: Verify**

Run: `grep -n "VITE_SNAKE_API_URL" .env .github/workflows/deploy.yml CLAUDE.md`
Expected: one match in each file.

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/deploy.yml CLAUDE.md
git commit -m "$(cat <<'EOF'
chore: wire up VITE_SNAKE_API_URL for the upcoming snake demo

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

(`.env` is gitignored and won't be staged — that's expected.)

- [ ] **Step 7: Flag the manual follow-up**

This step has no command — just surface it to the user in your final summary: `deploy.yml` now references `secrets.VITE_SNAKE_API_URL`, so the GitHub repo needs that secret added (Settings → Secrets and variables → Actions) before the next push-to-main deploy, or the production build will bake in an empty string for this var. Do not attempt to set this secret yourself (`gh secret set`) without the user's explicit go-ahead — it's a change to shared repo configuration.

---

### Task 2: Add the `snake-q-learning` project entry

**Files:**
- Modify: `src/data/projects.ts`

**Interfaces:**
- Produces: a `Project` object satisfying `src/types/index.ts`'s `Project` interface, with `slug: 'snake-q-learning'` and `hasDemo: true` — this slug is the key Task 3 registers in `Demo.tsx`'s `DEMOS` map.

- [ ] **Step 1: Insert the new project object**

In `src/data/projects.ts`, insert this object as the **first** element of the `projects` array (immediately after `export const projects: Project[] = [`, before the existing `microagent` entry), since it's the newest project:

```typescript
  {
    slug: 'snake-q-learning',
    title: 'Snake Q-Learning',
    description: 'Tabular Q-learning agent that learns to play Snake, built around a rotation-invariant, distance-bucketed state encoding rather than a neural network.',
    year: '2026',
    tags: ['Python', 'Reinforcement Learning', 'FastAPI'],
    status: 'complete',
    overview: 'A Q-learning agent for Snake with no neural network — its entire "brain" is a 1,600-row table of state-action values, updated with a plain Bellman-equation rule. The environment is a small Gym-like world built from scratch on top of a minimal Snake entity, and a FastAPI backend streams live training or greedy-playthrough frames over Server-Sent Events for the browser demo below.',
    challenge: 'The original state encoding used three plain booleans for danger and a 3-way sign for food direction — 72 states total. It trained fine but plateaued hard: average score converged to roughly 21-22 by episode 5,000-6,000 and never improved with more training. The root cause was information loss, not under-training — a boolean "danger ahead" can\'t distinguish a wall directly in front of the snake from one five cells away, and a 3-way food sign can\'t distinguish food one cell away from food across the entire board.',
    approach: 'Replacing the encoding with distance-bucketed danger (four buckets across each of three relative directions) and bucketed food position (five buckets per axis) took the table from 72 to 1,600 states — and broke the plateau. Both danger and food are encoded relative to the snake\'s own heading rather than absolute grid direction, so the agent learns one rotation-invariant policy instead of four rotated copies of the same one. A separate FastAPI service exposes the same train()/play() generators the CLI uses as GET /train and GET /play Server-Sent Event streams, so the exact same episode loop drives the CLI\'s progress output, an optional pygame renderer, and this live browser demo — none of the RL logic is duplicated across the three.',
    features: [
      'Rotation-invariant, distance-bucketed state encoding (1,600 states) that broke through a hard plateau a simpler 72-state boolean encoding hit at avg score ~21-22',
      'train() and play() are implemented as generators, not functions — shared unmodified by the CLI, an optional pygame renderer, and the FastAPI SSE endpoints',
      'Greedy playthrough over 100,000 episodes averages a score of 42 (final snake length), with a top score of 87',
      '500-episode soak test asserting environment invariants hold on every single step, which previously caught a collision-set desync bug',
    ],
    links: [
      { label: 'GitHub', href: 'https://github.com/objones25/snake-q-learning' },
    ],
    hasDemo: true,
  },
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Visually verify the project card**

Run: `npm run dev` (leave running), then open `http://localhost:3000/projects` in a browser and confirm a "Snake Q-Learning" card appears first in the grid; click into it and confirm `http://localhost:3000/projects/snake-q-learning` renders the overview/challenge/approach/features sections without layout breakage (long unbroken strings, missing punctuation, etc.). Stop the dev server after (Task 3 will restart it).

- [ ] **Step 4: Commit**

```bash
git add src/data/projects.ts
git commit -m "$(cat <<'EOF'
content: add snake-q-learning project entry

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Build `SnakeDemo.tsx` and register the route

**Files:**
- Create: `src/pages/demos/SnakeDemo.tsx`
- Modify: `src/pages/Demo.tsx`

**Interfaces:**
- Consumes: `VITE_SNAKE_API_URL` from Task 1; slug `'snake-q-learning'` from Task 2 (must match the `DEMOS` map key exactly).
- Produces: `export function SnakeDemo()` — a React component with no props, consumed only by `Demo.tsx`.

**Implementation note — deviating from the design doc's "native EventSource" wording:** the design spec says the connection should be a native `EventSource`, but the browser `EventSource` API exposes no HTTP status code or response body on failure — it only fires a generic `onerror` `Event`. That makes the spec's "503 surfaced verbatim" requirement unimplementable with `EventSource`. This task instead uses `fetch()` + a manual `ReadableStream` reader to parse `data: ` lines by hand, which preserves every behavioral requirement from the spec (mode toggle, param controls, HUD, canvas draw, cold-start retry copy, natural end-of-stream detection) while also getting real HTTP status/body access for the 503 case, and clean cancellation via `AbortController` for the Stop button. All spec-level behavior is unchanged; only the underlying transport class is swapped.

- [ ] **Step 1: Write `src/pages/demos/SnakeDemo.tsx`**

```tsx
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
    return { ok: false, message: `${res.status}: ${text || res.statusText}` }
  }

  const reader = res.body?.getReader()
  if (!reader) return { ok: false, message: 'Response had no body' }

  const decoder = new TextDecoder()
  let buffer = ''

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

  return { ok: true }
}

const GRID_SIZES = [10, 15, 20, 30] as const
const FPS_OPTIONS = [10, 30, 60] as const
const TRAIN_EPISODES = [25, 50, 100, 200] as const
const PLAY_EPISODES = [5, 10, 25, 50] as const
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

  const cell = CANVAS_SIZE / frame.board.grid_size

  ctx.fillStyle = COLORS.background
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

  ctx.strokeStyle = COLORS.grid
  ctx.lineWidth = 1
  for (let i = 0; i <= frame.board.grid_size; i++) {
    const pos = i * cell
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
  const [trainEpisodes, setTrainEpisodes] = useState<number>(50)
  const [playEpisodes, setPlayEpisodes] = useState<number>(10)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [frame, setFrame] = useState<Frame | null>(null)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const controllerRef = useRef<AbortController | null>(null)

  useEffect(() => () => { controllerRef.current?.abort() }, [])

  useEffect(() => {
    if (canvasRef.current && frame) {
      drawBoard(canvasRef.current, frame, frame.reward === -10)
    }
  }, [frame])

  const nEpisodes = mode === 'train' ? trainEpisodes : playEpisodes
  const episodeOptions = mode === 'train' ? TRAIN_EPISODES : PLAY_EPISODES
  const setEpisodes = mode === 'train' ? setTrainEpisodes : setPlayEpisodes

  const start = useCallback(async () => {
    if (status === 'connecting' || status === 'streaming') return

    setStatus('connecting')
    setErrorMsg('')
    setFrame(null)

    const controller = new AbortController()
    controllerRef.current = controller

    const params = new URLSearchParams({
      grid_size: String(gridSize),
      fps: String(fps),
      n_episodes: String(nEpisodes),
    })
    const url = `${BASE_URL}/${mode}?${params}`

    const result = await streamSnake(
      url,
      (f) => {
        setStatus('streaming')
        setFrame(f)
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
      <h1 className="display mb-2">Snake Q-Learning</h1>
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
                onClick={() => setMode(m)}
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
                onClick={() => setGridSize(g)}
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
                onClick={() => setEpisodes(n)}
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
                onClick={() => setFps(f)}
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
          <p className="mono text-xs text-text-muted border border-dashed border-border-strong px-4 py-3">
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
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="w-full max-w-[480px] aspect-square border border-border-strong bg-background"
        />

        {frame && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px border border-border-strong border-t-0 max-w-[480px]">
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
```

- [ ] **Step 2: Register the route in `Demo.tsx`**

In `src/pages/Demo.tsx`, add the import and map entry:

```tsx
import { useParams, Navigate } from 'react-router-dom'
import type { ComponentType } from 'react'
import { PageTransition } from '@/components/layout/PageTransition'
import { WeatherDemo } from './demos/WeatherDemo'
import { GeminiAudioDemo } from './demos/GeminiAudioDemo'
import { BraveSearchDemo } from './demos/BraveSearchDemo'
import { MicroagentDemo } from './demos/MicroagentDemo'
import { DocumentScannerDemo } from './demos/DocumentScannerDemo'
import { SnakeDemo } from './demos/SnakeDemo'

const DEMOS: Record<string, ComponentType> = {
  'weather-api': WeatherDemo,
  'gemini-audio-agent': GeminiAudioDemo,
  'brave-search-agent': BraveSearchDemo,
  'microagent': MicroagentDemo,
  'document-scanner': DocumentScannerDemo,
  'snake-q-learning': SnakeDemo,
}
```

(Everything else in `Demo.tsx` is unchanged.)

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: no errors. If `import.meta.env.VITE_SNAKE_API_URL` produces a type error, confirm Task 1 Step 1 was completed (the var must exist in `.env` for Vite's type inference, though in practice `vite/client` types allow any `VITE_*` key as `string` regardless).

- [ ] **Step 4: Manual browser verification — Play mode**

Run `npm run dev`, open `http://localhost:3000/projects/snake-q-learning/demo`. Using the claude-in-chrome tools (`tabs_create_mcp` to open the tab, `computer` to click, `read_console_messages` to check for runtime errors):
1. Confirm the page loads with Mode defaulted to "Play (pretrained)", Grid Size 20x20, Episodes 10, FPS 30.
2. Click `[ Start ]`. Confirm status changes to "Streaming..." and the canvas begins drawing a moving snake within ~1-2 seconds (Railway may need a moment to cold-start on first request — if nothing happens after ~15s, check `read_network_requests` for the `/play` request status).
3. Confirm the EPISODE / SCORE / STATUS stat row appears and updates as frames arrive, and that EPSILON is absent in Play mode.
4. Let it run to completion (10 episodes at grid 20 finishes in well under a minute) and confirm status settles to "DONE" (shown in the STATUS stat) without the error box appearing.
5. Check `read_console_messages` for any uncaught errors during the run — expected: none.

- [ ] **Step 5: Manual browser verification — Train mode + Stop**

1. Click `[ Train (from scratch) ]`, set Episodes to 25 (fastest option) and FPS to 60.
2. Click `[ Start ]`. Confirm the EPSILON stat now appears and decreases over time (starts near 1.0), and that early gameplay looks visibly more erratic than the Play run.
3. Mid-stream, click `[ Stop ]`. Confirm status immediately returns to idle (Start button re-enabled, Stop button disappears) and no further canvas updates occur after stopping — take a screenshot, wait ~2s, take another, and confirm the canvas is identical across the two.

- [ ] **Step 6: Manual verification — error state**

Temporarily change `BASE_URL` usage to an unreachable URL to verify the error path renders correctly, without leaving that change in the file:
1. In a scratch browser console on the running page (via `javascript_tool` or by temporarily editing the file), simulate a failed fetch — simplest approach: stop your local network / or temporarily edit `.env`'s `VITE_SNAKE_API_URL` to `https://localhost:9` (an address nothing listens on), restart `npm run dev`, click Start.
2. Confirm the error box renders with the "Connection failed — server may be waking up..." copy and status shows ERROR, and that `[ Start ]` is clickable again (not stuck disabled).
3. Revert `.env`'s `VITE_SNAKE_API_URL` back to `https://web-production-be2c0.up.railway.app` and restart `npm run dev` to confirm normal operation resumes.

- [ ] **Step 7: Commit**

```bash
git add src/pages/demos/SnakeDemo.tsx src/pages/Demo.tsx
git commit -m "$(cat <<'EOF'
feat: add live snake-q-learning demo

Streams /train and /play SSE frames from the deployed FastAPI backend
directly (no worker proxy needed — the API is public with no secrets)
and renders the board on canvas in real time.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Post-plan check (not a task — just confirm before calling this done)

- `npm run build` succeeds locally (catches anything `typecheck` alone might miss, e.g. unused-import issues in strict mode across the whole build).
- The GitHub Actions secret reminder from Task 1 Step 7 has been communicated to the user.
