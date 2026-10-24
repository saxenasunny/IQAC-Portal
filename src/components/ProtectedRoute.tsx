import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { toast } from 'sonner'
import { Button, Card } from '@/components/ui'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { authService } from '@/services/authService'
import { studentService } from '@/services/studentService'
import { facultyService } from '@/services/facultyService'
import { usePortalStore } from '@/store/portalStore'

export function ProtectedRoute() {
  const user = usePortalStore((s) => s.currentUser)
  const setAuthenticatedUser = usePortalStore((s) => s.setAuthenticatedUser)
  const students = usePortalStore((s) => s.students)
  const faculty = usePortalStore((s) => s.faculty)
  const setStudents = usePortalStore((s) => s.setStudents)
  const setFaculty = usePortalStore((s) => s.setFaculty)
  const setIsLoadingData = usePortalStore((s) => s.setIsLoadingData)
  const setDataSyncError = usePortalStore((s) => s.setDataSyncError)

  // If user is already in store (from LoginPage or localStorage), unblock UI immediately
  const [ready, setReady] = useState(() => !isSupabaseConfigured || Boolean(user))
  const [authError, setAuthError] = useState('')
  const [dataAttempt, setDataAttempt] = useState(0)

  // 1. Session verification & Profile resolution (fast: ~100-200ms)
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return
    let cancelled = false

    async function verifySession() {
      try {
        const { data, error } = await supabase!.auth.getSession()
        if (error || !data.session) {
          if (!cancelled) {
            setAuthenticatedUser(null)
            setReady(true)
          }
          return
        }

        if (!user) {
          const profile = await authService.profileForUser(data.session.user.id)
          if (!cancelled) {
            setAuthenticatedUser(profile)
            setReady(true)
          }
        } else {
          if (!cancelled) setReady(true)
        }
      } catch (err) {
        if (!cancelled) {
          if (!user) {
            setAuthError(err instanceof Error ? err.message : 'Unable to verify your session.')
          }
          setReady(true)
        }
      }
    }

    void verifySession()
    return () => {
      cancelled = true
    }
  }, [user, setAuthenticatedUser])

  // 2. Asynchronous background data sync (does not block landing on dashboard)
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !user) return
    let cancelled = false

    async function syncData() {
      setIsLoadingData(true)
      setDataSyncError(null)
      try {
        const [studentList, facultyList] = await Promise.all([
          studentService.listPortal(),
          facultyService.list(),
        ])
        if (!cancelled) {
          setStudents(studentList)
          setFaculty(facultyList)
          setIsLoadingData(false)
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to sync latest portal data.'
          setDataSyncError(message)
          setIsLoadingData(false)
          toast.error(message)
        }
      }
    }

    // Sync if data is not yet in memory or if user explicitly requested a retry
    if (students.length === 0 || faculty.length === 0 || dataAttempt > 0) {
      void syncData()
    }

    return () => {
      cancelled = true
    }
  }, [user?.id, dataAttempt, setFaculty, setIsLoadingData, setDataSyncError, setStudents])

  if (!ready) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-navy-700 border-t-transparent" />
          <p className="text-sm font-medium text-navy-800">Connecting to Portal…</p>
        </div>
      </div>
    )
  }

  if (!isSupabaseConfigured) return <Navigate to="/login" replace />

  if (authError) {
    return (
      <div className="mx-auto mt-12 max-w-xl">
        <Card className="space-y-4 p-6">
          <h1 className="text-lg font-semibold text-navy-950">Could not verify portal account</h1>
          <p className="text-sm text-red-700">{authError}</p>
          <div className="flex gap-2">
            <Button onClick={() => window.location.reload()}>Retry</Button>
            <Button
              variant="outline"
              onClick={() => {
                void authService.signOut().then(() => {
                  setAuthenticatedUser(null)
                  setAuthError('')
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
