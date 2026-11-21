# Style Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the portfolio for phones first, fix the first-minute defects, and narrow the project list, without touching demos or workers.

**Architecture:** Tokens and utilities change in `src/index.css`; a small motion layer (`entrance.ts`, `Reveal`, `ClipReveal`) replaces per-page entrance code; project and profile content stay as typed data in `src/data/`; pages are rewritten or adjusted to consume them.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS 4 (`@theme` in `src/index.css`, no config file), framer-motion 12, react-router-dom.

**Spec:** `docs/superpowers/specs/2026-11-20-style-refactor-design.md`

## Global Constraints

- Do not modify anything under `src/pages/demos/`, `src/pages/Demo.tsx`, or `workers/`.
- No new dependencies. No test runner exists; do not add one. Do not run `npm test` or `npm run lint` (neither exists).
- Every task ends with `npm run typecheck` and `npm run build` both passing.
- No text below 12px: never use `text-[0.6…rem]`, `text-[10px]`, `text-[11px]` or any size under `0.75rem`.
- Never put anything `shrink-0` or `whitespace-nowrap` beside a heading below the `md` breakpoint. Phone layout is the default; wider layouts are added with `md:` / `lg:`.
- Interactive elements (links styled as buttons, nav links, chapter buttons) are at least 44px tall: `inline-flex min-h-11 items-center`.
- Never hide content until hover.
- The accent (`text-accent`, `bg-accent`, `border-accent`) is for state and emphasis marks only, never body text.
- Course codes use the `CMPSC` prefix. Copy states only the facts listed in the spec's "Facts allowed in copy". No em dashes in new copy; no invented numbers, employers, labs or dates.
- The owner's contact address is never typed out by an implementer. It already exists as a string literal in `src/pages/Contact.tsx`; Task 3 moves that literal into `src/data/profile.ts` and every other file reads `profile.email`.
- Keep the terminal idiom already in the code: `// Section labels`, `[ Bracketed buttons ]`, zero-padded indices.
- Path alias `@/` maps to `src/`. Follow the surrounding code style; do not reformat untouched code.
- Commit at the end of each task with a Conventional Commits message ending in the line `Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>`. Stage only files the task names; never `git add -A` or `git add .` (the repo root has unrelated untracked files and a modified `.DS_Store`). Do not push.

## Review Focus

1. **Phone overflow from long unbroken content** (a long project title, a long tag list, a URL in a facts list): nothing may widen the page at 360px. Owned by Tasks 5, 6, 7, 8.
2. **A project with only `description`, `tagline` and `overview`** (the three placeholders): the detail page must render cleanly with no empty section headings. Owned by Task 6.
3. **Entrance flag when `sessionStorage` throws** (private mode, storage disabled): the site must still render and animate. Owned by Task 2.
4. **Archived project reached by direct URL or via prev/next:** correct back link, never mixes into the active sequence. Owned by Task 6.
5. **`profile.cvHref` undefined:** no empty row, no dead link, on About, Contact and Footer. Owned by Tasks 4 and 8.

---

### Task 1: Tokens, typography and document head

**Files:**
- Modify: `src/index.css`
- Modify: `index.html`
- Create: `public/favicon.svg`, `public/robots.txt`, `public/sitemap.xml`

**Interfaces:**
- Produces: Tailwind colour utilities `text-accent`, `bg-accent`, `border-accent`, `bg-accent-hover`; classes `.display`, `.heading-lg`, `.lead`, `.mono`, `.mono-lg`, `.section-label`, `.clip`, `.scroll-hide`. The marquee classes (`.marquee-track`, `.card-marquee`, `.card-marquee-wrap`) are NOT removed in this task; Task 7 removes them with their markup.

- [ ] **Step 1: Replace the `@theme` block values** with exactly:

```css
@theme {
  --color-background: #0A0A0A;
  --color-surface: #141414;
  --color-surface-raised: #1C1C1C;
  --color-text: #E8E8E4;
  --color-text-muted: #A8A8A4;
  --color-text-dim: #7B7B78;
  --color-border: rgba(255, 255, 255, 0.08);
  --color-border-strong: rgba(255, 255, 255, 0.14);
  --color-accent: #FFB200;
  --color-accent-hover: #FFC64D;

  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace;
}
```

- [ ] **Step 2: Update the utilities** to the values in the spec's utility table (`.display`, `.heading-lg`, new `.lead`, `.mono`, `.mono-lg`, `.section-label`). Leave `.clip` and `.scroll-hide` unchanged.

- [ ] **Step 3: Add the base rules** from the spec: `text-wrap` balance/pretty, `:focus-visible` ring, `::selection` in accent, `html { scrollbar-gutter: stable }`, and

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 4: Rewrite the `<head>` of `index.html`** per the spec's Head section (title, description, Open Graph, twitter card, canonical, `theme-color` `#0A0A0A`, `color-scheme`, both preconnects, font URL `https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap`, favicon link). Keep the inline GitHub Pages redirect script and the body exactly as they are.

