import { catalog } from '@/store/portalStore'
import type { Student } from '@/types'

export function schoolName(id?: string) {
  return catalog.schools.find((s) => s.id === id)?.name ?? '—'
}

export function departmentName(id?: string) {
  return catalog.departments.find((s) => s.id === id)?.name ?? '—'
}

export function programmeName(id?: string) {
  return catalog.programmes.find((s) => s.id === id)?.name ?? '—'
}

export function batchLabel(id?: string) {
  return catalog.batches.find((s) => s.id === id)?.label ?? '—'
}

export function yearLabel(id?: string) {
  return catalog.academicYears.find((s) => s.id === id)?.label ?? '—'
}

export function studentCompleteness(s: Student) {
  const groups = {
    personal: [s.fullName, s.dateOfBirth, s.gender, s.personal.category, s.personal.domicileState],
    academic: [s.programmeId, s.academic.cgpa, s.academic.admissionDate, s.universityRollNumber],
    contact: [s.email, s.phone, s.contact.emergencyContactPhone],
    qualification: s.qualifications.length ? ['ok'] : [],
    category: [s.personal.category],
    documents: s.sensitive?.abcId ? ['ok'] : [],
  }
  const score = (arr: unknown[]) => Math.round((arr.filter((v) => v !== undefined && v !== null && v !== '').length / Math.max(arr.length, 1)) * 100)
  return {
    personal: score(groups.personal),
    academic: score(groups.academic),
    contact: score(groups.contact),
    qualification: s.qualifications.length ? 88 : 40,
    category: s.personal.category ? 94 : 0,
    documents: s.sensitive?.abcId ? 80 : 45,
  }
}

export function visibleStudents(students: Student[], role: string, schoolId?: string, departmentId?: string) {
  if (['super_admin', 'iqac_admin', 'iqac_viewer', 'registrar', 'data_entry', 'verifier', 'auditor'].includes(role)) {
    return students
  }
  if (role === 'dean') return students.filter((s) => s.schoolId === schoolId)
  return students.filter((s) => s.departmentId === departmentId)
}

export function visibleFaculty<T extends { schoolId: string; departmentId: string }>(
  rows: T[],
  role: string,
  schoolId?: string,
  departmentId?: string,
) {
  if (['super_admin', 'iqac_admin', 'iqac_viewer', 'registrar', 'data_entry', 'verifier', 'auditor'].includes(role)) {
    return rows
  }
  if (role === 'dean') return rows.filter((s) => s.schoolId === schoolId)
  return rows.filter((s) => s.departmentId === departmentId)
}
