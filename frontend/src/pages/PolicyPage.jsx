import React, { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { getPolicies, createPolicy, updatePolicyStatus, getPolicyQuote } from '../services/policyService'
import { payPolicyPremium } from '../services/paymentService'
import '../styles/dashboard.css'

const POLICY_TYPES = ['Basic', 'Standard', 'Premium']
const OCCUPATIONS = ['Zomato', 'Swiggy', 'Zepto', 'Amazon', 'Flipkart', 'Other']

const statusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'active': return '#27ae60'
    case 'paused': return '#f39c12'
    case 'cancelled': return '#e74c3c'
    case 'expired': return '#95a5a6'
    default: return '#95a5a6'
  }
}

const formatCurrency = (value) => `Rs${Number(value || 0).toFixed(2)}`

const PolicyPage = () => {
  const [policies, setPolicies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [actionLoading, setActionLoading] = useState(null)
  const [formData, setFormData] = useState({ type: '', coverage: '', occupation: '', location: '' })
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [quote, setQuote] = useState(null)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [paymentLoading, setPaymentLoading] = useState(null)

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

  useEffect(() => {
    const { coverage, occupation, location } = formData
    if (!coverage || !occupation || !location || Number(coverage) <= 0) {
      setQuote(null)
      return undefined
    }

    const timer = setTimeout(async () => {
      try {
        setQuoteLoading(true)
        const nextQuote = await getPolicyQuote({
          coverage: Number(coverage),
          occupation,
          location
        })
        setQuote(nextQuote)
      } catch {
        setQuote(null)
      } finally {
        setQuoteLoading(false)
      }
    }, 350)

    return () => clearTimeout(timer)
  }, [formData.coverage, formData.occupation, formData.location])

  const handleFormChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value })
    setFormError('')
  }

  const handleCreatePolicy = async (event) => {
    event.preventDefault()
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
      setQuote(null)
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
      paused: 'Pause this policy? You will not be covered until reactivated.',
      active: 'Reactivate this policy?'
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

  const handlePayment = async (policyId) => {
    try {
      setPaymentLoading(policyId)
      const result = await payPolicyPremium(policyId)
      if (result.mode === 'stripe') {
        setSuccess('Payment intent created. Connect Stripe Elements to complete live card checkout.')
      } else {
        setSuccess(result.message || 'Payment completed successfully!')
      }
      await fetchPolicies()
      setTimeout(() => setSuccess(''), 4000)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to process premium payment')
      setTimeout(() => setError(''), 4000)
    } finally {
      setPaymentLoading(null)
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
        <div className="header-row">
          <h2 className="page-title policy-page-title">My Policies</h2>
          {!showForm && (
            <button className="submit-btn compact-button" onClick={() => setShowForm(true)}>
              + New Policy
            </button>
          )}
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

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
                      {POLICY_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Coverage Amount (Rs)</label>
                    <input type="number" name="coverage" value={formData.coverage} onChange={handleFormChange} placeholder="e.g. 5000" required />
                  </div>
                  <div className="form-group">
                    <label>Occupation / Platform</label>
                    <select name="occupation" value={formData.occupation} onChange={handleFormChange} required>
                      <option value="">Select platform</option>
                      {OCCUPATIONS.map((occupation) => <option key={occupation} value={occupation}>{occupation}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Work Location / City</label>
                    <input type="text" name="location" value={formData.location} onChange={handleFormChange} placeholder="e.g. Mumbai" required />
                  </div>
                </div>

                <div className="quote-panel">
                  <div className="quote-header">
                    <div>
                      <h4>Dynamic premium preview</h4>
                      <p>Live quote updates from zone history, weather intensity, platform exposure, and selected coverage.</p>
                    </div>
                    {quoteLoading && <span className="quote-tag">Refreshing...</span>}
                  </div>

                  {quote ? (
                    <div className="quote-grid">
                      <div className="quote-metric">
                        <span className="quote-label">Weekly premium</span>
                        <strong>{formatCurrency(quote.premium)}</strong>
                      </div>
                      <div className="quote-metric">
                        <span className="quote-label">Risk level</span>
                        <strong>{quote.riskLevel}</strong>
                      </div>
                      <div className="quote-metric">
                        <span className="quote-label">Coverage window</span>
                        <strong>{quote.recommendedCoverageHours} hrs / week</strong>
                      </div>
                      <div className="quote-metric">
                        <span className="quote-label">Quote summary</span>
                        <strong>{quote.quoteSummary.headline}</strong>
                      </div>
                    </div>
                  ) : (
                    <p className="muted-copy">Fill in coverage, platform, and city to preview the live premium.</p>
                  )}

                  {quote?.eligibleTriggers?.length > 0 && (
                    <div className="trigger-chip-row">
                      {quote.eligibleTriggers.map((trigger) => (
                        <span key={trigger.type} className="trigger-chip">
                          {trigger.label} {trigger.autoPayout ? 'auto' : 'review'}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="button-row">
                  <button type="submit" className="submit-btn" disabled={formLoading}>
                    {formLoading ? 'Creating...' : 'Create Policy'}
                  </button>
                  {policies.length > 0 && (
                    <button type="button" className="action-btn cancel" onClick={() => { setShowForm(false); setFormError(''); setQuote(null) }}>
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          </section>
        )}

        {policies.length === 0 && !showForm ? (
          <div className="info-card centered-card">
            <p>You do not have any policies yet.</p>
            <button className="submit-btn compact-button top-space" onClick={() => setShowForm(true)}>
              Create Your First Policy
            </button>
          </div>
        ) : (
          policies.map((policy) => (
            <section key={policy.id} className="dashboard-section">
              <div className="policy-card">
                <div className="header-row">
                  <h3>{policy.type} Policy</h3>
                  <span style={{
                    background: statusColor(policy.status),
                    color: 'white',
                    padding: '4px 14px',
                    borderRadius: '99px',
                    fontSize: '13px',
                    fontWeight: '600'
                  }}>
                    {policy.status?.toUpperCase()}
                  </span>
                </div>

                <div className="policy-details">
                  <div className="policy-row">
                    <span className="policy-label">Weekly Premium:</span>
                    <span className="policy-value">{formatCurrency(policy.premium)}</span>
                  </div>
                  <div className="policy-row">
                    <span className="policy-label">Coverage Amount:</span>
                    <span className="policy-value">{formatCurrency(policy.coverage)}</span>
                  </div>
                  <div className="policy-row">
                    <span className="policy-label">Risk Level:</span>
                    <span className="policy-value">{policy.riskLevel || 'medium'}</span>
                  </div>
                  <div className="policy-row">
                    <span className="policy-label">Recommended Coverage Window:</span>
                    <span className="policy-value">{policy.recommendedCoverageHours || 24} hours</span>
                  </div>
                  <div className="policy-row">
                    <span className="policy-label">Start Date:</span>
                    <span className="policy-value">{new Date(policy.startDate || policy.createdAt).toDateString()}</span>
                  </div>
                  <div className="policy-row">
                    <span className="policy-label">End Date:</span>
                    <span className="policy-value">{new Date(policy.endDate).toDateString()}</span>
                  </div>
                  <div className="policy-row">
                    <span className="policy-label">Payment Status:</span>
                    <span className="policy-value">{policy.paymentStatus || 'pending'}</span>
                  </div>
                </div>

                {policy.eligibleTriggers?.length > 0 && (
                  <div className="trigger-chip-row top-space">
                    {policy.eligibleTriggers.map((trigger) => (
                      <span className="trigger-chip" key={`${policy.id}-${trigger.type}`}>
                        {trigger.label}
                      </span>
                    ))}
                  </div>
                )}

                <div className="policy-actions">
                  {policy.paymentStatus !== 'paid' && (
                    <button className="action-btn activate" disabled={paymentLoading === policy.id} onClick={() => handlePayment(policy.id)}>
                      {paymentLoading === policy.id ? 'Processing...' : `Pay ${formatCurrency(policy.premium)}`}
                    </button>
                  )}
                  {policy.status === 'paused' && (
                    <button className="action-btn activate" disabled={actionLoading === policy.id} onClick={() => handleStatusChange(policy.id, 'active')}>
                      {actionLoading === policy.id ? 'Updating...' : 'Reactivate'}
                    </button>
                  )}
                  {policy.status === 'active' && (
                    <button className="action-btn pause" disabled={actionLoading === policy.id} onClick={() => handleStatusChange(policy.id, 'paused')}>
                      {actionLoading === policy.id ? 'Updating...' : 'Pause Policy'}
                    </button>
                  )}
                  {(policy.status === 'active' || policy.status === 'paused') && (
                    <button className="action-btn cancel" disabled={actionLoading === policy.id} onClick={() => handleStatusChange(policy.id, 'cancelled')}>
                      {actionLoading === policy.id ? 'Updating...' : 'Cancel Policy'}
                    </button>
                  )}
                  {(policy.status === 'cancelled' || policy.status === 'expired') && (
                    <p className="muted-copy">This policy is {policy.status}. Create a new one above to resume coverage.</p>
                  )}
                </div>
              </div>
            </section>
          ))
        )}

        <section className="dashboard-section">
          <div className="info-card">
            <h3>Zero-touch protections</h3>
            <div className="trigger-chip-row">
              <span className="trigger-chip">Heavy rain auto claim</span>
              <span className="trigger-chip">Thunderstorm auto claim</span>
              <span className="trigger-chip">Flood and waterlogging auto claim</span>
              <span className="trigger-chip">Extreme heat auto claim</span>
              <span className="trigger-chip">Civic restriction soft review</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default PolicyPage
