import { Link } from 'react-router-dom'
import { profile } from '@/data/profile'

const linkClass = 'inline-flex min-h-11 items-center mono text-text-muted hover:text-text'

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-border mt-24 print:hidden">
      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs text-text-muted">© {year} {profile.name}</span>
        <div className="flex flex-wrap items-center gap-x-6">
          <Link to="/now" className={linkClass}>
            Now
          </Link>
          <a href={`mailto:${profile.email}`} className={linkClass}>
            Email
          </a>
          {profile.links.map(({ label, href }) => (
            <a key={href} href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
              {label}
            </a>
          ))}
          {profile.cvHref && (
            <a href={profile.cvHref} className={linkClass}>
              CV
            </a>
          )}
        </div>
      </div>
    </footer>
  )
}
