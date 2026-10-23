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
  { id: 'academic.expectedGraduation', label: 'Expected Graduation', aliases: ['expected graduation', 'expected graduation date'] },
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

const EXACT_STUDENT_COLUMNS = [
  'Registration Id', 'Application Number', 'Name', 'Email', 'Phone Number', 'Department',
  'Programme', 'Batch Year', 'Gender', 'Quota', 'Academic Status', 'Current Year',
  'Specialisation', 'Accommodation Type', 'Date of Joining', 'Account Status', 'Joining Year',
  'Expected Graduation Year', 'Expected Graduation Date', 'Intake', 'Programme Section',
  'current Term', 'Programme System', 'Admission Type', 'Activation/Deactivation Reason',
  'Student Status', 'Student Status Remark', 'Specialization', 'School',
  'Will you require hostel accommodation?', 'How did you come to know about GD Goenka University?',
  'If Newspaper, select one of the following:', 'Will you require transportation?',
  'Meritto Application Number', 'Title', 'Age as on 31st December 2025', 'Nationality',
  'Academic Bank of Credits (ABC) ID', 'Name as per Aadhar Card', 'Blood-Group', 'First name',
  'Middle name', 'Last name', 'Name as on certificate', 'Date of birth', 'Citizenship',
  'Nationality If Other', 'Blood Group if Other', "Father's Alternate Mobile Number",
  "Father's Email Address", "Father's first name", "Father's middle name", "Father's last name",
  "Father's phone", "Father's email", "Father's address", "Father's occupation",
  "Father's annual income", "Father's PAN", "Father's aadhar number", "Father's Name",
  "Mother's Email Address", "Mother's Alternate Mobile Number", "Mother's first name",
  "Mother's middle name", "Mother's last name", "Mother's phone", "Mother's email",
  "Mother's address", "Mother's occupation", "Mother's annual income", "Mother's PAN",
  "Mother's aadhar number", "Mother's Name", "GUARDIAN's Alternate Mobile Number",
  "Guardian's Designation", "Guardian's first name", "Guardian's last name", "Guardian's phone",
  "Guardian's email", "Guardian's address", "Guardian's occupation", "Guardian's annual income",
  "Guardian's PAN", "Guardian's aadhar number", "Guardian's gender", 'PAN card number',
  'Aadhar card number (Passport Number for Foreign National Students)', 'Place of Issue',
  'Passport number', 'Passport issued date', 'Passport expiry date', 'Passport Country',
  'State', 'Address Line 2', 'P Address Line 1', 'P Address Line 2', 'P Pincode', 'P District',
  'C Address Line 1', 'C Address Line 2', 'C Pincode', 'C District',
  'Is permanent address same as address for communication?', 'P City', 'C City', 'C State',
  'C Country', 'Country', 'Emergency contact number', 'Email id', 'Permanent city',
  'Alternate email id', 'Phone number', 'Alternate phone number', 'Present address',
  'Present city', 'Present district', 'Present state', 'Present postcode', 'Permanent address',
  'Presently residing with', 'Permanent district', 'Permanent state', 'Permanent postcode',
  'Communication address', 'Communication city', 'Communication district',
  'Communication state', 'Communication Country', 'Permanent Country',
  "Local guardian's name", "Local guardian's contact number", "Local guardian's email id",
  "Local guardian's occupation", "Local guardian's annual income",
  'Have you appear in any entrance exam?', 'Please check the Entrance Exams Appeared',
  'Entrance exam enrollment number', 'Entrance exam rank', 'JEE rank', 'JEE roll number',
  'CET rank', 'CET roll number', 'NATA rank', 'NATA roll number', 'CLAT rank', 'CLAT roll number',
  'Visa number', 'Visa issued date', 'Visa expiry date', 'RC/RP issued date', 'RC/RP expiry date',
  'Bank A/C number', 'Account holder name', 'IFSC Code', 'Branch', 'Bank name',
  'Sponsorer name', 'Relation with sponsorer', 'Sponsorer address', 'Sponsorer city',
  'Sponsorer district', 'Sponsorer state', 'Sponsorer country', 'Sponsorer postcode',
  'Post Graduation Stream', '12th Name of Board/ University', 'ABC ID', 'Graduation State',
  'Graduation University', 'Graduation Institute', 'UG-Obtained Percentage / CGPA',
  'Post Graduation State', 'Post Graduation University', 'Post Graduation Institute',
  'PG-Obtained Percentage / CGPA', 'Graduation Degree Name', 'Graduation Year of Passing',
  'Post Graduation Degree Name', 'Diploma Stream', 'PG-Year of Passing',
  'Other Qualification-Degree', 'Other Qualification-Stream', 'Other Qualification-Result Status',
  'Other Qualification-Year of Passing', 'Other Qualification-Obtained Percentage / CGPA',
  '12th Stream', 'Marking Scheme-10th', 'Marking Scheme-12th', 'Marking Scheme-Diploma',
  'Marking Scheme-UG', 'Marking Scheme-PG', 'Marking Scheme-Other',
  'Diploma-School/Institute Name', 'Graduation Stream', 'H.S.C (12th) Exam Cgpa',
  'S.S.C (10th) Exam Cgpa', '10th-Obtained Percentage / CGPA', 'Post Graduate (PG) Marks',
  'S.S.C (10th) exam marks', 'H.S.C (12th) exam marks', 'Diploma marks',
  'Under graduate marks', 'University roll number', 'Post Graduate (PG) Year Of Passing',
  'S.S.C (10th) Exam Year Of Passing', '12th-Obtained Percentage / CGPA',
  'H.S.C (12th) Exam Year Of Passing', 'Diploma-Obtained Percentage / CGPA',
  'Diploma (Deg) Year of Passing', 'Under Graduate (UG) Percentage',
  'Under Graduate (UG) Year Of Passing', 'Number of Active Backlogs',
  'Number of Cleared Backlogs', 'Number of Year Backs', 'Post Graduate (PG) Percentage',
  'University / Board Name', 'Total Work Experience (In Years)', 'Under Graduate (UG) Cgpa',
  'Post Graduate (PG) Cgpa', 'Industry', 'Are you Differently Abled?',
  'Do you belong to EWS category?', 'Are you kashmiri migrant?',
  'Reservation Category', 'Family ID, if resident of Haryana',
  "Are you 1st generation child (Whose parent's are not a Graduate)",
  'Are you a Haryana Domicile Student?', 'Religion Name', 'Caste', 'Sub caste', 'Religion',
  'State of domicile', 'Name Of Organisation', 'Industry Type', 'Function', 'Designation',
  'Gross Annual Salary', 'Start Date', 'End Date', 'Responsibilities And Functions',
  'Total Experience(In Months)', 'Mentor Name', 'Mentor Email', 'Mentor Phone',
  'Applicant name', 'Parent name', 'Date',
] as const

