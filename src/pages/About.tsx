import { motion } from 'framer-motion'
import { PageTransition } from '@/components/layout/PageTransition'

const skills: Record<string, string[]> = {
  Primary:      ['Python', 'TypeScript'],
  Familiar:     ['Go', 'Rust', 'Ruby'],
  'ML / AI':    ['PyTorch', 'scikit-learn', 'NumPy', 'pandas', 'Hugging Face'],
  'Web / Backend': ['Node.js', 'Hono', 'Cloudflare Workers', 'REST APIs', 'SSE', 'MCP'],
  Tools:        ['Docker', 'Git', 'uv'],
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
              Self-taught programmer at the intersection of machine learning and backend development.
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
            <span className="label block mb-6">// Background</span>
            <div className="space-y-4 text-text-muted leading-relaxed">
              <p>
                Applied Math degree from UCLA. I spend most of my time in Python and TypeScript,
                building ML pipelines, training neural nets from scratch, and wiring up AI-powered APIs.
                Currently deepening my ML foundations through ISL and Karpathy's makemore series.
              </p>
            </div>

            <span className="label block mt-12 mb-6">// Beyond the Code</span>
            <p className="text-text-muted leading-relaxed">
              When I'm not coding I'm usually at the gym. Currently training for Hyrox and DEKA
              competitions, a lot of running and heavy functional fitness. Surfing and hiking fill
              out the rest of the time, and living close to the water in Santa Barbara makes that
              pretty easy.
            </p>
          </motion.div>

          {/* Skills */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <span className="label block mb-6">// Skills</span>
            <div className="space-y-6">
              {Object.entries(skills).map(([category, items]) => (
                <div key={category}>
                  <span className="mono text-text-muted block mb-2 uppercase tracking-wider">
                    {category}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {items.map(skill => (
                      <span
                        key={skill}
                        className="mono border border-border px-1.5 py-0.5 text-text-muted"
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
