import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'
import { Badge, Button, Card, PageHeader, Select } from '@/components/ui'
import { canImport } from '@/lib/access'
import { isSupabaseConfigured } from '@/lib/supabase'
import { facultyService } from '@/services/facultyService'
import { catalog, usePortalStore } from '@/store/portalStore'
import { uid } from '@/lib/utils'
import type { EmploymentType, Faculty, Gender, ImportJob } from '@/types'

const FACULTY_IMPORT_FIELDS = [
  { id: 'employeeId', label: 'Employee ID', aliases: ['employee id', 'employee code', 'employee number', 'staff id', 'faculty id', 'emp id', 'emp code'] },
  { id: 'fullName', label: 'Full Name', aliases: ['name', 'full name', 'faculty name', 'faculty full name', 'employee name', 'staff name'] },
  { id: 'email', label: 'Email', aliases: ['email', 'email address', 'official email', 'work email'] },
  { id: 'phone', label: 'Phone Number', aliases: ['phone', 'phone number', 'mobile', 'mobile number', 'contact number'] },
  { id: 'gender', label: 'Gender', aliases: ['gender', 'sex'] },
  { id: 'dateOfBirth', label: 'Date of Birth', aliases: ['date of birth', 'dob', 'birth date'] },
  { id: 'department', label: 'Department', aliases: ['department', 'department name', 'department code', 'dept', 'dept name'] },
  { id: 'school', label: 'School', aliases: ['school', 'school name', 'school code', 'faculty', 'faculty of'] },
  { id: 'designation', label: 'Designation', aliases: ['designation', 'job title', 'position', 'academic position', 'rank'] },
  { id: 'employmentType', label: 'Employment Type', aliases: ['employment type', 'employee type', 'appointment type', 'nature of employment'] },
  { id: 'joiningDate', label: 'Joining Date', aliases: ['joining date', 'date of joining', 'date joined', 'appointment date'] },
  { id: 'highestQualification', label: 'Highest Qualification', aliases: ['highest qualification', 'qualification', 'highest degree', 'degree'] },
  { id: 'specialization', label: 'Specialization', aliases: ['specialization', 'specialisation', 'area of specialization', 'area of expertise'] },
  { id: 'teachingExperienceYears', label: 'Teaching Experience (Years)', aliases: ['teaching experience', 'teaching experience years', 'teaching experience in years'] },
  { id: 'researchExperienceYears', label: 'Research Experience (Years)', aliases: ['research experience', 'research experience years', 'research experience in years'] },
  { id: 'orcid', label: 'ORCID', aliases: ['orcid', 'orcid id'] },
  { id: 'googleScholar', label: 'Google Scholar Profile', aliases: ['google scholar', 'google scholar profile', 'google scholar link'] },
  { id: 'scopusId', label: 'Scopus ID', aliases: ['scopus id', 'scopus author id'] },
  { id: 'isActive', label: 'Active Status', aliases: ['active', 'is active', 'active status', 'employment status', 'status'] },
] as const

type FacultyImportFieldId = typeof FACULTY_IMPORT_FIELDS[number]['id']

const SORTED_FACULTY_IMPORT_FIELDS = [...FACULTY_IMPORT_FIELDS].sort((a, b) => a.label.localeCompare(b.label))
const EMPTY_STRING = ''

