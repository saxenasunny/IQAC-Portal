import { usePortalStore } from '@/store/portalStore'

export function useAuth() {
  const currentUser = usePortalStore((s) => s.currentUser)
  const logout = usePortalStore((s) => s.logout)
  return { currentUser, logout, isAuthenticated: Boolean(currentUser) }
}
