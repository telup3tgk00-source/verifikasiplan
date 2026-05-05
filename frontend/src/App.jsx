import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import LoginPage from './pages/LoginPage'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import UploadPage from './pages/UploadPage'
import VerifikasiPage from './pages/VerifikasiPage'
import AssignmentPage from './pages/AssignmentPage'
import ProgressPage from './pages/ProgressPage'
import ExportPage from './pages/ExportPage'
import UsersPage from './pages/UsersPage'

function ProtectedRoute({ children, allowedRoles }) {
  const { token, role } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(role)) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="upload" element={<UploadPage />} />
          <Route path="verifikasi" element={<VerifikasiPage />} />
          <Route path="assignment" element={<AssignmentPage />} />
          <Route path="progress" element={<ProgressPage />} />
          <Route path="export" element={<ExportPage />} />
          <Route path="users" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <UsersPage />
            </ProtectedRoute>
          } />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}