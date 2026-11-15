# Pokemon Red PPO project page — design

## Intent
Add `pokemon-red-ppo` (https://github.com/objones25/pokemon-red-ppo) to the portfolio. The recorded run9 seed-0
episode is the centrepiece; below it, the page goes in depth on the reward design and how runs 1-9 evolved.

## Goals / non-goals
- Goal: video at the top of the project page, with clickable milestone chapters.
- Goal: reward terms and runs presented as expandable data tables, with narrative in the standard prose sections.
- Non-goal: a custom article-style layout, charts, or a live demo.
- Anti-goal: claims about the runs that the repo's `docs/evidence/` doesn't support.

## Approaches
1. **Standard project page + optional video slot** (chosen): reuses Section/DataTable components; one small new
   type and block. Cheap, consistent with other projects.
2. Custom long-form article page: more room for charts and run-by-run sections, but a one-off layout. Rejected by
   the user in favour of 1.

## Design
- `src/types/index.ts`: `ProjectVideo { src, poster, caption, chapters: { label, timeS }[] }`; `video?: ProjectVideo`
  on `Project`.
- `src/pages/ProjectDetail.tsx`: `ProjectVideoBlock` rendered between header and Overview only when `video` is set.
  `<video controls preload="metadata" playsInline>`, pixelated image rendering, caption noting 24x game speed,
  chapter list (`MM:SS —— Label`) whose buttons seek and play.
- Asset: source MP4 (480x432, 60 fps, 50 MB) re-encoded to a smaller H.264 MP4 with `+faststart`, plus a poster
  frame, in `public/projects/pokemon-red-ppo/`. Root-level source `.mp4`/`.json` stay uncommitted.
- `src/data/projects.ts`: new entry first in the list; overview/challenge/approach/features; **Reward terms** and
  **Runs** tables with detail fields; chapters transcribed from `pokemon_red_run9_seed0.json` with readable labels.

## Verification
`npm run typecheck`, `npm run build`, and a manual check in the dev server (video plays, chapters seek). No test
runner exists in this repo.

## Left to the builder
Exact copy and per-row run detail, sourced from `docs/evidence/run*/` in the pokemon-red-ppo repo.
