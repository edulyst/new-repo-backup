import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { getAccessToken, getRole } from '@/lib/auth-storage'

export function ProtectedLayout() {
  const location = useLocation()
  if (!getAccessToken()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}

/** Only allows admin role — employer gets sent to /emp */
export function AdminGuard() {
  const role = getRole()
  if (role === 'employer') return <Navigate to="/emp" replace />
  if (!role) return <Navigate to="/login" replace />
  return <Outlet />
}

/** Only allows employer role — admin gets sent to / */
export function EmployerGuard() {
  const role = getRole()
  if (role === 'admin') return <Navigate to="/" replace />
  if (!role) return <Navigate to="/login" replace />
  return <Outlet />
}
