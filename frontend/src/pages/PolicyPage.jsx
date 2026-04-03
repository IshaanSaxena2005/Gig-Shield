import React, { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { getPolicies, createPolicy, updatePolicyStatus } from '../services/policyService'
import '../styles/dashboard.css'

// FIX: 'Pro' not 'Premium' — matches backend PLAN_TRIGGERS & premiumCalculator
const POLICY_TYPES = [
  { value: 'Basic',    label: 'Shield Basic — ₹99/week',    cap: '₹2,500', triggers: 'Rain + AQI' },
  { value: 'Standard', label: 'Shield Standard — ₹149/week', cap: '₹3,500', triggers: 'Rain + AQI + Heat + Cyclone' },
  { value: 'Pro',      label: 'Shield Pro — ₹229/week',      cap: '₹5,000', triggers: 'All triggers + Curfew/Strike' },
]
const OCCUPATIONS = ['Zomato', 'Swiggy', 'Zepto', 'Blinkit', 'Amazon', 'Flipkart', 'Other']

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
  const [formData, setFormData]           = useState({ type: '', occupation: '', location: '' })
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
    const { type, occupation, location } = formData
    if (!type || !occupation || !location) {
      setFormError('Please fill in all fields')
      return
    }
    try {
      setFormLoading(true)
      // Coverage is determined server-side by plan type — no client input needed
      const selectedType = POLICY_TYPES.find(p => p.value === type)
      await createPolicy({ type, occupation, location, coverage: 0 /* server overrides */ })
      setSuccess(`${selectedType?.label} created! Premium auto-calculated by actuarial engine.`)
      setShowForm(false)
      setFormData({ type: '', occupation: '', location: '' })
      await fetchPolicies()
      setTimeout(() => setSuccess(''), 4000)
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create policy')
    } finally {
      setFormLoading(false)
    }
  }

  const handleStatusChange = async (policyId, newStatus) => {
    const confirmMsg = {
      cancelled: 'Cancel this policy? You will lose coverage immediately.',
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

  if (loading) return (
    <div className="dashboard-container">
      <Navbar />
      <div className="dashboard-content"><div className="loading">Loading policies...</div></div>
    </div>
  )

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
              <p style={{ fontSize: 13, color: '#666', marginBottom: '1rem' }}>
                Premium is calculated automatically by our actuarial engine based on your city and plan.
              </p>
              {formError && <div className="error-message">{formError}</div>}
              <form onSubmit={handleCreatePolicy} className="auth-form">
                <div className="info-grid">
                  <div className="form-group">
                    <label>Plan Type</label>
                    <select name="type" value={formData.type} onChange={handleFormChange} required>
                      <option value="">Select plan</option>
                      {POLICY_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                    {formData.type && (
                      <small style={{ color: '#666', marginTop: 4, display: 'block' }}>
                        Triggers: {POLICY_TYPES.find(p => p.value === formData.type)?.triggers} ·
                        Coverage cap: {POLICY_TYPES.find(p => p.value === formData.type)?.cap}
                      </small>
                    )}
                  </div>
                  <div className="form-group">
                    <label>Delivery Platform</label>
                    <select name="occupation" value={formData.occupation} onChange={handleFormChange} required>
                      <option value="">Select platform</option>
                      {OCCUPATIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Work City</label>
                    <input type="text" name="location" value={formData.location}
                      onChange={handleFormChange} placeholder="e.g. Chennai, Mumbai, Delhi" required />
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
                    <span className="policy-value">₹{Number(policy.premium).toFixed(0)}</span>
                  </div>
                  <div className="policy-row">
                    <span className="policy-label">Coverage Cap:</span>
                    <span className="policy-value">₹{Number(policy.coverage).toFixed(0)}</span>
                  </div>
                  <div className="policy-row">
                    <span className="policy-label">Start Date:</span>
                    <span className="policy-value">{new Date(policy.startDate || policy.createdAt).toDateString()}</span>
                  </div>
                  <div className="policy-row">
                    <span className="policy-label">Renewal / Expiry:</span>
                    <span className="policy-value">{new Date(policy.endDate).toDateString()}</span>
                  </div>
                </div>
                <div className="policy-actions" style={{ marginTop: '1.5rem' }}>
                  {policy.status === 'paused' && (
                    <button className="action-btn activate" disabled={actionLoading === policy.id}
                      onClick={() => handleStatusChange(policy.id, 'active')}>
                      {actionLoading === policy.id ? 'Updating...' : '▶ Reactivate'}
                    </button>
                  )}
                  {policy.status === 'active' && (
                    <button className="action-btn pause" disabled={actionLoading === policy.id}
                      onClick={() => handleStatusChange(policy.id, 'paused')}>
                      {actionLoading === policy.id ? 'Updating...' : '⏸ Pause Policy'}
                    </button>
                  )}
                  {(policy.status === 'active' || policy.status === 'paused') && (
                    <button className="action-btn cancel" disabled={actionLoading === policy.id}
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

        {/* What's Covered / Excluded */}
        <section className="dashboard-section">
          <div className="info-card">
            <h3>What's Covered</h3>
            <ul className="coverage-list">
              <li>✓ Loss of income from heavy rain (≥50mm/3hr)</li>
              <li>✓ Loss of income from extreme heat (≥42°C)</li>
              <li>✓ Loss of income from severe AQI (≥200)</li>
              <li>✓ Loss of income from cyclone / state red alert</li>
              <li>✓ Loss of income from curfew / local strike (Pro only)</li>
            </ul>
            <h3 style={{ marginTop: '1rem', color: '#e74c3c' }}>Strictly Excluded</h3>
            <ul className="coverage-list" style={{ color: '#e74c3c' }}>
              <li>✗ Health, medical or hospitalisation expenses</li>
              <li>✗ Vehicle damage, repair or fuel costs</li>
              <li>✗ Accidents or personal injury</li>
              <li>✗ Life insurance or death benefit</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  )
}

export default PolicyPage
