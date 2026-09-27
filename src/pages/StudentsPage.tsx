import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Badge, Button, Card, EmptyState, Input, Modal, PageHeader, Select, statusTone } from '@/components/ui'
import { canWriteData } from '@/lib/access'
import { batchLabel, departmentName, programmeName, schoolName, visibleStudents } from '@/lib/lookups'
import { downloadBlob, toCsv, uid } from '@/lib/utils'
import { catalog, usePortalStore } from '@/store/portalStore'
import type { Student } from '@/types'

export function StudentsPage() {
  const navigate = useNavigate()
  const user = usePortalStore((s) => s.currentUser)!
  const students = visibleStudents(usePortalStore((s) => s.students), user.role, user.schoolId, user.departmentId).filter((s) => !s.isArchived)
  const upsertStudent = usePortalStore((s) => s.upsertStudent)
  const [q, setQ] = useState('')
  const [school, setSchool] = useState('')
  const [dept, setDept] = useState('')
  const [prog, setProg] = useState('')
  const [gender, setGender] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState(false)
  const pageSize = 12

  const filtered = useMemo(() => {
    return students.filter((s) => {
      const term = q.toLowerCase()
      const matches =
        !q ||
        s.fullName.toLowerCase().includes(term) ||
        s.registrationId.toLowerCase().includes(term) ||
        s.applicationNumber.toLowerCase().includes(term) ||
        s.universityRollNumber.toLowerCase().includes(term) ||
        s.email.toLowerCase().includes(term)
      return (
        matches &&
        (!school || s.schoolId === school) &&
        (!dept || s.departmentId === dept) &&
        (!prog || s.programmeId === prog) &&
        (!gender || s.gender === gender) &&
        (!status || s.studentStatus === status)
      )
    })
  }, [students, q, school, dept, prog, gender, status])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize)

  function exportCsv() {
    downloadBlob(
      'students.csv',
      toCsv(
        filtered.map((s) => ({
          registrationId: s.registrationId,
          name: s.fullName,
          programme: programmeName(s.programmeId),
          department: departmentName(s.departmentId),
          batch: batchLabel(s.batchId),
          gender: s.gender,
          status: s.studentStatus,
          email: s.email,
        })),
      ),
    )
  }

  return (
    <div>
      <PageHeader
        title="Students"
        subtitle="Central student database used by NAAC, NIRF, NBA and other frameworks."
        actions={
          <>
            <Button variant="outline" onClick={exportCsv}>Export</Button>
            {canWriteData(user.role) ? <Button onClick={() => setOpen(true)}>Add Student</Button> : null}
          </>
        }
      />
      <Card className="mb-4 p-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Input placeholder="Search ID, name, email..." value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} />
          <Select value={school} onChange={(e) => { setSchool(e.target.value); setPage(1) }}>
            <option value="">All Schools</option>
            {catalog.schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <Select value={dept} onChange={(e) => { setDept(e.target.value); setPage(1) }}>
            <option value="">All Departments</option>
            {catalog.departments.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <Select value={prog} onChange={(e) => { setProg(e.target.value); setPage(1) }}>
            <option value="">All Programmes</option>
            {catalog.programmes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <Select value={gender} onChange={(e) => { setGender(e.target.value); setPage(1) }}>
            <option value="">All Genders</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
          </Select>
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}>
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="graduated">Graduated</option>
          </Select>
        </div>
      </Card>
      {rows.length === 0 ? (
        <EmptyState title="No students found" body="There are currently no students matching your filters." action={<Button onClick={() => { setQ(''); setSchool(''); setDept(''); setProg(''); setGender(''); setStatus('') }}>Clear filters</Button>} />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-navy-950 text-left text-white">
                <tr>
                  {['Registration ID', 'Name', 'Programme', 'Department', 'Batch', 'Gender', 'Status'].map((h) => (
                    <th key={h} className="px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id} className="cursor-pointer border-t border-navy-100 hover:bg-navy-50" onClick={() => navigate(`/students/${s.id}`)}>
                    <td className="px-4 py-3 font-medium">{s.registrationId}</td>
                    <td className="px-4 py-3">{s.fullName}</td>
                    <td className="px-4 py-3">{programmeName(s.programmeId)}</td>
                    <td className="px-4 py-3">{departmentName(s.departmentId)}</td>
                    <td className="px-4 py-3">{batchLabel(s.batchId)}</td>
                    <td className="px-4 py-3 capitalize">{s.gender}</td>
                    <td className="px-4 py-3"><Badge tone={statusTone(s.studentStatus)}>{s.studentStatus}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-navy-100 px-4 py-3 text-sm">
            <span>{filtered.length} records</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <span className="px-2 py-1">{page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        </Card>
      )}
      <AddStudentModal open={open} onClose={() => setOpen(false)} onSave={(s) => { upsertStudent(s, 'Manual entry'); setOpen(false); navigate(`/students/${s.id}`) }} />
    </div>
  )
}

function AddStudentModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (s: Student) => void }) {
  const [name, setName] = useState('')
  const [reg, setReg] = useState('')
  const [email, setEmail] = useState('')
  const [programmeId, setProgrammeId] = useState(catalog.programmes[0].id)

  function save() {
    const programme = catalog.programmes.find((p) => p.id === programmeId)!
    const dept = catalog.departments.find((d) => d.id === programme.departmentId)!
    const batch = catalog.batches.find((b) => b.programmeId === programme.id)!
    const student: Student = {
      id: uid('stu'),
      registrationId: reg || `AU2025${uid('').slice(-5).toUpperCase()}`,
      applicationNumber: `APP${Date.now().toString().slice(-8)}`,
      universityRollNumber: `2025${programme.code.slice(0, 3)}${Math.floor(Math.random() * 900 + 100)}`,
      fullName: name,
      email,
      phone: '',
      gender: 'female',
      dateOfBirth: '2004-01-01',
      nationality: 'India',
      programmeId: programme.id,
      departmentId: dept.id,
      schoolId: dept.schoolId,
      batchId: batch.id,
      academicYearId: 'ay_2526',
      currentYear: 1,
      currentTerm: 'Odd',
      studentStatus: 'active',
      academicStatus: 'regular',
      admissionType: 'Merit',
      workflow: 'draft',
      isArchived: false,
      personal: { firstName: name.split(' ')[0], lastName: name.split(' ').slice(1).join(' '), firstGeneration: false, differentlyAbled: false, ews: false, domicileState: 'Rajasthan', category: 'General' },
      academic: { backlogs: 0, admissionDate: '2025-07-15' },
      contact: {},
      addresses: [],
      family: {},
      qualifications: [],
      entranceExams: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    onSave(student)
  }

  return (
    <Modal open={open} title="Add Student" onClose={onClose}>
      <div className="space-y-3">
        <Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="Registration ID" value={reg} onChange={(e) => setReg(e.target.value)} />
        <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Select value={programmeId} onChange={(e) => setProgrammeId(e.target.value)}>
          {catalog.programmes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={!name} onClick={save}>Save draft</Button>
        </div>
      </div>
    </Modal>
  )
}

export function StaffPage() {
  return (
    <div>
      <PageHeader title="Staff" subtitle="Non-teaching staff module is scaffolded for Phase 2." />
      <EmptyState title="Staff records not in Phase 1" body="The architecture supports staff as a people domain. Phase 1 focuses on students and faculty as ranking data sources." />
    </div>
  )
}
