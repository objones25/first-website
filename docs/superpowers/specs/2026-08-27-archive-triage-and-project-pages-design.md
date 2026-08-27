# Archive triage + project pages — design

## Scope

Two parts. Archive triage is done (see below). Project-pages content
quality is a punch list of specific, per-project gaps found by the
site-audit fork against the `website-add-project` skill's
`case-study-rules.md` standard — not an architecture decision, so this
doc is a map for a sequence of real interviews, not a technical design.

This is the third of four specs decomposing a broader "improve the site"
request (the others: Testing + schema refactor, Backend + GitHub API,
Site hygiene).

## 1. Archive triage — done

Moved to `archive.ts` (commit `b9a06ac`):
- **neural-network-library** — tutorial-derived by its own text
  ("value was in working through the math rather than original design"),
  no distinct novel-decision content; `makemore` covers the same
  "NN fundamentals from scratch" ground with real investigative findings
  (dead-neuron diagnosis, WaveNet-vs-RNN comparison).
- **battleship** — zero verification content, otherwise a fairly standard
  multiplayer-over-sockets shape, despite one real wrinkle
  (JWT-in-httpOnly-cookie vs. Socket.io handshake).

10 projects remain in `projects.ts`. `llm-from-scratch` is already
reference-quality (images, DPO honesty, full tradeoffs narrative — see the
first commit of this session). The other 9 need real content work.

## 2. Per-project punch list

Ordered lightest-to-heaviest lift. Every "what's next" gap is systemic —
not one project in `projects.ts` has one, so it's listed per-project below
rather than called out as a single line item.

| Project | Gaps | Needs a real answer from Owen on |
|---|---|---|
| `snake-q-learning` | No what's-next | What would you change, or what's the obvious next step? |
| `document-scanner` | Numbers are count-only (135+ tests, no coverage/accuracy metric); no what's-next | Do you have an actual accuracy/coverage number, or is "verification = it ran without crashing on N documents" the honest answer? |
| `weather-api` | Tradeoff argument is thin ("chose FastAPI to learn FastAPI" isn't a rejected-alternative argument); no what's-next | What was the actual alternative you didn't take, and what would it have cost you? |
| `microagent` | No quantified eval result despite the whole project being an eval harness; no what's-next | What's the actual before/after judge score or pass-rate number? |
| `brave-search-agent` | Zero verification/result section for an agentic system | How do you actually know it works — tested-query count, citation-accuracy spot-check, anything? |
| `gemini-audio-agent` | Zero verification section | Same question — what did "I checked this works" actually consist of? |
| `chess` | No visual evidence (CLI game); no what's-next | Is a terminal screenshot or a checkmate-sequence GIF feasible, or does this genuinely not need one? |
| `makemore` | No visual evidence despite being literally about training diagnostics (a loss/gradient-flow chart would be the most on-theme addition on the site); no what's-next | Do you have training logs/plots from this project the way `llm-training` had for `llm-from-scratch`, or would a fresh chart need to be generated? |
| `computer-use-agent` | Zero verification/testing mentioned; zero result quantification; no visual evidence | All three at once — heaviest lift. How do you know this actually works, what would a result number even look like for an agent like this, and is a VNC-session screenshot/GIF feasible? |

## 3. Process

Each project's content gets filled via a real interview following
`website-add-project`'s process and `case-study-rules.md` — asking, not
inventing, and pushing back on a first answer if it's generic enough to
paste into any other project unnoticed. Sequenced **one project at a
time**, not batched, so each interview gets the same depth the
`llm-from-scratch` revision did rather than becoming a rushed
fill-in-the-blank pass across 9 projects in one sitting.

For the 3 projects needing new visuals (`makemore`, `chess`,
`computer-use-agent`), the interview also needs to establish whether
source material already exists (training logs, a way to capture a
screenshot/GIF) before committing to adding an image — matching how
`llm-from-scratch`'s images came from real training-run plots, not
generated-for-the-page charts.

## Out of scope

- Any further archive-vs-flagship decisions beyond the 2 already made —
  the remaining 9 projects all have distinct, real content (per the fork
  audit), they need fixing, not demoting.
- SEO/meta, worker consistency, accessibility, testing/CI — the other
  three specs.
