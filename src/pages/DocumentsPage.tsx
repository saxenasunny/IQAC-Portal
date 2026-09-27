import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Badge, Button, Card, EmptyState, Input, Modal, PageHeader, Select, statusTone } from '@/components/ui'
import { canWriteData } from '@/lib/access'
import { departmentName, yearLabel } from '@/lib/lookups'
import { formatDate, uid } from '@/lib/utils'
import { catalog, usePortalStore } from '@/store/portalStore'
import type { DocumentRecord } from '@/types'

export function DocumentsPage({ mode = 'all' }: { mode?: 'all' | 'evidence' | 'pending' | 'expiring' }) {
  const navigate = useNavigate()
  const user = usePortalStore((s) => s.currentUser)!
  const documents = usePortalStore((s) => s.documents)
  const addDocument = usePortalStore((s) => s.addDocument)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const today = new Date()

  const filtered = useMemo(() => {
    return documents.filter((d) => {
      if (mode === 'pending' && !['draft', 'submitted'].includes(d.status)) return false
      if (mode === 'expiring') {
        if (!d.expiryDate) return false
        const exp = new Date(d.expiryDate)
        const days = (exp.getTime() - today.getTime()) / 86400000
        if (days > 60) return false
      }
      return !q || d.title.toLowerCase().includes(q.toLowerCase()) || d.documentType.toLowerCase().includes(q.toLowerCase())
    })
  }, [documents, mode, q, today])

  const title = mode === 'pending' ? 'Pending Documents' : mode === 'expiring' ? 'Expiring Documents' : mode === 'evidence' ? 'Evidence Repository' : 'Documents'

  return (
    <div>
      <PageHeader
        title={title}
        subtitle="One document, many requirements. Version history is retained."
        actions={canWriteData(user.role) ? <Button onClick={() => setOpen(true)}>Upload Document</Button> : undefined}
      />
      <Card className="mb-4 p-4">
        <Input placeholder="Search title or type" value={q} onChange={(e) => setQ(e.target.value)} />
      </Card>
      {filtered.length === 0 ? (
        <EmptyState title="No documents found" body="There are currently no documents matching your filters." action={canWriteData(user.role) ? <Button onClick={() => setOpen(true)}>Upload Document</Button> : undefined} />
      ) : (
        <Card className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-navy-950 text-left text-white">
              <tr>{['Title', 'Type', 'Department', 'Year', 'Status', 'Version', 'Expiry'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id} className="cursor-pointer border-t hover:bg-navy-50" onClick={() => navigate(`/documents/${d.id}`)}>
                  <td className="px-4 py-3 font-medium">{d.title}</td>
                  <td className="px-4 py-3">{d.documentType}</td>
                  <td className="px-4 py-3">{departmentName(d.departmentId)}</td>
                  <td className="px-4 py-3">{yearLabel(d.academicYearId)}</td>
                  <td className="px-4 py-3"><Badge tone={statusTone(d.status)}>{d.status}</Badge></td>
                  <td className="px-4 py-3">v{d.currentVersion}</td>
                  <td className="px-4 py-3">{formatDate(d.expiryDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <Modal open={open} title="Upload Document" onClose={() => setOpen(false)}>
        <UploadForm
          onSave={(doc) => {
            addDocument(doc)
            setOpen(false)
            toast.success('Document uploaded')
            navigate(`/documents/${doc.id}`)
          }}
          onCancel={() => setOpen(false)}
        />
      </Modal>
    </div>
  )
}

function UploadForm({ onSave, onCancel }: { onSave: (d: DocumentRecord) => void; onCancel: () => void }) {
  const user = usePortalStore((s) => s.currentUser)!
  const [title, setTitle] = useState('')
  const [type, setType] = useState('Policy')
  const [fileName, setFileName] = useState('')
  return (
    <div className="space-y-3">
      <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Select value={type} onChange={(e) => setType(e.target.value)}>
        {['Policy', 'Annual Report', 'SSR', 'Certificate', 'Photograph', 'Register', 'SAR', 'Audit Report'].map((t) => <option key={t}>{t}</option>)}
      </Select>
      <input type="file" onChange={(e) => setFileName(e.target.files?.[0]?.name ?? '')} />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button disabled={!title} onClick={() => onSave({
          id: uid('doc'),
          title,
          documentType: type,
          ownerName: user.fullName,
          academicYearId: 'ay_2526',
          documentDate: new Date().toISOString().slice(0, 10),
          status: 'submitted',
          description: '',
          tags: [],
          currentVersion: 1,
          versions: [{ version: 1, fileName: fileName || `${title}.pdf`, uploadedBy: user.fullName, uploadedAt: new Date().toISOString(), sizeKb: 120 }],
          linkedRequirementIds: [],
          createdAt: new Date().toISOString(),
        })}>Upload</Button>
      </div>
    </div>
  )
}

export function DocumentDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const user = usePortalStore((s) => s.currentUser)!
  const doc = usePortalStore((s) => s.documents.find((d) => d.id === id))
  const requirements = usePortalStore((s) => s.requirements)
  const addDocumentVersion = usePortalStore((s) => s.addDocumentVersion)
  const linkDocument = usePortalStore((s) => s.linkDocument)
  const [reqId, setReqId] = useState(requirements[0]?.id ?? '')
  if (!doc) return <div><PageHeader title="Document not found" /><Button onClick={() => navigate('/documents')}>Back</Button></div>

  return (
    <div>
      <PageHeader title={doc.title} subtitle={`${doc.documentType} · owned by ${doc.ownerName}`} actions={<Button variant="secondary" onClick={() => navigate('/documents')}>Back</Button>} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 text-sm lg:col-span-2">
          <p>{doc.description || 'No description provided.'}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge tone={statusTone(doc.status)}>{doc.status}</Badge>
            {doc.tags.map((t) => <Badge key={t}>{t}</Badge>)}
          </div>
          <h3 className="mt-6 font-medium">Versions</h3>
          <ul className="mt-2 space-y-2">
            {doc.versions.map((v) => (
              <li key={v.version} className="rounded-lg border border-navy-100 p-3">
                v{v.version} · {v.fileName} · {v.uploadedBy} · {formatDate(v.uploadedAt)}
                {v.changeReason ? <span className="block text-navy-400">Reason: {v.changeReason}</span> : null}
              </li>
            ))}
          </ul>
          {canWriteData(user.role) ? (
            <Button className="mt-4" size="sm" onClick={() => addDocumentVersion(doc.id, { version: doc.currentVersion + 1, fileName: `${doc.title}-v${doc.currentVersion + 1}.pdf`, uploadedBy: user.fullName, uploadedAt: new Date().toISOString(), changeReason: 'Replacement upload', sizeKb: 200 })}>
              Add replacement version
            </Button>
          ) : null}
        </Card>
        <Card className="p-5 text-sm">
          <h3 className="font-medium">Linked requirements</h3>
          <ul className="mt-2 space-y-2">
            {doc.linkedRequirementIds.map((rid) => {
              const r = requirements.find((x) => x.id === rid)
              return <li key={rid}><Link className="underline" to={`/accreditation/NAAC/${rid}`}>{r?.title ?? rid}</Link></li>
            })}
          </ul>
          <Select className="mt-4" value={reqId} onChange={(e) => setReqId(e.target.value)}>
            {requirements.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
          </Select>
          <Button className="mt-2 w-full" variant="outline" onClick={() => { linkDocument(doc.id, reqId); toast.success('Linked without duplicating the file') }}>Link requirement</Button>
        </Card>
      </div>
    </div>
  )
}

export function DocumentsRoute() {
  const location = useLocation()
  if (location.pathname.endsWith('/pending')) return <DocumentsPage mode="pending" />
  if (location.pathname.endsWith('/expiring')) return <DocumentsPage mode="expiring" />
  if (location.pathname.endsWith('/evidence')) return <DocumentsPage mode="evidence" />
  return <DocumentsPage />
}