- [ ] **Step 5: Create `public/favicon.svg`** (32x32, `#0A0A0A` square, `OJ` in `#FFB200`, monospace, centred), `public/robots.txt` (`User-agent: *`, `Allow: /`, `Sitemap: https://owenbeckettjones.com/sitemap.xml`) and `public/sitemap.xml` with these URLs under `https://owenbeckettjones.com`: `/`, `/about`, `/projects`, `/archive`, `/contact`, `/projects/pokemon-red-ppo`, `/projects/so101-arm`, `/projects/deep-retrieval`, `/projects/llm-from-scratch`, `/projects/agent-skills`, `/projects/snake-q-learning`, `/projects/microagent`, `/projects/llm-reward`, `/projects/computer-use-agent`, `/projects/document-scanner`, `/projects/brave-search-agent`, `/projects/gemini-audio-agent`.

- [ ] **Step 6: Verify**

Run: `npm run typecheck && npm run build`
Expected: both succeed.
Run: `grep -c "FFB200" src/index.css; grep -c "Space Mono" src/index.css index.html`
Expected: first count ≥ 1; `Space Mono` counts are 0 in both files.
Run: `ls dist/favicon.svg dist/robots.txt dist/sitemap.xml`
Expected: all three exist.

- [ ] **Step 7: Commit** `feat: new design tokens, type scale and document head`

---

### Task 2: Motion layer, router catch-all and document titles

**Files:**
- Create: `src/lib/entrance.ts`, `src/components/motion/Reveal.tsx`, `src/hooks/useDocumentMeta.ts`
- Modify: `src/components/layout/RootLayout.tsx`, `src/components/layout/PageTransition.tsx`, `src/main.tsx`, `src/pages/NotFound.tsx`
- Delete: `src/hooks/useReducedMotion.ts`

**Interfaces:**
- Produces:
  - `src/lib/entrance.ts`: `export function hasEntrancePlayed(): boolean`, `export function markEntrancePlayed(): void`, `export const EASE = [0.16, 1, 0.3, 1] as const`.
  - `src/components/motion/Reveal.tsx`: `export function Reveal(props: { children: React.ReactNode; delay?: number; className?: string; inView?: boolean })` and `export function ClipReveal(props: { children: React.ReactNode; as?: 'h1' | 'h2' | 'span'; delay?: number; className?: string })`.
  - `src/hooks/useDocumentMeta.ts`: `export function useDocumentMeta(title: string, description?: string): void`, plus `export const SITE_TITLE = 'Owen Jones · Reinforcement learning and robot learning'`.

- [ ] **Step 1: `entrance.ts`.** Module-level boolean initialised from `sessionStorage.getItem('entrance-played') === '1'`; `markEntrancePlayed` sets the boolean and writes `'1'`. Wrap both storage calls in `try/catch`: on failure the read yields `false` and the write is skipped. Add a one-line comment saying why (storage can throw in private mode; the entrance is cosmetic, so playing it again is the right degradation).

- [ ] **Step 2: `Reveal` and `ClipReveal`.** Each reads `hasEntrancePlayed()` once per mount (`useState(() => !hasEntrancePlayed())`) into `play`.
  - `Reveal`: a `motion.div`. When `play`: `initial={{ opacity: 0, y: 8 }}`, target `{ opacity: 1, y: 0 }`, `transition={{ duration: 0.3, delay, ease: EASE }}`; with `inView` the target goes on `whileInView` with `viewport={{ once: true, margin: '-40px' }}`, otherwise on `animate`. When not `play`: `initial={false}` and the target on `animate`. `delay` defaults to 0 and is clamped with `Math.min(delay, 0.24)`.
  - `ClipReveal`: outer `<span className="clip block">`, inner `motion[as]` (default `'span'`) with `className` plus `block`; when `play`, `initial={{ y: '105%' }}` → `animate={{ y: '0%' }}`, `transition={{ duration: 0.5, delay, ease: EASE }}`; otherwise `initial={false}`.

- [ ] **Step 3: `PageTransition`.** Fade in over 0.2s only when the entrance has not played; otherwise `initial={false}`. Remove `exit`.

- [ ] **Step 4: `RootLayout`.** Remove `AnimatePresence`. Keep `<main key={location.pathname}>` and change its classes to `min-h-dvh pt-14`. Add an effect that runs once on mount and calls `markEntrancePlayed()` after 1200ms, clearing the timer on unmount. Add a second effect that calls `window.scrollTo(0, 0)` whenever `location.pathname` changes.

- [ ] **Step 5: `main.tsx`.** Wrap `<RouterProvider>` in `<MotionConfig reducedMotion="user">` (import from `framer-motion`). Add `{ path: '*', element: <NotFound /> }` as the last child of the `RootLayout` route. Leave `errorElement` and everything Clerk-related unchanged.

- [ ] **Step 6: `useDocumentMeta`.** In an effect: set `document.title` to `title === SITE_TITLE ? SITE_TITLE : \`${title} · Owen Jones\``; if `description` is given, set the `content` of `meta[name="description"]`. The meta tag exists in `index.html` after Task 1; if it is missing, throw `new Error('meta description tag missing from index.html')` (a broken invariant, not a case to paper over).

