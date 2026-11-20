import { Link, useLocation } from 'react-router-dom'
import { useAuth, UserButton } from '@clerk/react-router'
import { navLinks } from '@/data/navigation'
import { useScrolled } from '@/hooks/useScrolled'
import { cn } from '@/lib/utils'

export function Navbar() {
  const { pathname } = useLocation()
  const scrolled = useScrolled()
  const { isSignedIn } = useAuth()

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 bg-background transition-colors duration-300',
        scrolled && 'border-b border-border'
      )}
    >
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex min-h-11 items-center px-1 mono text-text-muted hover:text-text transition-colors duration-200 uppercase tracking-wider"
        >
          OJ
        </Link>

        <div className="flex items-center gap-3 sm:gap-8">
          <nav aria-label="Primary" className="flex items-center gap-3 sm:gap-8">
            {navLinks.map(({ label, href }) => {
              const active = pathname === href || pathname.startsWith(href + '/')
              return (
                <Link
                  key={href}
                  to={href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'inline-flex min-h-11 items-center px-1 mono uppercase tracking-wider transition-colors duration-200',
                    active
                      ? 'text-text underline decoration-accent decoration-2 underline-offset-8'
                      : 'text-text-muted hover:text-text'
                  )}
                >
                  {label}
                </Link>
              )
            })}
          </nav>

          {isSignedIn ? (
            <UserButton
              appearance={{
                elements: {
                  avatarBox: 'w-7 h-7',
                },
              }}
            />
          ) : (
            <Link
              to="/sign-in"
              className="inline-flex min-h-11 items-center px-1 mono text-text-muted hover:text-text transition-colors duration-200"
            >
              [ Sign In ]
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
