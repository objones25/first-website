import { Link } from 'react-router-dom'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { PageTransition } from '@/components/layout/PageTransition'

export default function NotFound() {
  useDocumentMeta('Page not found')

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto px-6 pt-32 pb-32">
        <span className="section-label block mb-6">404</span>
        <h1 className="heading-lg mb-6">Page not found.</h1>
        <Link
          to="/"
          className="inline-flex min-h-11 items-center text-sm text-text-muted hover:text-text transition-colors duration-200"
        >
          ← Back home
        </Link>
      </div>
    </PageTransition>
  )
}