- [ ] **Step 7: `NotFound`.** Replace `label` with `section-label`; call `useDocumentMeta('Page not found')`; make the home link `inline-flex min-h-11 items-center`.

- [ ] **Step 8: Delete `src/hooks/useReducedMotion.ts`.**

- [ ] **Step 9: Verify**

Run: `npm run typecheck && npm run build`
Expected: both succeed.
Run: `grep -rn "AnimatePresence\|useReducedMotion" src | wc -l`
Expected: `0`.
Run: `grep -n "path: '\*'" src/main.tsx`
Expected: one match.

- [ ] **Step 10: Commit** `feat: once-per-session entrance, catch-all route and per-route titles`

---

### Task 3: Data model, profile data and project triage

**Files:**
- Modify: `src/types/index.ts`, `src/data/projects.ts`, `src/data/archive.ts`, `src/pages/ProjectDetail.tsx` (status label map only)
- Create: `src/data/profile.ts`

**Interfaces:**
- Produces:
  - Types: `ProjectResult { value: string; label: string }`; `Project` gains `tagline?: string`, `results?: ProjectResult[]`, `period?: string`, `archived?: boolean`; `Project['status']` is `'active' | 'stable' | 'complete' | 'planned' | 'paused'`; `ProjectVideo` gains `speedLabel?: string`.
  - `src/data/projects.ts`: `projects: Project[]`, `activeProjects: Project[]`, `archivedProjects: Project[]`.
  - `src/data/profile.ts`: `export const profile` with the shape in Step 3, and exported types `Course`, `Term`, `ProfileLink`.

- [ ] **Step 1: Types.** Add the fields above. Above `tagline`, comment: `// <= 140 characters; shown on cards and under the page title`.

- [ ] **Step 2: Status label.** In `src/pages/ProjectDetail.tsx` add `paused: 'Paused'` to `statusLabel`. Change nothing else in that file.

- [ ] **Step 3: `src/data/profile.ts`** with exactly this shape and these values. For `email`, copy the address string literal that is currently hard-coded in `src/pages/Contact.tsx` (it appears after `mailto:`); do not change `Contact.tsx` in this task.

```ts
export interface ProfileLink { label: string; href: string }
// title is '' when the owner has not supplied one; consumers omit an empty title
export interface Course { code: string; title: string; role: 'Student' | 'TA' }
export interface Term { term: string; courses: Course[] }

export const profile = {
  name: 'Owen Jones',
  lead: "CS master's student at UC Santa Barbara working on reinforcement learning and robot learning.",
  availability: 'Open to summer 2027 internships',
  location: 'Santa Barbara, CA',
  email: '<the literal from Contact.tsx>',
  links: [
    { label: 'GitHub', href: 'https://github.com/objones25' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/owenbeckettjones/' },
  ] as ProfileLink[],
  // Set to a URL (e.g. '/owen-jones-cv.pdf') once a CV exists. While undefined,
  // no CV row or link renders anywhere.
  cvHref: undefined as string | undefined,
  nowUpdated: '2026-11-20',
  now: [
    'Building an SO-101 robot arm. The follower is printed; the leader is next.',
    'CMPSC 291A final project: reproducing DeepRetrieval, a query rewriter trained with reinforcement learning.',
    'Teaching assistant for Math 34B.',
  ],
  terms: [
    {
      term: 'Fall 2026',
      courses: [
        { code: 'CMPSC 291A', title: 'Information Retrieval', role: 'Student' },
        { code: 'CMPSC 291K', title: 'Robot Learning', role: 'Student' },
        { code: 'CMPSC 279', title: 'Advanced Topics in Security', role: 'Student' },
        { code: 'MATH 34B', title: '', role: 'TA' },
      ],
    },
    {
      term: 'Winter 2027',
      courses: [
        { code: 'CMPSC 211B', title: 'Numerical Simulation', role: 'Student' },
        { code: 'CMPSC 225', title: 'Information Theory', role: 'Student' },
        { code: 'CMPSC 270', title: 'Operating Systems', role: 'Student' },
        { code: 'CMPSC 595N', title: 'Research Seminar', role: 'Student' },
        { code: 'MATH 4B', title: '', role: 'TA' },
      ],
    },
  ] as Term[],
}
```

