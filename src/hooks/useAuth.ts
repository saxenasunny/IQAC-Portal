import { usePortalStore } from '@/store/portalStore'

export function useAuth() {
  const currentUser = usePortalStore((s) => s.currentUser)
  const login = usePortalStore((s) => s.login)
  const logout = usePortalStore((s) => s.logout)
  return { currentUser, login, logout, isAuthenticated: Boolean(currentUser) }
}
