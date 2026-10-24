import { catalog } from '@/store/portalStore'
import type { Gender, Student } from '@/types'
import { supabase } from '@/lib/supabase'

type Row = Record<string, unknown>

const STUDENT_IMPORT_BATCH_SIZE = 50

const STUDENT_STATUSES: Student['studentStatus'][] = [
  'active',
  'inactive',
  'graduated',
  'alumni',
  'ng_alumni',
  'nep_exit',
  'repeat',
  'withdrawn',
  'suspended',
]
const ACADEMIC_STATUSES: Student['academicStatus'][] = ['regular', 'lateral', 're_admitted', 'detained']
const GENDERS: Gender[] = ['male', 'female', 'other', 'prefer_not_to_say']
const WORKFLOWS: Student['workflow'][] = [
  'draft', 'submitted', 'under_review', 'verified', 'approved', 'rejected',
  'needs_revision', 'change_requested', 'revised', 're_verified',
]

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function number(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function object(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {}
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function mapStudent(value: unknown): Student {
  const row = object(value)
  const programme = catalog.programmes.find((item) => item.code === row.programmeCode)
    ?? catalog.programmes.find((item) => item.id === row.programmeId)
    ?? catalog.programmes[0]
  const department = catalog.departments.find((item) => item.code === row.departmentCode)
    ?? (programme ? catalog.departments.find((item) => item.id === programme.departmentId) : null)
    ?? catalog.departments[0]
  const school = catalog.schools.find((item) => item.code === row.schoolCode)
    ?? (department ? catalog.schools.find((item) => item.id === department.schoolId) : null)
    ?? catalog.schools[0]

  const personal = object(row.personal)
  const academic = object(row.academic)
  const contact = object(row.contact)
  const family = object(row.family)
  const sensitive = object(row.sensitive)
  const addresses = array(row.addresses).map((value) => {
    const address = object(value)
    const type: Student['addresses'][number]['type'] =
      address.type === 'present' || address.type === 'communication' ? address.type : 'permanent'
    return {
      type,
      line1: text(address.line1),
      line2: text(address.line2) || undefined,
      city: text(address.city),
      state: text(address.state),
      pincode: text(address.pincode),
      country: text(address.country) || undefined,
    }
  })
  const qualifications = array(row.qualifications).map((value) => {
    const item = object(value)
    return {
      level: text(item.level),
      boardUniversity: text(item.boardUniversity),
      yearOfPassing: number(item.yearOfPassing),
      percentage: number(item.percentage),
    }
  })
  const entranceExams = array(row.entranceExams).map((value) => {
    const item = object(value)
    return {
      examName: text(item.examName),
      score: typeof item.score === 'number' ? item.score : undefined,
      rank: typeof item.rank === 'number' ? item.rank : undefined,
      year: number(item.year),
    }
  })
  const customFields = Object.fromEntries(
    Object.entries(object(row.customFields)).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  )
  const additionalIdentifiers = Object.fromEntries(
    Object.entries(object(sensitive.additionalIdentifiers))
      .filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  )

  return {
    id: text(row.id),
    registrationId: text(row.registrationId),
    applicationNumber: text(row.applicationNumber),
    universityRollNumber: text(row.universityRollNumber),
    fullName: text(row.fullName),
    email: text(row.email),
    phone: text(row.phone),
    gender: GENDERS.includes(row.gender as Gender) ? row.gender as Gender : 'prefer_not_to_say',
    dateOfBirth: text(row.dateOfBirth),
    nationality: text(row.nationality, 'India'),
    programmeId: programme.id,
    departmentId: department.id,
    schoolId: school.id,
    batchId: catalog.batches.find((item) => item.programmeId === programme.id && item.year === row.batchYear)?.id ?? '',
    academicYearId: catalog.academicYears.find((item) => item.label === row.academicYearLabel)?.id ?? '',
    currentYear: number(row.currentYear, 1),
    currentTerm: text(row.currentTerm),
    studentStatus: STUDENT_STATUSES.includes(row.studentStatus as Student['studentStatus'])
      ? row.studentStatus as Student['studentStatus']
      : 'active',
    academicStatus: ACADEMIC_STATUSES.includes(row.academicStatus as Student['academicStatus'])
      ? row.academicStatus as Student['academicStatus']
      : 'regular',
    admissionType: text(row.admissionType),
    quota: text(row.quota) || undefined,
    workflow: WORKFLOWS.includes(row.workflow as Student['workflow'])
      ? row.workflow as Student['workflow']
      : 'submitted',
    isArchived: row.isArchived === true,
    personal: {
      firstName: text(personal.firstName),
      middleName: text(personal.middleName) || undefined,
      lastName: text(personal.lastName),
      title: text(personal.title) || undefined,
      religion: text(personal.religion) || undefined,
      bloodGroup: text(personal.bloodGroup) || undefined,
      motherTongue: text(personal.motherTongue) || undefined,
      firstGeneration: personal.firstGeneration === true,
      differentlyAbled: personal.differentlyAbled === true,
      ews: personal.ews === true,
      domicileState: text(personal.domicileState),
      category: text(personal.category),
    },
    academic: {
      cgpa: typeof academic.cgpa === 'number' ? academic.cgpa : undefined,
      percentage: typeof academic.percentage === 'number' ? academic.percentage : undefined,
      backlogs: number(academic.backlogs),
      admissionDate: text(academic.admissionDate),
      expectedGraduation: text(academic.expectedGraduation) || undefined,
    },
    contact: {
      personalEmail: text(contact.personalEmail) || undefined,
      alternatePhone: text(contact.alternatePhone) || undefined,
      emergencyContactName: text(contact.emergencyContactName) || undefined,
      emergencyContactPhone: text(contact.emergencyContactPhone) || undefined,
    },
    addresses,
    family: {
      fatherName: text(family.fatherName) || undefined,
      fatherOccupation: text(family.fatherOccupation) || undefined,
      motherName: text(family.motherName) || undefined,
      motherOccupation: text(family.motherOccupation) || undefined,
      annualIncome: typeof family.annualIncome === 'number' ? family.annualIncome : undefined,
    },
    qualifications,
    entranceExams,
    mentor: Object.keys(object(row.mentor)).length
      ? {
          name: text(object(row.mentor).name),
          email: text(object(row.mentor).email),
          phone: text(object(row.mentor).phone),
        }
      : undefined,
    sensitive: Object.keys(sensitive).length
      ? {
          aadhaar: text(sensitive.aadhaar) || undefined,
          pan: text(sensitive.pan) || undefined,
          bankAccount: text(sensitive.bankAccount) || undefined,
          ifsc: text(sensitive.ifsc) || undefined,
          abcId: text(sensitive.abcId) || undefined,
          additionalIdentifiers,
        }
      : undefined,
    customFields,
    createdAt: text(row.createdAt),
    updatedAt: text(row.updatedAt),
  }
}

function toImportRow(student: Student): Row {
  const programme = catalog.programmes.find((item) => item.id === student.programmeId) ?? catalog.programmes[0]
  const department = catalog.departments.find((item) => item.id === student.departmentId)
    ?? (programme ? catalog.departments.find((item) => item.id === programme.departmentId) : null)
    ?? catalog.departments[0]
  const school = catalog.schools.find((item) => item.id === student.schoolId)
    ?? (department ? catalog.schools.find((item) => item.id === department.schoolId) : null)
    ?? catalog.schools[0]
  const batch = catalog.batches.find((item) => item.id === student.batchId)
  const academicYear = catalog.academicYears.find((item) => item.id === student.academicYearId)
  const { additionalIdentifiers: _additionalIdentifiers, ...sensitive } = student.sensitive ?? {}
  return {
    ...student,
    sensitive,
    programmeCode: programme.code,
    departmentCode: department.code,
    schoolCode: school.code,
    batchYear: batch?.year ?? null,
    academicYearLabel: academicYear?.label ?? null,
    programmeId: undefined,
    departmentId: undefined,
    schoolId: undefined,
    batchId: undefined,
    academicYearId: undefined,
  }
}

function toStudentFromDbRow(row: Record<string, unknown>): Student {
  const programmeId = text(row.programme_id)
  const departmentId = text(row.department_id)
  const schoolId = text(row.school_id)
  const batchId = text(row.batch_id)
  const academicYearId = text(row.academic_year_id)
  const gender = text(row.gender) as Gender

  const fullName = text(row.full_name)
  const nameParts = fullName.trim().split(/\s+/)
  const firstName = nameParts[0] || ''
  const lastName = nameParts.slice(1).join(' ') || ''

  return {
    id: text(row.id),
    registrationId: text(row.registration_id),
    applicationNumber: text(row.application_number),
    universityRollNumber: text(row.university_roll_number),
    fullName,
    email: text(row.email),
    phone: text(row.phone),
    gender: GENDERS.includes(gender) ? gender : 'prefer_not_to_say',
    dateOfBirth: text(row.date_of_birth),
    nationality: text(row.nationality, 'India'),
    programmeId,
    departmentId,
    schoolId,
    batchId,
    academicYearId,
    currentYear: number(row.current_year, 1),
    currentTerm: text(row.current_term),
    studentStatus: STUDENT_STATUSES.includes(row.student_status as Student['studentStatus'])
      ? (row.student_status as Student['studentStatus'])
      : 'active',
    academicStatus: ACADEMIC_STATUSES.includes(row.academic_status as Student['academicStatus'])
      ? (row.academic_status as Student['academicStatus'])
      : 'regular',
    admissionType: text(row.admission_type),
    quota: text(row.quota) || undefined,
    workflow: WORKFLOWS.includes(row.workflow as Student['workflow'])
      ? (row.workflow as Student['workflow'])
      : 'submitted',
    isArchived: row.is_archived === true,
    personal: {
      firstName,
      lastName,
      category: 'General',
      domicileState: '',
      firstGeneration: false,
      differentlyAbled: false,
      ews: false,
    },
    academic: {
      backlogs: 0,
      admissionDate: '',
    },
    contact: {},
    addresses: [],
    family: {},
    qualifications: [],
    entranceExams: [],
    customFields: {},
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
  }
}

export const studentService = {
  async listPortal(): Promise<Student[]> {
    if (!supabase) throw new Error('Supabase is not configured.')

    // Uses SECURITY DEFINER RPC that checks the caller's role ONCE (not per row),
    // bypassing per-row RLS evaluation that causes statement_timeout for non-admin users.
    // PAGE_SIZE must be <= 1000 (Supabase PostgREST default max_rows).
    const allStudents: Student[] = []
    const PAGE_SIZE = 1000
    let from = 0

    while (true) {
      const { data, error } = await supabase
        .rpc('list_students_fast')
        .order('registration_id', { ascending: true })
        .range(from, from + PAGE_SIZE - 1)

      if (error) {
        // Fallback: if the RPC doesn't exist yet (migration not run), try direct table query
        if (error.code === 'PGRST202') {
          console.warn('list_students_fast RPC not found. Falling back to direct table query. Run migration 0018 for best performance.')
          return this._listPortalFallback()
        }
        throw new Error(error.message || `Database error (${error.code || 'unknown'}) loading students`)
      }
      if (!Array.isArray(data) || data.length === 0) break
      allStudents.push(...data.map(toStudentFromDbRow))
      if (data.length < PAGE_SIZE) break
      from += PAGE_SIZE
    }
    return allStudents
  },

  /** Fallback direct table query (works for super_admin; may timeout for other roles due to RLS) */
  async _listPortalFallback(): Promise<Student[]> {
    if (!supabase) throw new Error('Supabase is not configured.')
    const allStudents: Student[] = []
    const PAGE_SIZE = 1000
    let from = 0

    while (true) {
      const { data, error } = await supabase
        .from('students')
        .select('id, registration_id, application_number, university_roll_number, full_name, email, phone, gender, date_of_birth, nationality, school_id, department_id, programme_id, batch_id, academic_year_id, current_year, current_term, student_status, academic_status, admission_type, quota, workflow, is_archived, created_at, updated_at')
        .order('registration_id', { ascending: true })
        .range(from, from + PAGE_SIZE - 1)

      if (error) {
        throw new Error(error.message || `Database error (${error.code || 'unknown'}) loading students`)
      }
      if (!Array.isArray(data) || data.length === 0) break
      allStudents.push(...data.map(toStudentFromDbRow))
      if (data.length < PAGE_SIZE) break
      from += PAGE_SIZE
    }
    return allStudents
  },

  async getById(id: string): Promise<Student | null> {
    if (!supabase) throw new Error('Supabase is not configured.')
    const [studentRes, portalDataRes, sensitiveRes, familyRes] = await Promise.all([
      supabase.from('students').select('*').eq('id', id).maybeSingle(),
      supabase.from('student_portal_data').select('data').eq('student_id', id).maybeSingle(),
      supabase.from('student_sensitive').select('*').eq('student_id', id).maybeSingle(),
      supabase.from('student_family').select('*').eq('student_id', id).maybeSingle(),
    ])

    if (studentRes.error || !studentRes.data) return null
    const base = toStudentFromDbRow(studentRes.data)
    const portalData = portalDataRes.data?.data ? mapStudent(portalDataRes.data.data) : null

    return {
      ...base,
      ...(portalData ?? {}),
      id: base.id,
      registrationId: base.registrationId,
      fullName: base.fullName,
      email: base.email,
      phone: base.phone,
      programmeId: base.programmeId || portalData?.programmeId || '',
      departmentId: base.departmentId || portalData?.departmentId || '',
      schoolId: base.schoolId || portalData?.schoolId || '',
      sensitive: sensitiveRes.data ? {
        aadhaar: sensitiveRes.data.aadhaar ?? undefined,
        pan: sensitiveRes.data.pan ?? undefined,
        bankAccount: sensitiveRes.data.bank_account ?? undefined,
        ifsc: sensitiveRes.data.ifsc ?? undefined,
        abcId: sensitiveRes.data.abc_id ?? undefined,
        additionalIdentifiers: sensitiveRes.data.additional_identifiers ?? undefined,
      } : portalData?.sensitive,
      family: {
        ...(portalData?.family ?? {}),
        ...(familyRes.data ? {
          fatherName: familyRes.data.father_name ?? undefined,
          fatherOccupation: familyRes.data.father_occupation ?? undefined,
          motherName: familyRes.data.mother_name ?? undefined,
          motherOccupation: familyRes.data.mother_occupation ?? undefined,
          annualIncome: familyRes.data.annual_income ?? undefined,
        } : {}),
      },
    }
  },

  async commitImport(
    fileName: string,
    mapping: Record<string, string>,
    students: Student[],
    onBatchSaved?: (rows: Student[], totals: { created: number; updated: number }) => void,
  ) {
    if (!supabase) throw new Error('Supabase is not configured.')
    const rows = students.map(toImportRow)
    let created = 0
    let updated = 0
    let completedRows = 0

    for (let offset = 0; offset < students.length; offset += STUDENT_IMPORT_BATCH_SIZE) {
      const batch = students.slice(offset, offset + STUDENT_IMPORT_BATCH_SIZE)
      const batchRows = rows.slice(offset, offset + STUDENT_IMPORT_BATCH_SIZE)
      const sensitiveRows = batch.flatMap((student) => {
        const identifiers = student.sensitive?.additionalIdentifiers ?? {}
        return Object.keys(identifiers).length
          ? [{ registrationId: student.registrationId, identifiers }]
          : []
      })
      const params = {
        p_file_name: fileName,
        p_mapping: mapping,
        p_rows: batchRows,
      }
      const { data, error } = sensitiveRows.length
        ? await supabase.rpc('commit_student_import', { ...params, p_sensitive_rows: sensitiveRows })
        : await supabase.rpc('commit_student_import', params)

      if (error?.code === 'PGRST202' && sensitiveRows.length) {
        throw new Error('Supabase is missing the protected student import RPC. Run migration 0004_extended_student_import_attributes.sql, then retry.')
      }
      if (error) {
        const detail = [error.message, error.details, error.hint].filter(Boolean).join(' ')
        const code = error.code ? ` (${error.code})` : ''
        const partial = completedRows
          ? `${completedRows} of ${students.length} valid rows were already saved; retrying the import is safe because records are matched by Registration ID. `
          : ''
        throw new Error(`${partial}Batch rows ${offset + 1}-${offset + batch.length} failed${code}: ${detail}`)
      }

      const result = object(data)
      const createdCount = typeof result.created === 'number' ? result.created : (typeof result.newCount === 'number' ? result.newCount : null)
      const updatedCount = typeof result.updated === 'number' ? result.updated : (typeof result.updatedCount === 'number' ? result.updatedCount : null)

      if (createdCount === null || updatedCount === null) {
        throw new Error(`${completedRows} of ${students.length} valid rows were saved, but Supabase did not confirm batch rows ${offset + 1}-${offset + batch.length}.`)
      }
      created += createdCount
      updated += updatedCount
      completedRows += batch.length
      onBatchSaved?.(batch, { created, updated })
    }
    return { created, updated, rows: completedRows }
  },
}