- [ ] **Step 4: `projects.ts` — existing entries.**
  - `pokemon-red-ppo`: add `tagline: 'A PPO agent for Pokemon Red that beats two gyms and gets HM01 in 63 of 64 frozen episodes.'`; `results: [{ value: '63 / 64', label: 'frozen episodes reach HM01' }, { value: '400M', label: 'environment steps in the final run' }, { value: '9', label: 'training runs, each audited' }]`; `speedLabel: '24x'` inside `video`. In `description` change `from pixels on the PyBoy emulator` to `on the PyBoy emulator from screen pixels and game state`. In `approach` delete the sentence `The core is pure.` (the following sentence, which starts `Emulator memory is parsed once per step`, stays as is). In `features` fix `a median of 18 each, In 64 frozen episodes` to `a median of 18 each. In 64 frozen episodes`.
  - `llm-from-scratch`: add `tagline: 'A 478M-parameter transformer language model trained from scratch on one rented GPU.'`. Add `results` with `{ value: '478M', label: 'parameters' }` and, only if the string `9.7B` appears in this entry's own text, `{ value: '9.7B', label: 'training tokens' }`.
  - `llm-reward`: `status: 'paused'`, `archived: true`.
  - `snake-q-learning`, `microagent`, `computer-use-agent`, `document-scanner`, `brave-search-agent`, `gemini-audio-agent`: add `archived: true`. Set `brave-search-agent` to `status: 'complete'`.
  - Give every archived entry a `tagline`: its existing `description` if that is 140 characters or fewer, otherwise a shortened version of the same sentence that adds no new claim and uses no em dash.
  - Change no other prose in any entry.

- [ ] **Step 5: `projects.ts` — three placeholders.** Insert so the array order is: `pokemon-red-ppo`, `so101-arm`, `deep-retrieval`, `llm-from-scratch`, `agent-skills`, then the archived entries in their current relative order. Each placeholder has only these fields:

```ts
{
  slug: 'so101-arm',
  title: 'SO-101 Robot Arm',
  tagline: 'Building a 3D-printed SO-101 arm to train imitation-learning policies on real hardware.',
  description: 'An open-hardware SO-101 leader and follower arm, built to collect teleoperated demonstrations and train manipulation policies with LeRobot. In progress.',
  year: '2026',
  tags: ['Robotics', 'Imitation Learning', 'LeRobot'],
  status: 'active',
  overview: 'In progress. The follower arm is printed and the leader arm is next. The plan is teleoperation first, then a recorded demonstration dataset, then an imitation-learning policy with a success rate measured over repeated trials, including the failures. This page will be filled in as each step produces something to show.',
  links: [{ label: 'Hardware', href: 'https://github.com/TheRobotStudio/SO-ARM100' }],
},
{
  slug: 'deep-retrieval',
  title: 'Deep Retrieval',
  tagline: 'Does an RL-trained query rewriter win on BM25 by repeating words? A CMPSC 291A project.',
  description: 'A three-person CMPSC 291A final project that reproduces DeepRetrieval, a language model trained with PPO to rewrite search queries, and tests how much of its BM25 gain comes from repeated query terms. In progress.',
  year: '2026',
  tags: ['Python', 'PyTorch', 'Reinforcement Learning', 'Information Retrieval'],
  status: 'active',
  overview: 'In progress. BM25 as implemented in Pyserini scores a term once for every time it appears in the query, so a rewriter can raise its score by repeating words. The experiment trains the same model twice, once rewarded by normal BM25 and once by a version that counts each query term once, then scores both models under both. The training runs have not finished, so there are no results here yet.',
  links: [{ label: 'Paper', href: 'https://arxiv.org/abs/2503.00223' }],
},
{
  slug: 'agent-skills',
  title: 'Agent Skills',
  tagline: 'Claude Code skills I wrote and use daily, each with scripts, tests and an audit of its own claims.',
  description: 'A public collection of Claude Code skills for testing, agent design, PyTorch and robot learning. Each ships runnable scripts, a test suite and a record of what was checked against sources and what was not.',
  year: '2026',
  tags: ['Claude Code', 'Python', 'Tooling'],
  status: 'active',
  overview: 'A fuller page is planned. For now the repository is the best place to look: each skill directory has its instructions, scripts, tests, a changelog and an audit file listing which claims were verified and which were not.',
  links: [{ label: 'GitHub', href: 'https://github.com/objones25/my-skills' }],
},
```

- [ ] **Step 6: `projects.ts` — exports.** Remove `featuredProjects`. Add `export const activeProjects = projects.filter(p => !p.archived)` and `export const archivedProjects = projects.filter(p => p.archived)`.

- [ ] **Step 7: `archive.ts`.** Delete the entries titled `Browserbase Agent`, `Gemini Chat Agent`, `YouTube Transcript MCP Server`, `MCP Research Tool`, `Battleship`, `Makemore`, `Chess`, `Weather API`. Keep `Shorelark`, `Custom Vector`, `Sudoku Solver`, `Neural Network Library` unchanged.

- [ ] **Step 8: Verify**

Run: `npm run typecheck && npm run build`
Expected: both succeed.
Run: `grep -c "archived: true" src/data/projects.ts`
Expected: `7`.
Run: `grep -c "^    title: '" src/data/archive.ts`
Expected: `4`.
Run: `grep -c "tagline:" src/data/projects.ts`
Expected: `12`. Then confirm by reading that every tagline is 140 characters or fewer and report the longest length.

- [ ] **Step 9: Commit** `feat: project triage, placeholders, results fields and profile data`

---

### Task 4: Navbar and Footer

**Files:**
- Modify: `src/components/layout/Navbar.tsx`, `src/components/layout/Footer.tsx`

