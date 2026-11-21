import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import Demo from './Demo'

export default function ProtectedDemo() {
  return (
    <ProtectedRoute>
      <Demo />
    </ProtectedRoute>
  )
}
