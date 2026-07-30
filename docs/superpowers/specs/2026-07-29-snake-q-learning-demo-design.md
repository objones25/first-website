# Snake Q-Learning demo — design

## Scope

Add a new live demo for the `snake-q-learning` project (a tabular Q-learning
Snake agent deployed at `https://web-production-be2c0.up.railway.app`, source
at `github.com/objones25/snake-q-learning`) to the portfolio site. The API
exposes `GET /train` and `GET /play` as Server-Sent Events, one JSON frame
per environment step.

Removing the existing Weather API demo is explicitly **out of scope** for
this work — it stays as-is.

## 1. New project entry

Add to `src/data/projects.ts`:

- `slug`: `'snake-q-learning'`
- `title`: "Snake Q-Learning"
- `tags`: `['Python', 'Reinforcement Learning', 'FastAPI']`
- `year`: `'2026'`
- `status`: `'complete'`
- `links`: `[{ label: 'GitHub', href: 'https://github.com/objones25/snake-q-learning' }]`
- `hasDemo`: `true`
- `overview` / `challenge` / `approach` / `features`: written fresh (not
  copy-pasted from the README), leading with the state-representation
  redesign as the interesting engineering decision — the rotation-invariant,
  distance-bucketed encoding that took the Q-table from 72 states (which
  plateaued at avg score ~21-22) to 1,600 states, and why a bigger table
  fixed the plateau where more training episodes alone didn't. Secondary
  mentions: the strict bottom-up module layering, and `train()`/`play()`
  being generators specifically so `watch.py`'s pygame renderer and this
  API's SSE endpoints can share one implementation of the episode loop
  instead of duplicating it.

## 2. Demo architecture

- New file `src/pages/demos/SnakeDemo.tsx`, registered in
  `src/pages/Demo.tsx`'s `DEMOS` map under key `'snake-q-learning'`.
- New env var `VITE_SNAKE_API_URL` (e.g.
  `https://web-production-be2c0.up.railway.app`), read the same way
  `VITE_WEATHER_API_URL` etc. are. Added to:
  - `.github/workflows/deploy.yml` build-step env (as a secret)
  - `CLAUDE.md`'s list of required root `.env` vars
- **No Cloudflare Worker proxy.** The API's CORS is wide open
  (`allow_origins=["*"]`) with no auth and nothing sensitive server-side, so
  there's no secret to inject and no reason to route through a Worker —
  same reasoning as `BraveSearchDemo`/`GeminiAudioDemo` needing no proxy
  source in this repo. The frontend calls Railway directly.
- Connection is a native `EventSource`, built from `URLSearchParams` against
  `${VITE_SNAKE_API_URL}/train` or `/play`. `onmessage` parses each frame's
  JSON body and updates board + stats state. `onerror` shows a "server may
  be waking up, try again" message (Railway free-tier cold start), matching
  Microagent's WebSocket error copy. There is no explicit terminal
  server-sent event — the stream simply ends (server closes the connection)
  once `n_episodes` completes or the 3000-frame cap is hit; the client
  treats an `onerror` fired *after* frames have already been received as a
  normal end-of-stream, not a failure, and does not show the cold-start
  error copy in that case.

## 3. UI / UX

- Mode toggle: `[ Train ]` / `[ Play ]` pill buttons (same visual pattern as
  `WeatherDemo`'s unit toggle).
- Param controls, all pre-set pill choices (no free-text numeric inputs —
  every value sent to the API is one of these fixed options, so client-side
  422s are not reachable):
  - Both modes: `grid_size` — 10 / 15 / 20 / 30. `fps` — 10 / 30 / 60.
  - Train only: `n_episodes` — 25 / 50 / 100 / 200.
  - Play only: `n_episodes` — 5 / 10 / 25 / 50.
  - Everything else (`alpha`, `gamma`, `epsilon_start/end/decay`,
    `render_every`) stays at API defaults — not exposed.
- `[ Start ]` / `[ Stop ]` button, mirroring Microagent's Run/Cancel: Start
  disabled while a stream is active; Stop closes the `EventSource` and
  resets to idle.
- Live HUD above the board: episode index / total episodes, current score,
  epsilon (Train only — `null` on Play means the field is hidden entirely,
  not shown as "null"), and a pulsing status dot while connected (reusing
  the dot pattern from Microagent's "running" indicator).

## 4. Canvas rendering

- Fixed-size `<canvas>` (480×480 CSS px, scaled for device pixel ratio),
  cell size = `480 / grid_size`. Redrawn imperatively via a `useRef` canvas
  handle and a draw function called from the SSE `onmessage` handler —
  board state is NOT pushed through React re-renders per cell, to avoid
  reconciliation cost at up to 120fps.
- Visual treatment, using existing design tokens:
  - Faint grid lines using the site's border color token.
  - Snake body: filled with `--color-text`.
  - Snake head: visually distinct from the body (inverted fill or a
    brighter shade) so direction/head position reads at a glance.
  - Food: filled with the existing green accent already used for success
    states (`DoneEntry` in `MicroagentDemo.tsx`), since eating is the
    positive event.
  - Death this frame (`reward === -10`): briefly flash the canvas border
    red (reusing the red already used for failure states), then clear.

## 5. Error handling

- No client-side param validation needed (see pill-choice constraint above).
- Connection failure / cold start → inline error message with a
  `[ Retry ]` action that re-enables Start.
- `503` from `/play` (missing committed Q-table — a genuine backend
  misconfiguration, not a client bug) → surfaced verbatim as an error
  state, no special-casing or retry-with-backoff logic.

## Files touched

- `src/pages/demos/SnakeDemo.tsx` (new)
- `src/pages/Demo.tsx` (register in `DEMOS`)
- `src/data/projects.ts` (new project entry)
- `.github/workflows/deploy.yml` (new secret env var)
- `CLAUDE.md` (document `VITE_SNAKE_API_URL` in the env var list, and the
  new demo in the "Worker proxy integration" section as a fourth demo with
  no in-repo proxy)

Weather API demo removal is explicitly not part of this change.
