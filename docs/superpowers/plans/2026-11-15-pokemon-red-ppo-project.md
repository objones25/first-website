# Pokemon Red PPO Project Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `pokemon-red-ppo` project page whose centrepiece is the run9 seed-0 video with clickable milestone chapters, followed by reward-design and run-history detail.

**Architecture:** One optional `video` field on `Project`, rendered by a `ProjectVideoBlock` in `ProjectDetail.tsx` between header and Overview. Content lives in `src/data/projects.ts` using the existing prose sections and `DataTable` (with `detailFields`).

**Tech Stack:** React 19, TypeScript, Vite, Tailwind 4, framer-motion; ffmpeg for the asset.

**Spec:** `docs/superpowers/specs/2026-11-15-pokemon-red-ppo-project-design.md`

## Global Constraints

- No test runner exists: the gates are `npm run typecheck`, `npm run build`, and a browser check of the dev server.
- Pages without `video` must render exactly as before.
- Every factual claim in copy must trace to `~/Python_Projects/pokemon-red-ppo` (`README.md`, `CLAUDE.md`, `docs/evidence/**`).
- Root-level `pokemon_red_run9_seed0.{mp4,json}` stay uncommitted.
- Site style: mono labels, `MM:SS ——` padded indices, `[ Bracketed ]` controls, ease `[0.16, 1, 0.3, 1]`.

## Review Focus

- Clicking a chapter before the video's metadata loads should still seek (set `currentTime` after `loadedmetadata` if `readyState === 0`) — verified in Task 4.
- Pixel art must stay sharp when scaled up (`image-rendering: pixelated`) — verified in Task 4 by screenshot.
- Phone width: video scales to container width, chapters wrap, no horizontal scroll — Task 4 at 390px.
- `play()` returns a rejected promise if autoplay is blocked; it must not throw an unhandled rejection — Task 2 catches and ignores only `NotAllowedError`.
- Video file size: re-encoded file should be well under 25 MB so GitHub Pages serves it quickly — Task 1.

---

### Task 1: Video asset

**Files:**
- Create: `public/projects/pokemon-red-ppo/run9-seed0.mp4`, `public/projects/pokemon-red-ppo/run9-seed0-poster.png`

- [ ] **Step 1:** Re-encode: `ffmpeg -i pokemon_red_run9_seed0.mp4 -c:v libx264 -preset veryslow -crf 26 -pix_fmt yuv420p -movflags +faststart -an public/projects/pokemon-red-ppo/run9-seed0.mp4` (raise CRF if > 25 MB; keep 480x432, 60 fps).
- [ ] **Step 2:** Poster: grab a recognisable frame (e.g. ~33 s, Brock) as PNG.
- [ ] **Step 3:** Verify: `ffprobe` shows 480x432, ~276.85 s duration; size < 25 MB; poster opens.

### Task 2: Video slot in the project template

**Files:**
- Modify: `src/types/index.ts`, `src/pages/ProjectDetail.tsx`

**Interfaces — Produces:**
```ts
export interface VideoChapter { label: string; timeS: number }
export interface ProjectVideo { src: string; poster: string; caption: string; chapters: VideoChapter[] }
// Project gains: video?: ProjectVideo
```

- [ ] **Step 1:** Add the types above.
- [ ] **Step 2:** Add `function ProjectVideoBlock({ video }: { video: ProjectVideo })` in `ProjectDetail.tsx`, rendered as `<Section label="// Run" ...>` before Overview when `project.video` is set. `<video ref controls preload="metadata" playsInline poster>` styled `w-full border border-border [image-rendering:pixelated]`, caption in mono xs, chapters as `<button>` rows `MM:SS —— Label` that seek and `play()`; mark the chapter whose range contains `currentTime` (via `timeupdate`) with `text-text`.
- [ ] **Step 3:** `npm run typecheck` → no errors.
- [ ] **Step 4:** Commit `feat: optional video slot with chapters on project pages`.

### Task 3: Project content

**Files:**
- Modify: `src/data/projects.ts` (new entry first in array)

**Interfaces — Consumes:** `ProjectVideo` from Task 2.

- [ ] **Step 1:** Read `docs/evidence/run*/` summaries and `CLAUDE.md` reward table in the pokemon-red-ppo repo.
- [ ] **Step 2:** Add the entry: slug `pokemon-red-ppo`, year `2026`, tags `['Python','PyTorch','Reinforcement Learning']`, status `complete`, GitHub link, `hasDemo: false`, `video` with all 20 milestones from the JSON (`timeS` = its `time_s`, readable labels e.g. "Beat Brock", "Got HM01").
- [ ] **Step 3:** Overview / challenge / approach / features prose.
- [ ] **Step 4:** `dataTables`: **Reward terms** (columns term, pays, limit; detail field "why") for all 14 terms; **Runs** (columns run, init, steps, furthest; detail fields "what happened", "what changed next") for run1–run9.
- [ ] **Step 5:** `npm run typecheck && npm run build` → both succeed.
- [ ] **Step 6:** Commit `feat: add pokemon-red-ppo project page` (with Task 1 assets and this spec/plan).

### Task 4: Browser check

- [ ] **Step 1:** `npm run dev`, open `/projects/pokemon-red-ppo`.
- [ ] **Step 2:** Video plays; clicking "Beat Misty" lands at 2:36; active chapter highlights; pixel art sharp.
- [ ] **Step 3:** At 390px width, no horizontal scroll; tables expand; another project page (`/projects/llm-reward`) unchanged.