**Interfaces:**
- Consumes: `profile` from `@/data/profile` (`name`, `email`, `links`, `cvHref`).

- [ ] **Step 1: Navbar.** Inner row height `h-14`. Logo link, each nav link and the sign-in link get `inline-flex min-h-11 items-center` and `px-1`; gaps become `gap-3 sm:gap-8` so everything fits at 360px with at least 8px between targets. The active nav link keeps `text-text` and gains `underline decoration-accent decoration-2 underline-offset-8`; a link is active when `pathname === href` or `pathname.startsWith(href + '/')`. Add `aria-label="Primary"` to `<nav>` and `aria-current="page"` to the active link. Keep the Clerk `useAuth` / `UserButton` logic unchanged.

- [ ] **Step 2: Footer.** Left: `© {year} {profile.name}`. Right: a row of links (a `mailto:` link built from `profile.email` labelled `Email`, each `profile.links` entry opening in a new tab with `rel="noopener noreferrer"`, and `CV` only when `profile.cvHref` is set), each `inline-flex min-h-11 items-center mono text-text-muted hover:text-text`. Stack the two sides vertically below `sm`. Remove the "Software Engineer" text. Change `mt-32` to `mt-24`.

- [ ] **Step 3: Verify**

Run: `npm run typecheck && npm run build`
Expected: both succeed.
Run: `grep -c "Software Engineer" src/components/layout/Footer.tsx; grep -c "min-h-11" src/components/layout/Navbar.tsx`
Expected: `0`, then a count ≥ 3.

- [ ] **Step 4: Commit** `feat: phone-sized nav targets and profile-driven footer`

---

### Task 5: Projects list and Archive

**Files:**
- Create: `src/components/ProjectRow.tsx`
- Modify: `src/pages/Projects.tsx`, `src/pages/Archive.tsx`

**Interfaces:**
- Consumes: `activeProjects`, `archivedProjects` from `@/data/projects`; `archiveProjects` from `@/data/archive`; `Reveal`, `ClipReveal` from `@/components/motion/Reveal`; `useDocumentMeta` from `@/hooks/useDocumentMeta`.
- Produces: `export function ProjectRow(props: { project: Project; index: number; showDemoMarker?: boolean })` — a `Link` to `/projects/${slug}`; `index` is the 1-based number displayed. Task 7 reuses it on Home.

- [ ] **Step 1: `ProjectRow`.** Phone layout (default): a single column — index and year on one mono line, title (`text-lg font-medium`), `project.tagline ?? project.description` in `text-sm text-text-muted`, then tags wrapping below, then `GithubStatsBadge`. From `md`: `md:grid md:grid-cols-[3rem_1fr_auto] md:gap-6` with the index in column 1, text in column 2, tags right-aligned in column 3 with `md:max-w-56`. Row: `block py-6 -mx-4 px-4 hover:bg-surface transition-colors duration-150`. Text column needs `min-w-0`; title needs `break-words`. When `showDemoMarker && project.hasDemo`, show a mono `demo` tag with `border-accent text-text`. Tags are `mono text-text-muted border border-border px-2 py-0.5`.

- [ ] **Step 2: `Projects.tsx`.** Render `activeProjects` with `ProjectRow` inside a `divide-y divide-border` list. Header uses `ClipReveal` for the `section-label` ("Work") and the `h1` ("Projects", `heading-lg`). Wrap the list in one `Reveal delay={0.1}` (no per-row stagger). Keep the archive link, restyled `inline-flex min-h-11 items-center`, text `// Archive: earlier work →`. Call `useDocumentMeta('Projects', 'Projects in reinforcement learning, robot learning and language models.')`. Remove all direct `motion` usage and the `label` class.

- [ ] **Step 3: `Archive.tsx`.** Two groups under `<h2 className="section-label">` headings: `// Project pages` (the `archivedProjects`, each a `ProjectRow` with `showDemoMarker`) and `// Repositories` (the remaining `archiveProjects`, keeping their external links and current content, restyled with the same stacked-below-`md` layout as `ProjectRow`). Replace the page's intro paragraph with: `Earlier projects. Most are API integrations and tutorial-scale builds from before I moved to reinforcement learning. Pages and demos still work.` Use `ClipReveal`/`Reveal` as in Step 2; no direct `motion` usage; no `label` class. Call `useDocumentMeta('Archive', 'Earlier projects.')`.

- [ ] **Step 4: Verify**

Run: `npm run typecheck && npm run build`
Expected: both succeed.
Run: `grep -n "from 'framer-motion'\|className=\"label\|grid-cols-\[3rem_1fr_auto\]" src/pages/Projects.tsx src/pages/Archive.tsx src/components/ProjectRow.tsx`
Expected: no `framer-motion` import, no `label` class; any `grid-cols-[3rem_1fr_auto]` appears only with an `md:` prefix.

- [ ] **Step 5: Commit** `feat: stacked project rows, active and archived lists`

---

### Task 6: Project detail page

**Files:**
- Modify: `src/pages/ProjectDetail.tsx`

