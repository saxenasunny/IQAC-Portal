import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { StaffPage, StudentsPage } from '@/pages/StudentsPage'
import { StudentProfilePage } from '@/pages/StudentProfilePage'
import { FacultyPage, FacultyProfilePage } from '@/pages/FacultyPage'
import { CampusesPage, DepartmentsPage, InstitutionProfilePage, ProgrammesPage, SchoolsPage } from '@/pages/InstitutionPages'
import { ImportPage } from '@/pages/ImportPage'
import { ConfigurationPage, DataHistoryPage, DataQualityPage, DataValidationPage, NotificationsPage } from '@/pages/DataPages'
import { AccreditationDashboardPage, RequirementDetailPage } from '@/pages/AccreditationPages'
import { DocumentDetailPage, DocumentsPage } from '@/pages/DocumentsPage'
import { AccreditationReportsPage, ExportCentrePage, FacultyReportsPage, StudentReportsPage } from '@/pages/ReportsPages'
import { AuditLogsPage, PermissionsPage, RolesPage, UsersPage } from '@/pages/AdminPages'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/institution" element={<InstitutionProfilePage />} />
          <Route path="/institution/campuses" element={<CampusesPage />} />
          <Route path="/institution/schools" element={<SchoolsPage />} />
          <Route path="/institution/departments" element={<DepartmentsPage />} />
          <Route path="/institution/programmes" element={<ProgrammesPage />} />
          <Route path="/students" element={<StudentsPage />} />
          <Route path="/students/:id" element={<StudentProfilePage />} />
          <Route path="/faculty" element={<FacultyPage />} />
          <Route path="/faculty/:id" element={<FacultyProfilePage />} />
          <Route path="/staff" element={<StaffPage />} />
          <Route path="/data/import" element={<ImportPage />} />
          <Route path="/data/validation" element={<DataValidationPage />} />
          <Route path="/data/quality" element={<DataQualityPage />} />
          <Route path="/data/history" element={<DataHistoryPage />} />
          <Route path="/accreditation/:code" element={<AccreditationDashboardPage />} />
          <Route path="/accreditation/:code/:id" element={<RequirementDetailPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/documents/evidence" element={<DocumentsPage mode="evidence" />} />
          <Route path="/documents/pending" element={<DocumentsPage mode="pending" />} />
          <Route path="/documents/expiring" element={<DocumentsPage mode="expiring" />} />
          <Route path="/documents/:id" element={<DocumentDetailPage />} />
          <Route path="/reports/students" element={<StudentReportsPage />} />
          <Route path="/reports/faculty" element={<FacultyReportsPage />} />
          <Route path="/reports/accreditation" element={<AccreditationReportsPage />} />
          <Route path="/reports/export" element={<ExportCentrePage />} />
          <Route path="/admin/users" element={<UsersPage />} />
          <Route path="/admin/roles" element={<RolesPage />} />
          <Route path="/admin/permissions" element={<PermissionsPage />} />
          <Route path="/admin/configuration" element={<ConfigurationPage />} />
          <Route path="/admin/audit" element={<AuditLogsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
