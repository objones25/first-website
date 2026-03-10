export function WeatherDemo() {
  return (
    <div className="max-w-6xl mx-auto px-6 pt-16 pb-32">
      <span className="section-label block mb-4">// Live Demo — Weather API</span>
      <h1 className="display mb-8">Weather API</h1>
      <div className="border border-dashed border-border-strong p-8 max-w-2xl">
        <span className="mono text-text-muted block mb-2">[ Coming soon ]</span>
        <p className="mono text-text-muted text-sm">
          Enter a city and get real-time weather data from the Visual Crossing API,
          served via a FastAPI backend with Redis caching.
        </p>
      </div>
    </div>
  )
}
