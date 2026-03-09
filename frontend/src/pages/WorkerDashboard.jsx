import React, { useEffect, useState } from 'react'
import WorkerCard from '../components/WorkerCard'
import ClaimAlert from '../components/ClaimAlert'
import api from '../services/api'

const WorkerDashboard = () => {
  const [policies, setPolicies] = useState([])
  const [claims, setClaims] = useState([])

  useEffect(() => {
    const fetchData = async () => {
      const policiesData = await api.getPolicies()
      const claimsData = await api.getClaims()
      setPolicies(policiesData)
      setClaims(claimsData)
    }
    fetchData()
  }, [])

  return (
    <div className="dashboard">
      <h2>Worker Dashboard</h2>
      <div>
        <h3>Your Policies</h3>
        {policies.map(policy => (
          <WorkerCard key={policy.id} worker={policy} />
        ))}
      </div>
      <div>
        <h3>Recent Claims</h3>
        {claims.map(claim => (
          <ClaimAlert key={claim.id} claim={claim} />
        ))}
      </div>
    </div>
  )
}

export default WorkerDashboard