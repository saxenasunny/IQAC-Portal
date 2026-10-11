import { catalog } from '@/store/portalStore'
import type { Gender, Student } from '@/types'
import { supabase } from '@/lib/supabase'

type Row = Record<string, unknown>

const STUDENT_STATUSES: Student['studentStatus'][] = ['active', 'inactive', 'graduated', 'alumni', 'withdrawn', 'suspended']
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
  const department = catalog.departments.find((item) => item.code === row.departmentCode)
  const school = catalog.schools.find((item) => item.code === row.schoolCode)
  if (!programme || !department || !school) {
    throw new Error(`Student ${text(row.registrationId, '(unknown ID)')} references a programme or department not in the portal catalogue.`)
  }

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
  const programme = catalog.programmes.find((item) => item.id === student.programmeId)
  const department = catalog.departments.find((item) => item.id === student.departmentId)
  const school = catalog.schools.find((item) => item.id === student.schoolId)
  const batch = catalog.batches.find((item) => item.id === student.batchId)
  const academicYear = catalog.academicYears.find((item) => item.id === student.academicYearId)
  if (!programme || !department || !school) {
    throw new Error(`Cannot save ${student.registrationId}: its programme, department, or school is missing from the portal catalogue.`)
  }
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

export const studentService = {
  async listPortal(): Promise<Student[]> {
    if (!supabase) throw new Error('Supabase is not configured.')
    const { data, error } = await supabase.rpc('list_portal_students')
    if (error) throw error
    if (!Array.isArray(data)) throw new Error('Supabase returned an invalid student list.')
    return data.map(mapStudent)
  },

  async commitImport(fileName: string, mapping: Record<string, string>, students: Student[]) {
    if (!supabase) throw new Error('Supabase is not configured.')
    const { data, error } = await supabase.rpc('commit_student_import', {
      p_file_name: fileName,
      p_mapping: mapping,
      p_rows: students.map(toImportRow),
      p_sensitive_rows: students.flatMap((student) => {
        const identifiers = student.sensitive?.additionalIdentifiers ?? {}
        return Object.keys(identifiers).length
          ? [{ registrationId: student.registrationId, identifiers }]
          : []
      }),
    })
    if (error) throw error
    const result = object(data)
    if (
      typeof result.created !== 'number'
      || typeof result.updated !== 'number'
      || typeof result.import_id !== 'string'
    ) {
      throw new Error('Supabase did not confirm the imported student counts.')
    }
    return { created: result.created, updated: result.updated, import_id: result.import_id }
  },
}
