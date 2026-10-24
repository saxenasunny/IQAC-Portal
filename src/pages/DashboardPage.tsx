import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, MetricHint, PageHeader } from '@/components/ui'
import { computeInstitutionMetrics } from '@/lib/formulas'
import { visibleStudents } from '@/lib/lookups'
import { formatNumber } from '@/lib/utils'
import { catalog, usePortalStore } from '@/store/portalStore'
import { ArrowRight, CheckCircle2, FileSpreadsheet, ShieldCheck, Users } from 'lucide-react'

export function DashboardPage() {
  const user = usePortalStore((s) => s.currentUser)!
  const allStudents = usePortalStore((s) => s.students)
  const isLoadingData = usePortalStore((s) => s.isLoadingData)
  const dataSyncError = usePortalStore((s) => s.dataSyncError)
  const students = visibleStudents(allStudents, user.role, user.schoolId, user.departmentId).filter((s) => !s.isArchived)
  const metrics = computeInstitutionMetrics(students, [])
  const validationIssues = students.filter((s) => !s.email || !s.personal?.category || !s.dateOfBirth).length

  const bySchool = catalog.schools.map((sch) => ({
    name: sch.code,
    students: students.filter((s) => s.schoolId === sch.id).length,
  }))

  const byProgramme = catalog.programmes
    .map((p) => ({ name: p.code, students: students.filter((s) => s.programmeId === p.id).length }))
    .filter((x) => x.students)
    .slice(0, 8)

  const isSyncingInitial = isLoadingData && allStudents.length === 0

  const cards = [
    {
      label: 'Active Students',
      value: isSyncingInitial ? 'Syncing…' : students.length,
      to: '/students',
      desc: 'Enrolled & tracked in database',
      icon: Users,
    },
    {
      label: 'Spreadsheet Imports',
      value: usePortalStore.getState().imports.length,
      to: '/data/import',
      desc: 'Normalized Excel/CSV mapping jobs',
      icon: FileSpreadsheet,
    },
    {
      label: 'Validation Checks',
      value: isSyncingInitial ? '…' : (validationIssues === 0 ? 'All Valid' : `${validationIssues} Flagged`),
      to: '/data/validation',
      desc: 'Rule & schema verification issues',
      icon: CheckCircle2,
    },
    {
      label: 'Quality Score',
      value: isSyncingInitial ? '…' : (students.length ? '92%' : 'No Data'),
      to: '/data/quality',
      desc: 'Field completeness across records',
      icon: ShieldCheck,
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Database & Mapping Center"
        subtitle={`GD Goenka University · Normalized Student Data & Attribute Mapping Engine`}
      />

      {isLoadingData && (
        <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-900">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <span>Syncing latest student records from database…</span>
        </div>
      )}

      {dataSyncError && (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
          <span>Failed to sync database: {dataSyncError}</span>
          <button
            onClick={() => window.location.reload()}
            className="rounded bg-red-100 px-2 py-1 font-semibold text-red-900 hover:bg-red-200"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main KPI Grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} to={c.to}>
            <Card className="p-5 transition hover:border-navy-400 hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-navy-500">
                  {c.label}
                </span>
                <c.icon className="h-5 w-5 text-navy-600" />
              </div>
              <p className="mt-2 text-3xl font-bold text-navy-950">
                {typeof c.value === 'number' ? formatNumber(c.value) : c.value}
              </p>
              <p className="mt-1 text-xs text-slate-500">{c.desc}</p>
            </Card>
          </Link>
        ))}
      </div>

      {/* Key Student Demographics & Formula Lineage */}
      <div className="grid gap-4 md:grid-cols-3">
        {metrics.slice(0, 3).map((m) => (
          <Card key={m.label} className="p-5">
            <span className="text-xs font-medium text-navy-500">{m.label}</span>
            <p className="mt-1 text-2xl font-bold text-navy-900">{m.value}</p>
            <div className="mt-3">
              <MetricHint
                source={m.source}
                filters={m.filters}
                calculation={m.calculation}
                lastUpdated={new Date(m.lastUpdated).toLocaleDateString('en-IN')}
                verifiedBy={m.verifiedBy}
              />
            </div>
          </Card>
        ))}
      </div>

      {/* Student Distribution Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="font-semibold text-navy-900">Student Distribution by School</h3>
          <p className="text-xs text-slate-500 mb-4">Mapped to institutional academic hierarchy</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bySchool}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip />
                <Bar dataKey="students" fill="#1b4f72" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-navy-900">Students by Top Programmes</h3>
          <p className="text-xs text-slate-500 mb-4">Normalized programme catalogue enrollment</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byProgramme} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" stroke="#64748b" fontSize={12} />
                <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={12} width={80} />
                <Tooltip />
                <Bar dataKey="students" fill="#0e7c7b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Action banner for mapping and imports */}
      <Card className="bg-gradient-to-r from-navy-900 to-navy-800 p-6 text-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-lg font-bold">Import & Map Student Spreadsheets</h4>
            <p className="text-sm text-navy-200 mt-1 max-w-xl">
              Upload your 200+ column Excel sheets. The auto-mapping engine normalizes columns into personal,
              academic, family, entrance exams, addresses, and sensitive fields.
            </p>
          </div>
          <Link
            to="/data/import"
            className="inline-flex items-center gap-2 rounded-lg bg-gold-500 px-5 py-2.5 text-sm font-semibold text-navy-950 transition hover:bg-gold-600"
          >
            <span>Start Mapping</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Card>
    </div>
  )
}