**Interfaces:**
- Consumes: `projects`, `activeProjects`, `archivedProjects`; `Reveal`, `ClipReveal`; `useDocumentMeta`; types `ProjectResult`, `ProjectVideo` (`speedLabel`).

- [ ] **Step 1: Lookup and sequence.** Find the project in `projects`; unknown slug still redirects to `/projects`. `const group = project.archived ? archivedProjects : activeProjects`; `prev`/`next` come from `group`. Back link: `← Archive` to `/archive` when archived, else `← All Projects` to `/projects`; `inline-flex min-h-11 items-center`. Index label: `// Archive` when archived, else `// {1-based position in activeProjects, 3 digits}`. Call `useDocumentMeta(project.title, project.tagline ?? project.description)`. Hooks must run before the early return for a missing project (pass fallback strings when `project` is undefined).

- [ ] **Step 2: Header.** Structure, phone first: label, `h1` (`ClipReveal as="h1"`, class `display break-words pb-[0.15em]`), then `project.tagline` as `<p className="lead mt-4 max-w-2xl">` when present, then the links block. The header wrapper is `flex flex-col gap-6 md:flex-row md:items-start md:justify-between md:gap-8`; the title column has `min-w-0`; the links block has `md:shrink-0` (never plain `shrink-0`) and its links are `inline-flex min-h-11 items-center`. In `GithubStatsFull`, omit the stars item when stars is 0 and the open-issues item when it is 0, and let the row wrap (`flex flex-wrap`, no `whitespace-nowrap` on the row).

- [ ] **Step 3: Metadata row.** Keep Year / Status / Stack. Status renders as a dot plus label: dot `bg-accent` for `active`, `bg-text-muted` otherwise. Add a Period item when `project.period` exists. Stack tags stay outlined.

- [ ] **Step 4: Results strip.** When `project.results?.length`, render directly after the header border, before the video: a `<dl>` with `grid grid-cols-1 sm:grid-cols-3 gap-6`; each item is a `<div className="flex flex-col-reverse">` holding `<dt>` (label, `mono text-text-muted mt-1`) and `<dd>` (value, `text-3xl font-medium tracking-tight`), so the value shows above its label while the markup stays valid.

- [ ] **Step 5: Optional sections.** Overview, The Challenge, The Approach and Key Features each render only when their field is non-empty. Delete the `Placeholder` component. `Section` loses its `delay` prop and uses `<Reveal inView>`; its label becomes an `<h2 className="section-label mb-6">`.

- [ ] **Step 6: Video block.** `max-h-[75dvh]`. When `video.speedLabel`, overlay it top-right inside a `relative` wrapper around the video: `absolute right-2 top-2 mono bg-background/70 px-1.5 py-0.5 text-text pointer-events-none`, `aria-hidden`, plus an `sr-only` span in the figure reading `Playback speed {speedLabel}`. Chapter list: the `<ol>` is `flex gap-2 overflow-x-auto scroll-hide pb-2 lg:block lg:space-y-1 lg:max-h-[36rem] lg:overflow-y-auto lg:pb-0`; each `<li>` is `shrink-0 lg:shrink`; each button is `inline-flex min-h-11 items-center gap-2 whitespace-nowrap px-3 border border-border lg:w-full lg:border-0 lg:px-0 lg:whitespace-normal lg:text-left`. The active chapter gets `text-accent` and `aria-current="true"`; keep the existing seek logic untouched.

- [ ] **Step 7: Figures and table text.** Wrap each evidence `<img>` in `<a href={img.src} target="_blank" rel="noopener noreferrer">` with `aria-label={\`Open full-size figure: ${img.alt}\`}`. Captions use `text-sm text-text-muted` (sans, not mono). In `DataTableBlock`, the table description becomes `text-sm text-text-muted`, and the table scroll wrapper keeps `overflow-x-auto` but applies its fixed max height only from `lg` (`lg:max-h-[36rem] lg:overflow-y-auto`). Expandable rows get `tabIndex={0}`, `role="button"`, `aria-expanded`, and toggle on Enter and Space. The `+/−` marker uses `text-accent` when open and `text-text-muted` when closed. No `text-text-dim` remains in this file.

- [ ] **Step 8: Demo call to action and prev/next.** The demo link is `inline-flex min-h-11 items-center`; change the note to `Sign in with GitHub required.` Prev/next links are `min-h-11` blocks, stacked below `sm`, with `min-w-0` and `break-words` titles.

- [ ] **Step 9: Remove direct entrance code.** No `initial=`/`animate=` props remain in this file. Remove the `motion` import and the local `ease` constant if unused.

- [ ] **Step 10: Verify**

Run: `npm run typecheck && npm run build`
Expected: both succeed.
Run: `grep -n "Placeholder\|text-text-dim\|max-h-\[75vh\]\|initial={{" src/pages/ProjectDetail.tsx`
Expected: no matches.
Run: `grep -n "shrink-0" src/pages/ProjectDetail.tsx`
Expected: every match is `md:shrink-0`, or is on a list-numbering span or a chapter `<li>`; none is on a sibling of the `h1`.

