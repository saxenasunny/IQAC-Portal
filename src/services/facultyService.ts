import { catalog } from '@/store/portalStore'
import type { EmploymentType, Faculty, Gender, WorkflowStatus } from '@/types'
import { supabase } from '@/lib/supabase'

type FacultyImportRow = Omit<Faculty, 'id' | 'qualifications' | 'publications' | 'projects' | 'patents' | 'createdAt' | 'updatedAt'> & {
  departmentCode: string
  schoolCode: string
}

const IMPORT_BATCH_SIZE = 25
const GENDERS: Gender[] = ['male', 'female', 'other', 'prefer_not_to_say']
const EMPLOYMENT_TYPES: EmploymentType[] = ['permanent', 'contract', 'visiting', 'adjunct']
const WORKFLOWS: WorkflowStatus[] = [
  'draft', 'submitted', 'under_review', 'verified', 'approved', 'rejected',
  'needs_revision', 'change_requested', 'revised', 're_verified',
]

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function numeric(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function mapFaculty(value: unknown, departmentIds: Map<string, string>, schoolIds: Map<string, string>): Faculty {
  const row = object(value)
  const gender = row.gender
  const employmentType = row.employment_type
  const workflow = row.workflow
  return {
    id: text(row.id),
    employeeId: text(row.employee_id),
    fullName: text(row.full_name),
    email: text(row.email),
    phone: text(row.phone),
    gender: GENDERS.includes(gender as Gender) ? gender as Gender : 'prefer_not_to_say',
    dateOfBirth: text(row.date_of_birth),
    schoolId: schoolIds.get(text(row.school_id)) ?? '',
    departmentId: departmentIds.get(text(row.department_id)) ?? '',
    designation: text(row.designation),
    employmentType: EMPLOYMENT_TYPES.includes(employmentType as EmploymentType)
      ? employmentType as EmploymentType
      : 'permanent',
    joiningDate: text(row.joining_date),
    highestQualification: text(row.highest_qualification),
    specialization: text(row.specialization),
    orcid: text(row.orcid) || undefined,
    googleScholar: text(row.google_scholar) || undefined,
    scopusId: text(row.scopus_id) || undefined,
    teachingExperienceYears: numeric(row.teaching_experience_years),
    researchExperienceYears: numeric(row.research_experience_years),
    isActive: row.is_active === true,
    workflow: WORKFLOWS.includes(workflow as WorkflowStatus) ? workflow as WorkflowStatus : 'submitted',
    qualifications: [],
    publications: [],
    projects: [],
    patents: [],
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
  }
}

function toImportRow(member: Faculty): FacultyImportRow {
  const department = catalog.departments.find((item) => item.id === member.departmentId)
  const school = catalog.schools.find((item) => item.id === member.schoolId)
  return {
    employeeId: member.employeeId,
    fullName: member.fullName,
    email: member.email,
    phone: member.phone,
    gender: member.gender,
    dateOfBirth: member.dateOfBirth,
    departmentCode: department?.code ?? '',
    schoolCode: school?.code ?? '',
    schoolId: member.schoolId,
    departmentId: member.departmentId,
    designation: member.designation,
    employmentType: member.employmentType,
    joiningDate: member.joiningDate,
    highestQualification: member.highestQualification,
    specialization: member.specialization,
    orcid: member.orcid,
    googleScholar: member.googleScholar,
    scopusId: member.scopusId,
    teachingExperienceYears: member.teachingExperienceYears,
    researchExperienceYears: member.researchExperienceYears,
    isActive: member.isActive,
    workflow: member.workflow,
  }
}

export const facultyService = {
  async list() {
    if (!supabase) throw new Error('Supabase is not configured.')
    const [facultyResult, departmentResult, schoolResult] = await Promise.all([
      supabase.from('faculty').select('*').eq('is_active', true),
      supabase.from('departments').select('id, code, school_id'),
      supabase.from('schools').select('id, code'),
    ])
    if (facultyResult.error) throw new Error(`Faculty: ${facultyResult.error.message}`)
    if (departmentResult.error) throw new Error(`Departments: ${departmentResult.error.message}`)
    if (schoolResult.error) throw new Error(`Schools: ${schoolResult.error.message}`)

    const departmentIds = new Map((departmentResult.data ?? []).map((row) => [row.id, row.code]))
    const schoolIds = new Map((schoolResult.data ?? []).map((row) => [row.id, row.code]))
    const departmentCodes = new Map(catalog.departments.map((item) => [item.code, item.id]))
    const schoolCodes = new Map(catalog.schools.map((item) => [item.code, item.id]))

    return (facultyResult.data ?? []).map((row) => {
      const mapped = mapFaculty(row, departmentIds, schoolIds)
      return {
        ...mapped,
        departmentId: departmentCodes.get(mapped.departmentId) ?? '',
        schoolId: schoolCodes.get(mapped.schoolId) ?? '',
      }
    })
  },

  async commitImport(
    fileName: string,
    mapping: Record<string, string>,
    faculty: Faculty[],
    onBatchSaved?: (rows: Faculty[], totals: { created: number; updated: number }) => void,
  ) {
    if (!supabase) throw new Error('Supabase is not configured.')
    const rows = faculty.map(toImportRow)
    let created = 0
    let updated = 0
    let completedRows = 0

    for (let offset = 0; offset < faculty.length; offset += IMPORT_BATCH_SIZE) {
      const batch = faculty.slice(offset, offset + IMPORT_BATCH_SIZE)
      const batchRows = rows.slice(offset, offset + IMPORT_BATCH_SIZE)
      const { data, error } = await supabase.rpc('commit_faculty_import', {
        p_file_name: fileName,
        p_mapping: mapping,
        p_rows: batchRows,
      })
      if (error?.code === 'PGRST202') {
        throw new Error('Supabase is missing the faculty import function. Apply migration 0008_faculty_import_sync.sql, then retry.')
      }
      if (error) {
        const detail = [error.message, error.details, error.hint].filter(Boolean).join(' ')
        const code = error.code ? ` (${error.code})` : ''
        const partial = completedRows
          ? `${completedRows} of ${faculty.length} valid rows were already saved; retrying is safe because records are matched by Employee ID. `
          : ''
        throw new Error(`${partial}Faculty import batch rows ${offset + 1}-${offset + batch.length} failed${code}: ${detail}`)
      }

      const result = object(data)
      if (typeof result.created !== 'number' || typeof result.updated !== 'number') {
        throw new Error(`${completedRows} of ${faculty.length} valid rows were saved, but Supabase did not confirm batch rows ${offset + 1}-${offset + batch.length}.`)
      }
      created += result.created
      updated += result.updated
      completedRows += batch.length
      onBatchSaved?.(batch, { created, updated })
    }
    return { created, updated, rows: completedRows }
  },
}
