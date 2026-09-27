import { Badge, Card, PageHeader } from '@/components/ui'
import { canSeeAudit, ROLE_LABELS } from '@/lib/access'
import { roleCatalog } from '@/data/seed'
import { catalog, usePortalStore } from '@/store/portalStore'

export function UsersPage() {
  const users = usePortalStore((s) => s.users)
  return (
    <div>
      <PageHeader title="Users" subtitle="Demo directory. Production uses Supabase Auth + profiles." />
      <Card className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-navy-950 text-white text-left"><tr>{['Name', 'Email', 'Role', 'Scope'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="px-4 py-2">{u.fullName}</td>
                <td className="px-4 py-2">{u.email}</td>
                <td className="px-4 py-2">{ROLE_LABELS[u.role]}</td>
                <td className="px-4 py-2">{catalog.departments.find((d) => d.id === u.departmentId)?.name ?? catalog.schools.find((s) => s.id === u.schoolId)?.name ?? 'Institution'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

export function RolesPage() {
  return (
    <div>
      <PageHeader title="Roles" />
      <div className="grid gap-3 md:grid-cols-2">
        {roleCatalog.map((r) => (
          <Card key={r.role} className="p-4">
            <p className="font-medium">{ROLE_LABELS[r.role]}</p>
            <p className="text-sm text-navy-500">{r.description}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function PermissionsPage() {
  const rows = [
    ['students.read', 'Students', 'All authenticated except none'],
    ['students.write', 'Students', 'Admin, data entry, verifier'],
    ['students.sensitive', 'Students', 'Super admin, IQAC admin, registrar'],
    ['faculty.write', 'Faculty', 'Admin, data entry'],
    ['documents.write', 'Documents', 'Admin, HOD, dean, data entry'],
    ['import.execute', 'Data', 'Admin, registrar, data entry'],
    ['audit.read', 'Admin', 'Super admin, IQAC admin, auditor, registrar'],
    ['users.manage', 'Admin', 'Super admin, IQAC admin'],
  ]
  return (
    <div>
      <PageHeader title="Permissions" subtitle="Enforced in application guards and mirrored by Supabase RLS." />
      <Card className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-navy-950 text-white text-left"><tr>{['Code', 'Module', 'Granted to'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((r) => <tr key={r[0]} className="border-t">{r.map((c) => <td key={c} className="px-4 py-2">{c}</td>)}</tr>)}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

export function AuditLogsPage() {
  const user = usePortalStore((s) => s.currentUser)!
  const logs = usePortalStore((s) => s.auditLogs)
  if (!canSeeAudit(user.role)) {
    return <div><PageHeader title="Audit Logs" /><Card className="p-6 text-sm">Your role cannot access audit logs.</Card></div>
  }
  return (
    <div>
      <PageHeader title="Audit Logs" subtitle="Every important mutation is attributable." />
      <Card className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-navy-950 text-white text-left">
            <tr>{['Timestamp', 'User', 'Action', 'Entity', 'Old', 'New', 'Reason', 'IP'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="px-4 py-2 whitespace-nowrap">{new Date(l.createdAt).toLocaleString('en-IN')}</td>
                <td className="px-4 py-2">{l.actorName}<div className="text-xs text-navy-400">{ROLE_LABELS[l.actorRole]}</div></td>
                <td className="px-4 py-2">{l.action}</td>
                <td className="px-4 py-2">{l.entity} {l.entityId}</td>
                <td className="px-4 py-2">{l.oldValue ?? '—'}</td>
                <td className="px-4 py-2">{l.newValue ?? '—'}</td>
                <td className="px-4 py-2">{l.reason ?? '—'}</td>
                <td className="px-4 py-2">{l.ipAddress}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
