import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import * as XLSX from 'xlsx'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  PageHeader,
  ProgressBar,
  Select,
} from '@/components/ui'
import { studentCompleteness, visibleStudents } from '@/lib/lookups'
import { catalog, usePortalStore } from '@/store/portalStore'
import type { Student } from '@/types'
import { AlertTriangle, CheckCircle2, Download, ExternalLink, Search } from 'lucide-react'

export function DataQualityPage() {
  const user = usePortalStore((s) => s.currentUser)!
  const students = visibleStudents(usePortalStore((s) => s.students), user.role, user.schoolId, user.departmentId)
  const missing = {
    abc: students.filter((s) => !s.sensitive?.abcId),
    category: students.filter((s) => !s.personal.category),
    dob: students.filter((s) => !s.dateOfBirth),
    qualification: students.filter((s) => !s.qualifications.length),
    address: students.filter((s) => !s.addresses.length),
  }
  const avg = students.reduce((acc, s) => {
    const c = studentCompleteness(s)
    return acc + (c.personal + c.academic + c.contact + c.qualification + c.category + c.documents) / 6
  }, 0) / Math.max(students.length, 1)

  return (
    <div>
      <PageHeader title="Data Quality" subtitle="Completeness of the central student database." />
      <Card className="mb-4 p-5">
        <p className="text-sm text-navy-500">Overall completeness</p>
        <p className="text-3xl font-semibold">{Math.round(avg)}%</p>
        <div className="mt-3"><ProgressBar value={avg} /></div>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        {[
          ['Personal Information', 96],
          ['Academic Information', 98],
          ['Contact Information', 91],
          ['Qualification', 88],
          ['Category Information', 94],
          ['Documents', 72],
        ].map(([label, v]) => (
          <Card key={String(label)} className="p-4">
            <div className="mb-2 flex justify-between text-sm"><span>{label}</span><span>{v}%</span></div>
            <ProgressBar value={Number(v)} />
          </Card>
        ))}
      </div>
      <Card className="mt-4 p-5 text-sm">
        <p className="font-medium">Students missing:</p>
        <ul className="mt-2 space-y-1">
          <li>ABC ID — {missing.abc.length}</li>
          <li>Category — {missing.category.length}</li>
          <li>Date of Birth — {missing.dob.length}</li>
          <li>Qualification — {missing.qualification.length}</li>
          <li>Address — {missing.address.length}</li>
        </ul>
      </Card>
    </div>
  )
}

type ValidationFieldKey =
  | 'all'
  | 'dateOfBirth'
  | 'email'
  | 'phone'
  | 'category'
  | 'gender'
  | 'applicationNumber'
  | 'universityRollNumber'
  | 'programme'
  | 'department'
  | 'school'

const VALIDATION_CHECKS: Record<
  Exclude<ValidationFieldKey, 'all'>,
  { label: string; issueLabel: string; isMissing: (s: Student) => boolean }
> = {
  dateOfBirth: {
    label: 'Date of Birth',
    issueLabel: 'Missing Date of Birth',
    isMissing: (s) => !s.dateOfBirth || s.dateOfBirth.trim() === '' || s.dateOfBirth.toLowerCase() === 'missing',
  },
  email: {
    label: 'Email Address',
    issueLabel: 'Missing or Invalid Email',
    isMissing: (s) =>
      !s.email ||
      s.email.trim() === '' ||
      s.email.toLowerCase() === 'missing' ||
      !s.email.includes('@'),
  },
  phone: {
    label: 'Phone Number',
    issueLabel: 'Missing Phone',
    isMissing: (s) => !s.phone || s.phone.trim() === '' || s.phone.toLowerCase() === 'missing',
  },
  category: {
    label: 'Social Category',
    issueLabel: 'Missing Category',
    isMissing: (s) =>
      !s.personal?.category ||
      s.personal.category.trim() === '' ||
      s.personal.category.toLowerCase() === 'missing',
  },
  gender: {
    label: 'Gender',
    issueLabel: 'Unspecified Gender',
    isMissing: (s) => !s.gender || s.gender === 'prefer_not_to_say' || s.gender.toLowerCase() === 'missing',
  },
  applicationNumber: {
    label: 'Application Number',
    issueLabel: 'Missing Application No.',
    isMissing: (s) =>
      !s.applicationNumber ||
      s.applicationNumber.trim() === '' ||
      s.applicationNumber.toLowerCase() === 'missing',
  },
  universityRollNumber: {
    label: 'University Roll Number',
    issueLabel: 'Missing Roll Number',
    isMissing: (s) =>
      !s.universityRollNumber ||
      s.universityRollNumber.trim() === '' ||
      s.universityRollNumber.toLowerCase() === 'missing',
  },
  programme: {
    label: 'Academic Programme',
    issueLabel: 'Missing Programme',
    isMissing: (s) => !s.programmeId || s.programmeId.trim() === '',
  },
  department: {
    label: 'Department',
    issueLabel: 'Missing Department',
    isMissing: (s) => !s.departmentId || s.departmentId.trim() === '',
  },
  school: {
    label: 'School',
    issueLabel: 'Missing School',
    isMissing: (s) => !s.schoolId || s.schoolId.trim() === '',
  },
}