- [ ] **Step 11: Commit** `feat: phone-first project page with results strip and optional sections`

---

### Task 7: Home page

**Files:**
- Modify: `src/pages/Home.tsx`, `src/index.css` (remove marquee rules only)

**Interfaces:**
- Consumes: `profile`; `activeProjects`; `ProjectRow`; `Reveal`, `ClipReveal`; `useDocumentMeta`, `SITE_TITLE`.

- [ ] **Step 1: Rewrite `Home.tsx`.** Delete `useDragScroll`, `ProjectCard`, the discipline list, the status block, "SCROLL TO BEGIN", the horizontal strip and the marquee. New structure inside `PageTransition`, all in one `max-w-6xl mx-auto px-6` column:
  1. **Hero** (`pt-16 pb-12 md:pt-24`): `<ClipReveal as="h1" className="display">{profile.name}</ClipReveal>`; `<Reveal delay={0.08}><p className="lead mt-6 max-w-2xl">{profile.lead}</p></Reveal>`; an availability line (`mono text-text-muted mt-6 flex flex-wrap items-center gap-x-3 gap-y-1`): a `size-1.5 rounded-full bg-accent` dot, `profile.availability`, a `·` separator, `profile.location`; then two buttons in `mt-8 flex flex-col gap-3 sm:flex-row`: primary `Link` to `/projects` reading `[ View work ]` (`inline-flex min-h-12 items-center justify-center px-5 mono uppercase bg-accent text-background hover:bg-accent-hover transition-colors duration-150`), secondary `a` with `mailto:` built from `profile.email`, reading `[ Email me ]` (same sizing, `border border-border-strong text-text hover:border-accent`).
  2. **Featured** (`py-12 border-t border-border`): `<h2 className="section-label mb-6">// Featured</h2>`; the first project in `activeProjects`. A `Link` to its page, `grid gap-6 md:grid-cols-2 md:items-center`: when `project.video` exists, the poster image (`project.video.poster`, `alt="A frame from the agent's final run"`, `className="w-full border border-border [image-rendering:pixelated]"`); and a text block with the title (`heading-lg`), `tagline` (`text-text-muted mt-3`), and its `results` as a compact `<dl>` (`mt-6 grid grid-cols-3 gap-4`; same `flex-col-reverse` dt/dd pattern as Task 6 Step 4 with value `text-xl font-medium` and label `mono text-text-muted`).
  3. **Work** (`py-12 border-t border-border`): header row with `<h2 className="section-label">// Work</h2>` and a `Link` to `/projects` reading `All projects →` (`inline-flex min-h-11 items-center mono text-text-muted hover:text-text`); then the remaining `activeProjects` (array index 1 onward) as `ProjectRow`s in a `divide-y divide-border` list, with displayed `index` starting at 2.
  Call `useDocumentMeta(SITE_TITLE, …)` with the description string from the spec's Head section. No direct `motion` usage.

- [ ] **Step 2: Remove the marquee CSS.** Delete `.marquee-track`, `@keyframes marquee`, `.card-marquee`, the two `.project-card:hover` rules and `.card-marquee-wrap` from `src/index.css`.

- [ ] **Step 3: Verify**

Run: `npm run typecheck && npm run build`
Expected: both succeed.
Run: `grep -rn "marquee\|useDragScroll\|SCROLL TO BEGIN\|//JONES\|text-\[0\.6" src | grep -v "src/pages/demos" | wc -l`
Expected: `0`.
Run: `grep -c "<ClipReveal as=\"h1\"" src/pages/Home.tsx`
Expected: `1`.

- [ ] **Step 4: Commit** `feat: phone-first home with positioning, featured project and work list`

---

### Task 8: About and Contact

**Files:**
- Modify: `src/pages/About.tsx`, `src/pages/Contact.tsx`

**Interfaces:**
- Consumes: `profile` (`lead`, `availability`, `location`, `email`, `links`, `cvHref`, `now`, `nowUpdated`, `terms`); `Reveal`, `ClipReveal`; `useDocumentMeta`.

