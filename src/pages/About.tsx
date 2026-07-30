import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { PageTransition } from '@/components/layout/PageTransition'

type ReadingStatus = 'read' | 'watched' | 'in progress'

interface ReadingItem {
  title: string
  meta: string
  status: ReadingStatus
}

const readingList: ReadingItem[] = [
  { title: 'ImageNet Classification with Deep Convolutional Neural Networks', meta: 'Krizhevsky, Sutskever, Hinton — NIPS 2012', status: 'in progress' },
  { title: 'Very Deep Convolutional Networks for Large-Scale Image Recognition', meta: 'Simonyan, Zisserman — ICLR 2015', status: 'in progress' },
  { title: 'Batch Normalization', meta: 'Ioffe, Szegedy — ICML 2015', status: 'in progress' },
  { title: 'Adam: A Method for Stochastic Optimization', meta: 'Kingma, Ba — ICLR 2015', status: 'in progress' },
  { title: 'Dropout: A Simple Way to Prevent Neural Networks from Overfitting', meta: 'Srivastava, Hinton, Krizhevsky, Sutskever, Salakhutdinov — JMLR 2014', status: 'in progress' },
  { title: 'Deep Residual Learning for Image Recognition', meta: 'He, Zhang, Ren, Sun — CVPR 2016', status: 'in progress' },
  { title: 'Long Short-Term Memory', meta: 'Hochreiter, Schmidhuber — Neural Computation, 1997', status: 'in progress' },
  { title: 'Universal Approximation of an Unknown Mapping and Its Derivatives', meta: 'Hornik, Stinchcombe, White — Neural Networks, 1990', status: 'in progress' },
  { title: 'An Introduction to Statistical Learning', meta: 'James, Witten, Hastie, Tibshirani', status: 'read' },
  { title: 'AI and ML for Coders in PyTorch', meta: 'Laurence Moroney', status: 'in progress' },
  { title: 'Neural Networks: Zero to Hero', meta: 'Andrej Karpathy', status: 'watched' },
  { title: 'Neural Networks', meta: '3Blue1Brown', status: 'watched' },
  { title: 'Singular Value Decomposition', meta: 'Steve Brunton — Data-Driven Science & Engineering', status: 'watched' },
  { title: 'Transformers & Large Language Models', meta: 'Stanford CME 295', status: 'in progress' },
]

const ease = [0.16, 1, 0.3, 1] as const

export default function About() {
  const bioRef = useRef<HTMLDivElement>(null)
  const [matchedHeight, setMatchedHeight] = useState<number>()

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')

    const updateHeight = () => {
      setMatchedHeight(mq.matches ? bioRef.current?.offsetHeight : undefined)
    }

    updateHeight()

    const ro = new ResizeObserver(updateHeight)
    if (bioRef.current) ro.observe(bioRef.current)
    mq.addEventListener('change', updateHeight)

    return () => {
      ro.disconnect()
      mq.removeEventListener('change', updateHeight)
    }
  }, [])

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
              Building machine learning foundations from first principles.
            </motion.h1>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-24 items-start">

          {/* Bio */}
          <motion.div
            ref={bioRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <span className="label block mb-6">// Background</span>
            <div className="space-y-4 text-text-muted leading-relaxed">
              <p>
                Applied Math degree from UCLA. This year I've been rebuilding my ML foundations by
                implementing architectures straight from their papers in PyTorch: AlexNet, VGG, ResNet,
                LSTMs. Alongside that I'm working through An Introduction to Statistical Learning and
                Karpathy's Neural Networks: Zero to Hero. I use AI daily to build faster, but the from
                scratch work is how I make sure I actually understand what's under the hood. I start a
                CS master's at UCSB this fall.
              </p>
            </div>

            <span className="label block mt-12 mb-6">// Beyond the Code</span>
            <p className="text-text-muted leading-relaxed">
              When I don't have my face buried in my laptop, I'm training for Hyrox and DEKA, running,
              swimming, surfing, or cooking.
            </p>
          </motion.div>

          {/* Currently Studying */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            style={matchedHeight ? { height: matchedHeight, display: 'flex', flexDirection: 'column' } : undefined}
          >
            <span className="label block mb-6 shrink-0">// Currently Studying</span>
            <div className="divide-y divide-border border-t border-border overflow-y-auto min-h-0">
              {readingList.map(item => (
                <div key={item.title} className="grid grid-cols-[1fr_auto] gap-4 py-4 items-start">
                  <div>
                    <span className="text-sm block mb-1">{item.title}</span>
                    <span className="mono text-text-muted block">{item.meta}</span>
                  </div>
                  <span className="text-xs text-text-muted border border-border px-2 py-0.5 whitespace-nowrap">
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

        </div>
      </div>
    </PageTransition>
  )
}
