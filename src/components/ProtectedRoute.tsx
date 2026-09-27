import { Navigate, Outlet } from 'react-router-dom'
import { usePortalStore } from '@/store/portalStore'

export function ProtectedRoute() {
  const user = usePortalStore((s) => s.currentUser)
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}
