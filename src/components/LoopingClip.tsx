import { useState } from 'react'

// A short silent clip that plays on a loop, like an animated picture. Readers
// who asked their system for reduced motion get the still frame instead.
export function LoopingClip({
  src,
  poster,
  alt,
  className,
}: {
  src: string
  poster: string
  alt: string
  className?: string
}) {
  const [still] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  if (still) return <img src={poster} alt={alt} className={className} />

  return (
    <video
      src={src}
      poster={poster}
      aria-label={alt}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      className={className}
    />
  )
}
