import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  academicYears,
  auditLogs as seedAudit,
  batches,
  campuses,
  departments,
  documents as seedDocs,
  faculty as seedFaculty,
  frameworkCategories,
  frameworkRequirements as seedReqs,
  frameworkTasks as seedTasks,
  frameworkVersions,
  frameworks,
  institution,
  notifications as seedNotes,
  programmes,
  schools,
  sections,
  students as seedStudents,
  demoUsers,
} from '@/data/seed'
import type {
  AuditLog,
  DocumentRecord,
  Faculty,
  FrameworkRequirement,
  FrameworkTask,
  ImportJob,
  NotificationItem,
  Profile,
  Student,
  UserRole,
} from '@/types'
import { uid } from '@/lib/utils'
import { evaluateRequirementFormula } from '@/lib/formulas'

interface PortalState {
  currentUser: (Profile & { password?: string }) | null
  users: Array<Profile & { password: string }>
  students: Student[]
  faculty: Faculty[]
  documents: DocumentRecord[]
  requirements: FrameworkRequirement[]
  tasks: FrameworkTask[]
  auditLogs: AuditLog[]
  notifications: NotificationItem[]
  imports: ImportJob[]
  login: (email: string, password: string) => string | null
  logout: () => void
  switchRole: (role: UserRole) => void
  upsertStudent: (student: Student, reason?: string) => void
  archiveStudent: (id: string) => void
  upsertFaculty: (row: Faculty, reason?: string) => void
  addDocument: (doc: DocumentRecord) => void
  addDocumentVersion: (id: string, version: DocumentRecord['versions'][number]) => void
  linkDocument: (docId: string, requirementId: string) => void
  updateRequirement: (id: string, patch: Partial<FrameworkRequirement>) => void
  addTask: (task: FrameworkTask) => void
  addImport: (job: ImportJob) => void
  commitImportStudents: (rows: Student[], jobId: string) => void
  markNotificationRead: (id: string) => void
  addAudit: (log: Omit<AuditLog, 'id' | 'createdAt' | 'actorName' | 'actorRole' | 'ipAddress'> & Partial<Pick<AuditLog, 'actorName' | 'ipAddress'>>) => void
  refreshComputed: () => void
}

function logBase(user: PortalState['currentUser']): Pick<AuditLog, 'actorName' | 'actorRole' | 'ipAddress' | 'createdAt'> {
  return {
    actorName: user?.fullName ?? 'System',
    actorRole: user?.role ?? 'iqac_viewer',
    ipAddress: '10.12.4.22',
    createdAt: new Date().toISOString(),
  }
}

