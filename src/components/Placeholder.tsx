import clsx from 'clsx'

// A frame that stands in for a picture that does not exist yet. It is meant to
// look unfinished (dashed border, hatching, the word "Placeholder") so nobody
// mistakes it for the real thing. `label` says what will go there.
export function Placeholder({
  label,
  compact = false,
  className,
}: {
  label: string
  // Small frames (row thumbnails) show only the word; the label is still read out.
  compact?: boolean
  className?: string
}) {
  return (
    <div
      role="img"
      aria-label={`Placeholder: ${label}`}
      className={clsx(
        'placeholder-hatch flex flex-col items-center justify-center gap-2 border border-dashed border-border-strong p-4 text-center',
        className,
      )}
    >
      <span className="mono uppercase text-text-muted">Placeholder</span>
      {!compact && <span className="max-w-sm text-sm text-text-muted leading-relaxed">{label}</span>}
    </div>
  )
}