function normalizeValue(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

function cleanValue(value: unknown): string {
  return String(value ?? '').replace(/\u00a0/g, ' ').trim()
}

function fieldForHeader(header: string): string {
  const normalized = normalizeValue(header)
  const match = FACULTY_IMPORT_FIELDS.find((field) =>
    normalizeValue(field.label) === normalized || field.aliases.some((alias) => normalizeValue(alias) === normalized),
  )
  return match?.id ?? ''
}

function parseNumber(value: string): number | undefined {
  if (!value) return undefined
  const parsed = Number(value.replace(/,/g, ''))
  return Number.isFinite(parsed) ? parsed : undefined
}

function parseDate(value: string): string | undefined {
  if (!value) return ''
  const serial = Number(value)
  if (Number.isFinite(serial) && serial > 0 && serial < 100000) {
    const date = XLSX.SSF.parse_date_code(serial)
    if (date) return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString().slice(0, 10)
}

function parseGender(value: string): Gender | undefined {
  if (!value) return undefined
  const normalized = normalizeValue(value)
  if (['male', 'm'].includes(normalized)) return 'male'
  if (['female', 'f'].includes(normalized)) return 'female'
  if (['other', 'nonbinary', 'nonbinarygender'].includes(normalized)) return 'other'
  if (['prefernottosay', 'undisclosed', 'unknown'].includes(normalized)) return 'prefer_not_to_say'
  return undefined
}

function parseEmploymentType(value: string): EmploymentType | undefined {
  if (!value) return undefined
  const normalized = normalizeValue(value)
  if (['permanent', 'regular', 'fulltime'].includes(normalized)) return 'permanent'
  if (['contract', 'contractual', 'fixedterm'].includes(normalized)) return 'contract'
  if (['visiting', 'guest'].includes(normalized)) return 'visiting'
  if (['adjunct', 'parttime'].includes(normalized)) return 'adjunct'
  return undefined
}

function parseBoolean(value: string): boolean | undefined {
  if (!value) return undefined
  if (['true', 'yes', 'y', '1', 'active', 'employed'].includes(normalizeValue(value))) return true
  if (['false', 'no', 'n', '0', 'inactive', 'notemployed', 'left'].includes(normalizeValue(value))) return false
  return undefined
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message
  return 'Unable to read or save the faculty spreadsheet.'
}

function matchDepartment(value: string) {
  const normalized = normalizeValue(value)
  return catalog.departments.find((department) =>
    normalizeValue(department.name) === normalized || normalizeValue(department.code) === normalized,
  )
}

function matchSchool(value: string) {
  const normalized = normalizeValue(value)
  return catalog.schools.find((school) =>
    normalizeValue(school.name) === normalized || normalizeValue(school.code) === normalized,
  )
}

export function FacultyImportPage() {
  const navigate = useNavigate()
  const user = usePortalStore((state) => state.currentUser)!
  const addImport = usePortalStore((state) => state.addImport)
  const commitImportFaculty = usePortalStore((state) => state.commitImportFaculty)
  const mergeImportedFaculty = usePortalStore((state) => state.mergeImportedFaculty)
  const setImportStatus = usePortalStore((state) => state.setImportStatus)
  const faculty = usePortalStore((state) => state.faculty)
  const jobs = usePortalStore((state) => state.imports)
  const [job, setJob] = useState<ImportJob | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [sourceRows, setSourceRows] = useState<Record<string, unknown>[]>([])
  const [saving, setSaving] = useState(false)
  const [savingRows, setSavingRows] = useState(0)
  const [importCompleted, setImportCompleted] = useState(false)

  if (!canImport(user.role)) {
    return <div><PageHeader title="Import Faculty" /><Card className="p-6 text-sm text-navy-600">Your role cannot import institutional data.</Card></div>
  }

  function onFile(file: File) {
    const reader = new FileReader()
    reader.onerror = () => toast.error(`Unable to read ${file.name}.`)
    reader.onload = () => {
      try {
        const workbook = XLSX.read(reader.result, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        if (!sheetName) throw new Error('The selected file does not contain a worksheet.')
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: EMPTY_STRING }) as Record<string, unknown>[]
        const columns = rows[0] ? Object.keys(rows[0]) : []
        if (!columns.length || !rows.length) throw new Error('The selected worksheet is empty or has no header row.')
        const autoMapping = Object.fromEntries(columns.map((column) => [column, fieldForHeader(column)]))
        const created: ImportJob = {
          id: uid('imp'),
          entity: 'faculty',
          fileName: file.name,
          status: 'mapped',
          totalRows: rows.length,
          validRows: 0,
          warningRows: 0,
          errorRows: 0,
          newCount: 0,
          updatedCount: 0,
          unchangedCount: 0,
          mapping: autoMapping,
          uploadedBy: user.fullName,
          createdAt: new Date().toISOString(),
          errors: [],
          previewRows: rows.slice(0, 200).map((row) =>
            Object.fromEntries(Object.entries(row).map(([key, value]) => [key, String(value ?? '')])),
          ),
        }
        setHeaders(columns)
        setSourceRows(rows)
        setMapping(autoMapping)
        setJob(created)
        setImportCompleted(false)
        setSavingRows(0)
        addImport(created)
        toast.success(`Detected ${rows.length} rows and ${columns.length} columns`)
      } catch (error) {
        toast.error(errorMessage(error))
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const validated = useMemo(() => {
    if (!job) return null
    const existingByEmployeeId = new Map(faculty.map((member) => [member.employeeId.toLowerCase(), member]))
    const existingEmailOwner = new Map(
      faculty.filter((member) => member.email).map((member) => [member.email.toLowerCase(), member.employeeId.toLowerCase()]),
    )
    const seenEmployeeIds = new Set<string>()
    const seenEmails = new Set<string>()
    const errors: ImportJob['errors'] = []
    const built: Faculty[] = []

    sourceRows.forEach((row, index) => {
      const get = (field: FacultyImportFieldId) => {
        const column = Object.entries(mapping).find(([, target]) => target === field)?.[0]
        return column ? cleanValue(row[column]) : ''
      }
      const employeeId = get('employeeId')
      const existing = employeeId ? existingByEmployeeId.get(employeeId.toLowerCase()) : undefined
      const fullName = get('fullName') || existing?.fullName || ''
      const issues: ImportJob['errors'] = []
      if (!employeeId) issues.push({ row: index + 2, severity: 'error', field: 'employeeId', message: 'Missing required field Employee ID' })
      if (!fullName) issues.push({ row: index + 2, severity: 'error', field: 'fullName', message: 'Missing required field Full Name' })
      const email = get('email') || existing?.email || ''
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        issues.push({ row: index + 2, severity: 'error', field: 'email', message: 'Invalid email address' })
      }
      const employeeKey = employeeId.toLowerCase()
      if (employeeId && seenEmployeeIds.has(employeeKey)) {
        issues.push({ row: index + 2, severity: 'error', field: 'employeeId', message: `Duplicate Employee ID "${employeeId}" in file` })
      }
      if (employeeId) seenEmployeeIds.add(employeeKey)
      const emailKey = email.toLowerCase()
      if (email) {
        const existingOwner = existingEmailOwner.get(emailKey)
        if (seenEmails.has(emailKey) || (existingOwner && existingOwner !== employeeKey)) {
          issues.push({ row: index + 2, severity: 'error', field: 'email', message: `Duplicate email "${email}"` })
        }
        seenEmails.add(emailKey)
      }

      const departmentValue = get('department')
      const schoolValue = get('school')
      const department = departmentValue ? matchDepartment(departmentValue) : catalog.departments.find((item) => item.id === existing?.departmentId)
      const school = schoolValue ? matchSchool(schoolValue) : catalog.schools.find((item) => item.id === existing?.schoolId)
      if (departmentValue && !department) {
        issues.push({ row: index + 2, severity: 'error', field: 'department', message: `Unknown department: ${departmentValue}` })
      }
      if (schoolValue && !school) {
        issues.push({ row: index + 2, severity: 'error', field: 'school', message: `Unknown school: ${schoolValue}` })
      }
      if (department && schoolValue && school && department.schoolId !== school.id) {
        issues.push({ row: index + 2, severity: 'error', field: 'school', message: 'The selected department does not belong to the selected school' })
      }

      const designation = get('designation') || existing?.designation || ''
      if (!designation) issues.push({ row: index + 2, severity: 'error', field: 'designation', message: 'Missing required field Designation' })
      const genderValue = get('gender')
      const gender = genderValue ? parseGender(genderValue) : existing?.gender ?? 'prefer_not_to_say'
      if (genderValue && !parseGender(genderValue)) {
        issues.push({ row: index + 2, severity: 'error', field: 'gender', message: `Unsupported gender value: ${genderValue}` })
      }
      const employmentValue = get('employmentType')
      const employmentType = employmentValue ? parseEmploymentType(employmentValue) : existing?.employmentType ?? 'permanent'
      if (employmentValue && !parseEmploymentType(employmentValue)) {
        issues.push({ row: index + 2, severity: 'error', field: 'employmentType', message: `Unsupported employment type: ${employmentValue}` })
      }

      const dateOfBirthValue = get('dateOfBirth')
      const dateOfBirth = dateOfBirthValue ? parseDate(dateOfBirthValue) : existing?.dateOfBirth ?? ''
      if (dateOfBirthValue && dateOfBirth === undefined) {
        issues.push({ row: index + 2, severity: 'error', field: 'dateOfBirth', message: 'Invalid date of birth' })
      }
      const joiningDateValue = get('joiningDate')
      const joiningDate = joiningDateValue ? parseDate(joiningDateValue) : existing?.joiningDate ?? ''
      if (joiningDateValue && joiningDate === undefined) {
        issues.push({ row: index + 2, severity: 'error', field: 'joiningDate', message: 'Invalid joining date' })
      }

      const teachingValue = get('teachingExperienceYears')
      const teachingExperienceYears = teachingValue ? parseNumber(teachingValue) : existing?.teachingExperienceYears ?? 0
      if (teachingValue && (teachingExperienceYears === undefined || teachingExperienceYears < 0)) {
        issues.push({ row: index + 2, severity: 'error', field: 'teachingExperienceYears', message: 'Teaching experience must be a non-negative number' })
      }
      const researchValue = get('researchExperienceYears')
      const researchExperienceYears = researchValue ? parseNumber(researchValue) : existing?.researchExperienceYears ?? 0
      if (researchValue && (researchExperienceYears === undefined || researchExperienceYears < 0)) {
        issues.push({ row: index + 2, severity: 'error', field: 'researchExperienceYears', message: 'Research experience must be a non-negative number' })
      }
      const activeValue = get('isActive')
      const isActive = activeValue ? parseBoolean(activeValue) : existing?.isActive ?? true
      if (activeValue && isActive === undefined) {
        issues.push({ row: index + 2, severity: 'error', field: 'isActive', message: `Unsupported active status: ${activeValue}` })
      }

      errors.push(...issues)
      if (issues.some((issue) => issue.severity === 'error')) return
      const now = new Date().toISOString()
      built.push({
        id: existing?.id ?? uid('fac'),
        employeeId,
        fullName,
        email,
        phone: get('phone') || existing?.phone || '',
        gender: gender!,
        dateOfBirth: dateOfBirth ?? '',
        schoolId: department?.schoolId ?? school?.id ?? '',
        departmentId: department?.id ?? '',
        designation,
        employmentType: employmentType!,
        joiningDate: joiningDate ?? '',
        highestQualification: get('highestQualification') || existing?.highestQualification || '',
        specialization: get('specialization') || existing?.specialization || '',
        orcid: get('orcid') || existing?.orcid,
        googleScholar: get('googleScholar') || existing?.googleScholar,
        scopusId: get('scopusId') || existing?.scopusId,
        teachingExperienceYears: teachingExperienceYears ?? 0,
        researchExperienceYears: researchExperienceYears ?? 0,
        isActive: isActive ?? true,
        workflow: existing?.workflow ?? 'submitted',
        qualifications: existing?.qualifications ?? [],
        publications: existing?.publications ?? [],
        projects: existing?.projects ?? [],
        patents: existing?.patents ?? [],
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      })
    })

    const newCount = built.filter((member) => !existingByEmployeeId.has(member.employeeId.toLowerCase())).length
    const updatedCount = built.length - newCount
    const invalidRows = new Set(errors.filter((issue) => issue.severity === 'error').map((issue) => issue.row)).size
    return { errors, built, newCount, updatedCount, invalidRows }
  }, [faculty, job, mapping, sourceRows])

  const skippedRows = useMemo(() => {
    if (!validated) return []
    const rowErrors = new Map<number, string[]>()
    validated.errors.forEach((issue) => {
      const messages = rowErrors.get(issue.row) ?? []
      messages.push(`${issue.field}: ${issue.message}`)
      rowErrors.set(issue.row, messages)
    })
    return [...rowErrors.entries()].sort(([first], [second]) => first - second).map(([rowNumber, messages]) => ({
      'Row Number': rowNumber,
      ...Object.fromEntries(headers.map((header) => [header, String(sourceRows[rowNumber - 2]?.[header] ?? '')])),
      'Import Errors': [...new Set(messages)].join(' | '),
    }))
  }, [headers, sourceRows, validated])

  async function confirm() {
    if (!job || !validated) return
    const committedRows: Faculty[] = []
    setSaving(true)
    setSavingRows(0)
    try {
      let savedCounts: { created: number; updated: number } | undefined
      if (isSupabaseConfigured && validated.built.length) {
        savedCounts = await facultyService.commitImport(job.fileName, mapping, validated.built, (batch) => {
          committedRows.push(...batch)
          setSavingRows(committedRows.length)
        })
      }
      commitImportFaculty(validated.built, job.id)
      if (!validated.built.length) {
        toast.success(`Import completed. No rows were saved; ${skippedRows.length} invalid rows were skipped.`)
      } else if (isSupabaseConfigured) {
        toast.success(`${savedCounts?.created ?? 0} new and ${savedCounts?.updated ?? 0} updated faculty records saved to Supabase and the portal`)
      } else {
        toast.success(`${validated.built.length} faculty records saved in this browser`)
      }
      setJob({ ...job, status: 'committed', newCount: savedCounts?.created ?? validated.newCount, updatedCount: savedCounts?.updated ?? validated.updatedCount })
      setImportCompleted(true)
    } catch (error) {
      if (committedRows.length) mergeImportedFaculty(committedRows)
      setImportStatus(job.id, 'failed')
      toast.error(`Faculty import was not fully saved: ${errorMessage(error)}`)
    } finally {
      setSaving(false)
      setSavingRows(0)
    }
  }

  function downloadReport(rows: Record<string, unknown>[], sheetName: string, suffix: string) {
    if (!job || !rows.length) return
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), sheetName)
    XLSX.writeFile(workbook, `${job.fileName.replace(/\.[^.]+$/, '')}-${suffix}.xlsx`)
  }

  return (
    <div>
      <PageHeader
        title="Import Faculty"
        subtitle="Upload a faculty spreadsheet, map columns, review validation results, and confirm the import."
        actions={<Button variant="outline" onClick={() => navigate('/faculty')}>Back to Faculty</Button>}
      />
      <Card className="p-5">
        <p className="text-sm font-medium">Upload Faculty Excel or CSV</p>
        <input className="mt-3 text-sm" type="file" accept=".xlsx,.xls,.csv" onChange={(event) => event.target.files?.[0] && onFile(event.target.files[0])} />
        <p className="mt-2 text-xs text-navy-400">Accepted: XLS, XLSX, CSV. Employee ID, full name, and designation are required. Department and school values should match the portal catalogue.</p>
        <p className="mt-1 text-xs text-navy-400">Supported faculty fields are imported; unmapped columns are ignored.</p>
        {!isSupabaseConfigured ? (
          <p className="mt-2 text-xs text-amber-700">Supabase is not configured. Imports are saved only in this browser and are not shared across users or devices.</p>
        ) : null}
      </Card>

      {job ? (
        <Card className="mt-4 p-5">
          <p className="font-medium">{job.fileName}</p>
          <p className="text-sm text-navy-500">Detected: {job.totalRows} rows · {headers.length} columns</p>
          <h3 className="mb-2 mt-4 text-sm font-medium">Column Mapping</h3>
          <div className="grid gap-2 md:grid-cols-2">
            {headers.map((header) => (
              <div key={header} className="grid grid-cols-2 items-center gap-2 text-sm">
                <span className="truncate text-navy-600">{header}</span>
                <Select value={mapping[header] ?? ''} onChange={(event) => setMapping((current) => ({ ...current, [header]: event.target.value }))}>
                  <option value="">Ignore</option>
                  {SORTED_FACULTY_IMPORT_FIELDS.map((field) => <option key={field.id} value={field.id}>{field.label}</option>)}
                </Select>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {job && validated ? (
        <>
          <Card className="mt-4 p-5">
            <div className="grid gap-3 text-sm sm:grid-cols-4">
              <Stat label="Valid" value={validated.built.length} />
              <Stat label="Invalid Rows" value={validated.invalidRows} />
              <Stat label="Errors" value={validated.errors.length} />
              <Stat label="New / Updated" value={`${validated.newCount} / ${validated.updatedCount}`} />
            </div>
            <h3 className="mb-2 mt-5 text-sm font-medium">Preview (first 10 valid rows)</h3>
            {validated.built.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-navy-950 text-white"><tr>
                    {['Employee ID', 'Name', 'Email', 'Department', 'Designation', 'Employment Type'].map((label) => <th key={label} className="px-3 py-2">{label}</th>)}
                  </tr></thead>
                  <tbody>{validated.built.slice(0, 10).map((member) => (
                    <tr key={member.employeeId} className="border-t">
                      <td className="px-3 py-2">{member.employeeId}</td>
                      <td className="px-3 py-2">{member.fullName}</td>
                      <td className="px-3 py-2">{member.email}</td>
                      <td className="px-3 py-2">{catalog.departments.find((item) => item.id === member.departmentId)?.name ?? catalog.schools.find((item) => item.id === member.schoolId)?.name ?? '—'}</td>
                      <td className="px-3 py-2">{member.designation}</td>
                      <td className="px-3 py-2">{member.employmentType}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            ) : <p className="text-sm text-navy-500">No valid rows to preview.</p>}
            {importCompleted ? (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-medium text-amber-900">Import completed: {validated.built.length} valid rows processed and {skippedRows.length} invalid rows skipped.</p>
                {skippedRows.length ? <Button className="mt-3" variant="outline" onClick={() => downloadReport(skippedRows, 'Skipped faculty rows', 'skipped-rows-report')}><Download size={16} /> Download Skipped Rows Report</Button> : null}
              </div>
            ) : null}
            {validated.errors.slice(0, 40).map((issue, index) => (
              <p key={`${issue.row}-${issue.field}-${index}`} className="mt-2 text-xs text-red-700">Row {issue.row} · {issue.field} · {issue.message}</p>
            ))}
            <div className="mt-4 flex flex-wrap gap-2">
              {!importCompleted ? <Button variant="outline" disabled={saving} onClick={() => setJob(null)}>Cancel Import</Button> : null}
              <Button variant="outline" disabled={!validated.errors.length} onClick={() => downloadReport(validated.errors, 'Validation issues', 'validation-report')}><Download size={16} /> Download Issues</Button>
              <Button disabled={(!validated.built.length && !skippedRows.length) || saving || importCompleted} onClick={() => void confirm()}>
                {saving ? `Saving ${savingRows}/${validated.built.length}…` : importCompleted ? 'Import Completed' : 'Confirm Import'}
              </Button>
            </div>
          </Card>
        </>
      ) : null}

      {jobs.length ? (
        <Card className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-navy-950 text-left text-white"><tr><th className="px-4 py-3">File</th><th>Entity</th><th>Status</th><th>Rows</th><th>When</th></tr></thead>
            <tbody>{jobs.filter((item) => item.entity === 'faculty').map((item) => (
              <tr key={item.id} className="border-t"><td className="px-4 py-2">{item.fileName}</td><td><Badge>{item.entity}</Badge></td><td><Badge>{item.status}</Badge></td><td>{item.totalRows}</td><td>{new Date(item.createdAt).toLocaleString('en-IN')}</td></tr>
            ))}</tbody>
          </table>
        </Card>
      ) : null}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-lg bg-navy-50 p-3"><p className="text-navy-500">{label}</p><p className="text-xl font-semibold">{value}</p></div>
}
