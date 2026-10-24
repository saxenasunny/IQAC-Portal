import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  academicYears,
  batches,
  campuses,
  departments,
  frameworkCategories,
  frameworkVersions,
  frameworks,
  institution,
  programmes,
  schools,
  sections,
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
} from '@/types'
import { isSupabaseConfigured } from '@/lib/supabase'
import { uid } from '@/lib/utils'
import { evaluateRequirementFormula } from '@/lib/formulas'

interface PortalState {
  currentUser: Profile | null
  students: Student[]
  faculty: Faculty[]
  documents: DocumentRecord[]
  requirements: FrameworkRequirement[]
  tasks: FrameworkTask[]
  auditLogs: AuditLog[]
  notifications: NotificationItem[]
  imports: ImportJob[]
  isLoadingData: boolean
  dataSyncError: string | null
  setIsLoadingData: (loading: boolean) => void
  setDataSyncError: (error: string | null) => void
  setAuthenticatedUser: (user: Profile | null) => void
  setStudents: (students: Student[]) => void
  setFaculty: (faculty: Faculty[]) => void
  logout: () => void
  upsertStudent: (student: Student, reason?: string) => void
  archiveStudent: (id: string) => void
  upsertFaculty: (row: Faculty, reason?: string) => void
  addDocument: (doc: DocumentRecord) => void
  addDocumentVersion: (id: string, version: DocumentRecord['versions'][number]) => void
  linkDocument: (docId: string, requirementId: string) => void
  updateRequirement: (id: string, patch: Partial<FrameworkRequirement>) => void
  addTask: (task: FrameworkTask) => void
  addImport: (job: ImportJob) => void
  mergeImportedStudents: (rows: Student[]) => void
  mergeImportedFaculty: (rows: Faculty[]) => void
  setImportStatus: (jobId: string, status: ImportJob['status']) => void
  commitImportStudents: (rows: Student[], jobId: string) => void
  commitImportFaculty: (rows: Faculty[], jobId: string) => void
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
      students: [],
      faculty: [],
      documents: [],
      requirements: [],
      tasks: [],
      auditLogs: [],
      notifications: [],
      imports: [],
      isLoadingData: false,
      dataSyncError: null,
      setIsLoadingData: (isLoadingData) => set({ isLoadingData }),
      setDataSyncError: (dataSyncError) => set({ dataSyncError }),
      setAuthenticatedUser: (user) => set({ currentUser: user }),
      setStudents: (students) => {
        set({ students })
        get().refreshComputed()
      },
      setFaculty: (faculty) => {
        set({ faculty })
        get().refreshComputed()
      },
      logout: () => {
        const user = get().currentUser
        if (user) get().addAudit({ action: 'Logged out', entity: 'Session', entityId: user.id })
        set({ currentUser: null, students: [], faculty: [], dataSyncError: null, isLoadingData: false })
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
      mergeImportedStudents: (rows) => {
        const studentsByRegistration = new Map(
          get().students.map((student) => [student.registrationId.toLowerCase(), student]),
        )
        rows.forEach((row) => {
          const key = row.registrationId.toLowerCase()
          const existing = studentsByRegistration.get(key)
          studentsByRegistration.set(key, existing ? { ...existing, ...row, id: existing.id } : row)
        })
        set({ students: [...studentsByRegistration.values()] })
        get().refreshComputed()
      },
      mergeImportedFaculty: (rows) => {
        const facultyByEmployeeId = new Map(
          get().faculty.map((member) => [member.employeeId.toLowerCase(), member]),
        )
        rows.forEach((row) => {
          const key = row.employeeId.toLowerCase()
          const existing = facultyByEmployeeId.get(key)
          facultyByEmployeeId.set(key, existing ? { ...existing, ...row, id: existing.id } : row)
        })
        set({ faculty: [...facultyByEmployeeId.values()] })
        get().refreshComputed()
      },
      setImportStatus: (jobId, status) => {
        set({
          imports: get().imports.map((job) => job.id === jobId ? { ...job, status } : job),
        })
      },
      commitImportStudents: (rows, jobId) => {
        const nextMap = new Map<string, Student>()
        get().students.forEach((s) => nextMap.set(s.registrationId.toLowerCase(), s))
        let created = 0
        let updated = 0
        for (const row of rows) {
          const key = row.registrationId.toLowerCase()
          const existing = nextMap.get(key)
          if (existing) {
            nextMap.set(key, { ...existing, ...row, id: existing.id, updatedAt: new Date().toISOString() })
            updated += 1
          } else {
            nextMap.set(key, row)
            created += 1
          }
        }
        const next = [...nextMap.values()]
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
      commitImportFaculty: (rows, jobId) => {
        const existingByEmployeeId = new Map(
          get().faculty.map((member) => [member.employeeId.toLowerCase(), member]),
        )
        const next = [...get().faculty]
        let created = 0
        let updated = 0
        for (const row of rows) {
          const existing = existingByEmployeeId.get(row.employeeId.toLowerCase())
          if (existing) {
            const index = next.findIndex((member) => member.id === existing.id)
            next[index] = { ...existing, ...row, id: existing.id, updatedAt: new Date().toISOString() }
            updated += 1
          } else {
            next.unshift(row)
            created += 1
          }
        }
        set({
          faculty: next,
          imports: get().imports.map((job) =>
            job.id === jobId
              ? { ...job, status: 'committed', newCount: created, updatedCount: updated, validRows: rows.length }
              : job,
          ),
        })
        get().addAudit({ action: 'Committed faculty import', entity: 'Import', entityId: jobId, newValue: `${created} new, ${updated} updated` })
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
    {
      name: 'iqac-portal-v1',
      version: 2,
      partialize: (state) => ({
        ...state,
        isLoadingData: false,
        dataSyncError: null,
        students: isSupabaseConfigured ? [] : state.students,
      }),
      migrate: (persistedState) => {
        const persisted = persistedState as Partial<PortalState> & { users?: unknown }
        const { users: _legacyUsers, ...state } = persisted
        return {
          ...state,
          currentUser: state.currentUser?.id.startsWith('usr_') ? null : state.currentUser ?? null,
          students: (isSupabaseConfigured ? [] : state.students ?? []).filter((student) => !/^stu_\d+$/.test(student.id)),
          faculty: (state.faculty ?? []).filter((member) => !/^fac_\d+$/.test(member.id)),
          documents: (state.documents ?? []).filter((document) =>
            !['doc_ar', 'doc_ssr', 'doc_phd', 'doc_infra', 'doc_pol', 'doc_green', 'doc_nba', 'doc_int'].includes(document.id),
          ),
          requirements: (state.requirements ?? []).filter((requirement) =>
            ![
              'req_n_stu', 'req_n_sfr', 'req_n_phd', 'req_n_pub', 'req_n_infra', 'req_n_ss',
              'req_n_gov', 'req_ir_enr', 'req_ir_fac', 'req_ir_int', 'req_nba_peo',
              'req_qs_sfr', 'req_the_teach', 'req_sus_sdg',
            ].includes(requirement.id),
          ),
          tasks: (state.tasks ?? []).filter((task) => !/^task_\d+$/.test(task.id)),
          auditLogs: (state.auditLogs ?? []).filter((log) => !/^aud_\d+$/.test(log.id)),
          notifications: (state.notifications ?? []).filter((notification) => !/^nt_\d+$/.test(notification.id)),
        }
      },
    },
  ),
)

export const catalog = {
  institution,
  campuses,
  schools: [...schools].sort((a, b) => a.name.localeCompare(b.name)),
  departments: [...departments].sort((a, b) => a.name.localeCompare(b.name)),
  programmes: [...programmes].sort((a, b) => a.name.localeCompare(b.name)),
  academicYears,
  batches: [...batches].sort((a, b) => a.label.localeCompare(b.label)),
  sections,
  frameworks,
  frameworkVersions,
  frameworkCategories,
}
