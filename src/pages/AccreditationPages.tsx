import { Link, useNavigate, useParams } from 'react-router-dom'
import { Badge, Button, Card, PageHeader, ProgressBar, Select, statusTone } from '@/components/ui'
import { canVerify, canWriteData } from '@/lib/access'
import { departmentName } from '@/lib/lookups'
import { formatDateTime } from '@/lib/utils'
import { catalog, usePortalStore } from '@/store/portalStore'
import type { RequirementStatus } from '@/types'

export function AccreditationDashboardPage() {
  const { code = 'NAAC' } = useParams()
  const navigate = useNavigate()
  const fw = catalog.frameworks.find((f) => f.code === code) ?? catalog.frameworks[0]
  const version = catalog.frameworkVersions.find((v) => v.frameworkId === fw.id)
  const categories = catalog.frameworkCategories.filter((c) => c.frameworkVersionId === version?.id)
  const requirements = usePortalStore((s) => s.requirements.filter((r) => r.frameworkVersionId === version?.id))
  const overall = requirements.length ? Math.round(requirements.reduce((a, b) => a + b.progress, 0) / requirements.length) : 0

  return (
    <div>
      <PageHeader title={`${fw.name} Dashboard`} subtitle={fw.description} />
      <Card className="mb-6 p-5">
        <p className="text-sm text-navy-500">Overall Progress</p>
        <p className="text-3xl font-semibold">{overall}%</p>
        <div className="mt-3"><ProgressBar value={overall} /></div>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        {categories.map((c) => {
          const reqs = requirements.filter((r) => r.categoryId === c.id)
          const pct = reqs.length ? Math.round(reqs.reduce((a, b) => a + b.progress, 0) / reqs.length) : 20
          return (
            <Card key={c.id} className="p-4">
              <div className="mb-2 flex justify-between text-sm">
                <span className="font-medium">{c.code} · {c.name}</span>
                <span>{pct}%</span>
              </div>
              <ProgressBar value={pct} />
            </Card>
          )
        })}
      </div>
      <Card className="mt-6 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-navy-950 text-left text-white">
            <tr>{['Requirement', 'Owner', 'Department', 'Documents', 'Status', 'Updated', 'Verified By'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
          </thead>
          <tbody>
            {requirements.map((r) => (
              <tr key={r.id} className="cursor-pointer border-t hover:bg-navy-50" onClick={() => navigate(`/accreditation/${fw.code}/${r.id}`)}>
                <td className="px-4 py-3">{r.indicatorCode} · {r.title}</td>
                <td className="px-4 py-3">{r.dataOwnerName ?? '—'}</td>
                <td className="px-4 py-3">{departmentName(r.responsibleDepartmentId)}</td>
                <td className="px-4 py-3">{r.requirementType}</td>
                <td className="px-4 py-3"><Badge tone={statusTone(r.status)}>{r.status.replace(/_/g, ' ')}</Badge></td>
                <td className="px-4 py-3">{formatDateTime(r.lastUpdatedAt)}</td>
                <td className="px-4 py-3">{r.verifiedBy ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

export function RequirementDetailPage() {
  const { code = 'NAAC', id } = useParams()
  const navigate = useNavigate()
  const user = usePortalStore((s) => s.currentUser)!
  const requirement = usePortalStore((s) => s.requirements.find((r) => r.id === id))
  const updateRequirement = usePortalStore((s) => s.updateRequirement)
  const documents = usePortalStore((s) => s.documents.filter((d) => d.linkedRequirementIds.includes(id ?? '')))
  const tasks = usePortalStore((s) => s.tasks.filter((t) => t.requirementId === id))
  const audit = usePortalStore((s) => s.auditLogs.filter((a) => a.entityId === id))

  if (!requirement) return <div><PageHeader title="Requirement not found" /><Button onClick={() => navigate(`/accreditation/${code}`)}>Back</Button></div>

  return (
    <div>
      <PageHeader title={requirement.title} subtitle={`${code} · ${requirement.indicatorCode}`} actions={<Button variant="secondary" onClick={() => navigate(`/accreditation/${code}`)}>Back</Button>} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 text-sm lg:col-span-2 space-y-3">
          <p><span className="text-navy-400">Status:</span> <Badge tone={statusTone(requirement.status)}>{requirement.status.replace(/_/g, ' ')}</Badge></p>
          <p><span className="text-navy-400">Responsible department:</span> {departmentName(requirement.responsibleDepartmentId)}</p>
          <p><span className="text-navy-400">Data owner:</span> {requirement.dataOwnerName ?? '—'}</p>
          <p><span className="text-navy-400">Due date:</span> {requirement.dueDate ?? '—'}</p>
          <div className="rounded-lg bg-navy-50 p-3">
            <p className="font-medium">Computed value: {requirement.computedValue ?? '—'}</p>
            <p className="mt-1 text-xs text-navy-500">Source: {requirement.sourceTable ?? 'manual / document'}</p>
            <p className="text-xs text-navy-500">Filters: {Object.entries(requirement.filters).map(([k, v]) => `${k}=${v}`).join(', ') || '—'}</p>
            <p className="text-xs text-navy-500">Calculation: {requirement.formula ?? '—'}</p>
            <p className="text-xs text-navy-500">Last updated: {formatDateTime(requirement.lastUpdatedAt)}</p>
            <p className="text-xs text-navy-500">Verified by: {requirement.verifiedBy ?? 'Not yet verified'}</p>
          </div>
          {requirement.comments ? <p className="text-amber-800">Comments: {requirement.comments}</p> : null}
          {(canWriteData(user.role) || canVerify(user.role)) && (
            <div className="flex flex-wrap gap-2">
              <Select value={requirement.status} onChange={(e) => updateRequirement(requirement.id, { status: e.target.value as RequirementStatus })}>
                {['not_started', 'data_collection', 'submitted', 'under_review', 'verified', 'approved', 'rejected', 'needs_revision'].map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </Select>
              {canVerify(user.role) ? (
                <Button onClick={() => updateRequirement(requirement.id, { status: 'verified', verifiedBy: user.fullName, verifiedAt: new Date().toISOString(), progress: 100 })}>
                  Mark verified
                </Button>
              ) : null}
            </div>
          )}
        </Card>
        <Card className="p-5 text-sm">
          <h3 className="font-medium">Linked evidence</h3>
          <ul className="mt-2 space-y-2">
            {documents.map((d) => <li key={d.id}><Link className="underline" to={`/documents/${d.id}`}>{d.title}</Link></li>)}
            {!documents.length ? <li className="text-navy-400">No documents linked yet.</li> : null}
          </ul>
          <h3 className="mt-6 font-medium">Tasks</h3>
          <ul className="mt-2 space-y-2">
            {tasks.map((t) => <li key={t.id}>{t.title} · {t.assignedTo} · {t.status.replace('_', ' ')}</li>)}
            {!tasks.length ? <li className="text-navy-400">No tasks.</li> : null}
          </ul>
        </Card>
      </div>
      <Card className="mt-4 p-5 text-sm">
        <h3 className="mb-3 font-medium">Activity timeline</h3>
        <ul className="space-y-3">
          {audit.length ? audit.map((a) => (
            <li key={a.id}><span className="text-navy-400">{formatDateTime(a.createdAt)}</span> — {a.actorName} {a.action.toLowerCase()}</li>
          )) : (
            <>
              <li>27 Sept — HOD uploaded document</li>
              <li>26 Sept — IQAC requested revision</li>
              <li>25 Sept — Faculty data submitted</li>
              <li>20 Sept — Task created</li>
            </>
          )}
        </ul>
      </Card>
    </div>
  )
}
