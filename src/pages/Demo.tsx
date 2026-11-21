import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { PageTransition } from '@/components/layout/PageTransition'

// One chunk per demo, so opening one does not download the other six.
const DEMOS: Record<string, LazyExoticComponent<ComponentType>> = {
  'weather-api': lazy(() => import('./demos/WeatherDemo').then(m => ({ default: m.WeatherDemo }))),
  'gemini-audio-agent': lazy(() => import('./demos/GeminiAudioDemo').then(m => ({ default: m.GeminiAudioDemo }))),
  'brave-search-agent': lazy(() => import('./demos/BraveSearchDemo').then(m => ({ default: m.BraveSearchDemo }))),
  'microagent': lazy(() => import('./demos/MicroagentDemo').then(m => ({ default: m.MicroagentDemo }))),
  'document-scanner': lazy(() => import('./demos/DocumentScannerDemo').then(m => ({ default: m.DocumentScannerDemo }))),
  'snake-q-learning': lazy(() => import('./demos/SnakeDemo').then(m => ({ default: m.SnakeDemo }))),
  'llm-from-scratch': lazy(() => import('./demos/LlmFromScratchDemo').then(m => ({ default: m.LlmFromScratchDemo }))),
}

export default function Demo() {
  const { slug } = useParams<{ slug: string }>()
  const DemoComponent = slug ? DEMOS[slug] : undefined

  if (!DemoComponent) return <Navigate to="/projects" replace />

  return (
    <PageTransition>
      <Suspense fallback={<p role="status" className="mono text-text-muted max-w-6xl mx-auto px-6 pt-16">[ loading demo… ]</p>}>
        <DemoComponent />
      </Suspense>
    </PageTransition>
  )
}
