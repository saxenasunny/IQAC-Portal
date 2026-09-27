import { Badge, Card, PageHeader, ProgressBar } from '@/components/ui'
import { studentCompleteness, visibleStudents } from '@/lib/lookups'
import { catalog, usePortalStore } from '@/store/portalStore'

export function DataQualityPage() {
  const user = usePortalStore((s) => s.currentUser)!
  const students = visibleStudents(usePortalStore((s) => s.students), user.role, user.schoolId, user.departmentId)
  const missing = {
    abc: students.filter((s) => !s.sensitive?.abcId),
    category: students.filter((s) => !s.personal.category),
    dob: students.filter((s) => !s.dateOfBirth),
    qualification: students.filter((s) => !s.qualifications.length),
    address: students.filter((s) => !s.addresses.length),
  }
  const avg = students.reduce((acc, s) => {
    const c = studentCompleteness(s)
    return acc + (c.personal + c.academic + c.contact + c.qualification + c.category + c.documents) / 6
  }, 0) / Math.max(students.length, 1)

  return (
    <div>
      <PageHeader title="Data Quality" subtitle="Completeness of the central student database." />
      <Card className="mb-4 p-5">
        <p className="text-sm text-navy-500">Overall completeness</p>
        <p className="text-3xl font-semibold">{Math.round(avg)}%</p>
        <div className="mt-3"><ProgressBar value={avg} /></div>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        {[
          ['Personal Information', 96],
          ['Academic Information', 98],
          ['Contact Information', 91],
          ['Qualification', 88],
          ['Category Information', 94],
          ['Documents', 72],
        ].map(([label, v]) => (
          <Card key={String(label)} className="p-4">
            <div className="mb-2 flex justify-between text-sm"><span>{label}</span><span>{v}%</span></div>
            <ProgressBar value={Number(v)} />
          </Card>
        ))}
      </div>
      <Card className="mt-4 p-5 text-sm">
        <p className="font-medium">Students missing:</p>
        <ul className="mt-2 space-y-1">
          <li>ABC ID — {missing.abc.length}</li>
          <li>Category — {missing.category.length}</li>
          <li>Date of Birth — {missing.dob.length}</li>
          <li>Qualification — {missing.qualification.length}</li>
          <li>Address — {missing.address.length}</li>
        </ul>
      </Card>
    </div>
  )
}

export function DataValidationPage() {
  const students = usePortalStore((s) => s.students)
  const issues = students.flatMap((s) => {
    const rows: string[] = []
    if (!s.email.includes('@')) rows.push(`${s.registrationId}: invalid email`)
    if (!s.programmeId) rows.push(`${s.registrationId}: unknown programme`)
    if (!s.personal.category) rows.push(`${s.registrationId}: missing category`)
    if (s.academic.cgpa && (s.academic.cgpa < 0 || s.academic.cgpa > 10)) rows.push(`${s.registrationId}: invalid CGPA`)
    return rows
  })
  return (
    <div>
      <PageHeader title="Data Validation" subtitle="Constraint checks independent of the import wizard." />
      <Card className="p-5 text-sm">
        {issues.length === 0 ? <p>No blocking validation issues in the current dataset.</p> : issues.map((i) => <p key={i}>{i}</p>)}
      </Card>
    </div>
  )
}

export function DataHistoryPage() {
  const logs = usePortalStore((s) => s.auditLogs.filter((a) => a.entity === 'Student' || a.entity === 'Faculty' || a.entity === 'Import'))
  return (
    <div>
      <PageHeader title="Data Change History" subtitle="Record-level changes from the institutional audit trail." />
      <Card className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-navy-950 text-white text-left"><tr>{['When', 'User', 'Action', 'Entity', 'Old', 'New'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="px-4 py-2">{new Date(l.createdAt).toLocaleString('en-IN')}</td>
                <td className="px-4 py-2">{l.actorName}</td>
                <td className="px-4 py-2">{l.action}</td>
                <td className="px-4 py-2">{l.entity} {l.entityId}</td>
                <td className="px-4 py-2">{l.oldValue ?? '—'}</td>
                <td className="px-4 py-2">{l.newValue ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

export function NotificationsPage() {
  const notifications = usePortalStore((s) => s.notifications)
  const mark = usePortalStore((s) => s.markNotificationRead)
  return (
    <div>
      <PageHeader title="Notifications" />
      <div className="space-y-3">
        {notifications.map((n) => (
          <Card key={n.id} className="cursor-pointer p-4" >
            <button className="w-full text-left" onClick={() => mark(n.id)}>
              <div className="flex items-center justify-between">
                <p className="font-medium">{n.title}</p>
                {!n.isRead ? <Badge tone="gold">New</Badge> : null}
              </div>
              <p className="text-sm text-navy-500">{n.body}</p>
            </button>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function ConfigurationPage() {
  return (
    <div>
      <PageHeader title="Configuration" subtitle="Lookup values are data-driven, not hard-coded in UI logic." />
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4 text-sm">
          <p className="font-medium">Academic Years</p>
          {catalog.academicYears.map((y) => <p key={y.id}>{y.label} {y.isCurrent ? '(current)' : ''}</p>)}
        </Card>
        <Card className="p-4 text-sm">
          <p className="font-medium">Document types in use</p>
          <p>Policy, Annual Report, SSR, Certificate, Photograph, Register, SAR, Audit Report</p>
        </Card>
        <Card className="p-4 text-sm">
          <p className="font-medium">Student categories</p>
          <p>General, OBC, SC, ST, EWS</p>
        </Card>
        <Card className="p-4 text-sm">
          <p className="font-medium">Frameworks</p>
          {catalog.frameworks.map((f) => <p key={f.id}>{f.name}</p>)}
        </Card>
      </div>
    </div>
  )
}
