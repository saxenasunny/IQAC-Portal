import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import { Badge, Button, Card, PageHeader, Select } from '@/components/ui'
import { canImport } from '@/lib/access'
import { catalog, usePortalStore } from '@/store/portalStore'
import { uid } from '@/lib/utils'
import type { ImportJob, Student } from '@/types'

const FIELD_MAP: Record<string, string> = {
  'registration id': 'registrationId',
  registration_id: 'registrationId',
  'application number': 'applicationNumber',
  name: 'fullName',
  'full name': 'fullName',
  email: 'email',
  phone: 'phone',
  gender: 'gender',
  programme: 'programme',
  department: 'department',
  'batch year': 'batchYear',
  nationality: 'nationality',
  category: 'category',
  status: 'studentStatus',
}

const REQUIRED = ['registrationId', 'fullName']

export function ImportPage() {
  const user = usePortalStore((s) => s.currentUser)!
  const addImport = usePortalStore((s) => s.addImport)
  const commitImportStudents = usePortalStore((s) => s.commitImportStudents)
  const students = usePortalStore((s) => s.students)
  const jobs = usePortalStore((s) => s.imports)
  const [job, setJob] = useState<ImportJob | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})

  if (!canImport(user.role)) {
    return <div><PageHeader title="Import Data" /><Card className="p-6 text-sm text-navy-600">Your role cannot import institutional data.</Card></div>
  }

  function onFile(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      const wb = XLSX.read(reader.result, { type: 'array' })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as Record<string, string>[]
      const cols = json[0] ? Object.keys(json[0]) : []
      const auto: Record<string, string> = {}
      cols.forEach((c) => {
        const mapped = FIELD_MAP[c.toLowerCase().trim()]
        if (mapped) auto[c] = mapped
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
        previewRows: json.slice(0, 200) as Record<string, string>[],
      }
      setHeaders(cols)
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
    job.previewRows.forEach((row, idx) => {
      const get = (field: string) => {
        const col = Object.entries(mapping).find(([, v]) => v === field)?.[0]
        return col ? String(row[col] ?? '').trim() : ''
      }
      const registrationId = get('registrationId')
      const fullName = get('fullName')
      const email = get('email')
      const programmeName = get('programme')
      const issues: ImportJob['errors'] = []
      if (!registrationId) issues.push({ row: idx + 2, severity: 'error', field: 'registrationId', message: 'Missing required field Registration ID' })
      if (!fullName) issues.push({ row: idx + 2, severity: 'error', field: 'fullName', message: 'Missing required field Name' })
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) issues.push({ row: idx + 2, severity: 'error', field: 'email', message: 'Invalid email' })
      if (registrationId && seen.has(registrationId.toLowerCase())) issues.push({ row: idx + 2, severity: 'error', field: 'registrationId', message: 'Duplicate Registration ID in file' })
      if (registrationId) seen.add(registrationId.toLowerCase())
      const programme = catalog.programmes.find((p) => p.name.toLowerCase() === programmeName.toLowerCase() || p.code.toLowerCase() === programmeName.toLowerCase())
      if (programmeName && !programme) issues.push({ row: idx + 2, severity: 'error', field: 'programme', message: `Unknown programme: ${programmeName}` })
      const gender = get('gender').toLowerCase()
      if (gender && !['male', 'female', 'other'].includes(gender)) issues.push({ row: idx + 2, severity: 'warning', field: 'gender', message: 'Invalid gender; defaulting to unspecified handling' })
      if (issues.some((i) => i.severity === 'error')) {
        errors.push(...issues)
        return
      }
      if (issues.length) {
        warn += 1
        errors.push(...issues)
      }
      valid += 1
      const dept = programme ? catalog.departments.find((d) => d.id === programme.departmentId) : catalog.departments[0]
      const prog = programme ?? catalog.programmes[0]
      const batch = catalog.batches.find((b) => b.programmeId === prog.id) ?? catalog.batches[0]
      built.push({
        id: uid('stu'),
        registrationId,
        applicationNumber: `APP${registrationId}`,
        universityRollNumber: registrationId,
        fullName,
        email,
        phone: get('phone'),
        gender: gender === 'male' || gender === 'female' ? gender : 'prefer_not_to_say',
        dateOfBirth: '2004-01-01',
        nationality: get('nationality') || 'India',
        programmeId: prog.id,
        departmentId: dept!.id,
        schoolId: dept!.schoolId,
        batchId: batch.id,
        academicYearId: 'ay_2526',
        currentYear: 1,
        currentTerm: 'Odd',
        studentStatus: (get('studentStatus') as Student['studentStatus']) || 'active',
        academicStatus: 'regular',
        admissionType: 'Merit',
        workflow: 'submitted',
        isArchived: false,
        personal: { firstName: fullName.split(' ')[0], lastName: fullName.split(' ').slice(1).join(' '), firstGeneration: false, differentlyAbled: false, ews: false, domicileState: 'Rajasthan', category: get('category') || 'General' },
        academic: { backlogs: 0, admissionDate: '2025-07-15' },
        contact: {},
        addresses: [],
        family: {},
        qualifications: [],
        entranceExams: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    })
    const newCount = built.filter((b) => !existing.has(b.registrationId.toLowerCase())).length
    const updatedCount = built.length - newCount
    return { errors, valid, warn, built, newCount, updatedCount, unchanged: job.totalRows - built.length - errors.filter((e) => e.severity === 'error').length }
  }, [job, mapping, students])

  function confirm() {
    if (!job || !validated) return
    commitImportStudents(validated.built, job.id)
    toast.success('Import committed to central student database')
    setJob({ ...job, status: 'committed' })
  }

  return (
    <div>
      <PageHeader title="Import Data" subtitle="Map Excel/CSV columns to the normalized student model. Critical errors are blocked." />
      <Card className="p-5">
        <p className="text-sm font-medium">Upload Student Excel</p>
        <input className="mt-3 text-sm" type="file" accept=".xlsx,.xls,.csv" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        <p className="mt-2 text-xs text-navy-400">Accepted: XLS, XLSX, CSV. Preview, validate, then confirm.</p>
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
                  {['registrationId', 'fullName', 'email', 'phone', 'gender', 'programme', 'department', 'batchYear', 'nationality', 'category', 'studentStatus', 'applicationNumber'].map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
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
            <Button variant="outline" onClick={() => setJob(null)}>Cancel Import</Button>
            <Button disabled={!validated.built.length} onClick={confirm}>Confirm Import</Button>
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
