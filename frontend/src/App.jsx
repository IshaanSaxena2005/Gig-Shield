import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import ErrorBoundary        from './components/ErrorBoundary'
import ProtectedRoute, { AdminRoute } from './components/ProtectedRoute'
import Home                 from './pages/Home'
import Login                from './pages/Login'
import Register             from './pages/Register'
import WorkerDashboard      from './pages/WorkerDashboard'
import PolicyPage           from './pages/PolicyPage'
import ClaimSubmitPage      from './pages/ClaimSubmitPage'
import AdminDashboard       from './pages/AdminDashboard'
import JobMonitor           from './components/admin/JobMonitor'
import ForgotPassword       from './pages/ForgotPassword'
import ResetPassword        from './pages/ResetPassword'
import ProfilePage          from './pages/ProfilePage'
import NotFound             from './pages/NotFound'
import './styles/dashboard.css'

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          {/* Public */}
          <Route path="/"                element={<Home />} />
          <Route path="/login"           element={<Login />} />
          <Route path="/register"        element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password"  element={<ResetPassword />} />

          {/* Protected — worker */}
          <Route path="/dashboard"     element={<ProtectedRoute><WorkerDashboard /></ProtectedRoute>} />
          <Route path="/policy"        element={<ProtectedRoute><PolicyPage /></ProtectedRoute>} />
          <Route path="/claims/submit" element={<ProtectedRoute><ClaimSubmitPage /></ProtectedRoute>} />
          <Route path="/profile"       element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

          {/* Protected — admin only */}
          <Route path="/admin"      element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/jobs" element={<AdminRoute><JobMonitor /></AdminRoute>} />

          {/* 404 catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  )
}

export default App
