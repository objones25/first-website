# Style refactor and quick high-priority fixes — design

Date: 2026-11-20. Branch: `feat/style-refactor` (from `origin/main`).
Source of findings: `website-audit-2026-11-20.md` (repo root, untracked). Section numbers below refer to it.

## Goal

Make owenbeckettjones.com read as a deliberate site for a CS master's student in reinforcement learning and robot learning who is applying for summer 2027 internships, on a phone first. Fix the defects a recruiter hits in the first minute, replace the generic styling choices with measured ones, and narrow the project list to what the owner wants to show.

## Out of scope

- Demo pages (`src/pages/demos/*`, `src/pages/Demo.tsx`) and `workers/`. No edits. They may change appearance only through shared tokens.
- Worker hardening, Clerk scoping, bundle splitting, prerendering, self-hosted fonts.
- The ask-the-site agent, a real toolkit page, a CV file, a photo.
- Skills or hooks to guard copy quality (planned as a follow-up after this lands).
- Adding a test runner. The repo has none; see Verification.

## Decisions

Each is a single token or data value and is cheap to change later.

1. **Accent colour: amber `#FFB200`** (11.0:1 on `#0A0A0A`). Hover `#FFC64D`. Used only for state and emphasis marks: focus ring, `::selection`, the availability dot, the active nav indicator, the primary button, the active video chapter, the expanded-row marker. Never for body text.
2. **Mono face: JetBrains Mono** replaces Space Mono (section 15.4: Space Mono appears on none of 34 reference sites). Sans stays Inter. Fonts stay on Google Fonts.
3. **Display type:** Inter weight 500, tracking -0.04em, fluid size with a 40px minimum (was weight 300, -0.03em, 56px minimum).
4. **Text floor is 12px.** No text renders below `0.75rem`.
5. **Greys:** keep `text` `#E8E8E4` and `text-muted` `#A8A8A4`. Redefine `text-dim` from `#2A2A2A` (1.38:1, invisible) to `#7B7B78` (about 4.7:1) so every existing `text-text-dim` use becomes readable, including the demos, without touching them.
6. **Entrance animation plays once per browser session**, on the first page viewed. Later navigations show content immediately. No route exit animation.
7. **Project triage** (owner decisions, sections 2 and 11): main list is Pokemon Red PPO, SO-101 arm (placeholder), Deep Retrieval (placeholder), LLM From Scratch, Agent Skills (placeholder). Archived with their pages and demos still reachable: Snake Q-Learning, Microagent, LLM Response Classifier, Computer Use Agent, Document Scanner, Brave Search Agent, Gemini Audio Agent. Old GitHub-only archive entries pruned to Shorelark, Custom Vector, Sudoku Solver, Neural Network Library.
8. **Contact stays a page**; it and About read from one profile data file.

## Design tokens (`src/index.css`)

```
--color-background: #0A0A0A      (unchanged)
--color-surface: #141414         (unchanged)
--color-surface-raised: #1C1C1C  (unchanged)
--color-text: #E8E8E4            (unchanged)
--color-text-muted: #A8A8A4      (unchanged)
--color-text-dim: #7B7B78        (was #2A2A2A)
--color-border: rgba(255,255,255,0.08)         (was 0.07)
--color-border-strong: rgba(255,255,255,0.14)  (was 0.12)
--color-accent: #FFB200
--color-accent-hover: #FFC64D
--font-sans: 'Inter', system-ui, -apple-system, sans-serif
--font-mono: 'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace
```

Utility classes:

| Class | Value |
|---|---|
| `.display` | `font-size: clamp(2.5rem, 1.2rem + 5.5vw, 5.5rem)`; weight 500; `letter-spacing: -0.04em`; `line-height: 1` |
| `.heading-lg` | `font-size: clamp(1.75rem, 1.3rem + 2vw, 2.5rem)`; weight 500; `letter-spacing: -0.02em`; `line-height: 1.1` |
| `.lead` (new) | `font-size: clamp(1.125rem, 1rem + 0.6vw, 1.375rem)`; `line-height: 1.5`; colour `text-muted` |
| `.mono` | `font-size: 0.75rem`; `letter-spacing: 0.04em`; `font-variant-numeric: tabular-nums slashed-zero` |
| `.mono-lg` | `font-size: 0.875rem`; `letter-spacing: 0.02em` |
| `.section-label` | mono; `font-size: 0.75rem`; `letter-spacing: 0.08em`; uppercase; colour `text-muted` |

