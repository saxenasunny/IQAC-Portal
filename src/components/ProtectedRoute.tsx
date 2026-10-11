import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { toast } from 'sonner'
import { Button, Card } from '@/components/ui'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { authService } from '@/services/authService'
import { studentService } from '@/services/studentService'
import { usePortalStore } from '@/store/portalStore'

export function ProtectedRoute() {
  const user = usePortalStore((s) => s.currentUser)
  const setAuthenticatedUser = usePortalStore((s) => s.setAuthenticatedUser)
  const setStudents = usePortalStore((s) => s.setStudents)
  const [ready, setReady] = useState(!isSupabaseConfigured)
  const [loadError, setLoadError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return
    let cancelled = false

    async function restoreSession() {
      setReady(false)
      setLoadError('')
      try {
        const { data, error } = await supabase!.auth.getSession()
        if (error) throw error
        if (!data.session) {
          if (!cancelled) {
            setAuthenticatedUser(null)
            setReady(true)
          }
          return
        }
        const profile = await authService.profileForUser(data.session.user.id)
        const students = await studentService.listPortal()
        if (!cancelled) {
          setAuthenticatedUser(profile)
          setStudents(students)
          setReady(true)
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : 'Unable to load your Supabase account and student data.')
          setReady(true)
        }
      }
    }

    void restoreSession()
    return () => {
      cancelled = true
    }
  }, [attempt, setAuthenticatedUser, setStudents])

  if (!ready) return <Card className="m-6 p-6 text-sm text-navy-600">Connecting to Supabase…</Card>
  if (!isSupabaseConfigured) return <Navigate to="/login" replace />
  if (loadError) {
    return (
      <div className="mx-auto mt-12 max-w-xl">
        <Card className="space-y-4 p-6">
          <h1 className="text-lg font-semibold">Could not load portal data</h1>
          <p className="text-sm text-red-700">{loadError}</p>
          <div className="flex gap-2">
            <Button onClick={() => setAttempt((value) => value + 1)}>Retry</Button>
            <Button
              variant="outline"
              onClick={() => {
                void authService.signOut().then(() => {
                  setAuthenticatedUser(null)
                  setLoadError('')
                }).catch((error: unknown) => {
                  const message = error instanceof Error ? error.message : 'Unable to sign out.'
                  toast.error(message)
                })
              }}
            >
              Sign out
            </Button>
          </div>
        </Card>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}
