import React, { useEffect, useState } from 'react'
import api from '../services/api'

const AdminDashboard = () => {
  const [stats, setStats] = useState({})

  useEffect(() => {
    const fetchStats = async () => {
      const data = await api.getAdminStats()
      setStats(data)
    }
    fetchStats()
  }, [])

  return (
    <div className="dashboard">
      <h2>Admin Dashboard</h2>
      <div className="card">
        <h3>Statistics</h3>
        <p>Total Policies: {stats.policies}</p>
        <p>Total Claims: {stats.claims}</p>
        <p>Total Revenue: ${stats.revenue}</p>
      </div>
    </div>
  )
}

export default AdminDashboard