type ImportFieldId = (typeof IMPORT_FIELDS)[number]['id'] | `custom:${string}`

const FIELD_BY_ALIAS = new Map(
  IMPORT_FIELDS.flatMap((field) =>
    [field.label, ...field.aliases].map((alias) => [normalizeImportValue(alias), field.id] as const),
  ),
)

const EXACT_COLUMN_IMPORT_FIELDS = [...new Set(EXACT_STUDENT_COLUMNS)]
  .map((label) => ({
    id: FIELD_BY_ALIAS.get(normalizeImportValue(label)) ?? `custom:${label}`,
    label,
  }))
  .filter((exact) => !IMPORT_FIELDS.some((field) => field.id === exact.id && field.label === exact.label))
const SORTED_IMPORT_FIELDS = [...IMPORT_FIELDS, ...EXACT_COLUMN_IMPORT_FIELDS]
  .sort((a, b) => a.label.localeCompare(b.label))
const EXACT_COLUMN_BY_NORMALIZED = new Map(
  EXACT_STUDENT_COLUMNS.map((label) => [normalizeImportValue(label), label] as const),
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

function cleanOptionalImportValue(value: string): string {
  const trimmed = value.trim()
  return /^(?:[-–—]+|n\/?a|null|undefined|none|not applicable)$/i.test(trimmed) ? '' : trimmed
}

function fieldForHeader(header: string): ImportFieldId {
  const normalized = normalizeImportValue(header)
  return FIELD_BY_ALIAS.get(normalized)
    ?? (EXACT_COLUMN_BY_NORMALIZED.get(normalized)
      ? `custom:${EXACT_COLUMN_BY_NORMALIZED.get(normalized)!}`
      : `custom:${header}`)
}

function isSensitiveImportAttribute(label: string): boolean {
  return /\b(aadhaar|aadhar|pan|passport|visa|ifsc|abc id|bank|account holder)\b/i.test(label)
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

function importErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object') {
    const details = error as Record<string, unknown>
    const message = typeof details.message === 'string' ? details.message : ''
    const code = typeof details.code === 'string' ? ` (${details.code})` : ''
    const detail = typeof details.details === 'string' ? ` Details: ${details.details}` : ''
    const hint = typeof details.hint === 'string' ? ` Hint: ${details.hint}` : ''
    if (message) return `${message}${code}${detail}${hint}`
  }
  return 'Supabase returned an unrecognized error. Check the browser console and Supabase logs.'
}

