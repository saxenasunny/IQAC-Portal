import type { Faculty, Student } from '@/types'

export interface MetricLineage {
  label: string
  value: string | number
  source: string
  filters: Record<string, string>
  calculation: string
  lastUpdated: string
  verifiedBy?: string
  recordCount: number
}

export function countActiveStudents(students: Student[]) {
  return students.filter((s) => s.studentStatus === 'active' && !s.isArchived)
}

export function computeInstitutionMetrics(students: Student[], faculty: Faculty[]): MetricLineage[] {
  const active = countActiveStudents(students)
  const activeFaculty = faculty.filter((f) => f.isActive)
  const female = active.filter((s) => s.gender === 'female')
  const male = active.filter((s) => s.gender === 'male')
  const intl = active.filter((s) => s.nationality !== 'India')
  const ratio = activeFaculty.length ? active.length / activeFaculty.length : 0
  const graduated = students.filter((s) => s.studentStatus === 'graduated')
  const updated = new Date().toISOString()

  return [
    {
      label: 'Total Students (Active)',
      value: active.length,
      source: 'Student Database',
      filters: { academicYear: '2025-26', studentStatus: 'active' },
      calculation: 'COUNT(active students)',
      lastUpdated: updated,
      verifiedBy: 'Lakshmi Krishnan',
      recordCount: active.length,
    },
    {
      label: 'Female Students',
      value: female.length,
      source: 'Student Database',
      filters: { gender: 'female', studentStatus: 'active' },
      calculation: 'COUNT(gender = Female)',
      lastUpdated: updated,
      recordCount: female.length,
    },
    {
      label: 'Male Students',
      value: male.length,
      source: 'Student Database',
      filters: { gender: 'male', studentStatus: 'active' },
      calculation: 'COUNT(gender = Male)',
      lastUpdated: updated,
      recordCount: male.length,
    },
    {
      label: 'International Students',
      value: intl.length,
      source: 'Student Database',
      filters: { nationality: '!= India', studentStatus: 'active' },
      calculation: 'COUNT(nationality != India)',
      lastUpdated: updated,
      recordCount: intl.length,
    },
    {
      label: 'Student–Faculty Ratio',
      value: ratio.toFixed(2),
      source: 'Student Database + Faculty Database',
      filters: { studentStatus: 'active', facultyActive: 'true' },
      calculation: 'Total Students / Total Faculty',
      lastUpdated: updated,
      verifiedBy: 'Dr. Sunita Rao',
      recordCount: active.length + activeFaculty.length,
    },
    {
      label: 'Graduation Count',
      value: graduated.length,
      source: 'Student Database',
      filters: { studentStatus: 'graduated' },
      calculation: 'COUNT(graduated students)',
      lastUpdated: updated,
      recordCount: graduated.length,
    },
  ]
}

export function evaluateRequirementFormula(formula: string | undefined, students: Student[], faculty: Faculty[]) {
  const active = countActiveStudents(students)
  const activeFaculty = faculty.filter((f) => f.isActive)
  switch (formula) {
    case 'COUNT(active students)':
      return String(active.length)
    case 'COUNT(gender = Female)':
      return String(active.filter((s) => s.gender === 'female').length)
    case 'COUNT(gender = Male)':
      return String(active.filter((s) => s.gender === 'male').length)
    case 'COUNT(nationality != India)':
    case "COUNT(nationality != India)":
      return String(active.filter((s) => s.nationality !== 'India').length)
    case 'Total Students / Total Faculty':
      return activeFaculty.length ? (active.length / activeFaculty.length).toFixed(2) : '0'
    case 'COUNT(faculty where qualification in Ph.D, Post-Doc)':
      return String(faculty.filter((f) => /ph\.?d|post-doc/i.test(f.highestQualification)).length)
    case 'COUNT(active faculty)':
      return String(activeFaculty.length)
    default:
      return undefined
  }
}