Base rules:
- `h1, h2, h3, .display, .heading-lg { text-wrap: balance }`; `p { text-wrap: pretty }`.
- `:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 3px; border-radius: 2px }`.
- `::selection { background: var(--color-accent); color: var(--color-background) }`.
- `html { scrollbar-gutter: stable }`.
- `@media (prefers-reduced-motion: reduce)`: all CSS animations and transitions off.
- Remove the marquee and card-marquee rules (their markup is deleted).
- The undefined `.label` class is not defined; its uses are replaced with `section-label`.

## Head (`index.html`, `public/`)

- `<title>Owen Jones · Reinforcement learning and robot learning</title>`
- Description: `CS master's student at UC Santa Barbara working on reinforcement learning and robot learning. Open to summer 2027 internships.`
- `og:type=website`, `og:title`, `og:description`, `og:url=https://owenbeckettjones.com/`, `og:image=https://owenbeckettjones.com/projects/pokemon-red-ppo/run9-seed0-poster.png`; `twitter:card=summary`.
- `<link rel="canonical" href="https://owenbeckettjones.com/">`.
- `theme-color` `#0A0A0A`; `<meta name="color-scheme" content="dark">`.
- Fonts: Inter 400/500/600 and JetBrains Mono 400/500, `display=swap`; preconnect to both `fonts.googleapis.com` and `fonts.gstatic.com`.
- `public/favicon.svg`: a 32x32 SVG, background `#0A0A0A`, the letters `OJ` in `#FFB200`. Linked with `rel="icon" type="image/svg+xml"`.
- `public/robots.txt` (allow all, sitemap line) and `public/sitemap.xml` listing `/`, `/about`, `/projects`, `/archive`, `/contact` and every `/projects/<slug>`.

Per-route titles: a `useDocumentMeta(title, description?)` hook sets `document.title` to `<title> · Owen Jones` and updates the description meta tag. Home passes the full default title.

## Motion

- `src/lib/entrance.ts` owns the once-per-session flag. Storage key `entrance-played` in `sessionStorage`. If storage is unavailable the entrance simply plays (it is cosmetic).
- `RootLayout` marks the flag 1200ms after first mount, so the first page's own children finish animating.
- Two shared components replace hand-written `motion.*` entrances: `Reveal` (fade plus 8px rise, 0.3s) and `ClipReveal` (heading clip reveal, 0.5s). When the flag is set they render with `initial={false}`.
- Easing stays `[0.16, 1, 0.3, 1]`. No delay exceeds 0.24s.
- `PageTransition` keeps a 0.2s fade-in on first entrance only and has no `exit`. `AnimatePresence` is removed from `RootLayout`.
- `<MotionConfig reducedMotion="user">` wraps the app. `src/hooks/useReducedMotion.ts` is deleted.

## Data model

`src/types/index.ts`:
- `Project` gains `tagline?: string` (140 characters or fewer; used on cards and under the page title), `results?: ProjectResult[]`, `period?: string`, `archived?: boolean`.
- `ProjectResult = { value: string; label: string }`.
- `Project.status` gains `'paused'`.
- `ProjectVideo` gains `speedLabel?: string`.

`src/data/projects.ts` exports `projects` (all, active first), `activeProjects`, `archivedProjects`. `featuredProjects` is removed (unused).

`src/data/profile.ts` (new) is the single source for name, role line, location, availability, email, external links, an optional CV link, now-items, courses and teaching. Home, About, Contact and Footer read from it.

Facts allowed in copy come only from the owner: applied math degree from UCLA; first-year CS master's student at UC Santa Barbara; Fall 2026 CMPSC 291A (information retrieval), CMPSC 291K (robot learning), CMPSC 279 (advanced topics in security), TA for Math 34B; Winter 2027 CMPSC 211B (numerical simulation), CMPSC 225 (information theory), CMPSC 270 (operating systems), CMPSC 595N (research seminar), TA for Math 4B; interests in reinforcement learning and robot learning; building an SO-101 arm (follower printed, leader not yet); open to summer 2027 internships; Santa Barbara, CA. No lab, advisor, CV, photo or reply time is stated anywhere. Course codes use the `CMPSC` prefix.

