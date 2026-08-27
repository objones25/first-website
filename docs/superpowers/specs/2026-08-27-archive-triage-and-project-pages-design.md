# Archive triage + project pages — design

## Scope

Three parts. Archive triage is done (section 1). A chunk of the original
punch list is now deferred or blocked, not active (section 2). What's left
is a smaller, real interview list, extended to cover demo quality/
interestingness alongside prose (section 3) — not an architecture
decision, so sections 2-3 are a map for a sequence of real interviews, not
a technical design.

This is the third of four active specs decomposing a broader "improve the
site" request (the others: Testing + schema refactor, Backend + GitHub
API, Site hygiene). A fifth idea came up during this spec's revision — a
blog/learning-notes section — and is queued, not brainstormed here (see
"Queued, not in this spec" below).

## 1. Archive triage — done

Moved to `archive.ts`:
- **neural-network-library** (commit `b9a06ac`) — tutorial-derived by its
  own text ("value was in working through the math rather than original
  design"), no distinct novel-decision content; `makemore` covered the
  same "NN fundamentals from scratch" ground with real investigative
  findings.
- **battleship** (commit `b9a06ac`) — zero verification content,
  otherwise a fairly standard multiplayer-over-sockets shape, despite one
  real wrinkle (JWT-in-httpOnly-cookie vs. Socket.io handshake).
- **makemore** (commit `fe694e0`) — small-scale, limited demonstration
  capability; also specifically earmarked as material for the future
  blog/learning-notes section (the Karpathy makemore/GPT-from-scratch
  series), not a flagship case study. Keeping the archive card means it
  stays discoverable via GitHub even before that section exists — a
  future blog post can still reference it.
- **chess** (commit `fe694e0`) — small-scale, limited demonstration
  capability (a CLI game with no visual evidence and no demo).

8 projects remain in `projects.ts`. `llm-from-scratch` is already
reference-quality (images, DPO honesty, full tradeoffs narrative).

## 2. Deferred / blocked — not active right now

- **`computer-use-agent`** — deferred at Owen's request. He's planning to
  build on it further and wants real demo material (a GIF or video of it
  actually acting) before revisiting the page, not a text-only patch now.
  Revisit once that exists.
- **`brave-search-agent`** and **`document-scanner`** — both need code
  fixes first, and those fixes belong in their own separate repos
  (`brave-search-agent`, `document-scanner`), not this Website repo. Content
  interviews for these two wait until Owen has made those fixes.
- **`microagent`** — deferred during its own interview, not preemptively.
  The actual gap turned out deeper than "no number was written down": the
  eval harness's judge has no strict criteria for what makes one prompt
  version better than another, so there isn't a trustworthy number to
  report yet — writing one in now would risk exactly the invented-rigor
  problem `case-study-rules.md` warns against. Owen's reflection, captured
  verbatim for whenever this gets revisited: *"Update August: If I were to
  come back to this project, I'd build out a more comprehensive evaluation
  framework with more strict criteria regarding which prompt is better —
  I'd probably rely on real benchmarks for coding tasks and use a more
  comprehensive LLM-as-judge component."* He's now leaning toward
  rebuilding parts of the eval harness itself before this page gets
  touched again, not just documenting the current gap.

## 3. Active punch list

Status as of this spec's last update. Every "what's next" gap was
systemic — not one project in `projects.ts` had one before this pass.

| Project | Status | Content gaps | Demo/interestingness note |
|---|---|---|---|
| `snake-q-learning` | **Done** (commit `cb89baf`) | Was: no what's-next. Also elevated the safety shield's real weight (42→79 avg score) over the state-encoding fix, which the page previously under-sold. | None — this is the one demo Owen already considers genuinely interesting; used as the bar for the rest. |
| `gemini-audio-agent` | Not started | Zero verification section; no what's-next | — |
| `weather-api` | Not started | Tradeoff argument is thin ("chose FastAPI to learn FastAPI" isn't a rejected-alternative argument); no what's-next | Owen flagged this demo specifically as "not particularly interesting." It's also one of the 4 `featuredProjects` (`projects.slice(0, 4)` in `projects.ts`) — worth deciding during this interview whether it still earns that featured slot once the demo itself is reconsidered, not just whether the copy improves. |

Questions to actually ask (not invent an answer to) per remaining project:
- **Content**: the same `case-study-rules.md` gaps as before — a real
  what's-next line for both; a real answer to "how do you know it works"
  for `gemini-audio-agent`; the actual rejected alternative and its cost
  for `weather-api`.
- **Demo quality** (new, folded in from Owen's feedback): for each demo,
  what would make it more interesting to interact with — is it the
  interaction itself that's flat (nothing to do beyond one input/output),
  the visual presentation, or the underlying capability being
  demonstrated? This may surface actual component-code changes to
  `src/pages/demos/*.tsx`, not just `projects.ts` copy — treat that as an
  acceptable outcome of the interview, not scope creep, since Owen
  explicitly asked for this to be folded in here rather than split out.

## 4. Process

Each project's content gets filled via a real interview following
`website-add-project`'s process and `case-study-rules.md` — asking, not
inventing, pushing back on a first answer if it's generic enough to paste
into any other project unnoticed. Sequenced **one project at a time**, not
batched, so each interview gets the depth the `llm-from-scratch` revision
did rather than becoming a rushed fill-in-the-blank pass.

## Queued, not in this spec

**Blog / learning-notes section.** Owen wants a place for weekly
reflections on what he's been learning (e.g. working through Karpathy's
makemore/GPT-from-scratch series) — content that doesn't fit the
project-case-study format because it's process/learning-focused rather
than a finished, demonstrable thing. This is a genuinely new subsystem
(new route, new content type/data model, likely a new nav entry) and
deserves its own architectural brainstorm — queued as a fifth spec, not
detailed here. `makemore`'s archive card (section 1) is a natural first
cross-reference once that section exists.

## Out of scope

- Any further archive-vs-flagship decisions beyond the 4 already made.
- Code fixes inside `brave-search-agent`'s or `document-scanner`'s own
  repos — that's Owen's work in those repos, not this spec.
- The blog/learning-notes section itself — queued above.
- SEO/meta, worker consistency, accessibility, testing/CI — the other
  three specs.
