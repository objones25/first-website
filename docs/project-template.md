# Project page template

A project page is one entry in `src/data/projects.ts`, rendered by `src/components/project/ProjectPage.tsx`. Every section is optional and appears only when its field has content, so a short project gets a short page.

To see every section filled in, run `npm run dev` and open `/projects/_template`. That page uses invented placeholder text from `src/data/projectTemplate.ts` and exists only in the dev server.

## Page order

| On the page | Field | What goes in it |
| --- | --- | --- |
| Title and one line | `title`, `tagline` | The tagline is one sentence, 140 characters or fewer, and includes the result. It is also what the project lists show. |
| Buttons | `hasDemo`, `links` | Demo first when there is one, then the links in the order given. A link labelled `GitHub` also drives the commit and star line. |
| Results strip | `results` | Two or three `{ value, label }` pairs. The label says what was counted. |
| Video | `video` | Source, poster, caption, chapters sorted by time, and `speedLabel` when it is sped up. |
| Contents | (automatic) | Built from whichever sections exist. |
| Facts sheet | `year` or `period`, `status`, `facts`, `tags` | Add `facts` rows for role, team, compute and cost. |
| Summary | `overview` | Two short paragraphs. The first is shown brighter and should stand alone. |
| Problem | `challenge` | Why it was hard, in a way a reader can check. |
| Approach | `approach` | Decisions and what they cost. |
| Highlights | `features` | Three to five claims, each with its evidence in the same sentence. |
| What failed | `failures` | `{ title, detail }`: what was tried, what happened, what it showed. |
| Limits | `limits` | What the result does not show: seeds, trials, conditions. |
| Evidence | `images` | Figures with `src`, `alt` and a full caption. |
| Data | `dataTables` | Tables a reader would want to check. Rows can expand through `detailFields`. |
| Next | `next` | What you would do next. Leave it out for finished work. |
| Credits | `credits` | `{ label, href?, note }` for work and people this depends on. |
| Demo | `hasDemo` | A second demo button at the end of the page. |

Prose fields (`overview`, `challenge`, `approach`) can hold several paragraphs: separate them with `\n\n` inside the string.

## Blank entry

```ts
{
  slug: '',
  title: '',
  tagline: '',          // 140 characters or fewer
  description: '',      // fallback text for lists and the meta description
  year: '2026',
  period: '',           // optional, e.g. 'Jan to Mar 2026'
  tags: [],
  status: 'active',     // 'active' | 'stable' | 'complete' | 'planned' | 'paused'
  results: [{ value: '', label: '' }],
  facts: [{ label: 'Role', value: '' }],
  overview: '',
  challenge: '',
  approach: '',
  features: [''],
  failures: [{ title: '', detail: '' }],
  limits: [''],
  next: [''],
  credits: [{ label: '', href: '', note: '' }],
  links: [{ label: 'GitHub', href: '' }],
  hasDemo: false,
},
```

Delete the fields you are not using. Then run `npm run og` and commit the new share image in `public/og/` (the build fails without it). For a picture you do not have yet, use `{ placeholder: 'what will go here' }` in `images` or `thumb`.

## Rules

- State only what you measured or did. The site's content rules are in `CLAUDE.md`.
- The placeholder text in `src/data/projectTemplate.ts` is invented. Do not copy it into a real entry.
- The copy and template from before this format was introduced are in `docs/backups/2026-11-21-project-pages/`.