- [ ] **Step 1: Rewrite `About.tsx`.** Delete the reading list, its types, and the `ResizeObserver` height-matching effect. One `max-w-6xl mx-auto px-6 pt-16 pb-24` column. Sections in this order, each headed by `<h2 className="section-label mb-4">`:
  1. Header: `ClipReveal` `section-label` "About"; `ClipReveal as="h1" className="heading-lg max-w-2xl"` with text `I work on reinforcement learning and robot learning.`
  2. Intro (`lead`, `max-w-2xl`), exactly: `I'm a first-year CS master's student at UC Santa Barbara, with an applied math degree from UCLA. The largest project on this site is a PPO agent for Pokemon Red, trained over nine runs, where most of the work was finding out what each reward term actually taught the agent. I'm now building an SO-101 arm to start on imitation learning with real hardware.`
  3. `// Now`: a bordered panel (`border border-border bg-surface p-5`) with `profile.now` as a list and a mono line `Last updated {profile.nowUpdated}`.
  4. `// Coursework and teaching`: for each `profile.terms` entry, a mono term heading and a list of rows. Phone: each row stacks code (mono, `text-text`), title, role. From `sm`: `sm:grid sm:grid-cols-[8rem_1fr_auto] sm:gap-4`. Omit the title when it is an empty string. Role `TA` renders as a tag with `border-accent`; `Student` renders nothing.
  5. `// Outside work`: `Outside of work I train for Hyrox and DEKA, run, swim, surf and cook.`
  6. `// Details`: a `<dl>` with `grid grid-cols-1 gap-y-3 sm:grid-cols-[8rem_1fr] sm:gap-x-4`, `dt` in `mono text-text-muted uppercase`, `dd` in `text-text break-words`. Rows: Location; Open to (`Summer 2027 internships`); Email (a `mailto:` link from `profile.email`); one row per `profile.links` entry; CV only when `profile.cvHref` is set.
  From `md`, sections 3-4 may sit beside sections 2, 5 and 6 in a two-column grid (`md:grid md:grid-cols-2 md:gap-16`); below `md` everything is one column in the order above. Wrap sections in `Reveal` with delays of 0.08 and 0.16 at most. Call `useDocumentMeta('About', profile.lead)`.

- [ ] **Step 2: Rewrite `Contact.tsx`.** Same column. `ClipReveal` `section-label` "Contact"; `ClipReveal as="h1" className="heading-lg max-w-3xl"` with text `I'm looking for a summer 2027 internship in reinforcement learning or robot learning.` Then, in one `Reveal`: a paragraph `Email is the best way to reach me.`; the email as a button-styled `a` (`mailto:` from `profile.email`): `flex min-h-12 w-full items-center justify-center px-5 mono bg-accent text-background hover:bg-accent-hover sm:w-fit`, showing `profile.email` with `break-all`; a `section-label` "Elsewhere" and the `profile.links` rows (keep the existing bordered-row style, each `min-h-12`), plus a CV row only when `profile.cvHref` is set; a final mono line with `profile.location`. Call `useDocumentMeta('Contact', 'Email and links for Owen Jones. Open to summer 2027 internships.')`. No direct `motion` usage and no `label` class in either file. After this step the address literal exists only in `src/data/profile.ts`.

- [ ] **Step 3: Verify**

Run: `npm run typecheck && npm run build`
Expected: both succeed.
Run: `grep -n "readingList\|ResizeObserver\|className=\"label\|from 'framer-motion'\|work together\|first principles\|mailto:[a-z]" src/pages/About.tsx src/pages/Contact.tsx`
Expected: no matches.
Run: `grep -rn "className=\"label\|label block\|\"label pt" src | wc -l`
Expected: `0`.
Run: `grep -rln "@gmail" src | sort`
Expected: only `src/data/profile.ts`.

- [ ] **Step 4: Commit** `feat: rewrite About and Contact around profile data`

---

### Task 9: CLAUDE.md and final checks

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update `CLAUDE.md`** so every statement matches the code on this branch. Read the changed files first; do not describe anything you have not confirmed in the code. Required changes:
  - Route tree: add the `*` NotFound route.
  - Data: `projects.ts` now holds active and archived projects (`archived` flag, `activeProjects` / `archivedProjects`), the `tagline` / `results` / `period` fields and the three placeholder entries; `profile.ts` is the single source for bio, availability, links and courses; `archive.ts` holds four GitHub-only entries.
  - How to add a project (extend the existing "Demo dispatch pattern" paragraph): required and optional fields, the 140-character tagline, add the slug to `public/sitemap.xml`.
  - Styling: replace the token and font description with the new tokens (accent `#FFB200` and where it may be used, JetBrains Mono, the 12px text floor, `.lead`), the phone-first rule (default styles are for phones; never `shrink-0` beside a heading below `md`; 44px tap targets), and the motion layer (`Reveal`, `ClipReveal`, `src/lib/entrance.ts`, once per session, `MotionConfig reducedMotion="user"`); remove statements that are no longer true (the marquee classes, entrance animation hand-written per page, `useReducedMotion.ts` being unused, `AnimatePresence` route transitions).
  - Per-route titles via `useDocumentMeta`; static Open Graph tags, favicon, `robots.txt`, `sitemap.xml` in `index.html` / `public/`.
  - Worker CORS: read the origin checks in the five `workers/*/src/index.ts` files (do not edit them) and correct the "(+ localhost)" statement to say which workers allow localhost.
  - Leave the Commands, Deployment and remaining Worker sections as they are unless a statement is now false.

- [ ] **Step 2: Verify**

Run: `npm run typecheck && npm run build`
Expected: both succeed.
Run: `git diff --stat origin/main -- src/pages/demos src/pages/Demo.tsx workers | tail -1`
Expected: empty output (no changes).
Run: `grep -rn "text-\[0\.6\|Space Mono\|marquee\|className=\"label\|featuredProjects\|useReducedMotion" src index.html | grep -v "src/pages/demos" | wc -l`
Expected: `0`.

- [ ] **Step 3: Commit** `docs: update CLAUDE.md for the style refactor`
