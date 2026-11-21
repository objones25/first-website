export interface ProfileLink {
  label: string
  href: string
}
// title is '' when the owner has not supplied one; consumers omit an empty title
export interface Course {
  code: string
  title: string
  role: 'Student' | 'TA'
}
export interface Term {
  term: string
  courses: Course[]
}

export const profile = {
  name: 'Owen Jones',
  lead: "CS master's student at UC Santa Barbara working on reinforcement learning and robot learning.",
  availability: 'Open to summer 2027 internships',
  location: 'Santa Barbara, CA',
  email: 'owenbeckettjones@gmail.com',
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
        { code: 'MATH 34B', title: 'Differential and Integral Calculus with Applications', role: 'TA' },
      ],
    },
    {
      term: 'Winter 2027',
      courses: [
        { code: 'CMPSC 211B', title: 'Numerical Simulation', role: 'Student' },
        { code: 'CMPSC 225', title: 'Information Theory', role: 'Student' },
        { code: 'CMPSC 270', title: 'Operating Systems', role: 'Student' },
        { code: 'CMPSC 595N', title: 'Research Seminar', role: 'Student' },
        { code: 'MATH 4B', title: 'Differential Equations', role: 'TA' },
      ],
    },
  ] as Term[],
}