const CHECK_KEYS = Object.keys(VALIDATION_CHECKS) as Array<Exclude<ValidationFieldKey, 'all'>>
const PAGE_SIZE = 50

export function DataValidationPage() {
  const user = usePortalStore((s) => s.currentUser)!
  const allStudents = usePortalStore((s) => s.students)
  const students = useMemo(
    () => visibleStudents(allStudents, user.role, user.schoolId, user.departmentId).filter((s) => !s.isArchived),
    [allStudents, user.role, user.schoolId, user.departmentId],
  )

  const [selectedField, setSelectedField] = useState<ValidationFieldKey>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)

  // Pre-calculate per-field missing counts across all scoped students
  const fieldCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const key of CHECK_KEYS) {
      counts[key] = students.filter(VALIDATION_CHECKS[key].isMissing).length
    }
    return counts
  }, [students])

  // Filter students that have missing data based on selected field
  const flaggedStudentsWithIssues = useMemo(() => {
    return students
      .map((student) => {
        const issues: string[] = []
        for (const key of CHECK_KEYS) {
          if (VALIDATION_CHECKS[key].isMissing(student)) {
            // If checking a specific field, only record that issue
            if (selectedField === 'all' || selectedField === key) {
              issues.push(VALIDATION_CHECKS[key].issueLabel)
            }
          }
        }
        return { student, issues }
      })
      .filter((item) => item.issues.length > 0)
  }, [students, selectedField])

  // Apply search query filter
  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return flaggedStudentsWithIssues
    const q = searchQuery.toLowerCase().trim()
    return flaggedStudentsWithIssues.filter(
      ({ student }) =>
        student.registrationId.toLowerCase().includes(q) ||
        student.fullName.toLowerCase().includes(q) ||
        student.universityRollNumber.toLowerCase().includes(q) ||
        student.applicationNumber.toLowerCase().includes(q) ||
        student.email.toLowerCase().includes(q),
    )
  }, [flaggedStudentsWithIssues, searchQuery])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE))
  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filteredRecords.slice(start, start + PAGE_SIZE)
  }, [filteredRecords, page])

  // Reset page when field or search changes
  function handleFieldChange(field: ValidationFieldKey) {
    setSelectedField(field)
    setPage(1)
  }

  function handleSearchChange(val: string) {
    setSearchQuery(val)
    setPage(1)
  }

  // Export to Excel
  function downloadExcelReport() {
    if (!filteredRecords.length) return
    const exportData = filteredRecords.map(({ student, issues }) => {
      const school = catalog.schools.find((s) => s.id === student.schoolId)?.name ?? ''
      const dept = catalog.departments.find((d) => d.id === student.departmentId)?.name ?? ''
      const prog = catalog.programmes.find((p) => p.id === student.programmeId)?.name ?? ''
      return {
        'Registration ID': student.registrationId,
        'Full Name': student.fullName,
        'Application No': student.applicationNumber,
        'Roll No': student.universityRollNumber,
        'Missing Fields': issues.join(', '),
        'Email': student.email,
        'Phone': student.phone,
        'Date of Birth': student.dateOfBirth,
        'Category': student.personal?.category ?? '',
        'Gender': student.gender,
        'School': school,
        'Department': dept,
        'Programme': prog,
      }
    })

    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Validation Issues')
    XLSX.writeFile(
      workbook,
      `data-validation-report-${selectedField}-${new Date().toISOString().slice(0, 10)}.xlsx`,
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data Validation Report"
        subtitle="Review records with missing or incomplete fields across the active student dataset."
        actions={
          <Button
            variant="outline"
            disabled={filteredRecords.length === 0}
            onClick={downloadExcelReport}
          >
            <Download size={16} /> Download Report ({filteredRecords.length})
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs font-medium text-navy-500 uppercase tracking-wide">Evaluated Students</p>
          <p className="mt-1 text-2xl font-bold text-navy-950">{students.length.toLocaleString()}</p>
          <p className="mt-1 text-xs text-navy-400">Total active records checked</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-navy-500 uppercase tracking-wide">Flagged Records</p>
            {flaggedStudentsWithIssues.length > 0 ? (
              <AlertTriangle className="text-amber-500" size={18} />
            ) : (
              <CheckCircle2 className="text-emerald-500" size={18} />
            )}
          </div>
          <p className="mt-1 text-2xl font-bold text-amber-600">
            {flaggedStudentsWithIssues.length.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-navy-400">
            {selectedField === 'all'
              ? 'Students with at least 1 missing field'
              : `Missing ${VALIDATION_CHECKS[selectedField].label}`}
          </p>
        </Card>

        <Card className="p-4">
          <p className="text-xs font-medium text-navy-500 uppercase tracking-wide">Missing Date of Birth</p>
          <p className="mt-1 text-2xl font-bold text-navy-950">{(fieldCounts.dateOfBirth ?? 0).toLocaleString()}</p>
          <p className="mt-1 text-xs text-navy-400">Blank or missing DOB</p>
        </Card>

        <Card className="p-4">
          <p className="text-xs font-medium text-navy-500 uppercase tracking-wide">Missing Phone / Email</p>
          <p className="mt-1 text-2xl font-bold text-navy-950">
            {((fieldCounts.phone ?? 0) + (fieldCounts.email ?? 0)).toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-navy-400">Contact detail gaps</p>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            {/* Field Dropdown */}
            <div className="w-full sm:w-72">
              <label htmlFor="validation-field-select" className="mb-1 block text-xs font-medium text-navy-700">
                Validation Field Filter
              </label>
              <Select
                id="validation-field-select"
                value={selectedField}
                onChange={(e) => handleFieldChange(e.target.value as ValidationFieldKey)}
              >
                <option value="all">All Missing Fields (Any Gap)</option>
                <optgroup label="Core Identifiers & Demographics">
                  <option value="dateOfBirth">
                    Date of Birth {fieldCounts.dateOfBirth ? `(${fieldCounts.dateOfBirth} missing)` : '(0 missing)'}
                  </option>
                  <option value="email">
                    Email Address {fieldCounts.email ? `(${fieldCounts.email} missing)` : '(0 missing)'}
                  </option>
                  <option value="phone">
                    Phone Number {fieldCounts.phone ? `(${fieldCounts.phone} missing)` : '(0 missing)'}
                  </option>
                  <option value="category">
                    Social Category {fieldCounts.category ? `(${fieldCounts.category} missing)` : '(0 missing)'}
                  </option>
                  <option value="gender">
                    Gender {fieldCounts.gender ? `(${fieldCounts.gender} missing)` : '(0 missing)'}
                  </option>
                  <option value="applicationNumber">
                    Application Number {fieldCounts.applicationNumber ? `(${fieldCounts.applicationNumber} missing)` : '(0 missing)'}
                  </option>
                  <option value="universityRollNumber">
                    University Roll Number {fieldCounts.universityRollNumber ? `(${fieldCounts.universityRollNumber} missing)` : '(0 missing)'}
                  </option>
                </optgroup>
                <optgroup label="Academic Mapping">
                  <option value="programme">
                    Programme {fieldCounts.programme ? `(${fieldCounts.programme} missing)` : '(0 missing)'}
                  </option>
                  <option value="department">
                    Department {fieldCounts.department ? `(${fieldCounts.department} missing)` : '(0 missing)'}
                  </option>
                  <option value="school">
                    School {fieldCounts.school ? `(${fieldCounts.school} missing)` : '(0 missing)'}
                  </option>
                </optgroup>
              </Select>
            </div>

            {/* Search Input */}
            <div className="flex-1">
              <label htmlFor="validation-search" className="mb-1 block text-xs font-medium text-navy-700">
                Search Students
              </label>
              <div className="relative">
                <Input
                  id="validation-search"
                  placeholder="Search by Registration ID, Roll No, or Name…"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Results Table */}
      {filteredRecords.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            title="No Missing Data Records Found"
            body={
              searchQuery
                ? 'No flagged student records match your current search criteria.'
                : selectedField === 'all'
                  ? 'All evaluated student records have complete core fields!'
                  : `No students are missing ${VALIDATION_CHECKS[selectedField]?.label ?? 'this field'}.`
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="border-b border-navy-100 bg-navy-50/50 px-4 py-3 flex items-center justify-between text-xs text-navy-600">
            <span>
              Showing <strong>{((page - 1) * PAGE_SIZE) + 1}</strong> to{' '}
              <strong>{Math.min(page * PAGE_SIZE, filteredRecords.length)}</strong> of{' '}
              <strong>{filteredRecords.length.toLocaleString()}</strong> flagged students
            </span>
            <span>
              Page <strong>{page}</strong> of <strong>{totalPages}</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-navy-950 text-white">
                <tr>
                  <th className="px-4 py-3">Registration ID</th>
                  <th className="px-4 py-3">Student Name</th>
                  <th className="px-4 py-3">Programme</th>
                  <th className="px-4 py-3">Missing Field(s)</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {paginatedRecords.map(({ student, issues }) => {
                  const prog = catalog.programmes.find((p) => p.id === student.programmeId)
                  return (
                    <tr key={student.id} className="hover:bg-navy-50/40">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-navy-900">
                        {student.registrationId}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-navy-950">{student.fullName}</div>
                        <div className="text-xs text-navy-500">
                          {student.universityRollNumber ? `Roll: ${student.universityRollNumber}` : (student.email || 'No email')}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-navy-600">
                        {prog ? `${prog.code} - ${prog.name}` : <span className="text-amber-600">Unassigned</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {issues.map((issue) => (
                            <Badge key={issue} tone="amber">
                              {issue}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`/students/${student.id}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-navy-700 hover:text-navy-950 underline"
                        >
                          View <ExternalLink size={12} />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-navy-100 px-4 py-3">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="text-xs text-navy-500">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

export function DataHistoryPage() {
  const logs = usePortalStore((s) => s.auditLogs.filter((a) => a.entity === 'Student' || a.entity === 'Faculty' || a.entity === 'Import'))
  return (
    <div>
      <PageHeader title="Data Change History" subtitle="Record-level changes from the institutional audit trail." />
      <Card className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-navy-950 text-white text-left"><tr>{['When', 'User', 'Action', 'Entity', 'Old', 'New'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="px-4 py-2 whitespace-nowrap">{new Date(l.createdAt).toLocaleString('en-IN')}</td>
                <td className="px-4 py-2">{l.actorName}</td>
                <td className="px-4 py-2">{l.action}</td>
                <td className="px-4 py-2">{l.entity} {l.entityId}</td>
                <td className="px-4 py-2">{l.oldValue ?? '—'}</td>
                <td className="px-4 py-2">{l.newValue ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

export function NotificationsPage() {
  const notifications = usePortalStore((s) => s.notifications)
  const mark = usePortalStore((s) => s.markNotificationRead)
  return (
    <div>
      <PageHeader title="Notifications" />
      <div className="space-y-3">
        {notifications.map((n) => (
          <Card key={n.id} className="cursor-pointer p-4">
            <button className="w-full text-left" onClick={() => mark(n.id)}>
              <div className="flex items-center justify-between">
                <p className="font-medium">{n.title}</p>
                {!n.isRead ? <Badge tone="gold">New</Badge> : null}
              </div>
              <p className="text-sm text-navy-500">{n.body}</p>
            </button>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function ConfigurationPage() {
  return (
    <div>
      <PageHeader title="Configuration" subtitle="Lookup values are data-driven, not hard-coded in UI logic." />
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4 text-sm">
          <p className="font-medium">Academic Years</p>
          {catalog.academicYears.map((y) => <p key={y.id}>{y.label} {y.isCurrent ? '(current)' : ''}</p>)}
        </Card>
        <Card className="p-4 text-sm">
          <p className="font-medium">Document types in use</p>
          <p>Policy, Annual Report, SSR, Certificate, Photograph, Register, SAR, Audit Report</p>
        </Card>
        <Card className="p-4 text-sm">
          <p className="font-medium">Student categories</p>
          <p>General, OBC, SC, ST, EWS</p>
        </Card>
        <Card className="p-4 text-sm">
          <p className="font-medium">Frameworks</p>
          {catalog.frameworks.map((f) => <p key={f.id}>{f.name}</p>)}
        </Card>
      </div>
    </div>
  )
}