function findProgrammeMatch(value: string) {
  const normalized = normalizeImportValue(value)
  if (!normalized) return null

  // 1. Exact name or code match
  const exactMatch = catalog.programmes.find((programme) =>
    normalizeImportValue(programme.name) === normalized || normalizeImportValue(programme.code) === normalized,
  )
  if (exactMatch) return exactMatch

  // 2. Normalized abbreviations match
  const target = normalizeProgrammeName(value)
  const aliasMatch = catalog.programmes.find((programme) => {
    const aliases = [
      programme.name,
      programme.name.replace(/\./g, ' '),
      programme.code,
      programme.code.replace(/[-_]/g, ' '),
    ]
    return aliases.some((alias) => normalizeProgrammeName(alias) === target)
  })
  if (aliasMatch) return aliasMatch

  // 3. Substring / fuzzy match
  return catalog.programmes.find((programme) => {
    const pNorm = normalizeImportValue(programme.name)
    return pNorm && (pNorm.includes(normalized) || normalized.includes(pNorm))
  }) ?? null
}

export function ImportPage() {
  const user = usePortalStore((s) => s.currentUser)!
  const addImport = usePortalStore((s) => s.addImport)
  const commitImportStudents = usePortalStore((s) => s.commitImportStudents)
  const mergeImportedStudents = usePortalStore((s) => s.mergeImportedStudents)
  const setImportStatus = usePortalStore((s) => s.setImportStatus)
  const students = usePortalStore((s) => s.students)
  const jobs = usePortalStore((s) => s.imports)
  const [job, setJob] = useState<ImportJob | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [sourceRows, setSourceRows] = useState<Record<string, unknown>[]>([])
  const [saving, setSaving] = useState(false)
  const [savingRows, setSavingRows] = useState(0)
  const [importCompleted, setImportCompleted] = useState(false)

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
      setImportCompleted(false)
      setSavingRows(0)
      addImport(created)
      toast.success(`Detected ${json.length} rows and ${cols.length} columns`)
    }
    reader.readAsArrayBuffer(file)
  }

  const validated = useMemo(() => {
    if (!job) return null
    const existing = new Set(students.map((s) => s.registrationId.toLowerCase()))
    const seen = new Set<string>()
    const seenApplicationNumbers = new Set<string>()
    const seenUniversityRollNumbers = new Set<string>()
    const errors: ImportJob['errors'] = []
    let valid = 0
    let warn = 0
    const built: Student[] = []
    sourceRows.forEach((row, idx) => {
      const get = (field: ImportFieldId) => {
        const col = Object.entries(mapping).find(([, value]) => value === field)?.[0]
        return col ? cleanOptionalImportValue(String(row[col] ?? '')) : ''
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
      const applicationNumber = get('applicationNumber')
        || cleanOptionalImportValue(existingStudent?.applicationNumber ?? '')
        || `APP${registrationId}`
      const universityRollNumber = get('universityRollNumber')
        || cleanOptionalImportValue(existingStudent?.universityRollNumber ?? '')
      const existingWithApplicationNumber = students.find((student) =>
        student.registrationId.toLowerCase() !== existingStudent?.registrationId.toLowerCase()
        && applicationNumber
        && cleanOptionalImportValue(student.applicationNumber).toLowerCase() === applicationNumber.toLowerCase(),
      )
      if (applicationNumber && (seenApplicationNumbers.has(applicationNumber.toLowerCase()) || existingWithApplicationNumber)) {
        issues.push({ row: idx + 2, severity: 'error', field: 'applicationNumber', message: `Duplicate Application Number "${applicationNumber}"` })
      }
      if (applicationNumber) seenApplicationNumbers.add(applicationNumber.toLowerCase())
      const existingWithUniversityRollNumber = students.find((student) =>
        student.registrationId.toLowerCase() !== existingStudent?.registrationId.toLowerCase()
        && universityRollNumber
        && cleanOptionalImportValue(student.universityRollNumber).toLowerCase() === universityRollNumber.toLowerCase(),
      )
      if (universityRollNumber && (seenUniversityRollNumbers.has(universityRollNumber.toLowerCase()) || existingWithUniversityRollNumber)) {
        issues.push({ row: idx + 2, severity: 'error', field: 'universityRollNumber', message: `Duplicate University Roll Number "${universityRollNumber}"` })
      }
      if (universityRollNumber) seenUniversityRollNumbers.add(universityRollNumber.toLowerCase())
      const programme = findProgrammeMatch(programmeName)
      if (programmeName && !programme) issues.push({ row: idx + 2, severity: 'error', field: 'programme', message: `Unknown programme: ${programmeName}` })
      const departmentName = get('department')
      const normalizedDept = normalizeImportValue(departmentName)
      const department = departmentName
        ? catalog.departments.find((item) => {
            const itemNorm = normalizeImportValue(item.name)
            const codeNorm = normalizeImportValue(item.code)
            return (
              itemNorm === normalizedDept ||
              codeNorm === normalizedDept ||
              (itemNorm && normalizedDept && (itemNorm.includes(normalizedDept) || normalizedDept.includes(itemNorm)))
            )
          })
        : catalog.departments.find((item) => item.id === existingStudent?.departmentId)

      // Gracefully handle department resolution without blocking valid row import
      if (departmentName && !department) {
        issues.push({ row: idx + 2, severity: 'warning', field: 'department', message: `Unrecognized department: "${departmentName}"; mapping will assign parent institutional department.` })
      }
      const schoolName = get('school')
      const normalizedSch = normalizeImportValue(schoolName)
      const school = schoolName
        ? catalog.schools.find((item) => {
            const itemNorm = normalizeImportValue(item.name)
            const codeNorm = normalizeImportValue(item.code)
            return (
              itemNorm === normalizedSch ||
              codeNorm === normalizedSch ||
              (itemNorm && normalizedSch && (itemNorm.includes(normalizedSch) || normalizedSch.includes(itemNorm)))
            )
          })
        : catalog.schools.find((item) => item.id === existingStudent?.schoolId)

      if (schoolName && !school) {
        issues.push({ row: idx + 2, severity: 'warning', field: 'school', message: `Unrecognized school: "${schoolName}"; mapping will assign department parent school.` })
      }
      const genderValue = normalizeImportValue(get('gender'))
      const gender = genderValue === 'm' || genderValue === 'male' ? 'male'
        : genderValue === 'f' || genderValue === 'female' ? 'female'
          : genderValue === 'other' ? 'other'
            : genderValue ? 'prefer_not_to_say' : existingStudent?.gender ?? 'prefer_not_to_say'
      if (genderValue && gender === 'prefer_not_to_say') issues.push({ row: idx + 2, severity: 'warning', field: 'gender', message: 'Unrecognized gender; using unspecified' })
      const rawStatus = String(get('studentStatus') ?? '').trim().toLowerCase()
      const normalizedStatus = rawStatus.replace(/[\.\s\-]/g, '_')
      let studentStatus: Student['studentStatus'] | undefined = undefined

      if (['active'].includes(rawStatus) || normalizedStatus === 'active') {
        studentStatus = 'active'
      } else if (['n_g_alumni', 'ng_alumni', 'ngalumni'].includes(normalizedStatus) || rawStatus.includes('n.g.alumni') || rawStatus.includes('ng alumni')) {
        studentStatus = 'ng_alumni'
      } else if (['nep_exit', 'nepexit'].includes(normalizedStatus) || rawStatus.includes('nep exit')) {
        studentStatus = 'nep_exit'
      } else if (['alumni'].includes(normalizedStatus)) {
        studentStatus = 'alumni'
      } else if (['repeat', 'repeater'].includes(normalizedStatus)) {
        studentStatus = 'repeat'
      } else if (['withdrawn', 'withdraw'].includes(normalizedStatus)) {
        studentStatus = 'withdrawn'
      } else if (['graduated', 'graduate'].includes(normalizedStatus)) {
        studentStatus = 'graduated'
      } else if (['inactive'].includes(normalizedStatus)) {
        studentStatus = 'inactive'
      } else if (['suspended'].includes(normalizedStatus)) {
        studentStatus = 'suspended'
      }

      if (rawStatus && !studentStatus) {
        issues.push({
          row: idx + 2,
          severity: 'warning',
          field: 'studentStatus',
          message: `Unrecognized student status "${get('studentStatus')}"; keeping the existing status or using active`,
        })
      }
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
      const dept = department
        ?? catalog.departments.find((item) => item.id === prog.departmentId)
        ?? catalog.departments[0]
      const batchYearValue = get('batchYear')
      const batchYear = Number(batchYearValue.match(/\b(19|20)\d{2}\b/)?.[0])
      const batch = catalog.batches.find((item) => item.programmeId === prog.id && (!batchYear || item.year === batchYear))
        ?? catalog.batches.find((item) => item.id === existingStudent?.batchId && item.programmeId === prog.id)
        ?? catalog.batches.find((item) => item.programmeId === prog.id)
      const academicYearValue = normalizeImportValue(get('academicYear'))
      const academicYear = catalog.academicYears.find((item) => normalizeImportValue(item.label) === academicYearValue)
        ?? catalog.academicYears.find((item) => academicYearValue && normalizeImportValue(item.label).startsWith(academicYearValue.slice(0, 4)))
      const mappedCustomFields = Object.entries(mapping)
        .filter(([, field]) => field.startsWith('custom:'))
        .map(([column, field]) => [field.slice('custom:'.length) || column, String(row[column] ?? '').trim()] as const)
        .filter(([, value]) => value)
      const customFields = Object.fromEntries(
        mappedCustomFields.filter(([label]) => !isSensitiveImportAttribute(label)),
      )
      const additionalIdentifiers = Object.fromEntries(
        mappedCustomFields.filter(([label]) => isSensitiveImportAttribute(label)),
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
        additionalIdentifiers: {
          ...existingStudent?.sensitive?.additionalIdentifiers,
          ...additionalIdentifiers,
        },
      }
      built.push({
        id: uid('stu'),
        registrationId,
        applicationNumber,
        universityRollNumber,
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

  const skippedRows = useMemo(() => {
    if (!validated) return []
    const rowErrors = new Map<number, string[]>()
    validated.errors
      .filter((issue) => issue.severity === 'error')
      .forEach((issue) => {
        const messages = rowErrors.get(issue.row) ?? []
        messages.push(`${issue.field}: ${issue.message}`)
        rowErrors.set(issue.row, messages)
      })
    return [...rowErrors.entries()]
      .sort(([first], [second]) => first - second)
      .map(([rowNumber, messages]) => ({
        'Row Number': rowNumber,
        ...Object.fromEntries(
          headers.map((header) => [header, String(sourceRows[rowNumber - 2]?.[header] ?? '')]),
        ),
        'Import Errors': [...new Set(messages)].join(' | '),
      }))
  }, [headers, sourceRows, validated])

  async function confirm() {
    if (!job || !validated) return
    const committedRows: Student[] = []
    setSaving(true)
    setSavingRows(0)
    try {
      let savedCounts: { created: number; updated: number } | undefined
      if (isSupabaseConfigured && validated.built.length) {
        savedCounts = await studentService.commitImport(job.fileName, mapping, validated.built, (batch) => {
          committedRows.push(...batch)
          setSavingRows(committedRows.length)
        })
      }
      commitImportStudents(validated.built, job.id)
      if (!validated.built.length) {
        toast.success(`Import completed. No rows were saved; ${skippedRows.length} invalid rows were skipped.`)
      } else if (isSupabaseConfigured) {
        toast.success(`${savedCounts?.created ?? 0} new and ${savedCounts?.updated ?? 0} updated student records saved to Supabase and the portal`)
      } else {
        toast.success(`${validated.built.length} student records saved in this browser`)
      }
      setJob({ ...job, status: 'committed' })
      setImportCompleted(true)
    } catch (error) {
      if (committedRows.length) {
        mergeImportedStudents(committedRows)
        setImportStatus(job.id, 'failed')
      }
      const message = importErrorMessage(error)
      toast.error(`Import was not saved: ${message}`)
    } finally {
      setSaving(false)
      setSavingRows(0)
    }
  }

  function downloadValidationReport() {
    if (!job || !validated?.errors.length) return
    const worksheet = XLSX.utils.json_to_sheet(validated.errors)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Validation issues')
    XLSX.writeFile(workbook, `${job.fileName.replace(/\.[^.]+$/, '')}-validation-report.xlsx`)
  }

  function downloadSkippedRowsReport() {
    if (!job || !skippedRows.length) return
    const worksheet = XLSX.utils.json_to_sheet(skippedRows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Skipped student rows')
    XLSX.writeFile(workbook, `${job.fileName.replace(/\.[^.]+$/, '')}-skipped-rows-report.xlsx`)
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
          {importCompleted ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-900">
                Import completed: {validated.built.length} valid rows processed and {skippedRows.length} rows with errors skipped.
              </p>
              {skippedRows.length ? (
                <Button className="mt-3" variant="outline" onClick={downloadSkippedRowsReport}>
                  <Download size={16} /> Download Skipped Rows Report
                </Button>
              ) : null}
            </div>
          ) : null}
          <div className="mt-4 max-h-56 overflow-auto text-xs">
            {validated.errors.slice(0, 40).map((e, i) => (
              <p key={i} className={e.severity === 'error' ? 'text-red-700' : 'text-amber-700'}>
                Row {e.row} · {e.field} · {e.message}
              </p>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            {!importCompleted ? (
              <Button variant="outline" disabled={saving} onClick={() => setJob(null)}>Cancel Import</Button>
            ) : null}
            <Button variant="outline" disabled={!validated.errors.length} onClick={downloadValidationReport}>
              <Download size={16} /> Download Issues
            </Button>
            <Button disabled={(!validated.built.length && !skippedRows.length) || saving || importCompleted} onClick={() => void confirm()}>
              {saving ? `Saving ${savingRows}/${validated.built.length}…` : importCompleted ? 'Import Completed' : 'Confirm Import'}
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
