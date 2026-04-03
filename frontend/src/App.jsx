import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import WorkerDashboard from './pages/WorkerDashboard'
import PolicyPage from './pages/PolicyPage'
import AdminDashboard from './pages/AdminDashboard'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import ProfilePage from './pages/ProfilePage'
import ProtectedRoute from './components/ProtectedRoute'
import './styles/dashboard.css'

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route
          path="/dashboard"
          element={(
            <ProtectedRoute allowedRoles={['worker', 'admin']}>
              <WorkerDashboard />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/policy"
          element={(
            <ProtectedRoute allowedRoles={['worker', 'admin']}>
              <PolicyPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin"
          element={(
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/profile"
          element={(
            <ProtectedRoute allowedRoles={['worker', 'admin']}>
              <ProfilePage />
            </ProtectedRoute>
          )}
        />
      </Routes>
    </Router>
  )
}

export default App
