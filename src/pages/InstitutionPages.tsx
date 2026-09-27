import { Card, PageHeader } from '@/components/ui'
import { catalog } from '@/store/portalStore'

export function InstitutionProfilePage() {
  const i = catalog.institution
  return (
    <div>
      <PageHeader title="Institution Profile" subtitle="Master facts used across accreditation frameworks." />
      <Card className="grid gap-4 p-6 sm:grid-cols-2 text-sm">
        <KV label="Name" value={i.name} />
        <KV label="Type" value={i.type} />
        <KV label="Established" value={String(i.establishedYear)} />
        <KV label="NAAC Grade" value={i.naacGrade} />
        <KV label="NIRF Rank (latest)" value={String(i.nirfRank ?? '—')} />
        <KV label="City / State" value={`${i.city}, ${i.state}`} />
        <KV label="Website" value={i.website} />
        <KV label="Campuses" value={String(catalog.campuses.length)} />
      </Card>
    </div>
  )
}

export function CampusesPage() {
  return (
    <SimpleTable
      title="Campuses"
      subtitle="Institutional locations."
      headers={['Name', 'City', 'Type']}
      rows={catalog.campuses.map((c) => [c.name, c.city, c.isMain ? 'Main' : 'Satellite'])}
    />
  )
}

export function SchoolsPage() {
  return (
    <SimpleTable
      title="Schools"
      subtitle="Academic schools reporting to the university."
      headers={['Code', 'Name', 'Dean', 'Campus']}
      rows={catalog.schools.map((s) => [s.code, s.name, s.deanName, catalog.campuses.find((c) => c.id === s.campusId)?.name ?? '—'])}
    />
  )
}

export function DepartmentsPage() {
  return (
    <SimpleTable
      title="Departments"
      subtitle="Department is the primary access boundary for HODs."
      headers={['Code', 'Name', 'School', 'HOD', 'Established']}
      rows={catalog.departments.map((d) => [d.code, d.name, catalog.schools.find((s) => s.id === d.schoolId)?.name ?? '—', d.hodName, String(d.establishedYear)])}
    />
  )
}

export function ProgrammesPage() {
  return (
    <SimpleTable
      title="Programmes"
      subtitle="Programmes, duration and sanctioned intake."
      headers={['Code', 'Name', 'Level', 'Department', 'Duration', 'Intake']}
      rows={catalog.programmes.map((p) => [p.code, p.name, p.level, catalog.departments.find((d) => d.id === p.departmentId)?.name ?? '—', `${p.durationYears} yrs`, String(p.intake)])}
    />
  )
}

function SimpleTable({ title, subtitle, headers, rows }: { title: string; subtitle: string; headers: string[]; rows: string[][] }) {
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} />
      <Card className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-navy-950 text-left text-white">
            <tr>{headers.map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t">
                {r.map((c, j) => <td key={j} className="px-4 py-3">{c}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

function KV({ label, value }: { label: string; value: string }) {
  return <div><p className="text-navy-400">{label}</p><p className="font-medium">{value}</p></div>
}
