import { useRef, useState } from 'react'
import type { ProjectVideo } from '@/types'

function formatTimestamp(totalS: number) {
  const s = Math.floor(totalS)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export function ProjectVideoBlock({ video }: { video: ProjectVideo }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [currentS, setCurrentS] = useState(0)

  let activeIndex = -1
  video.chapters.forEach((c, i) => { if (c.timeS <= currentS) activeIndex = i })

  function seek(timeS: number) {
    const el = ref.current
    if (!el) return
    const go = () => {
      el.currentTime = timeS
      // Autoplay policy can reject play() (NotAllowedError), and a pause or
      // navigation while play is pending interrupts it (AbortError). In both
      // the seek still happened. Anything else is a real error.
      el.play().catch((err: unknown) => {
        const benign = err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'AbortError')
        if (!benign) throw err
      })
    }
    // With preload="metadata" the duration may not be known yet on first click;
    // setting currentTime before metadata loads is ignored by some browsers.
    if (el.readyState === 0) {
      el.addEventListener('loadedmetadata', go, { once: true })
      el.load()
    } else {
      go()
    }
  }

  return (
    <div className="grid min-w-0 gap-6 lg:gap-8 lg:grid-cols-[minmax(0,1fr)_16rem] items-start">
      <figure className="min-w-0">
        <div className="relative">
          <video
            ref={ref}
            src={video.src}
            poster={video.poster}
            controls
            preload="metadata"
            playsInline
            onTimeUpdate={e => setCurrentS(e.currentTarget.currentTime)}
            className="w-full max-h-[75dvh] object-contain border border-border bg-black [image-rendering:pixelated]"
          />
          {video.speedLabel && (
            <span
              aria-hidden="true"
              className="absolute right-2 top-2 mono bg-background/70 px-1.5 py-0.5 text-text pointer-events-none"
            >
              {video.speedLabel}
            </span>
          )}
        </div>
        {video.speedLabel && (
          <span className="sr-only">Playback speed {video.speedLabel}</span>
        )}
        <figcaption className="mt-3 text-sm text-text-muted leading-relaxed max-w-2xl">
          {video.caption}
        </figcaption>
      </figure>

      <ol className="flex gap-2 overflow-x-auto scroll-hide pb-2 lg:block lg:space-y-1 lg:max-h-[36rem] lg:overflow-y-auto lg:pb-0">
        {video.chapters.map((c, i) => (
          <li key={c.label} className="shrink-0 lg:shrink">
            <button
              type="button"
              onClick={() => seek(c.timeS)}
              aria-current={i === activeIndex ? 'true' : undefined}
              className={`mono inline-flex min-h-11 items-center gap-2 whitespace-nowrap px-3 border border-border lg:w-full lg:border-0 lg:px-0 lg:whitespace-normal lg:text-left transition-colors duration-200 hover:text-text focus-visible:-outline-offset-2 ${
                i === activeIndex ? 'text-accent' : 'text-text-muted'
              }`}
            >
              <span className="shrink-0 tabular-nums">{formatTimestamp(c.timeS)} ——</span>
              <span>{c.label}</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  )
}