export const usePortalStore = create<PortalState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      users: demoUsers,
      students: seedStudents,
      faculty: seedFaculty,
      documents: seedDocs,
      requirements: seedReqs.map((r) => ({
        ...r,
        computedValue: evaluateRequirementFormula(r.formula, seedStudents, seedFaculty) ?? r.computedValue,
      })),
      tasks: seedTasks,
      auditLogs: seedAudit,
      notifications: seedNotes,
      imports: [],
      login: (email, password) => {
        const user = get().users.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password && u.isActive)
        if (!user) return 'Invalid email or password.'
        set({ currentUser: user })
        get().addAudit({ action: 'Logged in', entity: 'Session', entityId: user.id })
        return null
      },
      logout: () => {
        const user = get().currentUser
        if (user) get().addAudit({ action: 'Logged out', entity: 'Session', entityId: user.id })
        set({ currentUser: null })
      },
      switchRole: (role) => {
        const current = get().currentUser
        if (!current) return
        const match = get().users.find((u) => u.role === role)
        if (match) set({ currentUser: match })
      },
      upsertStudent: (student, reason) => {
        const existing = get().students.find((s) => s.id === student.id)
        set({
          students: existing
            ? get().students.map((s) => (s.id === student.id ? { ...student, updatedAt: new Date().toISOString() } : s))
            : [student, ...get().students],
        })
        get().addAudit({
          action: existing ? 'Updated student record' : 'Created student record',
          entity: 'Student',
          entityId: student.registrationId,
          oldValue: existing ? existing.fullName : undefined,
          newValue: student.fullName,
          reason,
        })
        get().refreshComputed()
      },
      archiveStudent: (id) => {
        const student = get().students.find((s) => s.id === id)
        set({
          students: get().students.map((s) => (s.id === id ? { ...s, isArchived: true, studentStatus: 'inactive', updatedAt: new Date().toISOString() } : s)),
        })
        if (student) {
          get().addAudit({ action: 'Archived student', entity: 'Student', entityId: student.registrationId })
        }
      },
      upsertFaculty: (row, reason) => {
        const existing = get().faculty.find((s) => s.id === row.id)
        set({
          faculty: existing
            ? get().faculty.map((s) => (s.id === row.id ? { ...row, updatedAt: new Date().toISOString() } : s))
            : [row, ...get().faculty],
        })
        get().addAudit({
          action: existing ? 'Updated faculty record' : 'Created faculty record',
          entity: 'Faculty',
          entityId: row.employeeId,
          reason,
        })
        get().refreshComputed()
      },
      addDocument: (doc) => {
        set({ documents: [doc, ...get().documents] })
        get().addAudit({ action: 'Uploaded document', entity: 'Document', entityId: doc.id, newValue: doc.title })
      },
      addDocumentVersion: (id, version) => {
        set({
          documents: get().documents.map((d) =>
            d.id === id
              ? { ...d, currentVersion: version.version, versions: [...d.versions, version], status: d.status === 'expired' ? 'submitted' : d.status }
              : d,
          ),
        })
        get().addAudit({ action: 'Added document version', entity: 'Document', entityId: id, newValue: `v${version.version}` })
      },
      linkDocument: (docId, requirementId) => {
        set({
          documents: get().documents.map((d) =>
            d.id === docId && !d.linkedRequirementIds.includes(requirementId)
              ? { ...d, linkedRequirementIds: [...d.linkedRequirementIds, requirementId] }
              : d,
          ),
        })
      },
      updateRequirement: (id, patch) => {
        const existing = get().requirements.find((r) => r.id === id)
        set({
          requirements: get().requirements.map((r) => (r.id === id ? { ...r, ...patch, lastUpdatedAt: new Date().toISOString() } : r)),
        })
        if (existing) {
          get().addAudit({
            action: 'Updated requirement',
            entity: 'Requirement',
            entityId: id,
            oldValue: existing.status,
            newValue: patch.status ?? existing.status,
          })
        }
      },
      addTask: (task) => set({ tasks: [task, ...get().tasks] }),
      addImport: (job) => set({ imports: [job, ...get().imports] }),
      commitImportStudents: (rows, jobId) => {
        const existingByReg = new Map(get().students.map((s) => [s.registrationId, s]))
        let created = 0
        let updated = 0
        const next = [...get().students]
        for (const row of rows) {
          const found = existingByReg.get(row.registrationId)
          if (found) {
            const idx = next.findIndex((s) => s.id === found.id)
            next[idx] = { ...found, ...row, id: found.id, updatedAt: new Date().toISOString() }
            updated += 1
          } else {
            next.unshift(row)
            created += 1
          }
        }
        set({
          students: next,
          imports: get().imports.map((j) =>
            j.id === jobId
              ? { ...j, status: 'committed', newCount: created, updatedCount: updated, validRows: rows.length }
              : j,
          ),
        })
        get().addAudit({ action: 'Committed student import', entity: 'Import', entityId: jobId, newValue: `${created} new, ${updated} updated` })
        get().refreshComputed()
      },
      markNotificationRead: (id) =>
        set({ notifications: get().notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)) }),
      addAudit: (log) => {
        const entry: AuditLog = {
          id: uid('aud'),
          ...logBase(get().currentUser),
          ...log,
          actorName: log.actorName ?? logBase(get().currentUser).actorName,
        }
        set({ auditLogs: [entry, ...get().auditLogs] })
      },
      refreshComputed: () => {
        const { students, faculty, requirements } = get()
        set({
          requirements: requirements.map((r) => ({
            ...r,
            computedValue: evaluateRequirementFormula(r.formula, students, faculty) ?? r.computedValue,
          })),
        })
      },
    }),
    { name: 'iqac-portal-v1' },
  ),
)

export const catalog = {
  institution,
  campuses,
  schools,
  departments,
  programmes,
  academicYears,
  batches,
  sections,
  frameworks,
  frameworkVersions,
  frameworkCategories,
}
