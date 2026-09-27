export type UserRole =
  | 'super_admin'
  | 'iqac_admin'
  | 'iqac_viewer'
  | 'registrar'
  | 'dean'
  | 'hod'
  | 'faculty'
  | 'data_entry'
  | 'verifier'
  | 'auditor'

export type WorkflowStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'verified'
  | 'approved'
  | 'rejected'
  | 'needs_revision'
  | 'change_requested'
  | 'revised'
  | 're_verified'

export type StudentStatus = 'active' | 'inactive' | 'graduated' | 'alumni' | 'withdrawn' | 'suspended'
export type AcademicStatus = 'regular' | 'lateral' | 're_admitted' | 'detained'
export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say'
export type EmploymentType = 'permanent' | 'contract' | 'visiting' | 'adjunct'
export type DocumentStatus = 'draft' | 'submitted' | 'verified' | 'approved' | 'expired' | 'superseded'
export type RequirementStatus =
  | 'not_started'
  | 'data_collection'
  | 'submitted'
  | 'under_review'
  | 'verified'
  | 'approved'
  | 'rejected'
  | 'needs_revision'

export interface Profile {
  id: string
  email: string
  fullName: string
  phone?: string
  role: UserRole
  schoolId?: string
  departmentId?: string
  isActive: boolean
}

export interface Institution {
  id: string
  name: string
  shortName: string
  type: string
  establishedYear: number
  naacGrade: string
  nirfRank?: number
  city: string
  state: string
  website: string
}

export interface Campus {
  id: string
  name: string
  city: string
  isMain: boolean
}

export interface School {
  id: string
  code: string
  name: string
  deanName: string
  campusId: string
}

export interface Department {
  id: string
  schoolId: string
  code: string
  name: string
  hodName: string
  establishedYear: number
}

export interface AcademicYear {
  id: string
  label: string
  startDate: string
  endDate: string
  isCurrent: boolean
}

export interface Programme {
  id: string
  departmentId: string
  code: string
  name: string
  level: string
  durationYears: number
  intake: number
  isActive: boolean
}

export interface Batch {
  id: string
  programmeId: string
  academicYearId: string
  year: number
  label: string
}

export interface Section {
  id: string
  batchId: string
  name: string
}

export interface Student {
  id: string
  registrationId: string
  applicationNumber: string
  universityRollNumber: string
  fullName: string
  email: string
  phone: string
  gender: Gender
  dateOfBirth: string
  nationality: string
  programmeId: string
  departmentId: string
  schoolId: string
  batchId: string
  sectionId?: string
  academicYearId: string
  currentYear: number
  currentTerm: string
  studentStatus: StudentStatus
  academicStatus: AcademicStatus
  admissionType: string
  workflow: WorkflowStatus
  isArchived: boolean
  personal: {
    firstName: string
    lastName: string
    religion?: string
    bloodGroup?: string
    firstGeneration: boolean
    differentlyAbled: boolean
    ews: boolean
    domicileState: string
    category: string
  }
  academic: {
    cgpa?: number
    percentage?: number
    backlogs: number
    admissionDate: string
    expectedGraduation?: string
  }
  contact: {
    personalEmail?: string
    alternatePhone?: string
    emergencyContactName?: string
    emergencyContactPhone?: string
  }
  addresses: Array<{
    type: 'permanent' | 'present' | 'communication'
    line1: string
    city: string
    state: string
    pincode: string
  }>
  family: {
    fatherName?: string
    fatherOccupation?: string
    motherName?: string
    motherOccupation?: string
    annualIncome?: number
  }
  qualifications: Array<{
    level: string
    boardUniversity: string
    yearOfPassing: number
    percentage: number
  }>
  entranceExams: Array<{
    examName: string
    score?: number
    rank?: number
    year: number
  }>
  mentor?: { name: string; email: string; phone: string }
  sensitive?: { aadhaar?: string; pan?: string; bankAccount?: string; ifsc?: string; abcId?: string }
  createdAt: string
  updatedAt: string
}

export interface Faculty {
  id: string
  employeeId: string
  fullName: string
  email: string
  phone: string
  gender: Gender
  dateOfBirth: string
  schoolId: string
  departmentId: string
  designation: string
  employmentType: EmploymentType
  joiningDate: string
  highestQualification: string
  specialization: string
  orcid?: string
  googleScholar?: string
  scopusId?: string
  teachingExperienceYears: number
  researchExperienceYears: number
  isActive: boolean
  workflow: WorkflowStatus
  qualifications: Array<{ degree: string; specialization: string; university: string; year: number }>
  publications: Array<{ title: string; journal: string; year: number; indexedIn: string }>
  projects: Array<{ title: string; fundingAgency: string; amount: number; year: number; status: string }>
  patents: Array<{ title: string; patentNumber: string; year: number; status: string }>
  createdAt: string
  updatedAt: string
}

export interface DocumentRecord {
  id: string
  title: string
  documentType: string
  departmentId?: string
  ownerName: string
  academicYearId?: string
  documentDate: string
  expiryDate?: string
  status: DocumentStatus
  description: string
  tags: string[]
  currentVersion: number
  versions: Array<{
    version: number
    fileName: string
    uploadedBy: string
    uploadedAt: string
    changeReason?: string
    sizeKb: number
  }>
  linkedRequirementIds: string[]
  createdAt: string
}

export interface Framework {
  id: string
  code: string
  name: string
  description: string
  isActive: boolean
}

export interface FrameworkVersion {
  id: string
  frameworkId: string
  versionLabel: string
  academicYearId: string
  isCurrent: boolean
}

export interface FrameworkCategory {
  id: string
  frameworkVersionId: string
  code: string
  name: string
  weight: number
  sortOrder: number
}

export interface FrameworkRequirement {
  id: string
  frameworkVersionId: string
  categoryId: string
  indicatorCode: string
  title: string
  requirementType: 'data' | 'document' | 'both'
  sourceTable?: string
  filters: Record<string, string>
  formula?: string
  responsibleDepartmentId?: string
  dataOwnerName?: string
  dueDate?: string
  status: RequirementStatus
  lastUpdatedAt?: string
  verifiedBy?: string
  verifiedAt?: string
  comments?: string
  computedValue?: string
  progress: number
}

export interface FrameworkTask {
  id: string
  requirementId: string
  title: string
  assignedTo: string
  departmentId?: string
  dueDate: string
  status: 'open' | 'in_progress' | 'done'
}

export interface AuditLog {
  id: string
  actorName: string
  actorRole: UserRole
  action: string
  entity: string
  entityId: string
  oldValue?: string
  newValue?: string
  reason?: string
  ipAddress: string
  createdAt: string
}

export interface NotificationItem {
  id: string
  title: string
  body: string
  isRead: boolean
  link?: string
  createdAt: string
}

export interface ImportJob {
  id: string
  entity: string
  fileName: string
  status: 'uploaded' | 'mapped' | 'validated' | 'previewed' | 'committed' | 'failed' | 'cancelled'
  totalRows: number
  validRows: number
  warningRows: number
  errorRows: number
  newCount: number
  updatedCount: number
  unchangedCount: number
  mapping: Record<string, string>
  uploadedBy: string
  createdAt: string
  errors: Array<{ row: number; severity: 'error' | 'warning'; field: string; message: string }>
  previewRows: Record<string, string>[]
}

export interface TimelineEvent {
  id: string
  at: string
  actor: string
  text: string
}
