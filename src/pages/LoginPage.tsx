import { FormEvent, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { demoUsers } from '@/data/seed'
import { ROLE_LABELS } from '@/lib/access'
import { catalog, usePortalStore } from '@/store/portalStore'
import { Button, Card, Input } from '@/components/ui'

export function LoginPage() {
  const user = usePortalStore((s) => s.currentUser)
  const login = usePortalStore((s) => s.login)
  const navigate = useNavigate()
  const [email, setEmail] = useState('iqac.admin@apex.edu')
  const [password, setPassword] = useState('Portal@2026')
  const [error, setError] = useState<string | null>(null)

  if (user) return <Navigate to="/" replace />

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const msg = login(email, password)
    if (msg) setError(msg)
    else navigate('/')
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-navy-950 p-10 text-white lg:flex">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-gold-500">Internal Quality Assurance Cell</p>
          <h1 className="mt-4 text-4xl font-semibold">Accreditation & Ranking Data Management Portal</h1>
          <p className="mt-4 max-w-md text-navy-200">
            A single source of truth for students, faculty, evidence and ranking submissions at {catalog.institution.name}.
          </p>
        </div>
        <ul className="space-y-2 text-sm text-navy-200">
          <li>Normalized institutional data — not per-framework duplicates</li>
          <li>Role and department scoped access with audit history</li>
          <li>Designed for NAAC, NIRF, NBA, QS, THE and sustainability modules</li>
        </ul>
      </div>
      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-8">
          <p className="text-xs uppercase tracking-[0.2em] text-gold-600">Apex University</p>
          <h2 className="mt-2 text-2xl font-semibold text-navy-900">IQAC Data Management Portal</h2>
          <p className="mt-1 text-sm text-navy-500">Sign in with your institutional account.</p>
          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <label className="block text-sm font-medium">
              Email
              <Input className="mt-1" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
            </label>
            <label className="block text-sm font-medium">
              Password
              <Input className="mt-1" value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
            </label>
            {error ? <p className="text-sm text-red-700">{error}</p> : null}
            <Button type="submit" className="w-full">
              Login
            </Button>
            <p className="text-center text-xs text-navy-400">Forgot password? Contact IQAC administration.</p>
          </form>
          <div className="mt-6 border-t border-navy-100 pt-4">
            <p className="mb-2 text-xs font-medium text-navy-500">Demo accounts (password: Portal@2026)</p>
            <div className="grid max-h-48 grid-cols-1 gap-1 overflow-auto text-xs">
              {demoUsers.map((u) => (
                <button
                  key={u.id}
                  className="flex justify-between rounded px-2 py-1 text-left hover:bg-navy-50"
                  onClick={() => {
                    setEmail(u.email)
                    setPassword(u.password)
                  }}
                >
                  <span>{u.email}</span>
                  <span className="text-navy-400">{ROLE_LABELS[u.role]}</span>
                </button>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