Placeholders say what exists and nothing more:
- **SO-101 arm:** in progress; follower printed, leader next; plan is teleoperation, a demonstration dataset, then an imitation-learning policy with a measured success rate. No results claimed.
- **Deep Retrieval:** CMPSC 291A final project, a three-person team; reproduces DeepRetrieval (arXiv 2503.00223) and asks how much of its BM25 gain comes from repeated query terms; training runs pending. No results claimed, no teammate names.
- **Agent Skills:** a public collection of Claude Code skills at `https://github.com/objones25/my-skills`, each with scripts, tests and an audit trail; a fuller page is planned. No eval numbers.

## Pages

**Home (phone first).** Left-aligned. `h1` "Owen Jones" in `.display`; one lead sentence; an availability line with the accent dot; two buttons (View work, Email); a featured block for Pokemon Red PPO with its poster image, tagline and results; then the active projects as a vertical list. Removed: the centred `OWEN //JONES`, the discipline list, "SCROLL TO BEGIN", the horizontal card strip and drag-scroll, the hover ticker, the marquee.

**Projects.** Lists `activeProjects`. Rows stack to one column below `md`. Shares a `ProjectRow` component with Home.

**Archive.** Archived projects first (internal links to their pages; a "demo" marker where `hasDemo`), then the pruned GitHub-only entries. Same stacking rule.

**Project detail.**
- Header stacks below `md`: title, tagline, then links. Nothing is `shrink-0` beside the title on a phone.
- Results strip above the fold when `results` exists.
- Overview, Challenge, Approach and Key Features render only when present. The `Placeholder` component is removed.
- GitHub stats omit stars when 0 and open issues when 0.
- Status shows with a dot; it is visually distinct from the stack tags.
- Chapters: one list; a horizontally scrolling row of 44px-tall buttons below `lg`, the current vertical list from `lg` up; the active chapter uses the accent.
- Video: optional speed label overlaid top-right; `max-h-[75dvh]`.
- Figures link to the full-size file in a new tab.
- Archived projects: back link goes to `/archive`, the index label reads `// Archive`, prev/next stay within the archived group.

**About (full rewrite).** Single column on phones; two columns from `md`. Order: heading and lead; Now panel with a "last updated" date; coursework and teaching table; background; outside work; facts list (location, open to, email, links, CV when present). The reading list and its height-matching code are deleted.

**Contact (full rewrite).** Headline with the internship ask; the email as a full-width button on phones; link rows; CV row when present. One screen on a phone.

**Navbar and Footer.** Header 56px; every link at least 44px tall; active item marked with the accent. Footer shows the name, links from the profile, and no job title.

**Router.** A `path: '*'` route renders `NotFound` inside the layout.

## Acceptance

1. `npm run typecheck` and `npm run build` pass.
2. At 360, 390 and 430px wide, `documentElement.scrollWidth === clientWidth` on `/`, `/about`, `/contact`, `/projects`, `/archive`, `/projects/pokemon-red-ppo`, `/projects/llm-from-scratch`, `/projects/snake-q-learning`.
3. No computed font size below 12px on those pages.
4. Nav links, hero buttons and chapter buttons are at least 44px tall at 390px.
5. An unknown URL renders the site's NotFound page with the navbar.
6. Entrance animation plays on first load of a session and not on later in-site navigation.
7. `rg "text-\[0\.6|Space Mono|marquee|className=\"label|featuredProjects|useReducedMotion" src index.html` returns nothing.
8. No file under `src/pages/demos/`, `src/pages/Demo.tsx` or `workers/` is modified.
9. `CLAUDE.md` describes the new structure.

## Verification

There is no test runner, and adding one is out of scope, so this change is not test-first. Each task is checked with typecheck, build and the greps above. Acceptance items 2-6 are measured in a browser at the end, against a local preview build started with a placeholder Clerk key. If the app will not render without a real key, those items are reported as unverified, not assumed.
