import React from 'react'

const WorkerCard = ({ worker }) => {
  return (
    <div className="card">
      <h3>{worker.name}</h3>
      <p>Occupation: {worker.occupation}</p>
      <p>Location: {worker.location}</p>
      <p>Premium: ${worker.premium}</p>
      <button className="btn">View Details</button>
    </div>
  )
}

export default WorkerCard