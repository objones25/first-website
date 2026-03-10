export interface ArchiveProject {
  title: string
  description: string
  year: string
  tags: string[]
  href?: string
}

export const archiveProjects: ArchiveProject[] = [
  {
    title: 'Gemini Chat Agent',
    description: 'AI chat agent on Cloudflare Workers with SSE streaming, code execution, thinking mode, and KV-persisted chat history. Built as a precursor to the Gemini Audio Agent.',
    year: '2025',
    tags: ['TypeScript', 'Cloudflare', 'Gemini'],
    href: 'https://github.com/objones25/gemini-chat-agent',
  },
  {
    title: 'YouTube Transcript MCP Server',
    description: 'Serverless MCP server on Cloudflare Workers for extracting YouTube transcripts.',
    year: '2025',
    tags: ['TypeScript', 'Cloudflare', 'MCP'],
    href: 'https://github.com/objones25/remote-cloudflare-youtube-transcript-mcp-server',
  },
  {
    title: 'MCP Research Tool',
    description: 'AI research orchestration service on Cloudflare Workers that fans out queries across 10+ tools (Brave, Tavily, GitHub, arXiv, etc.) and synthesizes cited results.',
    year: '2025',
    tags: ['TypeScript', 'Cloudflare', 'MCP'],
    href: 'https://github.com/objones25/mcp-research-tool',
  },
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
]
