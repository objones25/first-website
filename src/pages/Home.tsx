import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { projects } from '@/data/projects'
import { PageTransition } from '@/components/layout/PageTransition'

const ease = [0.16, 1, 0.3, 1] as const

// ── Horizontal drag-scroll hook ──────────────────────────────────────────────
function useDragScroll() {
  const ref = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const startX = useRef(0)
  const scrollLeft = useRef(0)

  const onMouseDown = (e: React.MouseEvent) => {
    if (!ref.current) return
    dragging.current = true
    startX.current = e.pageX - ref.current.offsetLeft
    scrollLeft.current = ref.current.scrollLeft
    ref.current.style.cursor = 'grabbing'
  }
  const onMouseUp = () => {
    dragging.current = false
    if (ref.current) ref.current.style.cursor = 'grab'
  }
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current || !ref.current) return
    e.preventDefault()
    const x = e.pageX - ref.current.offsetLeft
    ref.current.scrollLeft = scrollLeft.current - (x - startX.current) * 1.2
  }

  return { ref, onMouseDown, onMouseUp, onMouseMove, onMouseLeave: onMouseUp }
}

// ── Project card ──────────────────────────────────────────────────────────────
function ProjectCard({ project, index }: { project: typeof projects[0]; index: number }) {
  return (
    <Link
      to={`/projects/${project.slug}`}
      className="project-card group shrink-0 w-72 h-80 border border-border bg-surface flex flex-col justify-between p-6 select-none hover:border-border-strong transition-colors duration-300"
    >
      <div>
        <div className="flex items-center justify-between mb-8">
          <span className="mono text-text-muted">
            {String(index + 1).padStart(3, '0')} ——
          </span>
          <span className="mono text-text-muted">{project.year}</span>
        </div>
        <h3 className="text-lg font-light tracking-tight mb-3 group-hover:text-text-muted transition-colors duration-200">
          {project.title}
        </h3>
        <p className="mono text-text-muted text-[0.625rem] leading-relaxed line-clamp-3">
          {project.description}
        </p>
      </div>

      <div>
        {/* Hover marquee */}
        <div className="card-marquee-wrap overflow-hidden border-t border-border pt-3 mb-4">
          <div className="card-marquee">
            {Array.from({ length: 6 }).map((_, i) => (
              <span key={i} className="mono text-text-muted whitespace-nowrap mr-4">
                View Project //
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {project.tags.map(tag => (
            <span key={tag} className="mono text-text-muted border border-border px-1.5 py-0.5">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </Link>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Home() {
  const drag = useDragScroll()

  return (
    <PageTransition>
      {/* ── Hero ── */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16">
        <div className="flex items-start justify-between mb-16">
          {/* Left: discipline list */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="hidden md:flex flex-col gap-4 pt-2"
          >
            {[
              ['001', 'Systems'],
              ['002', 'AI / Agents'],
              ['003', 'Web'],
            ].map(([num, label]) => (
              <div key={num} className="flex items-center gap-3">
                <span className="mono text-text-muted">{num}</span>
                <span className="mono text-text-muted">——</span>
                <span className="mono text-text-muted uppercase tracking-wider">{label}</span>
              </div>
            ))}
          </motion.div>

          {/* Center: name */}
          <div className="flex-1 md:text-center">
            <span className="clip block mb-2">
              <motion.span
                initial={{ y: '105%' }}
                animate={{ y: '0%' }}
                transition={{ duration: 1, ease }}
                className="display block"
              >
                OWEN
              </motion.span>
            </span>
            <span className="clip block">
              <motion.span
                initial={{ y: '105%' }}
                animate={{ y: '0%' }}
                transition={{ duration: 1, ease, delay: 0.08 }}
                className="display block text-text-muted"
              >
                //JONES
              </motion.span>
            </span>
          </div>

          {/* Right: status */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="hidden md:flex flex-col items-end gap-2 pt-2"
          >
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="mono text-text-muted">AVAILABLE</span>
            </div>
            <span className="mono text-text-muted">SANTA BARBARA, CA</span>
          </motion.div>
        </div>

        {/* Bottom of hero */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.9 }}
          className="flex items-end justify-between border-t border-border pt-6"
        >
          <div className="flex items-center gap-8">
            <Link to="/projects" className="mono text-text-muted hover:text-text transition-colors duration-200 uppercase tracking-wider">
              [ View Work ]
            </Link>
            <Link to="/about" className="mono text-text-muted hover:text-text transition-colors duration-200 uppercase tracking-wider">
              [ About ]
            </Link>
          </div>
          <span className="mono text-text-muted hidden sm:block">
            SCROLL TO BEGIN →
          </span>
        </motion.div>
      </section>

      {/* ── Horizontal project strip ── */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-6 mb-6 flex items-center justify-between">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="section-label"
          >
            // Selected Work
          </motion.span>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
          >
            <Link to="/projects" className="mono text-text-muted hover:text-text transition-colors duration-200">
              All Projects →
            </Link>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          ref={drag.ref}
          onMouseDown={drag.onMouseDown}
          onMouseUp={drag.onMouseUp}
          onMouseMove={drag.onMouseMove}
          onMouseLeave={drag.onMouseLeave}
          className="flex gap-4 overflow-x-auto scroll-hide px-6 cursor-grab"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {projects.map((project, i) => (
            <div key={project.slug} style={{ scrollSnapAlign: 'start' }}>
              <ProjectCard project={project} index={i} />
            </div>
          ))}
          {/* End padding */}
          <div className="shrink-0 w-6" />
        </motion.div>
      </section>

      {/* ── Marquee CTA ── */}
      <div className="border-t border-b border-border overflow-hidden py-4 mt-8 select-none">
        <div className="marquee-track">
          {Array.from({ length: 2 }).map((_, i) => (
            <span key={i} className="flex items-center">
              {Array.from({ length: 8 }).map((_, j) => (
                <span key={j} className="flex items-center">
                  <Link
                    to="/contact"
                    className="mono text-text-muted hover:text-text transition-colors duration-200 whitespace-nowrap mx-6 uppercase tracking-widest"
                  >
                    Get In Touch
                  </Link>
                  <span className="mono text-text-dim">——</span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>
    </PageTransition>
  )
}
