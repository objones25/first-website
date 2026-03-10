import { useState } from 'react'

const BASE_URL = import.meta.env.VITE_WEATHER_API_URL as string

type UnitGroup = 'us' | 'metric' | 'uk'
type Status = 'idle' | 'loading' | 'success' | 'error'

interface CurrentConditions {
  datetime: string
  temp: number
  feelslike: number
  humidity: number
  windspeed: number
  conditions: string
  icon: string
}

interface Day {
  datetime: string
  tempmax: number
  tempmin: number
  temp: number
  precip: number
  precipprob: number
  windspeed: number
  conditions: string
  description: string
}

interface WeatherResponse {
  resolvedAddress: string
  description: string
  days: Day[]
  currentConditions: CurrentConditions
}

const UNIT_LABELS: Record<UnitGroup, { temp: string; speed: string }> = {
  us: { temp: '°F', speed: 'mph' },
  metric: { temp: '°C', speed: 'km/h' },
  uk: { temp: '°C', speed: 'mph' },
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export function WeatherDemo() {
  const [location, setLocation] = useState('')
  const [unitGroup, setUnitGroup] = useState<UnitGroup>('us')
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<WeatherResponse | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    if (!location.trim()) return

    setStatus('loading')
    setResult(null)
    setErrorMsg('')

    try {
      const params = new URLSearchParams({
        location: location.trim(),
        unit_group: unitGroup,
        include: 'current,days',
      })

      const res = await fetch(`${BASE_URL}/v1/weather?${params}`)

      if (!res.ok) {
        const text = await res.text()
        throw new Error(`${res.status}: ${text}`)
      }

      const data: WeatherResponse = await res.json()
      setResult(data)
      setStatus('success')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error')
      setStatus('error')
    }
  }

  const units = UNIT_LABELS[unitGroup]

  return (
    <div className="max-w-4xl mx-auto px-6 pt-16 pb-32">
      <span className="section-label block mb-4">// Live Demo — Weather API</span>
      <h1 className="display mb-2">Weather API</h1>
      <p className="mono text-text-muted text-sm mb-12">
        15-day forecast via Visual Crossing, cached in Redis on Railway.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Location */}
        <div>
          <span className="section-label block mb-3">// LOCATION</span>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="City, address, ZIP, or lat/lon..."
            className="w-full bg-transparent border border-border-strong mono text-sm px-4 py-3 text-text placeholder:text-text-muted focus:outline-none focus:border-text"
          />
        </div>

        {/* Units */}
        <div>
          <span className="section-label block mb-3">// UNITS</span>
          <div className="flex gap-2">
            {(['us', 'metric', 'uk'] as UnitGroup[]).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUnitGroup(u)}
                className={`mono text-xs px-4 py-2 border transition-colors ${
                  unitGroup === u
                    ? 'border-text bg-text text-background'
                    : 'border-border-strong text-text-muted hover:border-text hover:text-text'
                }`}
              >
                [ {u.toUpperCase()} ]
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={status === 'loading' || !location.trim()}
          className="mono text-sm border border-text px-6 py-3 hover:bg-text hover:text-background transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {status === 'loading' ? '[ Fetching... ]' : '[ Get Weather ] →'}
        </button>
      </form>

      <div className="mt-12">
        {status === 'loading' && <LoadingSkeleton />}
        {status === 'error' && (
          <div className="border border-dashed border-border-strong p-4">
            <span className="section-label text-text-muted block mb-2">// ERROR</span>
            <p className="mono text-sm text-text-muted break-all">{errorMsg}</p>
          </div>
        )}
        {status === 'success' && result && (
          <WeatherResults result={result} units={units} />
        )}
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-3 bg-border-strong w-1/3" />
      <div className="h-3 bg-border-strong w-full" />
      <div className="h-3 bg-border-strong w-5/6" />
      <div className="h-3 bg-border-strong w-2/3" />
    </div>
  )
}

function WeatherResults({
  result,
  units,
}: {
  result: WeatherResponse
  units: { temp: string; speed: string }
}) {
  const today = result.days[0]
  const forecast = result.days.slice(1, 8)

  return (
    <div className="space-y-10">
      {/* Location + summary */}
      <div>
        <span className="section-label block mb-1">// {result.resolvedAddress.toUpperCase()}</span>
        <p className="mono text-xs text-text-muted">{result.description}</p>
      </div>

      {/* Current conditions */}
      {result.currentConditions && (
        <div>
          <span className="section-label block mb-4">// CURRENT CONDITIONS</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px border border-border-strong">
            <Stat label="TEMP" value={`${Math.round(result.currentConditions.temp)}${units.temp}`} />
            <Stat label="FEELS LIKE" value={`${Math.round(result.currentConditions.feelslike)}${units.temp}`} />
            <Stat label="HUMIDITY" value={`${Math.round(result.currentConditions.humidity)}%`} />
            <Stat label="WIND" value={`${Math.round(result.currentConditions.windspeed)} ${units.speed}`} />
          </div>
          <p className="mono text-xs text-text-muted mt-2">{result.currentConditions.conditions}</p>
        </div>
      )}

      {/* Today */}
      {today && (
        <div>
          <span className="section-label block mb-4">// TODAY</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px border border-border-strong">
            <Stat label="HIGH" value={`${Math.round(today.tempmax)}${units.temp}`} />
            <Stat label="LOW" value={`${Math.round(today.tempmin)}${units.temp}`} />
            <Stat label="PRECIP" value={`${Math.round(today.precipprob)}%`} />
            <Stat label="WIND" value={`${Math.round(today.windspeed)} ${units.speed}`} />
          </div>
          {today.description && (
            <p className="mono text-xs text-text-muted mt-2">{today.description}</p>
          )}
        </div>
      )}

      {/* 7-day forecast */}
      {forecast.length > 0 && (
        <div>
          <span className="section-label block mb-4">// 7-DAY FORECAST</span>
          <div className="space-y-0 border border-border-strong divide-y divide-border-strong">
            {forecast.map((day) => (
              <div
                key={day.datetime}
                className="grid grid-cols-4 px-4 py-3 mono text-xs"
              >
                <span className="text-text-muted">{formatDate(day.datetime)}</span>
                <span className="text-text">
                  {Math.round(day.tempmax)}{units.temp} / {Math.round(day.tempmin)}{units.temp}
                </span>
                <span className="text-text-muted">{Math.round(day.precipprob)}% precip</span>
                <span className="text-text-muted truncate">{day.conditions}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4">
      <span className="mono text-xs text-text-muted block mb-1">{label}</span>
      <span className="mono text-lg text-text">{value}</span>
    </div>
  )
}
