import { Navigate } from 'react-router-dom'
import { isAuthenticated } from '../utils/auth'

/**
 * ProtectedRoute — wraps a component that requires authentication.
 * If no valid JWT token exists (missing or expired), redirects to /login.
 */
export default function ProtectedRoute({ children }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }
  return children
}
