export interface ArchiveProject {
  title: string
  description: string
  year: string
  tags: string[]
  href?: string
}

export const archiveProjects: ArchiveProject[] = [
  {
    title: 'Shorelark',
    description: 'React frontend for Patryk Wychowaniec\'s evolution simulation — neural networks, genetic algorithms, and WebAssembly.',
    year: '2025',
    tags: ['React', 'Rust', 'WASM'],
    href: 'https://github.com/objones25/shorelark-objones25',
  },
  {
    title: 'Custom Vector',
    description: 'Generic vector in Rust with type-size-aware growth strategies (25/50/100%) and benchmarks.',
    year: '2025',
    tags: ['Rust', 'Systems'],
    href: 'https://github.com/objones25/custom_vector_objones25',
  },
  {
    title: 'Sudoku Solver',
    description: 'Multi-threaded Sudoku solver in Rust with SIMD validation, bitset candidate tracking, and external API integration for puzzle generation.',
    year: '2025',
    tags: ['Rust', 'Systems'],
    href: 'https://github.com/objones25/sudoku_rust',
  },
  {
    title: 'Neural Network Library',
    description: 'Neural network framework built from scratch in NumPy with full backprop, 8 activation functions, 5 optimizers, and 373 tests.',
    year: '2025',
    tags: ['Python', 'NumPy', 'ML'],
    href: 'https://github.com/objones25/neural-network-from-scratch',
  },
]
