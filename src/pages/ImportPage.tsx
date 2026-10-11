import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import { Badge, Button, Card, PageHeader, Select } from '@/components/ui'
import { canImport } from '@/lib/access'
import { isSupabaseConfigured } from '@/lib/supabase'
import { studentService } from '@/services/studentService'
import { catalog, usePortalStore } from '@/store/portalStore'
import { uid } from '@/lib/utils'
import type { ImportJob, Student } from '@/types'

const IMPORT_FIELDS = [
  { id: 'registrationId', label: 'Registration ID', aliases: ['registration id', 'registration no', 'student id', 'student registration id'] },
  { id: 'applicationNumber', label: 'Application Number', aliases: ['application number', 'application no', 'application id'] },
  { id: 'universityRollNumber', label: 'University Roll Number', aliases: ['university roll number', 'university roll no', 'roll number', 'roll no'] },
  { id: 'fullName', label: 'Name', aliases: ['name', 'full name', 'student name', 'student full name'] },
  { id: 'email', label: 'Email', aliases: ['email', 'email address', 'student email'] },
  { id: 'phone', label: 'Phone Number', aliases: ['phone', 'phone number', 'mobile', 'mobile number', 'contact number'] },
  { id: 'gender', label: 'Gender', aliases: ['gender', 'sex'] },
  { id: 'dateOfBirth', label: 'Date of Birth', aliases: ['date of birth', 'dob', 'birth date'] },
  { id: 'nationality', label: 'Nationality', aliases: ['nationality', 'citizenship'] },
  { id: 'programme', label: 'Programme', aliases: ['programme', 'program', 'programme name', 'program name', 'course', 'course name'] },
  { id: 'department', label: 'Department', aliases: ['department', 'department name', 'department code'] },
  { id: 'school', label: 'School', aliases: ['school', 'school name', 'school code'] },
  { id: 'batchYear', label: 'Batch Year', aliases: ['batch year', 'batch', 'admission year', 'year of admission'] },
  { id: 'academicYear', label: 'Academic Year', aliases: ['academic year', 'session', 'academic session'] },
  { id: 'currentYear', label: 'Current Year', aliases: ['current year', 'year of study', 'study year'] },
  { id: 'currentTerm', label: 'Current Semester / Term', aliases: ['current semester', 'semester', 'current term', 'term'] },
  { id: 'studentStatus', label: 'Student Status', aliases: ['status', 'student status', 'admission status'] },
  { id: 'academicStatus', label: 'Academic Status', aliases: ['academic status', 'student type'] },
  { id: 'admissionType', label: 'Admission Type', aliases: ['admission type', 'admission category'] },
  { id: 'quota', label: 'Quota', aliases: ['quota', 'admission quota', 'seat quota'] },
  { id: 'personal.firstName', label: 'First Name', aliases: ['first name', 'given name', "name's first name", 'names first name'] },
  { id: 'personal.middleName', label: 'Middle Name', aliases: ['middle name'] },
  { id: 'personal.lastName', label: 'Last Name', aliases: ['last name', 'surname', 'family name'] },
  { id: 'personal.title', label: 'Title', aliases: ['title', 'salutation'] },
  { id: 'personal.religion', label: 'Religion', aliases: ['religion'] },
  { id: 'personal.bloodGroup', label: 'Blood Group', aliases: ['blood group', 'blood type'] },
  { id: 'personal.motherTongue', label: 'Mother Tongue', aliases: ['mother tongue'] },
  { id: 'personal.category', label: 'Category', aliases: ['category', 'social category', 'caste category'] },
  { id: 'personal.domicileState', label: 'Domicile State', aliases: ['domicile state', 'state of domicile'] },
  { id: 'personal.firstGeneration', label: 'First-Generation Student', aliases: ['first generation', 'first generation student'] },
  { id: 'personal.differentlyAbled', label: 'Differently-Abled', aliases: ['differently abled', 'disability', 'person with disability', 'pwd'] },
  { id: 'personal.ews', label: 'EWS', aliases: ['ews', 'economically weaker section'] },
  { id: 'academic.cgpa', label: 'CGPA', aliases: ['cgpa', 'cumulative grade point average'] },
  { id: 'academic.percentage', label: 'Percentage', aliases: ['percentage', 'aggregate percentage', 'overall percentage'] },
  { id: 'academic.backlogs', label: 'Backlogs', aliases: ['backlogs', 'backlog count'] },
  { id: 'academic.admissionDate', label: 'Date of Joining / Admission', aliases: ['date of joining', 'date of admission', 'joining date', 'admission date'] },
  { id: 'academic.expectedGraduation', label: 'Expected Graduation', aliases: ['expected graduation', 'year of graduation', 'graduation year'] },
  { id: 'contact.personalEmail', label: 'Personal Email', aliases: ['personal email', 'alternate email', 'email id personal'] },
  { id: 'contact.alternatePhone', label: 'Alternate Phone', aliases: ['alternate phone', 'alternate mobile', 'personal mobile', 'alternate mobile number'] },
  { id: 'contact.emergencyContactName', label: 'Emergency Contact Name', aliases: ['emergency contact name', 'emergency contact'] },
  { id: 'contact.emergencyContactPhone', label: 'Emergency Contact Phone', aliases: ['emergency contact phone', 'emergency contact number'] },
  { id: 'family.fatherName', label: "Father's Name", aliases: ["father's name", 'fathers name', 'father name', "father's full name"] },
  { id: 'family.fatherOccupation', label: "Father's Occupation", aliases: ["father's occupation", 'father occupation', 'father profession'] },
  { id: 'family.motherName', label: "Mother's Name", aliases: ["mother's name", 'mothers name', 'mother name', "mother's full name"] },
  { id: 'family.motherOccupation', label: "Mother's Occupation", aliases: ["mother's occupation", 'mother occupation', 'mother profession'] },
  { id: 'family.annualIncome', label: 'Family Annual Income', aliases: ['annual income', 'family income', 'parent income'] },
  { id: 'qualification.level', label: 'Qualification Level', aliases: ['qualification', 'qualification level', 'exam passed'] },
  { id: 'qualification.boardUniversity', label: 'Qualification Board / University', aliases: ['board', 'board university', 'board or university', 'university name'] },
  { id: 'qualification.yearOfPassing', label: 'Qualification Year of Passing', aliases: ['year of passing', 'passing year'] },
  { id: 'qualification.percentage', label: 'Qualification Percentage', aliases: ['qualification percentage', 'class percentage', 'marks percentage'] },
  { id: 'entranceExam.examName', label: 'Entrance Exam Name', aliases: ['entrance exam', 'entrance exam name', 'exam name'] },
  { id: 'entranceExam.score', label: 'Entrance Exam Score', aliases: ['entrance score', 'exam score', 'entrance exam score'] },
  { id: 'entranceExam.rank', label: 'Entrance Exam Rank', aliases: ['entrance rank', 'exam rank', 'entrance exam rank'] },
  { id: 'entranceExam.year', label: 'Entrance Exam Year', aliases: ['entrance exam year', 'exam year'] },
  { id: 'mentor.name', label: 'Mentor Name', aliases: ['mentor', 'mentor name', 'faculty mentor'] },
  { id: 'mentor.email', label: 'Mentor Email', aliases: ['mentor email', 'faculty mentor email'] },
  { id: 'mentor.phone', label: 'Mentor Phone', aliases: ['mentor phone', 'mentor mobile'] },
  { id: 'sensitive.aadhaar', label: 'Aadhaar Number', aliases: ['aadhaar', 'aadhaar number', 'aadhar', 'aadhar number', 'uid number'] },
  { id: 'sensitive.pan', label: 'PAN Number', aliases: ['pan', 'pan number', 'pan card'] },
  { id: 'sensitive.bankAccount', label: 'Bank Account Number', aliases: ['bank account', 'bank account number', 'account number'] },
  { id: 'sensitive.ifsc', label: 'Bank IFSC', aliases: ['ifsc', 'ifsc code'] },
  { id: 'sensitive.abcId', label: 'ABC ID', aliases: ['abc id', 'academic bank of credits id'] },
  { id: 'address.permanent.line1', label: 'Permanent Address', aliases: ['permanent address', 'address permanent', 'p address', 'permanent address line 1', 'address line 1'] },
  { id: 'address.permanent.line2', label: 'Permanent Address Line 2', aliases: ['permanent address line 2', 'p address line 2', 'address line 2'] },
  { id: 'address.permanent.city', label: 'Permanent City', aliases: ['permanent city', 'city permanent', 'p city'] },
  { id: 'address.permanent.state', label: 'Permanent State', aliases: ['permanent state', 'state permanent', 'p state'] },
  { id: 'address.permanent.pincode', label: 'Permanent PIN Code', aliases: ['permanent pincode', 'permanent pin code', 'permanent postal code', 'p pincode', 'p pin code'] },
  { id: 'address.permanent.country', label: 'Permanent Country', aliases: ['permanent country', 'p country'] },
  { id: 'address.present.line1', label: 'Present Address', aliases: ['present address', 'current address', 'communication address', 'c address', 'present address line 1', 'current address line 1'] },
  { id: 'address.present.line2', label: 'Present Address Line 2', aliases: ['present address line 2', 'current address line 2', 'c address line 2'] },
  { id: 'address.present.city', label: 'Present City', aliases: ['present city', 'current city', 'c city'] },
  { id: 'address.present.state', label: 'Present State', aliases: ['present state', 'current state', 'c state'] },
  { id: 'address.present.pincode', label: 'Present PIN Code', aliases: ['present pincode', 'present pin code', 'current pincode', 'c pincode', 'c pin code'] },
  { id: 'address.present.country', label: 'Present Country', aliases: ['present country', 'current country', 'c country'] },
] as const

