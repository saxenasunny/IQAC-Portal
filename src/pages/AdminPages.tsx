import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { toast } from 'sonner'
import { Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Select } from '@/components/ui'
import { canCreateUsers, canDeactivateUsers, canManageUsers, canSeeAudit, ROLE_LABELS } from '@/lib/access'
import { roleCatalog } from '@/data/seed'
import { isSupabaseConfigured } from '@/lib/supabase'
import { userService, type PortalUser } from '@/services/userService'
import { catalog, usePortalStore } from '@/store/portalStore'
import type { UserRole } from '@/types'

export function UsersPage() {
  const currentUser = usePortalStore((s) => s.currentUser)!
  const [users, setUsers] = useState<PortalUser[]>([])
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState<UserRole>('iqac_viewer')
  const [schoolCode, setSchoolCode] = useState('')
  const [departmentCode, setDepartmentCode] = useState('')
  const canManage = canManageUsers(currentUser.role)
  const canCreate = canCreateUsers(currentUser.role)
  const canDeactivate = canDeactivateUsers(currentUser.role)

  async function toggleStatus(targetUser: PortalUser) {
    if (!canDeactivate) {
      toast.error('Only a Super Administrator has permission to activate or deactivate users.')
      return
    }
    if (targetUser.id === currentUser.id) {
      toast.error('You cannot change your own active status.')
      return
    }
    try {
      await userService.updateStatus(targetUser.id, !targetUser.isActive)
      toast.success(`${targetUser.fullName} is now ${!targetUser.isActive ? 'Active' : 'Inactive'}.`)
      await loadUsers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to update user status.')
    }
  }

  async function loadUsers() {
    setLoading(true)
    setError('')
    try {
      setUsers(await userService.list())
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Unable to load portal users.'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isSupabaseConfigured && canManage) void loadUsers()
  }, [canManage])

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canCreate) {
      toast.error('Only a super administrator has permission to create portal users.')
      return
    }
    if (password !== confirmPassword) {
      toast.error('The passwords do not match.')
      return
    }
    setSaving(true)
    try {
      await userService.create({
        fullName: name,
        email,
        password,
        role,
        ...(role === 'dean' ? { schoolCode } : {}),
        ...(['hod', 'faculty'].includes(role) ? { departmentCode } : {}),
      })
      toast.success(`Created ${email}. Share the initial password securely with the user.`)
      setOpen(false)
      setName('')
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      setRole('iqac_viewer')
      setSchoolCode('')
      setDepartmentCode('')
      await loadUsers()
    } catch (createError) {
      const message = createError instanceof Error ? createError.message : 'Unable to create the portal user.'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  if (!canManage) {
    return <div><PageHeader title="Users" /><Card className="p-6 text-sm">Only IQAC and super administrators can manage portal users.</Card></div>
  }

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="Manage Supabase accounts and assign portal roles and academic scopes."
        actions={canCreate ? <Button disabled={!isSupabaseConfigured} onClick={() => setOpen(true)}>Create User</Button> : undefined}
      />
      {!isSupabaseConfigured ? (
        <Card className="p-6 text-sm text-amber-800">Configure Supabase to create and manage users. Demo users are disabled.</Card>
      ) : error ? (
        <Card className="space-y-3 p-6 text-sm">
          <p className="text-red-700">{error}</p>
          <Button variant="outline" onClick={() => void loadUsers()}>Retry</Button>
        </Card>
      ) : loading ? (
        <Card className="p-6 text-sm text-navy-500">Loading users…</Card>
      ) : users.length === 0 ? (
        <EmptyState title="No portal users yet" body="Create accounts here after the first administrator has been configured in Supabase." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-navy-950 text-left text-white">
              <tr>
                {['Name', 'Email', 'Role', 'Scope', 'Status', ...(canDeactivate ? ['Action'] : [])].map((heading) => (
                  <th key={heading} className={`px-4 py-3 ${heading === 'Action' ? 'text-right' : ''}`}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t">
                  <td className="px-4 py-2">{user.fullName}</td>
                  <td className="px-4 py-2">{user.email}</td>
                  <td className="px-4 py-2">{ROLE_LABELS[user.role]}</td>
                  <td className="px-4 py-2">{catalog.departments.find((department) => department.id === user.departmentId)?.name ?? catalog.schools.find((school) => school.id === user.schoolId)?.name ?? 'Institution-wide'}</td>
                  <td className="px-4 py-2"><Badge tone={user.isActive ? 'green' : 'red'}>{user.isActive ? 'Active' : 'Inactive'}</Badge></td>
                  {canDeactivate && (
                    <td className="px-4 py-2 text-right">
                      {user.id !== currentUser.id ? (
                        <button
                          type="button"
                          onClick={() => void toggleStatus(user)}
                          className="text-xs text-navy-600 hover:text-navy-900 underline font-medium cursor-pointer"
                        >
                          {user.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">Current</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      {canCreate && (
        <Modal open={open} title="Create portal user" onClose={() => { if (!saving) setOpen(false) }}>
          <form className="space-y-4" onSubmit={(event) => void createUser(event)}>
            <Field label="Full name"><Input value={name} onChange={(event) => setName(event.target.value)} required maxLength={150} /></Field>
            <Field label="Email"><Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></Field>
            <Field label="Role">
              <Select value={role} onChange={(event) => setRole(event.target.value as UserRole)}>
                {roleCatalog
                  .map((entry) => <option key={entry.role} value={entry.role}>{ROLE_LABELS[entry.role]}</option>)}
              </Select>
            </Field>
            {role === 'dean' ? (
              <Field label="School scope">
                <Select value={schoolCode} onChange={(event) => setSchoolCode(event.target.value)} required>
                  <option value="">Select a school</option>
                  {catalog.schools.map((school) => <option key={school.code} value={school.code}>{school.name}</option>)}
                </Select>
              </Field>
            ) : null}
            {role === 'hod' || role === 'faculty' ? (
              <Field label="Department scope">
                <Select value={departmentCode} onChange={(event) => setDepartmentCode(event.target.value)} required>
                  <option value="">Select a department</option>
                  {catalog.departments.map((department) => <option key={department.code} value={department.code}>{department.name}</option>)}
                </Select>
              </Field>
            ) : null}
            <Field label="Initial password" hint="Use at least 6 characters. Share it with the user through a secure channel.">
              <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} maxLength={128} autoComplete="new-password" required />
            </Field>
            <Field label="Confirm password">
              <Input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={6} maxLength={128} autoComplete="new-password" required />
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" disabled={saving} onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create user'}</Button>
            </div>
          </form>
        </Modal>
      )}
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
    ['users.create', 'Admin', 'Super admin only'],
    ['users.deactivate', 'Admin', 'Super admin only'],
    ['users.manage', 'Admin', 'Super admin (full), IQAC admin (view)'],
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
