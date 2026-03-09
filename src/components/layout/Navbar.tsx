import { Link, useLocation } from 'react-router-dom'
import { navLinks } from '@/data/navigation'
import { useScrolled } from '@/hooks/useScrolled'
import { cn } from '@/lib/utils'

export function Navbar() {
  const { pathname } = useLocation()
  const scrolled = useScrolled()

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 bg-background transition-colors duration-300',
        scrolled && 'border-b border-border'
      )}
    >
      <div className="max-w-6xl mx-auto px-6 h-12 flex items-center justify-between">
        <Link to="/" className="mono text-text-muted hover:text-text transition-colors duration-200 uppercase tracking-wider">
          OJ
        </Link>

        <nav className="flex items-center gap-8">
          {navLinks.map(({ label, href }) => (
            <Link
              key={href}
              to={href}
              className={cn(
                'mono uppercase tracking-wider transition-colors duration-200',
                pathname === href ? 'text-text' : 'text-text-muted hover:text-text'
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
