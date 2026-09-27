import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Badge, Button, Card, EmptyState, Input, Modal, PageHeader, Select, statusTone } from '@/components/ui'
import { canWriteData } from '@/lib/access'
import { departmentName, schoolName, visibleFaculty } from '@/lib/lookups'
import { downloadBlob, toCsv, uid } from '@/lib/utils'
import { catalog, usePortalStore } from '@/store/portalStore'
import type { Faculty } from '@/types'

export function FacultyPage() {
  const navigate = useNavigate()
  const user = usePortalStore((s) => s.currentUser)!
  const faculty = visibleFaculty(usePortalStore((s) => s.faculty), user.role, user.schoolId, user.departmentId)
  const upsertFaculty = usePortalStore((s) => s.upsertFaculty)
  const [q, setQ] = useState('')
  const [dept, setDept] = useState('')
  const [desig, setDesig] = useState('')
  const [open, setOpen] = useState(false)

  const filtered = useMemo(() => faculty.filter((f) => {
    const term = q.toLowerCase()
    return (!q || f.fullName.toLowerCase().includes(term) || f.employeeId.toLowerCase().includes(term) || f.email.toLowerCase().includes(term))
      && (!dept || f.departmentId === dept)
      && (!desig || f.designation === desig)
  }), [faculty, q, dept, desig])

  return (
    <div>
      <PageHeader
        title="Faculty"
        subtitle="Central faculty database for teaching, research and ranking metrics."
        actions={
          <>
            <Button variant="outline" onClick={() => downloadBlob('faculty.csv', toCsv(filtered.map((f) => ({ employeeId: f.employeeId, name: f.fullName, department: departmentName(f.departmentId), designation: f.designation, qualification: f.highestQualification }))))}>Export</Button>
            {canWriteData(user.role) ? <Button onClick={() => setOpen(true)}>Add Faculty</Button> : null}
          </>
        }
      />
      <Card className="mb-4 grid gap-3 p-4 md:grid-cols-3">
        <Input placeholder="Search name, employee ID, email" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={dept} onChange={(e) => setDept(e.target.value)}>
          <option value="">All Departments</option>
          {catalog.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </Select>
        <Select value={desig} onChange={(e) => setDesig(e.target.value)}>
          <option value="">All Designations</option>
          <option>Professor</option>
          <option>Associate Professor</option>
          <option>Assistant Professor</option>
        </Select>
      </Card>
      {filtered.length === 0 ? (
        <EmptyState title="No faculty found" body="There are currently no faculty matching your filters." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-navy-950 text-left text-white">
              <tr>
                {['Employee ID', 'Name', 'Department', 'Designation', 'Qualification', 'Experience', 'Type'].map((h) => (
                  <th key={h} className="px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((f) => (
                <tr key={f.id} className="cursor-pointer border-t hover:bg-navy-50" onClick={() => navigate(`/faculty/${f.id}`)}>
                  <td className="px-4 py-3 font-medium">{f.employeeId}</td>
                  <td className="px-4 py-3">{f.fullName}</td>
                  <td className="px-4 py-3">{departmentName(f.departmentId)}</td>
                  <td className="px-4 py-3">{f.designation}</td>
                  <td className="px-4 py-3">{f.highestQualification}</td>
                  <td className="px-4 py-3">{f.teachingExperienceYears} yrs</td>
                  <td className="px-4 py-3"><Badge tone={statusTone(f.employmentType)}>{f.employmentType}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <Modal open={open} title="Add Faculty" onClose={() => setOpen(false)}>
        <FacultyForm onSave={(row) => { upsertFaculty(row, 'Manual entry'); setOpen(false); navigate(`/faculty/${row.id}`) }} onCancel={() => setOpen(false)} />
      </Modal>
    </div>
  )
}

function FacultyForm({ onSave, onCancel }: { onSave: (f: Faculty) => void; onCancel: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [departmentId, setDepartmentId] = useState(catalog.departments[0].id)
  return (
    <div className="space-y-3">
      <Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
      <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <Select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
        {catalog.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
      </Select>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button disabled={!name} onClick={() => {
          const dept = catalog.departments.find((d) => d.id === departmentId)!
          onSave({
            id: uid('fac'),
            employeeId: `EMP${Math.floor(3000 + Math.random() * 900)}`,
            fullName: name,
            email,
            phone: '',
            gender: 'female',
            dateOfBirth: '1980-01-01',
            schoolId: dept.schoolId,
            departmentId,
            designation: 'Assistant Professor',
            employmentType: 'permanent',
            joiningDate: '2026-07-01',
            highestQualification: 'Ph.D',
            specialization: '',
            teachingExperienceYears: 0,
            researchExperienceYears: 0,
            isActive: true,
            workflow: 'draft',
            qualifications: [],
            publications: [],
            projects: [],
            patents: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
        }}>Save</Button>
      </div>
    </div>
  )
}

export function FacultyProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const faculty = usePortalStore((s) => s.faculty.find((x) => x.id === id))
  const [tab, setTab] = useState('Overview')
  if (!faculty) return <div><PageHeader title="Faculty not found" /><Button onClick={() => navigate('/faculty')}>Back</Button></div>
  const tabs = ['Overview', 'Personal', 'Employment', 'Qualification', 'Experience', 'Research', 'Publications', 'Projects', 'Patents', 'Documents', 'History']
  return (
    <div>
      <PageHeader title={faculty.fullName} subtitle={`${faculty.employeeId} · ${faculty.designation} · ${departmentName(faculty.departmentId)}`} actions={<Button variant="secondary" onClick={() => navigate('/faculty')}>Back</Button>} />
      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-full px-3 py-1 text-sm ${tab === t ? 'bg-navy-900 text-white' : 'border border-navy-200 bg-white'}`}>{t}</button>
        ))}
      </div>
      <Card className="p-5 text-sm">
        {tab === 'Overview' && (
          <dl className="grid gap-4 sm:grid-cols-2">
            <KV label="Email" value={faculty.email} />
            <KV label="Phone" value={faculty.phone} />
            <KV label="School" value={schoolName(faculty.schoolId)} />
            <KV label="Highest Qualification" value={faculty.highestQualification} />
            <KV label="Specialization" value={faculty.specialization} />
            <KV label="Teaching Experience" value={`${faculty.teachingExperienceYears} years`} />
            <KV label="Research Experience" value={`${faculty.researchExperienceYears} years`} />
            <KV label="ORCID" value={faculty.orcid ?? '—'} />
            <KV label="Scopus ID" value={faculty.scopusId ?? '—'} />
          </dl>
        )}
        {tab === 'Personal' && <dl className="grid gap-4 sm:grid-cols-2"><KV label="Gender" value={faculty.gender} /><KV label="Date of Birth" value={faculty.dateOfBirth} /></dl>}
        {tab === 'Employment' && <dl className="grid gap-4 sm:grid-cols-2"><KV label="Type" value={faculty.employmentType} /><KV label="Joining Date" value={faculty.joiningDate} /><KV label="Status" value={faculty.isActive ? 'Active' : 'Inactive'} /></dl>}
        {tab === 'Qualification' && faculty.qualifications.map((q) => <p key={q.degree + q.year} className="border-b py-2">{q.degree} · {q.university} · {q.year}</p>)}
        {tab === 'Experience' && <p className="text-navy-500">Current appointment is the primary recorded experience. Historical postings appear in department/designation history after HR sync.</p>}
        {tab === 'Research' && <p>Indexed identifiers are captured for ranking extracts. Google Scholar: {faculty.googleScholar ?? '—'}</p>}
        {tab === 'Publications' && faculty.publications.map((p) => <p key={p.title} className="border-b py-2">{p.year} · {p.title} · {p.journal} ({p.indexedIn})</p>)}
        {tab === 'Projects' && (faculty.projects.length ? faculty.projects.map((p) => <p key={p.title} className="border-b py-2">{p.title} · {p.fundingAgency} · ₹{p.amount.toLocaleString('en-IN')}</p>) : <p>No funded projects recorded.</p>)}
        {tab === 'Patents' && (faculty.patents.length ? faculty.patents.map((p) => <p key={p.patentNumber} className="border-b py-2">{p.title} · {p.patentNumber}</p>) : <p>No patents recorded.</p>)}
        {tab === 'Documents' && <p className="text-navy-500">Faculty documents are linked from the evidence repository.</p>}
        {tab === 'History' && <p>Created {faculty.createdAt}. Last updated {faculty.updatedAt}.</p>}
      </Card>
    </div>
  )
}

function KV({ label, value }: { label: string; value: string }) {
  return <div><p className="text-navy-400">{label}</p><p className="font-medium">{value}</p></div>
}
