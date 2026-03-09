import { Link } from 'react-router-dom'
import { PageTransition } from '@/components/layout/PageTransition'

export default function NotFound() {
  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto px-6 pt-32 pb-32">
        <span className="label block mb-6">404</span>
        <h1 className="heading-lg mb-6">Page not found.</h1>
        <Link
          to="/"
          className="text-sm text-text-muted hover:text-text transition-colors duration-200"
        >
          ← Back home
        </Link>
      </div>
    </PageTransition>
  )
}
