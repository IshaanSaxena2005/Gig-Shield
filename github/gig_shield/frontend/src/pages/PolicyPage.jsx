import React, { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { getPolicies, createPolicy, updatePolicyStatus } from '../services/policyService'
import '../styles/dashboard.css'

const POLICY_TYPES = ['Basic', 'Standard', 'Premium']
const OCCUPATIONS = ['Zomato', 'Swiggy', 'Zepto', 'Amazon', 'Flipkart', 'Other']

const statusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'active':    return '#27ae60'
    case 'paused':    return '#f39c12'
    case 'cancelled': return '#e74c3c'
    case 'expired':   return '#95a5a6'
    default:          return '#95a5a6'
  }
}

const PolicyPage = () => {
  const [policies, setPolicies]           = useState([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState('')
  const [success, setSuccess]             = useState('')
  const [showForm, setShowForm]           = useState(false)
  const [actionLoading, setActionLoading] = useState(null)
  const [formData, setFormData]           = useState({ type: '', coverage: '', occupation: '', location: '' })
  const [formLoading, setFormLoading]     = useState(false)
  const [formError, setFormError]         = useState('')

  const fetchPolicies = async () => {
    try {
      setLoading(true)
      const data = await getPolicies()
      setPolicies(data)
      if (data.length === 0) setShowForm(true)
    } catch (err) {
      setError('Failed to load policies')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPolicies() }, [])

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    setFormError('')
  }

  const handleCreatePolicy = async (e) => {
    e.preventDefault()
    const { type, coverage, occupation, location } = formData
    if (!type || !coverage || !occupation || !location) {
      setFormError('Please fill in all fields')
      return
    }
    if (isNaN(coverage) || Number(coverage) <= 0) {
      setFormError('Coverage must be a positive number')
      return
    }
    try {
      setFormLoading(true)
      await createPolicy({ type, coverage: Number(coverage), occupation, location })
      setSuccess('Policy created successfully!')
      setShowForm(false)
      setFormData({ type: '', coverage: '', occupation: '', location: '' })
      await fetchPolicies()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create policy')
    } finally {
      setFormLoading(false)
    }
  }

  const handleStatusChange = async (policyId, newStatus) => {
    const confirmMsg = {
      cancelled: 'Are you sure you want to cancel this policy? This cannot be undone.',
      paused:    'Pause this policy? You will not be covered until reactivated.',
      active:    'Reactivate this policy?'
    }
    if (!window.confirm(confirmMsg[newStatus])) return
    try {
      setActionLoading(policyId)
      await updatePolicyStatus(policyId, newStatus)
      setSuccess(`Policy ${newStatus} successfully!`)
      await fetchPolicies()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update policy')
      setTimeout(() => setError(''), 3000)
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="dashboard-container">
        <Navbar />
        <div className="dashboard-content">
          <div className="loading">Loading policies...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      <Navbar />
      <div className="dashboard-content">

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 className="page-title" style={{ margin: 0 }}>My Policies</h2>
          {!showForm && (
            <button className="submit-btn" style={{ width: 'auto', padding: '0.5rem 1.5rem' }}
              onClick={() => setShowForm(true)}>
              + New Policy
            </button>
          )}
        </div>

        {error   && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {/* Create Policy Form */}
        {showForm && (
          <section className="dashboard-section">
            <div className="policy-card">
              <h3>Create New Policy</h3>
              {formError && <div className="error-message">{formError}</div>}
              <form onSubmit={handleCreatePolicy} className="auth-form">
                <div className="info-grid">
                  <div className="form-group">
                    <label>Policy Type</label>
                    <select name="type" value={formData.type} onChange={handleFormChange} required>
                      <option value="">Select type</option>
                      {POLICY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Coverage Amount (₹)</label>
                    <input type="number" name="coverage" value={formData.coverage}
                      onChange={handleFormChange} placeholder="e.g. 5000" required />
                  </div>
                  <div className="form-group">
                    <label>Occupation / Platform</label>
                    <select name="occupation" value={formData.occupation} onChange={handleFormChange} required>
                      <option value="">Select platform</option>
                      {OCCUPATIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Work Location / City</label>
                    <input type="text" name="location" value={formData.location}
                      onChange={handleFormChange} placeholder="e.g. Mumbai" required />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button type="submit" className="submit-btn" style={{ width: 'auto', flex: 1 }} disabled={formLoading}>
                    {formLoading ? 'Creating...' : 'Create Policy'}
                  </button>
                  {policies.length > 0 && (
                    <button type="button" className="action-btn cancel" style={{ flex: 1 }}
                      onClick={() => { setShowForm(false); setFormError('') }}>
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          </section>
        )}

        {/* Existing Policies */}
        {policies.length === 0 && !showForm ? (
          <div className="info-card" style={{ textAlign: 'center', padding: '2rem' }}>
            <p>You don't have any policies yet.</p>
            <button className="submit-btn" style={{ width: 'auto', marginTop: '1rem' }}
              onClick={() => setShowForm(true)}>
              Create Your First Policy
            </button>
          </div>
        ) : (
          policies.map(policy => (
            <section key={policy.id} className="dashboard-section">
              <div className="policy-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3>{policy.type} Policy</h3>
                  <span style={{
                    background: statusColor(policy.status), color: 'white',
                    padding: '4px 14px', borderRadius: '99px', fontSize: '13px', fontWeight: '600'
                  }}>
                    {policy.status?.toUpperCase()}
                  </span>
                </div>

                <div className="policy-details">
                  <div className="policy-row">
                    <span className="policy-label">Weekly Premium:</span>
                    <span className="policy-value">₹{Number(policy.premium).toFixed(2)}</span>
                  </div>
                  <div className="policy-row">
                    <span className="policy-label">Coverage Amount:</span>
                    <span className="policy-value">₹{Number(policy.coverage).toFixed(2)}</span>
                  </div>
                  <div className="policy-row">
                    <span className="policy-label">Start Date:</span>
                    <span className="policy-value">{new Date(policy.startDate || policy.createdAt).toDateString()}</span>
                  </div>
                  <div className="policy-row">
                    <span className="policy-label">End Date:</span>
                    <span className="policy-value">{new Date(policy.endDate).toDateString()}</span>
                  </div>
                </div>

                {/* Dynamic buttons based on current status */}
                <div className="policy-actions" style={{ marginTop: '1.5rem' }}>
                  {policy.status === 'paused' && (
                    <button className="action-btn activate"
                      disabled={actionLoading === policy.id}
                      onClick={() => handleStatusChange(policy.id, 'active')}>
                      {actionLoading === policy.id ? 'Updating...' : '▶ Reactivate'}
                    </button>
                  )}
                  {policy.status === 'active' && (
                    <button className="action-btn pause"
                      disabled={actionLoading === policy.id}
                      onClick={() => handleStatusChange(policy.id, 'paused')}>
                      {actionLoading === policy.id ? 'Updating...' : '⏸ Pause Policy'}
                    </button>
                  )}
                  {(policy.status === 'active' || policy.status === 'paused') && (
                    <button className="action-btn cancel"
                      disabled={actionLoading === policy.id}
                      onClick={() => handleStatusChange(policy.id, 'cancelled')}>
                      {actionLoading === policy.id ? 'Updating...' : '✕ Cancel Policy'}
                    </button>
                  )}
                  {(policy.status === 'cancelled' || policy.status === 'expired') && (
                    <p style={{ color: '#95a5a6', fontSize: '14px' }}>
                      This policy is {policy.status}. Create a new one above.
                    </p>
                  )}
                </div>
              </div>
            </section>
          ))
        )}

        {/* What's covered */}
        <section className="dashboard-section">
          <div className="info-card">
            <h3>What's Covered?</h3>
            <ul className="coverage-list">
              <li>✓ Loss of income due to heavy rain</li>
              <li>✓ Loss of income due to extreme heat</li>
              <li>✓ Loss of income due to floods</li>
              <li>✓ Loss of income due to pollution</li>
              <li>✓ Loss of income due to curfews</li>
            </ul>
          </div>
        </section>

      </div>
    </div>
  )
}

export default PolicyPage