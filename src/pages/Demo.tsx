import { useParams, Navigate } from 'react-router-dom'
import type { ComponentType } from 'react'
import { PageTransition } from '@/components/layout/PageTransition'
import { WeatherDemo } from './demos/WeatherDemo'
import { GeminiAudioDemo } from './demos/GeminiAudioDemo'
import { BraveSearchDemo } from './demos/BraveSearchDemo'
import { MicroagentDemo } from './demos/MicroagentDemo'

const DEMOS: Record<string, ComponentType> = {
  'weather-api': WeatherDemo,
  'gemini-audio-agent': GeminiAudioDemo,
  'brave-search-agent': BraveSearchDemo,
  'microagent': MicroagentDemo,
}

export default function Demo() {
  const { slug } = useParams<{ slug: string }>()
  const DemoComponent = slug ? DEMOS[slug] : undefined

  if (!DemoComponent) return <Navigate to="/projects" replace />

  return (
    <PageTransition>
      <DemoComponent />
    </PageTransition>
  )
}
