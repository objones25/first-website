# Project page backup, 2026-11-21

Copies of the project page data and template as they stood at commit `70075fd`
(branch `feat/style-refactor`), taken before the project page template was reworked.
The same commit is tagged `backup/project-pages-2026-11-21`.

- `projects.ts`: `src/data/projects.ts`, all project copy
- `archive.ts`: `src/data/archive.ts`
- `ProjectDetail.tsx`: `src/pages/ProjectDetail.tsx`, the old template
- `index.ts`: `src/types/index.ts`, the old `Project` type

These files are outside `src/`, so they are not type-checked or built. To restore,
copy them back to the paths above or run `git checkout backup/project-pages-2026-11-21 -- src/data/projects.ts src/pages/ProjectDetail.tsx src/types/index.ts`.
