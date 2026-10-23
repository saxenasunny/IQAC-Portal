import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { StudentsPage } from '@/pages/StudentsPage'
import { StudentProfilePage } from '@/pages/StudentProfilePage'
import { ImportPage } from '@/pages/ImportPage'
import {
  DataHistoryPage,
  DataQualityPage,
  DataValidationPage,
} from '@/pages/DataPages'
import { StudentReportsPage } from '@/pages/ReportsPages'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          {/* Main Student Hub */}
          <Route path="/" element={<DashboardPage />} />
          <Route path="/students" element={<StudentsPage />} />
          <Route path="/students/:id" element={<StudentProfilePage />} />

          {/* Student Data Management & Mapping */}
          <Route path="/data/import" element={<ImportPage />} />
          <Route path="/data/validation" element={<DataValidationPage />} />
          <Route path="/data/quality" element={<DataQualityPage />} />
          <Route path="/data/history" element={<DataHistoryPage />} />

          {/* Student Reports */}
          <Route path="/reports/students" element={<StudentReportsPage />} />
        </Route>
      </Route>
      {/* Catch-all redirect to student dashboard */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
