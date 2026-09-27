import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Button, Card, PageHeader } from '@/components/ui'
import { computeInstitutionMetrics } from '@/lib/formulas'
import { downloadBlob, toCsv } from '@/lib/utils'
import { catalog, usePortalStore } from '@/store/portalStore'

export function StudentReportsPage() {
  const students = usePortalStore((s) => s.students.filter((s) => !s.isArchived))
  const byProg = catalog.programmes.map((p) => ({ name: p.code, count: students.filter((s) => s.programmeId === p.id).length })).filter((x) => x.count)
  return (
    <div>
      <PageHeader title="Student Reports" actions={<Button variant="outline" onClick={() => downloadBlob('student-report.csv', toCsv(byProg))}>Export Excel/CSV</Button>} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="mb-3 font-medium">Students by programme</h3>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={byProg}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" hide />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#1b4f72" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-4 text-sm space-y-2">
          <p>Gender — Female {students.filter((s) => s.gender === 'female').length} / Male {students.filter((s) => s.gender === 'male').length}</p>
          <p>International {students.filter((s) => s.nationality !== 'India').length}</p>
          <p>Graduated {students.filter((s) => s.studentStatus === 'graduated').length}</p>
          <p>With backlogs {students.filter((s) => s.academic.backlogs > 0).length}</p>
          <p>EWS {students.filter((s) => s.personal.ews).length}</p>
        </Card>
      </div>
    </div>
  )
}

export function FacultyReportsPage() {
  const faculty = usePortalStore((s) => s.faculty)
  const students = usePortalStore((s) => s.students)
  const metrics = computeInstitutionMetrics(students, faculty)
  const sfr = metrics.find((m) => m.label.startsWith('Student'))
  return (
    <div>
      <PageHeader title="Faculty Reports" />
      <Card className="p-5 text-sm space-y-2">
        <p>Faculty by designation — Professor {faculty.filter((f) => f.designation === 'Professor').length}, Associate {faculty.filter((f) => f.designation === 'Associate Professor').length}, Assistant {faculty.filter((f) => f.designation === 'Assistant Professor').length}</p>
        <p>Ph.D / Post-Doc {faculty.filter((f) => /ph\.?d|post-doc/i.test(f.highestQualification)).length}</p>
        <p>Student–faculty ratio {sfr?.value}</p>
        <p className="text-xs text-navy-500">Source: {sfr?.source}. Calculation: {sfr?.calculation}. Verified by: {sfr?.verifiedBy}.</p>
      </Card>
    </div>
  )
}

export function AccreditationReportsPage() {
  const requirements = usePortalStore((s) => s.requirements)
  return (
    <div>
      <PageHeader title="Accreditation Reports" actions={<Button variant="outline" onClick={() => downloadBlob('accreditation.csv', toCsv(requirements.map((r) => ({ title: r.title, status: r.status, value: r.computedValue ?? '' }))))}>Export</Button>} />
      <Card className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-navy-950 text-white text-left"><tr>{['Requirement', 'Status', 'Missing data', 'Value'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
          <tbody>
            {requirements.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-2">{r.title}</td>
                <td className="px-4 py-2">{r.status}</td>
                <td className="px-4 py-2">{['not_started', 'needs_revision', 'data_collection'].includes(r.status) ? 'Yes' : 'No'}</td>
                <td className="px-4 py-2">{r.computedValue ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

export function ExportCentrePage() {
  const students = usePortalStore((s) => s.students)
  const faculty = usePortalStore((s) => s.faculty)
  return (
    <div>
      <PageHeader title="Export Centre" subtitle="Download operational extracts. PDF layout can be printed from the browser." />
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <p className="font-medium">Students</p>
          <Button className="mt-3" onClick={() => downloadBlob('students.csv', toCsv(students.map((s) => ({ id: s.registrationId, name: s.fullName, status: s.studentStatus }))))}>CSV / Excel</Button>
        </Card>
        <Card className="p-4">
          <p className="font-medium">Faculty</p>
          <Button className="mt-3" onClick={() => downloadBlob('faculty.csv', toCsv(faculty.map((s) => ({ id: s.employeeId, name: s.fullName, designation: s.designation }))))}>CSV / Excel</Button>
        </Card>
        <Card className="p-4">
          <p className="font-medium">Print / PDF</p>
          <Button className="mt-3" variant="outline" onClick={() => window.print()}>Print this page</Button>
        </Card>
      </div>
    </div>
  )
}
