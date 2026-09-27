import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Badge, Card, MetricHint, PageHeader, ProgressBar } from '@/components/ui'
import { computeInstitutionMetrics } from '@/lib/formulas'
import { departmentName, schoolName, visibleFaculty, visibleStudents } from '@/lib/lookups'
import { formatNumber } from '@/lib/utils'
import { catalog, usePortalStore } from '@/store/portalStore'

const COLORS = ['#0b1f33', '#1b4f72', '#0e7c7b', '#c9a227', '#4d7aa6', '#7fa3c4']

export function DashboardPage() {
  const user = usePortalStore((s) => s.currentUser)!
  const allStudents = usePortalStore((s) => s.students)
  const allFaculty = usePortalStore((s) => s.faculty)
  const documents = usePortalStore((s) => s.documents)
  const requirements = usePortalStore((s) => s.requirements)
  const students = visibleStudents(allStudents, user.role, user.schoolId, user.departmentId).filter((s) => !s.isArchived)
  const faculty = visibleFaculty(allFaculty, user.role, user.schoolId, user.departmentId)
  const metrics = computeInstitutionMetrics(students, faculty)
  const pendingDocs = documents.filter((d) => ['draft', 'submitted'].includes(d.status)).length
  const validationIssues = students.filter((s) => !s.email || !s.personal.category || !s.dateOfBirth).length
  const accreditationOpen = requirements.filter((r) => !['verified', 'approved'].includes(r.status)).length

  const bySchool = catalog.schools.map((sch) => ({
    name: sch.code,
    students: students.filter((s) => s.schoolId === sch.id).length,
  }))
  const byProgramme = catalog.programmes
    .map((p) => ({ name: p.code, students: students.filter((s) => s.programmeId === p.id).length }))
    .filter((x) => x.students)
    .slice(0, 8)
  const byGender = [
    { name: 'Female', value: students.filter((s) => s.gender === 'female').length },
    { name: 'Male', value: students.filter((s) => s.gender === 'male').length },
  ]
  const byBatch = [2023, 2024, 2025].map((y) => ({
    name: String(y),
    students: students.filter((s) => catalog.batches.find((b) => b.id === s.batchId)?.year === y).length,
  }))
  const facultyByDept = catalog.departments
    .map((d) => ({ name: d.code, faculty: faculty.filter((f) => f.departmentId === d.id).length }))
    .filter((x) => x.faculty)
  const facultyByDesig = ['Professor', 'Associate Professor', 'Assistant Professor'].map((d) => ({
    name: d.replace(' Professor', ''),
    value: faculty.filter((f) => f.designation === d).length,
  }))

  const cards = [
    { label: 'Students', value: students.length, to: '/students' },
    { label: 'Faculty', value: faculty.length, to: '/faculty' },
    { label: 'Departments', value: catalog.departments.length, to: '/institution/departments' },
    { label: 'Programmes', value: catalog.programmes.length, to: '/institution/programmes' },
    { label: 'Documents', value: documents.length, to: '/documents' },
    { label: 'Pending Evidence', value: pendingDocs, to: '/documents/pending' },
    { label: 'Validation Issues', value: validationIssues, to: '/data/validation' },
    { label: 'Accreditation Tasks', value: accreditationOpen, to: '/accreditation/NAAC' },
  ]

  return (
    <div>
      <PageHeader
        title="IQAC Dashboard"
        subtitle={`${catalog.institution.name} · NAAC ${catalog.institution.naacGrade} · Academic Year 2025-26`}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} to={c.to}>
            <Card className="p-4 transition hover:border-navy-300">
              <p className="text-sm text-navy-500">{c.label}</p>
              <p className="mt-1 text-3xl font-semibold text-navy-900">{formatNumber(c.value)}</p>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        {metrics.slice(0, 3).map((m) => (
          <Card key={m.label} className="p-4">
            <p className="text-sm text-navy-500">{m.label}</p>
            <p className="text-2xl font-semibold">{m.value}</p>
            <MetricHint
              source={m.source}
              filters={m.filters}
              calculation={m.calculation}
              lastUpdated={new Date(m.lastUpdated).toLocaleString('en-IN')}
              verifiedBy={m.verifiedBy}
            />
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="mb-3 font-medium">Students by School</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={bySchool}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6edf3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="students" fill="#1b4f72" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-4">
          <h3 className="mb-3 font-medium">Students by Programme</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={byProgramme} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e6edf3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={90} />
                <Tooltip />
                <Bar dataKey="students" fill="#0e7c7b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-4">
          <h3 className="mb-3 font-medium">Students by Gender</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={byGender} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                  {byGender.map((_, i) => (
                    <Cell key={i} fill={COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-4">
          <h3 className="mb-3 font-medium">Students by Batch</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={byBatch}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6edf3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="students" fill="#c9a227" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-4">
          <h3 className="mb-3 font-medium">Faculty by Department</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={facultyByDept}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6edf3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="faculty" fill="#163f5c" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-4">
          <h3 className="mb-3 font-medium">Faculty by Designation</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={facultyByDesig} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                  {facultyByDesig.map((_, i) => (
                    <Cell key={i} fill={COLORS[i + 1]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="mb-3 font-medium">Data Completeness</h3>
          {[
            { label: 'Personal Information', value: 96 },
            { label: 'Academic Information', value: 98 },
            { label: 'Contact Information', value: 91 },
            { label: 'Qualification', value: 88 },
            { label: 'Documents', value: 72 },
          ].map((row) => (
            <div key={row.label} className="mb-3">
              <div className="mb-1 flex justify-between text-sm">
                <span>{row.label}</span>
                <span>{row.value}%</span>
              </div>
              <ProgressBar value={row.value} />
            </div>
          ))}
        </Card>
        <Card className="p-4">
          <h3 className="mb-3 font-medium">Accreditation snapshot</h3>
          {catalog.frameworks.map((fw) => {
            const reqs = requirements.filter((r) => r.frameworkVersionId === `fv_${fw.code}_2026`)
            const avg = reqs.length ? Math.round(reqs.reduce((a, b) => a + b.progress, 0) / reqs.length) : 0
            return (
              <Link key={fw.id} to={`/accreditation/${fw.code}`} className="mb-3 block">
                <div className="mb-1 flex justify-between text-sm">
                  <span>{fw.name}</span>
                  <Badge tone="blue">{avg}%</Badge>
                </div>
                <ProgressBar value={avg} />
              </Link>
            )
          })}
        </Card>
      </div>
    </div>
  )
}
