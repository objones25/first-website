# Archive triage + project pages — design

## Status: active punch list closed out

Started as a 9-project content punch list. Ended as: 1 project fixed
(`snake-q-learning`), 5 moved to archive, 5 deferred pending Owen's own
follow-up work outside this repo, 1 (`llm-from-scratch`) already
reference-quality from before this spec existed. The active list (section
3) is empty — nothing left to interview right now. What follows is a
record of the decisions, not a task list to keep working through.

This is the third of four active specs decomposing a broader "improve the
site" request (the others: Testing + schema refactor, Backend + GitHub
API, Site hygiene). A fifth idea came up during this spec's work — a
blog/learning-notes section — and is queued, not brainstormed here (see
"Queued, not in this spec").

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
  capability; earmarked as material for the future blog/learning-notes
  section (the Karpathy makemore/GPT-from-scratch series), not a flagship
  case study.
- **chess** (commit `fe694e0`) — small-scale, limited demonstration
  capability (a CLI game with no visual evidence and no demo).
- **weather-api** (commit `0e9a805`) — per Owen's own read, more of an
  education project (learning FastAPI/backend API design generally) than
  a case study with a real decision-tradeoff argument, and — same as
  `makemore` — better suited to a future blog post. First archived
  project that had a real demo (`hasDemo: true`); the demo code
  (`WeatherDemo.tsx`, the `weather-proxy` Worker, `VITE_WEATHER_API_URL`)
  stays in the repo unlinked rather than deleted, Owen's explicit call, in
  case it's revived later. `featuredProjects` (`projects.ts:189`,
  `projects.slice(0, 4)`) isn't actually imported/rendered anywhere in
  `src/`, so this didn't silently change what's "featured" on the live
  site — but flagging that if that export ever gets wired up,
  `computer-use-agent` (no demo, deferred — see section 2) would land in
  it by pure position, which is worth a deliberate curation pass, not
  positional slicing, whenever that happens.

7 projects remain in `projects.ts`.

## 2. Deferred / blocked

- **`computer-use-agent`** — deferred at Owen's request. Planning to build
  on it further and wants real demo material (a GIF or video of it
  actually acting) before revisiting the page. Revisit once that exists.
- **`brave-search-agent`** and **`document-scanner`** — both need code
  fixes first, in their own separate repos, not this Website repo.
  Content interviews wait until Owen has made those fixes.
- **`microagent`** — deferred during its own interview. The real gap
  wasn't a missing number, it was that the eval harness's judge has no
  strict criteria for comparing prompt versions, so there's no trustworthy
  number to report yet. Owen's reflection, captured verbatim for whenever
  this gets revisited: *"Update August: If I were to come back to this
  project, I'd build out a more comprehensive evaluation framework with
  more strict criteria regarding which prompt is better — I'd probably
  rely on real benchmarks for coding tasks and use a more comprehensive
  LLM-as-judge component."* He's now leaning toward rebuilding parts of
  the eval harness itself before this page gets touched again.
- **`gemini-audio-agent`** — deferred during its own interview, same
  shape: asked how the dual-socket sync, barge-in handling, and 10-minute
  session cap are actually verified, and the honest answer wasn't there
  yet.

## 3. Active punch list — empty

Nothing active. `snake-q-learning` is done; everything else that was on
the original 9-project list is either archived (section 1) or deferred
(section 2). Re-open this section (or write a fresh punch list) once Owen
has done the follow-up engineering work behind any of section 2's items,
or has new projects to fold in.

## 4. Process, and what was learned running it

Each project's content was meant to get filled via a real interview
following `website-add-project`'s process and `case-study-rules.md` —
asking, not inventing. In practice, most of the punch list resolved a
different way: 3 of the original 9 projects (`microagent`,
`gemini-audio-agent`, and implicitly `weather-api` via Owen's own
reflection) turned out to have gaps in the *projects themselves*, not in
how they were described. Only `snake-q-learning` was a genuine writing
gap that a real interview actually closed.

**Defer-by-default rule**, for any future punch list: if an interview
surfaces that a "how do you know it works" or "what's next" gap is a gap
in the project itself — no real verification exists to report, not just
unreported — defer to section 2 rather than writing content around it.
The tell: a writing gap is about a decision already made that just wasn't
explained; an engineering gap is about something that doesn't actually
exist yet to describe. Only the first kind belongs on an active list.

## Queued, not in this spec

**Blog / learning-notes section.** Owen wants a place for weekly
reflections on what he's been learning (e.g. working through Karpathy's
makemore/GPT-from-scratch series) — content that doesn't fit the
project-case-study format because it's process/learning-focused rather
than a finished, demonstrable thing. This is a genuinely new subsystem
(new route, new content type/data model, likely a new nav entry) and
deserves its own architectural brainstorm — queued as a fifth spec, not
detailed here. `makemore`'s and `weather-api`'s archive cards (section 1)
are natural first cross-references once that section exists.

## Out of scope

- Any further archive-vs-flagship decisions beyond the 5 already made.
- Code fixes inside `brave-search-agent`'s or `document-scanner`'s own
  repos, or rebuilding `microagent`'s eval harness — that's Owen's work in
  those repos, not this spec.
- Deleting `weather-api`'s demo code — left in place per Owen's call.
- The blog/learning-notes section itself — queued above.
- SEO/meta, worker consistency, accessibility, testing/CI — the other
  three specs.
