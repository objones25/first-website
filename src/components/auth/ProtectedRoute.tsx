import { useAuth } from '@clerk/react-router'
import { Navigate, useLocation } from 'react-router-dom'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth()
  const location = useLocation()

  if (!isLoaded) return null

  if (!isSignedIn) {
    return <Navigate to={`/sign-in?redirect_url=${location.pathname}`} replace />
  }

  return <>{children}</>
}
