import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth'

export function ProtectedRoute({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <main className="loading-screen">Validando sessão...</main>
  }

  if (!user) {
    return <Navigate to={admin ? '/admin/login' : '/login'} state={{ from: location.pathname }} replace />
  }

  if (admin && !user.is_platform_admin) {
    return <Navigate to="/app/dashboard" replace />
  }

  return <>{children}</>
}
