import { useParams, Navigate } from 'react-router-dom'
import type { ComponentType } from 'react'
import { PageTransition } from '@/components/layout/PageTransition'
import { WeatherDemo } from './demos/WeatherDemo'
import { FakeNewsDemo } from './demos/FakeNewsDemo'
import { GeminiAudioDemo } from './demos/GeminiAudioDemo'

const DEMOS: Record<string, ComponentType> = {
  'weather-api': WeatherDemo,
  'fake-news-classifier': FakeNewsDemo,
  'gemini-audio-agent': GeminiAudioDemo,
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