const SORTED_IMPORT_FIELDS = [...IMPORT_FIELDS].sort((a, b) => a.label.localeCompare(b.label))

type ImportFieldId = (typeof IMPORT_FIELDS)[number]['id'] | `custom:${string}`

const FIELD_BY_ALIAS = new Map(
  IMPORT_FIELDS.flatMap((field) =>
    [field.label, ...field.aliases].map((alias) => [normalizeImportValue(alias), field.id] as const),
  ),
)

function normalizeImportValue(value: string) {
  return value
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function fieldForHeader(header: string): ImportFieldId {
  return FIELD_BY_ALIAS.get(normalizeImportValue(header)) ?? `custom:${header}`
}

function normalizeProgrammeName(value: string) {
  return normalizeImportValue(value)
    .replace(/\bb tech\b|\bbtech\b/g, 'bachelor of technology')
    .replace(/\bb sc\b|\bbsc\b/g, 'bachelor of science')
    .replace(/\bbca\b/g, 'bachelor of computer application')
    .replace(/\bmca\b/g, 'master of computer applications')
    .replace(/\bm sc\b|\bmsc\b/g, 'master of science')
    .replace(/\bcyber security\b/g, 'cybersecurity')
}

function parseImportNumber(value: string): number | undefined {
  if (!value.trim()) return undefined
  const parsed = Number(value.replace(/,/g, '').match(/-?\d+(\.\d+)?/)?.[0])
  return Number.isFinite(parsed) ? parsed : undefined
}

function parseImportBoolean(value: string): boolean {
  return ['1', 'yes', 'y', 'true'].includes(normalizeImportValue(value))
}

function parseImportDate(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed

  if (/^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(trimmed)) {
    const [dayOrMonth, monthOrDay, year] = trimmed.split(/[/-]/).map(Number)
    const [day, month] = dayOrMonth > 12 ? [dayOrMonth, monthOrDay] : [monthOrDay, dayOrMonth]
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const serial = Number(trimmed)
  if (Number.isFinite(serial) && serial > 0 && serial < 100000) {
    const date = XLSX.SSF.parse_date_code(serial)
    if (date) return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`
  }

  const date = new Date(trimmed)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10)
}

function findProgrammeMatch(value: string) {
  const normalized = normalizeImportValue(value)
  if (!normalized) return null

  const exactMatch = catalog.programmes.find((programme) =>
    normalizeImportValue(programme.name) === normalized || normalizeImportValue(programme.code) === normalized,
  )
  if (exactMatch) return exactMatch

  const target = normalizeProgrammeName(value)
  return catalog.programmes.find((programme) => {
    const aliases = [
      programme.name,
      programme.name.replace(/\./g, ' '),
      programme.code,
      programme.code.replace(/[-_]/g, ' '),
    ]

    return aliases.some((alias) => normalizeProgrammeName(alias) === target)
  })
}

export function ImportPage() {
  const user = usePortalStore((s) => s.currentUser)!
  const addImport = usePortalStore((s) => s.addImport)
  const commitImportStudents = usePortalStore((s) => s.commitImportStudents)
  const students = usePortalStore((s) => s.students)
  const jobs = usePortalStore((s) => s.imports)
  const [job, setJob] = useState<ImportJob | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [sourceRows, setSourceRows] = useState<Record<string, unknown>[]>([])
  const [saving, setSaving] = useState(false)

  if (!canImport(user.role)) {
    return <div><PageHeader title="Import Data" /><Card className="p-6 text-sm text-navy-600">Your role cannot import institutional data.</Card></div>
  }

  function onFile(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      const wb = XLSX.read(reader.result, { type: 'array' })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as Record<string, unknown>[]
      const cols = json[0] ? Object.keys(json[0]) : []
      const auto: Record<string, string> = {}
      cols.forEach((c) => {
        auto[c] = fieldForHeader(c)
      })
      const created: ImportJob = {
        id: uid('imp'),
        entity: 'students',
        fileName: file.name,
        status: 'mapped',
        totalRows: json.length,
        validRows: 0,
        warningRows: 0,
        errorRows: 0,
        newCount: 0,
        updatedCount: 0,
        unchangedCount: 0,
        mapping: auto,
        uploadedBy: user.fullName,
        createdAt: new Date().toISOString(),
        errors: [],
        previewRows: json.slice(0, 200).map((row) =>
          Object.fromEntries(Object.entries(row).map(([key, value]) => [key, String(value ?? '')])),
        ),
      }
      setHeaders(cols)
      setSourceRows(json)
      setMapping(auto)
      setJob(created)
      addImport(created)
      toast.success(`Detected ${json.length} rows and ${cols.length} columns`)
    }
    reader.readAsArrayBuffer(file)
  }

  const validated = useMemo(() => {
    if (!job) return null
    const existing = new Set(students.map((s) => s.registrationId.toLowerCase()))
    const seen = new Set<string>()
    const errors: ImportJob['errors'] = []
    let valid = 0
    let warn = 0
    const built: Student[] = []
    sourceRows.forEach((row, idx) => {
      const get = (field: ImportFieldId) => {
        const col = Object.entries(mapping).find(([, value]) => value === field)?.[0]
        return col ? String(row[col] ?? '').trim() : ''
      }
      const registrationId = get('registrationId')
      const existingStudent = registrationId
        ? students.find((student) => student.registrationId.toLowerCase() === registrationId.toLowerCase())
        : undefined
      const fullName = get('fullName')
        || [get('personal.firstName'), get('personal.middleName'), get('personal.lastName')].filter(Boolean).join(' ')
        || existingStudent?.fullName
      const email = get('email')
      const programmeName = get('programme')
      const issues: ImportJob['errors'] = []
      if (!registrationId) issues.push({ row: idx + 2, severity: 'error', field: 'registrationId', message: 'Missing required field Registration ID' })
      if (!fullName) issues.push({ row: idx + 2, severity: 'error', field: 'fullName', message: 'Missing required field Name' })
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) issues.push({ row: idx + 2, severity: 'error', field: 'email', message: 'Invalid email' })
      if (registrationId && seen.has(registrationId.toLowerCase())) issues.push({ row: idx + 2, severity: 'error', field: 'registrationId', message: 'Duplicate Registration ID in file' })
      if (registrationId) seen.add(registrationId.toLowerCase())
      const programme = findProgrammeMatch(programmeName)
      if (programmeName && !programme) issues.push({ row: idx + 2, severity: 'error', field: 'programme', message: `Unknown programme: ${programmeName}` })
      const departmentName = get('department')
      const department = departmentName
        ? catalog.departments.find((item) => normalizeImportValue(item.name) === normalizeImportValue(departmentName) || normalizeImportValue(item.code) === normalizeImportValue(departmentName))
        : catalog.departments.find((item) => item.id === existingStudent?.departmentId)
      if (departmentName && !department) issues.push({ row: idx + 2, severity: 'error', field: 'department', message: `Unknown department: ${departmentName}` })
      if (programme && department && programme.departmentId !== department.id) {
        issues.push({ row: idx + 2, severity: 'error', field: 'department', message: 'Department does not match the selected programme' })
      }
      const schoolName = get('school')
      const school = schoolName
        ? catalog.schools.find((item) => normalizeImportValue(item.name) === normalizeImportValue(schoolName) || normalizeImportValue(item.code) === normalizeImportValue(schoolName))
        : catalog.schools.find((item) => item.id === existingStudent?.schoolId)
      if (schoolName && !school) issues.push({ row: idx + 2, severity: 'error', field: 'school', message: `Unknown school: ${schoolName}` })
      if (school && department && department.schoolId !== school.id) {
        issues.push({ row: idx + 2, severity: 'error', field: 'school', message: 'School does not match the selected department' })
      }
      if (school && programme && catalog.departments.find((item) => item.id === programme.departmentId)?.schoolId !== school.id) {
        issues.push({ row: idx + 2, severity: 'error', field: 'school', message: 'School does not match the selected programme' })
      }
      const genderValue = normalizeImportValue(get('gender'))
      const gender = genderValue === 'm' || genderValue === 'male' ? 'male'
        : genderValue === 'f' || genderValue === 'female' ? 'female'
          : genderValue === 'other' ? 'other'
            : genderValue ? 'prefer_not_to_say' : existingStudent?.gender ?? 'prefer_not_to_say'
      if (genderValue && gender === 'prefer_not_to_say') issues.push({ row: idx + 2, severity: 'warning', field: 'gender', message: 'Unrecognized gender; using unspecified' })
      const statusValue = normalizeImportValue(get('studentStatus')).replace(/ /g, '_')
      const studentStatuses: Student['studentStatus'][] = ['active', 'inactive', 'graduated', 'alumni', 'withdrawn', 'suspended']
      const studentStatus = studentStatuses.find((status) => status === statusValue)
      if (statusValue && !studentStatus) issues.push({ row: idx + 2, severity: 'warning', field: 'studentStatus', message: `Unrecognized student status "${get('studentStatus')}"; keeping the existing status or using active` })
      const academicStatusValue = normalizeImportValue(get('academicStatus')).replace(/ /g, '_')
      const academicStatuses: Student['academicStatus'][] = ['regular', 'lateral', 're_admitted', 'detained']
      const academicStatus = academicStatuses.find((status) => status === academicStatusValue)
      if (academicStatusValue && !academicStatus) issues.push({ row: idx + 2, severity: 'warning', field: 'academicStatus', message: `Unrecognized academic status "${get('academicStatus')}"; keeping the existing status or using regular` })
      if (!registrationId || !fullName || issues.some((i) => i.severity === 'error')) {
        errors.push(...issues)
        return
      }
      if (issues.length) {
        warn += 1
        errors.push(...issues)
      }
      valid += 1
      const prog = programme
        ?? (departmentName ? catalog.programmes.find((item) => item.departmentId === department?.id) : null)
        ?? (schoolName ? catalog.programmes.find((item) => catalog.departments.find((deptItem) => deptItem.id === item.departmentId)?.schoolId === school?.id) : null)
        ?? catalog.programmes.find((item) => item.id === existingStudent?.programmeId)
        ?? catalog.programmes.find((item) => item.departmentId === department?.id)
        ?? catalog.programmes.find((item) => catalog.departments.find((deptItem) => deptItem.id === item.departmentId)?.schoolId === school?.id)
        ?? catalog.programmes[0]
      const dept = catalog.departments.find((item) => item.id === prog.departmentId)!
      const batchYearValue = get('batchYear')
      const batchYear = Number(batchYearValue.match(/\b(19|20)\d{2}\b/)?.[0])
      const batch = catalog.batches.find((item) => item.programmeId === prog.id && (!batchYear || item.year === batchYear))
        ?? catalog.batches.find((item) => item.id === existingStudent?.batchId && item.programmeId === prog.id)
        ?? catalog.batches.find((item) => item.programmeId === prog.id)
      const academicYearValue = normalizeImportValue(get('academicYear'))
      const academicYear = catalog.academicYears.find((item) => normalizeImportValue(item.label) === academicYearValue)
        ?? catalog.academicYears.find((item) => academicYearValue && normalizeImportValue(item.label).startsWith(academicYearValue.slice(0, 4)))
      const customFields = Object.fromEntries(
        Object.entries(mapping)
          .filter(([, field]) => field.startsWith('custom:'))
          .map(([column, field]) => [field.slice('custom:'.length) || column, String(row[column] ?? '').trim()])
          .filter(([, value]) => value),
      )
      const qualification = {
        level: get('qualification.level'),
        boardUniversity: get('qualification.boardUniversity'),
        yearOfPassing: parseImportNumber(get('qualification.yearOfPassing')) ?? 0,
        percentage: parseImportNumber(get('qualification.percentage')) ?? 0,
      }
      const entranceExam = {
        examName: get('entranceExam.examName'),
        score: parseImportNumber(get('entranceExam.score')),
        rank: parseImportNumber(get('entranceExam.rank')),
        year: parseImportNumber(get('entranceExam.year')) ?? new Date().getFullYear(),
      }
      const addresses = (['permanent', 'present'] as const).flatMap((type) => {
        const prefix = `address.${type}.` as const
        const address = {
          type,
          line1: get(`${prefix}line1`),
          line2: get(`${prefix}line2`),
          city: get(`${prefix}city`),
          state: get(`${prefix}state`),
          pincode: get(`${prefix}pincode`),
          country: get(`${prefix}country`),
        }
        return [address.line1, address.line2, address.city, address.state, address.pincode, address.country].some(Boolean) ? [address] : []
      })
      const sensitive = {
        aadhaar: get('sensitive.aadhaar') || existingStudent?.sensitive?.aadhaar,
        pan: get('sensitive.pan') || existingStudent?.sensitive?.pan,
        bankAccount: get('sensitive.bankAccount') || existingStudent?.sensitive?.bankAccount,
        ifsc: get('sensitive.ifsc') || existingStudent?.sensitive?.ifsc,
        abcId: get('sensitive.abcId') || existingStudent?.sensitive?.abcId,
      }
      built.push({
        id: uid('stu'),
        registrationId,
        applicationNumber: get('applicationNumber') || existingStudent?.applicationNumber || `APP${registrationId}`,
        universityRollNumber: get('universityRollNumber') || existingStudent?.universityRollNumber || registrationId,
        fullName,
        email: email || existingStudent?.email || '',
        phone: get('phone') || existingStudent?.phone || '',
        gender,
        dateOfBirth: parseImportDate(get('dateOfBirth')) || existingStudent?.dateOfBirth || '',
        nationality: get('nationality') || existingStudent?.nationality || 'India',
        quota: get('quota') || existingStudent?.quota,
        programmeId: prog.id,
        departmentId: dept.id,
        schoolId: dept.schoolId,
        batchId: batch?.id ?? existingStudent?.batchId ?? '',
        academicYearId: academicYear?.id ?? batch?.academicYearId ?? existingStudent?.academicYearId ?? catalog.academicYears.find((year) => year.isCurrent)?.id ?? '',
        currentYear: parseImportNumber(get('currentYear')) ?? existingStudent?.currentYear ?? 1,
        currentTerm: get('currentTerm') || existingStudent?.currentTerm || '',
        studentStatus: studentStatus ?? existingStudent?.studentStatus ?? 'active',
        academicStatus: academicStatus ?? existingStudent?.academicStatus ?? 'regular',
        admissionType: get('admissionType') || existingStudent?.admissionType || '',
        workflow: existingStudent?.workflow ?? 'submitted',
        isArchived: existingStudent?.isArchived ?? false,
        personal: {
          ...existingStudent?.personal,
          firstName: get('personal.firstName') || existingStudent?.personal.firstName || fullName.split(' ')[0],
          middleName: get('personal.middleName') || existingStudent?.personal.middleName,
          lastName: get('personal.lastName') || existingStudent?.personal.lastName || fullName.split(' ').slice(1).join(' '),
          title: get('personal.title') || existingStudent?.personal.title,
          religion: get('personal.religion') || existingStudent?.personal.religion,
          bloodGroup: get('personal.bloodGroup') || existingStudent?.personal.bloodGroup,
          motherTongue: get('personal.motherTongue') || existingStudent?.personal.motherTongue,
          firstGeneration: get('personal.firstGeneration') ? parseImportBoolean(get('personal.firstGeneration')) : existingStudent?.personal.firstGeneration ?? false,
          differentlyAbled: get('personal.differentlyAbled') ? parseImportBoolean(get('personal.differentlyAbled')) : existingStudent?.personal.differentlyAbled ?? false,
          ews: get('personal.ews') ? parseImportBoolean(get('personal.ews')) : existingStudent?.personal.ews ?? false,
          domicileState: get('personal.domicileState') || existingStudent?.personal.domicileState || '',
          category: get('personal.category') || existingStudent?.personal.category || '',
        },
        academic: {
          ...existingStudent?.academic,
          cgpa: parseImportNumber(get('academic.cgpa')) ?? existingStudent?.academic.cgpa,
          percentage: parseImportNumber(get('academic.percentage')) ?? existingStudent?.academic.percentage,
          backlogs: parseImportNumber(get('academic.backlogs')) ?? existingStudent?.academic.backlogs ?? 0,
          admissionDate: parseImportDate(get('academic.admissionDate')) || existingStudent?.academic.admissionDate || '',
          expectedGraduation: parseImportDate(get('academic.expectedGraduation')) || existingStudent?.academic.expectedGraduation,
        },
        contact: {
          ...existingStudent?.contact,
          personalEmail: get('contact.personalEmail') || existingStudent?.contact.personalEmail,
          alternatePhone: get('contact.alternatePhone') || existingStudent?.contact.alternatePhone,
          emergencyContactName: get('contact.emergencyContactName') || existingStudent?.contact.emergencyContactName,
          emergencyContactPhone: get('contact.emergencyContactPhone') || existingStudent?.contact.emergencyContactPhone,
        },
        addresses: addresses.length ? addresses : existingStudent?.addresses ?? [],
        family: {
          ...existingStudent?.family,
          fatherName: get('family.fatherName') || existingStudent?.family.fatherName,
          fatherOccupation: get('family.fatherOccupation') || existingStudent?.family.fatherOccupation,
          motherName: get('family.motherName') || existingStudent?.family.motherName,
          motherOccupation: get('family.motherOccupation') || existingStudent?.family.motherOccupation,
          annualIncome: parseImportNumber(get('family.annualIncome')) ?? existingStudent?.family.annualIncome,
        },
        qualifications: Object.values(qualification).some(Boolean) ? [qualification] : existingStudent?.qualifications ?? [],
        entranceExams: entranceExam.examName ? [entranceExam] : existingStudent?.entranceExams ?? [],
        mentor: get('mentor.name') ? {
          name: get('mentor.name'),
          email: get('mentor.email') || existingStudent?.mentor?.email || '',
          phone: get('mentor.phone') || existingStudent?.mentor?.phone || '',
        } : existingStudent?.mentor,
        sensitive: Object.values(sensitive).some(Boolean) ? sensitive : existingStudent?.sensitive,
        customFields: { ...existingStudent?.customFields, ...customFields },
        createdAt: existingStudent?.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    })
    const newCount = built.filter((b) => !existing.has(b.registrationId.toLowerCase())).length
    const updatedCount = built.length - newCount
    return { errors, valid, warn, built, newCount, updatedCount, unchanged: job.totalRows - built.length - errors.filter((e) => e.severity === 'error').length }
  }, [job, mapping, sourceRows, students])

  async function confirm() {
    if (!job || !validated) return
    setSaving(true)
    try {
      let savedCounts: { created: number; updated: number } | undefined
      if (isSupabaseConfigured) {
        savedCounts = await studentService.commitImport(job.fileName, mapping, validated.built)
      }
      commitImportStudents(validated.built, job.id)
      toast.success(
        isSupabaseConfigured
          ? `${savedCounts?.created ?? 0} new and ${savedCounts?.updated ?? 0} updated student records saved to Supabase and the portal`
          : `${validated.built.length} student records saved in this browser`,
      )
      setJob({ ...job, status: 'committed' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save the student import.'
      toast.error(`Import was not saved: ${message}`)
    } finally {
      setSaving(false)
    }
  }

  function downloadValidationReport() {
    if (!job || !validated?.errors.length) return
    const worksheet = XLSX.utils.json_to_sheet(validated.errors)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Validation issues')
    XLSX.writeFile(workbook, `${job.fileName.replace(/\.[^.]+$/, '')}-validation-report.xlsx`)
  }

  return (
    <div>
      <PageHeader title="Import Data" subtitle="Confirmed student imports are saved to Supabase and synchronized with the portal. Unmatched columns are retained as custom attributes." />
      <Card className="p-5">
        <p className="text-sm font-medium">Upload Student Excel</p>
        <input className="mt-3 text-sm" type="file" accept=".xlsx,.xls,.csv" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        <p className="mt-2 text-xs text-navy-400">Accepted: XLS, XLSX, CSV. Preview, validate, then confirm.</p>
        {!isSupabaseConfigured ? (
          <p className="mt-2 text-xs text-amber-700">Supabase is not configured. Imports are saved only in this browser and are not shared across users or devices.</p>
        ) : null}
      </Card>

      {job && (
        <Card className="mt-4 p-5">
          <p className="font-medium">{job.fileName}</p>
          <p className="text-sm text-navy-500">Detected: {job.totalRows} rows · {headers.length} columns</p>
          <h3 className="mt-4 mb-2 text-sm font-medium">Column Mapping</h3>
          <div className="grid gap-2 md:grid-cols-2">
            {headers.map((h) => (
              <div key={h} className="grid grid-cols-2 items-center gap-2 text-sm">
                <span className="truncate text-navy-600">{h}</span>
                <Select value={mapping[h] ?? ''} onChange={(e) => setMapping((m) => ({ ...m, [h]: e.target.value }))}>
                  <option value="">Ignore</option>
                  {SORTED_IMPORT_FIELDS.map((field) => (
                    <option key={field.id} value={field.id}>{field.label}</option>
                  ))}
                  <option value={`custom:${h}`}>Keep as custom attribute: {h}</option>
                </Select>
              </div>
            ))}
          </div>
        </Card>
      )}

      {validated && job && (
        <Card className="mt-4 p-5">
          <div className="grid gap-3 sm:grid-cols-4 text-sm">
            <Stat label="Valid" value={validated.valid} />
            <Stat label="Warnings" value={validated.warn} />
            <Stat label="Errors" value={validated.errors.filter((e) => e.severity === 'error').length} />
            <Stat label="New / Updated" value={`${validated.newCount} / ${validated.updatedCount}`} />
          </div>
          <div className="mt-4 max-h-56 overflow-auto text-xs">
            {validated.errors.slice(0, 40).map((e, i) => (
              <p key={i} className={e.severity === 'error' ? 'text-red-700' : 'text-amber-700'}>
                Row {e.row} · {e.field} · {e.message}
              </p>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="outline" disabled={saving} onClick={() => setJob(null)}>Cancel Import</Button>
            <Button variant="outline" disabled={!validated.errors.length} onClick={downloadValidationReport}>
              <Download size={16} /> Download Issues
            </Button>
            <Button disabled={!validated.built.length || saving} onClick={() => void confirm()}>
              {saving ? 'Saving…' : 'Confirm Import'}
            </Button>
          </div>
        </Card>
      )}

      {jobs.length > 0 && (
        <Card className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-navy-950 text-white text-left"><tr><th className="px-4 py-3">File</th><th>Status</th><th>Rows</th><th>When</th></tr></thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id} className="border-t"><td className="px-4 py-2">{j.fileName}</td><td><Badge>{j.status}</Badge></td><td>{j.totalRows}</td><td>{new Date(j.createdAt).toLocaleString('en-IN')}</td></tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-lg bg-navy-50 p-3"><p className="text-navy-500">{label}</p><p className="text-xl font-semibold">{value}</p></div>
}
