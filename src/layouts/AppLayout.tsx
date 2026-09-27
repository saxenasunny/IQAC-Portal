import { useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell,
  Building2,
  ChevronDown,
  ClipboardList,
  FileText,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Shield,
  Users,
  X,
} from 'lucide-react'
import { catalog, usePortalStore } from '@/store/portalStore'
import { ROLE_LABELS } from '@/lib/access'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui'

type NavItem = { to: string; label: string }
type NavGroup = { label: string; icon: typeof LayoutDashboard; items: NavItem[] }

const NAV: NavGroup[] = [
  { label: 'Overview', icon: LayoutDashboard, items: [{ to: '/', label: 'Dashboard' }] },
  {
    label: 'Institution',
    icon: Building2,
    items: [
      { to: '/institution', label: 'Institution Profile' },
      { to: '/institution/campuses', label: 'Campuses' },
      { to: '/institution/schools', label: 'Schools' },
      { to: '/institution/departments', label: 'Departments' },
      { to: '/institution/programmes', label: 'Programmes' },
    ],
  },
  {
    label: 'People',
    icon: Users,
    items: [
      { to: '/students', label: 'Students' },
      { to: '/faculty', label: 'Faculty' },
      { to: '/staff', label: 'Staff' },
    ],
  },
  {
    label: 'Data Management',
    icon: FolderOpen,
    items: [
      { to: '/data/import', label: 'Import Data' },
      { to: '/data/validation', label: 'Data Validation' },
      { to: '/data/quality', label: 'Data Quality' },
      { to: '/data/history', label: 'Data Change History' },
    ],
  },
  {
    label: 'Accreditation & Rankings',
    icon: ClipboardList,
    items: [
      { to: '/accreditation/NAAC', label: 'NAAC' },
      { to: '/accreditation/NIRF', label: 'NIRF' },
      { to: '/accreditation/NBA', label: 'NBA' },
      { to: '/accreditation/QS', label: 'QS' },
      { to: '/accreditation/THE', label: 'THE' },
      { to: '/accreditation/SUS', label: 'Sustainability' },
    ],
  },
  {
    label: 'Documents & Evidence',
    icon: FileText,
    items: [
      { to: '/documents', label: 'Documents' },
      { to: '/documents/evidence', label: 'Evidence Repository' },
      { to: '/documents/pending', label: 'Pending Documents' },
      { to: '/documents/expiring', label: 'Expiring Documents' },
    ],
  },
  {
    label: 'Reports',
    icon: ClipboardList,
    items: [
      { to: '/reports/students', label: 'Student Reports' },
      { to: '/reports/faculty', label: 'Faculty Reports' },
      { to: '/reports/accreditation', label: 'Accreditation Reports' },
      { to: '/reports/export', label: 'Export Centre' },
    ],
  },
  {
    label: 'Administration',
    icon: Shield,
    items: [
      { to: '/admin/users', label: 'Users' },
      { to: '/admin/roles', label: 'Roles' },
      { to: '/admin/permissions', label: 'Permissions' },
      { to: '/admin/configuration', label: 'Configuration' },
      { to: '/admin/audit', label: 'Audit Logs' },
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
  const faculty = usePortalStore((s) => s.faculty)
  const documents = usePortalStore((s) => s.documents)
  const requirements = usePortalStore((s) => s.requirements)
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const unread = notifications.filter((n) => !n.isRead).length

  const crumbs = useMemo(() => {
    const parts = location.pathname.split('/').filter(Boolean)
    if (!parts.length) return ['Dashboard']
    return parts.map((p) => p.replace(/-/g, ' '))
  }, [location.pathname])

  const results = useMemo(() => {
    if (q.trim().length < 2) return []
    const term = q.toLowerCase()
    return [
      ...students
        .filter((s) => s.fullName.toLowerCase().includes(term) || s.registrationId.toLowerCase().includes(term))
        .slice(0, 4)
        .map((s) => ({ type: 'Student', label: s.fullName, to: `/students/${s.id}` })),
      ...faculty
        .filter((s) => s.fullName.toLowerCase().includes(term) || s.employeeId.toLowerCase().includes(term))
        .slice(0, 3)
        .map((s) => ({ type: 'Faculty', label: s.fullName, to: `/faculty/${s.id}` })),
      ...documents
        .filter((s) => s.title.toLowerCase().includes(term))
        .slice(0, 3)
        .map((s) => ({ type: 'Document', label: s.title, to: `/documents/${s.id}` })),
      ...catalog.departments
        .filter((s) => s.name.toLowerCase().includes(term))
        .slice(0, 2)
        .map((s) => ({ type: 'Department', label: s.name, to: '/institution/departments' })),
      ...catalog.programmes
        .filter((s) => s.name.toLowerCase().includes(term))
        .slice(0, 2)
        .map((s) => ({ type: 'Programme', label: s.name, to: '/institution/programmes' })),
      ...requirements
        .filter((s) => s.title.toLowerCase().includes(term) || s.indicatorCode.toLowerCase().includes(term))
        .slice(0, 3)
        .map((s) => ({ type: 'Requirement', label: s.title, to: `/accreditation/NAAC/${s.id}` })),
    ]
  }, [q, students, faculty, documents, requirements])

  return (
    <div className="flex min-h-screen bg-[#f4f6f8]">
      <aside
        className={cn(
          'fixed inset-y-0 z-40 w-72 overflow-y-auto bg-navy-950 text-navy-100 lg:static',
          open ? 'block' : 'hidden lg:block',
        )}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-gold-500">IQAC</p>
            <p className="text-lg font-semibold text-white">Data Portal</p>
            <p className="text-xs text-navy-300">{catalog.institution.shortName} University</p>
          </div>
          <button className="lg:hidden" onClick={() => setOpen(false)}>
            <X size={18} />
          </button>
        </div>
        <nav className="space-y-5 px-3 pb-10">
          {NAV.map((group) => (
            <div key={group.label}>
              <p className="mb-1 flex items-center gap-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-navy-400">
                <group.icon size={12} />
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'block rounded-lg px-3 py-2 text-sm',
                        isActive ? 'bg-navy-800 text-white' : 'text-navy-200 hover:bg-navy-900 hover:text-white',
                      )
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-navy-100 bg-white px-4 py-3">
          <button className="lg:hidden" onClick={() => setOpen(true)}>
            <Menu size={20} />
          </button>
          <div className="hidden text-xs capitalize text-navy-400 md:block">{crumbs.join(' / ')}</div>
          <div className="relative ml-auto w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-navy-400" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setShowSearch(true)
              }}
              onFocus={() => setShowSearch(true)}
              placeholder="Search students, faculty, documents..."
              className="h-9 w-full rounded-lg border border-navy-200 bg-navy-50 pl-9 pr-3 text-sm"
            />
            {showSearch && results.length > 0 && (
              <div className="absolute mt-1 w-full overflow-hidden rounded-lg border border-navy-100 bg-white shadow-card">
                {results.map((r) => (
                  <button
                    key={r.to + r.label}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-navy-50"
                    onClick={() => {
                      navigate(r.to)
                      setShowSearch(false)
                      setQ('')
                    }}
                  >
                    <span>{r.label}</span>
                    <span className="text-xs text-navy-400">{r.type}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="relative rounded-lg p-2 hover:bg-navy-50" onClick={() => navigate('/notifications')}>
            <Bell size={18} />
            {unread > 0 ? <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-600" /> : null}
          </button>
          <div className="flex items-center gap-2 rounded-lg border border-navy-100 px-2 py-1">
            <div className="hidden sm:block">
              <p className="text-sm font-medium leading-none">{user?.fullName}</p>
              <p className="text-[11px] text-navy-500">{user ? ROLE_LABELS[user.role] : ''}</p>
            </div>
            <ChevronDown size={14} className="text-navy-400" />
            <button title="Sign out" onClick={() => { logout(); navigate('/login') }}>
              <LogOut size={16} />
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
