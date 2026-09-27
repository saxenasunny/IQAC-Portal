import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Badge, Button, Card, PageHeader, statusTone } from '@/components/ui'
import { canSeeSensitive, canWriteData } from '@/lib/access'
import { batchLabel, departmentName, programmeName, schoolName } from '@/lib/lookups'
import { formatDate, maskSensitive } from '@/lib/utils'
import { usePortalStore } from '@/store/portalStore'

const TABS = ['Overview', 'Academic', 'Personal', 'Contact', 'Family', 'Qualification', 'Entrance Exams', 'Experience', 'Documents', 'History'] as const

export function StudentProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const user = usePortalStore((s) => s.currentUser)!
  const student = usePortalStore((s) => s.students.find((x) => x.id === id))
  const archiveStudent = usePortalStore((s) => s.archiveStudent)
  const documents = usePortalStore((s) => s.documents)
  const [tab, setTab] = useState<(typeof TABS)[number]>('Overview')

  if (!student) {
    return (
      <div>
        <PageHeader title="Student not found" />
        <Button onClick={() => navigate('/students')}>Back to students</Button>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={student.fullName}
        subtitle={`${student.registrationId} · ${programmeName(student.programmeId)}`}
        actions={
          <>
            {canWriteData(user.role) ? (
              <Button variant="outline" onClick={() => { archiveStudent(student.id); toast.success('Student archived'); navigate('/students') }}>
                Archive
              </Button>
            ) : null}
            <Link to="/students"><Button variant="secondary">Back</Button></Link>
          </>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <Badge tone={statusTone(student.studentStatus)}>{student.studentStatus}</Badge>
        <Badge>{schoolName(student.schoolId)}</Badge>
        <Badge>{departmentName(student.departmentId)}</Badge>
        <Badge tone="gold">{student.workflow}</Badge>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-full px-3 py-1 text-sm ${tab === t ? 'bg-navy-900 text-white' : 'bg-white text-navy-700 border border-navy-200'}`}>
            {t}
          </button>
        ))}
      </div>
      <Card className="p-5">
        {tab === 'Overview' && (
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-sm">
            <Item label="Registration ID" value={student.registrationId} />
            <Item label="Application Number" value={student.applicationNumber} />
            <Item label="University Roll Number" value={student.universityRollNumber} />
            <Item label="Email" value={student.email} />
            <Item label="Phone" value={student.phone} />
            <Item label="Gender" value={student.gender} />
            <Item label="Date of Birth" value={formatDate(student.dateOfBirth)} />
            <Item label="Nationality" value={student.nationality} />
            <Item label="Batch" value={batchLabel(student.batchId)} />
            <Item label="Current Year / Term" value={`${student.currentYear} / ${student.currentTerm}`} />
            <Item label="Admission Type" value={student.admissionType} />
            <Item label="Academic Status" value={student.academicStatus} />
          </dl>
        )}
        {tab === 'Academic' && (
          <dl className="grid gap-4 sm:grid-cols-2 text-sm">
            <Item label="Programme" value={programmeName(student.programmeId)} />
            <Item label="CGPA" value={student.academic.cgpa ?? '—'} />
            <Item label="Percentage" value={student.academic.percentage ?? '—'} />
            <Item label="Backlogs" value={student.academic.backlogs} />
            <Item label="Admission Date" value={formatDate(student.academic.admissionDate)} />
            <Item label="Expected Graduation" value={formatDate(student.academic.expectedGraduation)} />
          </dl>
        )}
        {tab === 'Personal' && (
          <dl className="grid gap-4 sm:grid-cols-2 text-sm">
            <Item label="Category" value={student.personal.category} />
            <Item label="EWS" value={student.personal.ews ? 'Yes' : 'No'} />
            <Item label="Differently Abled" value={student.personal.differentlyAbled ? 'Yes' : 'No'} />
            <Item label="First Generation" value={student.personal.firstGeneration ? 'Yes' : 'No'} />
            <Item label="Domicile" value={student.personal.domicileState} />
            <Item label="Blood Group" value={student.personal.bloodGroup ?? '—'} />
            {canSeeSensitive(user.role) ? (
              <>
                <Item label="Aadhaar" value={maskSensitive(student.sensitive?.aadhaar)} />
                <Item label="PAN" value={maskSensitive(student.sensitive?.pan)} />
                <Item label="ABC ID" value={student.sensitive?.abcId ?? '—'} />
              </>
            ) : (
              <p className="sm:col-span-2 text-navy-500">Sensitive identifiers are restricted for your role.</p>
            )}
          </dl>
        )}
        {tab === 'Contact' && (
          <div className="grid gap-4 sm:grid-cols-2 text-sm">
            <Item label="Personal Email" value={student.contact.personalEmail ?? '—'} />
            <Item label="Alternate Phone" value={student.contact.alternatePhone ?? '—'} />
            <Item label="Emergency Contact" value={student.contact.emergencyContactName ?? '—'} />
            <Item label="Emergency Phone" value={student.contact.emergencyContactPhone ?? '—'} />
            {student.addresses.map((a) => (
              <Item key={a.type} label={`${a.type} address`} value={`${a.line1}, ${a.city}, ${a.state} ${a.pincode}`} />
            ))}
          </div>
        )}
        {tab === 'Family' && (
          <dl className="grid gap-4 sm:grid-cols-2 text-sm">
            <Item label="Father" value={student.family.fatherName ?? '—'} />
            <Item label="Father Occupation" value={student.family.fatherOccupation ?? '—'} />
            <Item label="Mother" value={student.family.motherName ?? '—'} />
            <Item label="Mother Occupation" value={student.family.motherOccupation ?? '—'} />
            <Item label="Annual Income" value={canSeeSensitive(user.role) ? student.family.annualIncome ?? '—' : 'Restricted'} />
            <Item label="Mentor" value={student.mentor?.name ?? '—'} />
          </dl>
        )}
        {tab === 'Qualification' && (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-navy-500"><th className="py-2">Level</th><th>Board / University</th><th>Year</th><th>%</th></tr></thead>
            <tbody>
              {student.qualifications.map((q) => (
                <tr key={q.level} className="border-t"><td className="py-2">{q.level}</td><td>{q.boardUniversity}</td><td>{q.yearOfPassing}</td><td>{q.percentage}</td></tr>
              ))}
            </tbody>
          </table>
        )}
        {tab === 'Entrance Exams' && (
          student.entranceExams.length ? (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-navy-500"><th className="py-2">Exam</th><th>Score</th><th>Rank</th><th>Year</th></tr></thead>
              <tbody>
                {student.entranceExams.map((q) => (
                  <tr key={q.examName} className="border-t"><td className="py-2">{q.examName}</td><td>{q.score ?? '—'}</td><td>{q.rank ?? '—'}</td><td>{q.year}</td></tr>
                ))}
              </tbody>
            </table>
          ) : <p className="text-sm text-navy-500">No entrance examination records.</p>
        )}
        {tab === 'Experience' && <p className="text-sm text-navy-500">No prior employment recorded for this student.</p>}
        {tab === 'Documents' && (
          <ul className="text-sm">
            {documents.slice(0, 3).map((d) => (
              <li key={d.id} className="border-b border-navy-50 py-2"><Link className="text-navy-700 underline" to={`/documents/${d.id}`}>{d.title}</Link></li>
            ))}
          </ul>
        )}
        {tab === 'History' && (
          <ul className="space-y-3 text-sm">
            <li>{formatDate(student.updatedAt)} — Record last updated</li>
            <li>{formatDate(student.createdAt)} — Record created in central database</li>
            <li>{formatDate(student.academic.admissionDate)} — Admitted to {programmeName(student.programmeId)}</li>
          </ul>
        )}
      </Card>
    </div>
  )
}

function Item({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-navy-400">{label}</dt>
      <dd className="font-medium capitalize">{value}</dd>
    </div>
  )
}
