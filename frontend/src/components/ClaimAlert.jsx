import React from 'react'

const ClaimAlert = ({ claim }) => {
  return (
    <div className="card alert">
      <h4>Claim Alert</h4>
      <p>Worker: {claim.workerName}</p>
      <p>Amount: ${claim.amount}</p>
      <p>Status: {claim.status}</p>
      <button className="btn">Process Claim</button>
    </div>
  )
}

export default ClaimAlert