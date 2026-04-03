import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import ErrorBoundary   from './components/ErrorBoundary'
import ProtectedRoute  from './components/ProtectedRoute'
import Home            from './pages/Home'
import Login           from './pages/Login'
import Register        from './pages/Register'
import WorkerDashboard from './pages/WorkerDashboard'
import PolicyPage      from './pages/PolicyPage'
import SubmitClaim     from './pages/SubmitClaim'
import AdminDashboard  from './pages/AdminDashboard'
import ForgotPassword  from './pages/ForgotPassword'
import ResetPassword   from './pages/ResetPassword'
import ProfilePage     from './pages/ProfilePage'
import NotFound        from './pages/NotFound'
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
          <Route path="/claims/submit" element={<ProtectedRoute><SubmitClaim /></ProtectedRoute>} />
          <Route path="/profile"       element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

          {/* Protected — admin */}
          <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />

          {/* 404 catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  )
}

export default App
