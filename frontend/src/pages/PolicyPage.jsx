import React, { useEffect, useState } from 'react'
import api from '../services/api'

const PolicyPage = () => {
  const [policies, setPolicies] = useState([])

  useEffect(() => {
    const fetchPolicies = async () => {
      const data = await api.getPolicies()
      setPolicies(data)
    }
    fetchPolicies()
  }, [])

  return (
    <div className="dashboard">
      <h2>Policies</h2>
      {policies.map(policy => (
        <div key={policy.id} className="card">
          <h3>{policy.name}</h3>
          <p>{policy.description}</p>
          <p>Premium: ${policy.premium}</p>
        </div>
      ))}
    </div>
  )
}

export default PolicyPage