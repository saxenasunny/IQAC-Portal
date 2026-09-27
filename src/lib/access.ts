import type { UserRole } from '@/types'

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  iqac_admin: 'IQAC Admin',
  iqac_viewer: 'IQAC Viewer',
  registrar: 'Registrar',
  dean: 'Dean',
  hod: 'Head of Department',
  faculty: 'Faculty',
  data_entry: 'Data Entry Operator',
  verifier: 'Verifier',
  auditor: 'Auditor',
}

const FULL = new Set<UserRole>(['super_admin', 'iqac_admin', 'registrar'])
const WRITE = new Set<UserRole>(['super_admin', 'iqac_admin', 'registrar', 'data_entry', 'verifier'])
const SENSITIVE = new Set<UserRole>(['super_admin', 'iqac_admin', 'registrar'])
const AUDIT = new Set<UserRole>(['super_admin', 'iqac_admin', 'auditor', 'registrar'])
const ADMIN_USERS = new Set<UserRole>(['super_admin', 'iqac_admin'])
const IMPORT = new Set<UserRole>(['super_admin', 'iqac_admin', 'registrar', 'data_entry'])

export function canSeeAllDepartments(role: UserRole) {
  return FULL.has(role) || role === 'iqac_viewer' || role === 'auditor' || role === 'verifier' || role === 'data_entry'
}

export function canWriteData(role: UserRole) {
  return WRITE.has(role)
}

export function canSeeSensitive(role: UserRole) {
  return SENSITIVE.has(role)
}

export function canSeeAudit(role: UserRole) {
  return AUDIT.has(role)
}

export function canManageUsers(role: UserRole) {
  return ADMIN_USERS.has(role)
}

export function canImport(role: UserRole) {
  return IMPORT.has(role)
}

export function canVerify(role: UserRole) {
  return role === 'verifier' || FULL.has(role)
}

export function scopedDepartmentId(role: UserRole, departmentId?: string) {
  if (canSeeAllDepartments(role)) return undefined
  if (role === 'dean') return undefined
  return departmentId
}

export function scopedSchoolId(role: UserRole, schoolId?: string) {
  if (role === 'dean') return schoolId
  return undefined
}
