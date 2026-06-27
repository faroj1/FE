import { Navigate } from 'react-router-dom'
import { isAuthenticated, getUser } from '../utils/auth'

/**
 * ProtectedRoute — wraps a component that requires authentication.
 * If no valid JWT token exists (missing or expired), redirects to /login.
 * If the authenticated user is not email-verified, redirects to /verify-email.
 */
export default function ProtectedRoute({ children }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }

  const user = getUser()
  if (user?.email_verified === false) {
    return <Navigate to="/verify-email" replace />
  }

  return children
}
