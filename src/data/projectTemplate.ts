import type { Project } from '@/types'
import type { ProjectGuide } from '@/components/project/ProjectPage'

// PLACEHOLDER CONTENT. Every sentence and number in this file is invented to
// show the project page format with all sections filled in. It is rendered only
// by the dev-only route /projects/_template and is not part of the site. Do not
// copy any of it into src/data/projects.ts as if it were true.
export const templateProject: Project = {
  slug: '_template',
  title: 'Example Project',
  tagline: 'One sentence saying what it is and what happened, with a number: a policy that stacks three blocks in 41 of 50 trials.',
  description: 'Placeholder entry used to preview the project page format.',
  year: '2027',
  period: 'Jan to Mar 2027',
  tags: ['Python', 'PyTorch', 'Imitation Learning'],
  status: 'complete',
  results: [
    { value: '41 / 50', label: 'trials succeed on held-out block positions' },
    { value: '120', label: 'teleoperated demonstrations' },
    { value: '3.5 h', label: 'training time on one GPU' },
  ],
  facts: [
    { label: 'Role', value: 'Solo' },
    { label: 'Compute', value: 'One rented GPU' },
    { label: 'Cost', value: 'About $12' },
  ],
  video: {
    src: '/projects/pokemon-red-ppo/run9-seed0.mp4',
    poster: '/projects/pokemon-red-ppo/run9-seed0-poster.png',
    caption: 'Placeholder media, borrowed from another page. The caption says exactly what is shown: which checkpoint, which seed, whether it is sped up, and whether it is a typical run or the best one.',
    speedLabel: '4x',
    chapters: [
      { label: 'Reach', timeS: 3 },
      { label: 'First block', timeS: 14 },
      { label: 'Second block', timeS: 33 },
      { label: 'Recovery after a slip', timeS: 65 },
    ],
  },
  overview:
    'The first paragraph is the whole project for someone who reads nothing else: what was built, how it was measured, and the result. It is shown brighter than the rest.\n\n' +
    'A second paragraph can add the context a reader in the field would ask for next, such as how this compares with the obvious baseline. Two short paragraphs are enough.',
  challenge:
    'Say why this was hard in terms a reader can check. For example: the gripper camera loses sight of the block during the last two centimetres of the approach, so a policy trained on images alone learns to stop early.',
  approach:
    'Describe the design decisions, not the file layout. What did you choose, what did you reject, and what did the choice cost?\n\n' +
    'Keep one idea per paragraph. If a paragraph needs a number to be believed, put the number in it.',
  features: [
    'Each highlight is one claim with its evidence in the same sentence: the policy recovers from a dropped block in 9 of 11 cases where one was dropped.',
    'Prefer what you measured over what you built. "Runs at 30 Hz on the arm\'s own computer" says more than "optimized inference".',
    'Three to five of these. More than that and none of them stands out.',
  ],
  failures: [
    {
      title: 'Wrist camera alone',
      detail: 'What you tried, what happened, and what it told you. Success rate stayed near 20% because the block left the frame at the moment the policy most needed it.',
    },
    {
      title: 'Longer action chunks',
      detail: 'Doubling the chunk length made motion smoother and made recovery worse, since the policy committed to a plan it could no longer correct.',
    },
  ],
  limits: [
    'Say what the result does not show. One table, one lighting setup, blocks of one size.',
    'Say how many seeds or trials sit behind each number, and whether anyone else has reproduced it.',
  ],
  images: [
    {
      src: '/projects/llm-from-scratch/pretraining-run.png',
      alt: 'Placeholder figure borrowed from another page',
      caption: 'Placeholder figure. A caption states what the axes are, which run this is, and the one thing the reader should see in it.',
    },
  ],
  dataTables: [
    {
      title: 'Trials by condition',
      description: 'A table earns its place when a reader would want to check the headline number. Rows can expand to show detail.',
      columns: [
        { key: 'condition', label: 'Condition' },
        { key: 'trials', label: 'Trials', align: 'right' },
        { key: 'success', label: 'Success', align: 'right' },
      ],
      detailFields: [{ key: 'notes', label: 'Notes' }],
      rows: [
        { condition: 'Training positions', trials: 50, success: '46 / 50', notes: 'Failures were all slips on the third block.' },
        { condition: 'Held-out positions', trials: 50, success: '41 / 50', notes: 'Five of the nine failures were at the far edge of the table.' },
        { condition: 'Dimmed lights', trials: 20, success: '9 / 20', notes: 'Not trained for. Included to show where it breaks.' },
      ],
    },
  ],
  next: [
    'What you would do with another month, in order.',
    'Leave this section out if the project is finished and you are not going back to it.',
  ],
  credits: [
    { label: 'Name of the work this builds on', href: 'https://example.com', note: 'One line on what you took from it and what you changed.' },
    { label: 'A person who helped', note: 'What they did.' },
  ],
  links: [
    { label: 'GitHub', href: 'https://example.com/code' },
    { label: 'Writeup', href: 'https://example.com/writeup' },
  ],
  hasDemo: true,
}

export const templateGuide: ProjectGuide = {
  header: 'Title, then one sentence of 140 characters or fewer that includes the result. Buttons: demo first, then code, then anything else.',
  results: 'Two or three numbers a reader can repeat to someone else. Each label says what was counted.',
  media: 'Video or a lead figure goes above the text. People decide whether to read from this.',
  facts: 'Year, status and stack fill in automatically. Add role, team, compute and cost when you have them.',
  summary: 'Field: overview. Two short paragraphs.',
  problem: 'Field: challenge. Why it was hard, in a way a reader can check.',
  approach: 'Field: approach. Decisions and trade-offs.',
  highlights: 'Field: features. Three to five claims, each with its evidence.',
  failed: 'Field: failures. What you tried that did not work and what it showed. This is the section readers in research look for.',
  limits: 'Field: limits. What the result does not show.',
  evidence: 'Field: images. Figures with full captions.',
  data: 'Field: dataTables. Only tables a reader would want to check.',
  next: 'Field: next. Optional.',
  credits: 'Field: credits. Work and people this depends on.',
  demo: 'Shown when hasDemo is true.',
}
