import { useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell,
  ChevronDown,
  FileSpreadsheet,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  UserCheck,
  X,
} from 'lucide-react'
import { usePortalStore } from '@/store/portalStore'
import { ROLE_LABELS } from '@/lib/access'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui'
import { toast } from 'sonner'
import { authService } from '@/services/authService'

type NavItem = { to: string; label: string }
type NavGroup = { label: string; icon: typeof LayoutDashboard; items: NavItem[] }

// Focused navigation: Student data and mapping only
const NAV: NavGroup[] = [
  {
    label: 'Student Portal',
    icon: LayoutDashboard,
    items: [
      { to: '/', label: 'Overview' },
    ],
  },
  {
    label: 'Student Records',
    icon: GraduationCap,
    items: [
      { to: '/students', label: 'All Students' },
    ],
  },
  {
    label: 'Data & Database Mapping',
    icon: FileSpreadsheet,
    items: [
      { to: '/data/import', label: 'Student Import & Mapping' },
      { to: '/data/validation', label: 'Data Validation' },
      { to: '/data/quality', label: 'Data Quality & Completeness' },
      { to: '/data/history', label: 'Change History' },
    ],
  },
  {
    label: 'Reports',
    icon: UserCheck,
    items: [
      { to: '/reports/students', label: 'Student Reports' },
    ],
  },
]

export function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const user = usePortalStore((s) => s.currentUser)
  const logout = usePortalStore((s) => s.logout)
  const notifications = usePortalStore((s) => s.notifications)
  const students = usePortalStore((s) => s.students)
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const unread = notifications.filter((n) => !n.isRead).length

  async function signOut() {
    try {
      await authService.signOut()
      logout()
      navigate('/login')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to sign out.')
    }
  }

  const navigation = useMemo(() => {
    const list = [...NAV]
    if (user?.role === 'super_admin' || user?.role === 'iqac_admin') {
      list.push({
        label: 'Administration',
        icon: ShieldCheck,
        items: [
          { to: '/admin/users', label: 'User Management' },
          { to: '/admin/roles', label: 'Roles & Access' },
          { to: '/admin/audit', label: 'Audit Logs' },
        ],
      })
    }
    return list
  }, [user?.role])

  const crumbs = useMemo(() => {
    const parts = location.pathname.split('/').filter(Boolean)
    if (!parts.length) return ['Student Overview']
    return parts.map((p) => p.replace(/-/g, ' '))
  }, [location.pathname])

  const results = useMemo(() => {
    if (q.trim().length < 2) return []
    const term = q.toLowerCase()
    return students
      .filter((s) => s.fullName.toLowerCase().includes(term) || s.registrationId.toLowerCase().includes(term))
      .slice(0, 6)
      .map((s) => ({ type: 'Student', label: `${s.fullName} (${s.registrationId})`, to: `/students/${s.id}` }))
  }, [q, students])

  return (
    <div className="flex min-h-screen bg-[#f4f6f8] text-navy-900">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-navy-900 text-slate-100 transition-transform duration-200 lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-0 max-lg:-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-navy-800 px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold-500 font-bold text-navy-950 shadow">
              IQ
            </div>
            <div>
              <p className="text-sm font-semibold tracking-wide text-white">Student Data Portal</p>
              <p className="text-xs text-navy-300">Database & Mapping Focus</p>
            </div>
          </div>
          <button
            type="button"
            className="rounded p-1 text-navy-300 hover:text-white lg:hidden"
            onClick={() => setOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-4">
          {navigation.map((group) => (
            <div key={group.label}>
              <div className="mb-2 flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-wider text-navy-300">
                <group.icon className="h-3.5 w-3.5" />
                <span>{group.label}</span>
              </div>
              <ul className="space-y-1">
                {group.items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.to === '/'}
                      onClick={() => setOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center justify-between rounded-md px-3 py-2 text-sm transition',
                          isActive
                            ? 'bg-navy-800 font-medium text-white shadow-sm'
                            : 'text-navy-200 hover:bg-navy-800/60 hover:text-white',
                        )
                      }
                    >
                      <span>{item.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-navy-800 p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{user?.fullName ?? 'User'}</p>
              <p className="truncate text-xs text-navy-300">
                {user ? ROLE_LABELS[user.role] : 'Guest'}
              </p>
            </div>
            <button
              type="button"
              onClick={signOut}
              title="Sign out"
              className="rounded p-1.5 text-navy-300 hover:bg-navy-800 hover:text-rose-400"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded p-1 text-navy-700 hover:bg-slate-100 lg:hidden"
              onClick={() => setOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center gap-2 text-xs text-navy-500">
              {crumbs.map((c, i) => (
                <span key={i} className="flex items-center gap-2 capitalize">
                  {i > 0 && <span className="text-slate-300">/</span>}
                  <span>{c}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="search"
                  placeholder="Quick search student..."
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value)
                    setShowSearch(true)
                  }}
                  onFocus={() => setShowSearch(true)}
                  className="h-9 w-48 rounded-md border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs focus:bg-white sm:w-64"
                />
              </div>

              {showSearch && results.length > 0 && (
                <div
                  className="absolute right-0 mt-2 w-72 rounded-lg border border-slate-200 bg-white p-2 shadow-xl"
                  onMouseLeave={() => setShowSearch(false)}
                >
                  <p className="px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Student Matches
                  </p>
                  {results.map((r, i) => (
                    <NavLink
                      key={i}
                      to={r.to}
                      onClick={() => {
                        setShowSearch(false)
                        setQ('')
                      }}
                      className="flex items-center justify-between rounded px-2 py-1.5 text-xs hover:bg-slate-50"
                    >
                      <span className="truncate font-medium text-navy-900">{r.label}</span>
                      <Badge tone="blue">{r.type}</Badge>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>

            <NavLink
              to="/data/quality"
              className="relative rounded p-2 text-navy-600 hover:bg-slate-100"
              title="Data Completeness"
            >
              <ShieldCheck className="h-5 w-5" />
            </NavLink>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
