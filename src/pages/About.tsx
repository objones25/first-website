import { motion } from 'framer-motion'
import { PageTransition } from '@/components/layout/PageTransition'

const skills = {
  Languages: ['Rust', 'Python', 'Go', 'C++', 'TypeScript'],
  'AI & ML': ['LLM Agents', 'MCP', 'RAG', 'Neural Networks', 'Embeddings'],
  Systems: ['WebAssembly', 'Multithreading', 'Networking', 'Data Structures'],
  Web: ['React', 'Vite', 'REST APIs', 'Node.js'],
}

const ease = [0.16, 1, 0.3, 1] as const

export default function About() {
  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto px-6 pt-20 pb-32">
        {/* Header */}
        <div className="mb-24">
          <span className="clip block mb-6">
            <motion.span
              initial={{ y: '105%' }}
              animate={{ y: '0%' }}
              transition={{ duration: 0.8, ease }}
              className="label block"
            >
              About
            </motion.span>
          </span>
          <span className="clip block">
            <motion.h1
              initial={{ y: '105%' }}
              animate={{ y: '0%' }}
              transition={{ duration: 0.8, ease, delay: 0.08 }}
              className="heading-lg max-w-2xl"
            >
              Software engineer focused on systems, AI, and the tools developers use every day.
            </motion.h1>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-24">
          {/* Bio */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <span className="label block mb-6">Background</span>
            <div className="space-y-4 text-text-muted leading-relaxed">
              <p>
                I'm Owen Jones, a software engineer with a passion for building systems that are fast, reliable, and well-designed. I work across the stack — from low-level systems programming in Rust and C++ to building intelligent AI agents in Python.
              </p>
              <p>
                My work spans systems programming, machine learning, and web development. I believe in understanding the fundamentals — which is why I enjoy building things from scratch, from neural networks to web servers.
              </p>
              <p>
                When I'm not coding, I'm reading about computer science theory, exploring new programming languages, or writing about what I've learned.
              </p>
            </div>
          </motion.div>

          {/* Skills */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <span className="label block mb-6">Skills</span>
            <div className="space-y-6">
              {Object.entries(skills).map(([category, items]) => (
                <div key={category}>
                  <span className="text-xs text-text-muted block mb-2">{category}</span>
                  <div className="flex flex-wrap gap-2">
                    {items.map(skill => (
                      <span
                        key={skill}
                        className="text-sm border border-border px-3 py-1 text-text-muted"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  )
}
