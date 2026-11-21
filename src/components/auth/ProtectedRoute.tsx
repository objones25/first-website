import { useAuth } from '@clerk/react-router'
import { Navigate, useLocation } from 'react-router-dom'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth()
  const location = useLocation()

  if (!isLoaded) {
    return (
      <p role="status" className="mono text-text-muted max-w-6xl mx-auto px-6 pt-16">
        [ checking sign-in… ]
      </p>
    )
  }

  if (!isSignedIn) {
    return <Navigate to={`/sign-in?redirect_url=${encodeURIComponent(location.pathname)}`} replace />
  }

  return <>{children}</>
}
