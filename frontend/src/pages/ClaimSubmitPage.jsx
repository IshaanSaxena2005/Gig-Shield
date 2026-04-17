import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { submitClaim } from '../services/claimService'
import { getPolicies } from '../services/policyService'
import '../styles/dashboard.css'

const DISRUPTION_TYPES = [
  { value: 'local_hartal',   label: 'Local market shutdown / hartal',          icon: '🚫' },
  { value: 'curfew_144',     label: 'Section 144 curfew (not auto-detected)',   icon: '🚔' },
  { value: 'road_flooding',  label: 'Severe localised flooding (road blocked)', icon: '🌊' },
  { value: 'local_aqi',      label: 'Localised AQI spike (not in CPCB zone)',   icon: '😷' },
  { value: 'platform_outage',label: 'Platform app outage (>4 hours)',           icon: '📵' },
  { value: 'other',          label: 'Other income-disrupting event',            icon: '📋' }
]

const EXCLUSIONS = [
  'Your health, injury or hospitalisation',
  'Vehicle breakdown, repair or fuel costs',
  'Accident involving you or third party',
  'Lost phone, stolen bike or equipment',
  'Normal rain / light drizzle under threshold'
]

const ClaimSubmitPage = () => {
  const navigate = useNavigate()
  const [policies,     setPolicies]     = useState([])
  const [activePolicy, setActivePolicy] = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [submitting,   setSubmitting]   = useState(false)
  const [submitted,    setSubmitted]    = useState(null)
  const [error,        setError]        = useState('')

  const [form, setForm] = useState({
    policyId:       '',
    disruptionType: '',
    date:           new Date().toISOString().split('T')[0],
    hoursLost:      '',
    location:       '',
    description:    ''
  })

  useEffect(() => {
    getPolicies()
      .then(data => {
        setPolicies(data)
        const active = data.find(p => p.status === 'active')
        if (active) {
          setActivePolicy(active)
          setForm(f => ({ ...f, policyId: String(active.id) }))
        }
      })
      .catch(() => setError('Could not load your policies'))
      .finally(() => setLoading(false))
  }, [])

  const estimatedPayout = () => {
    if (!activePolicy || !form.hoursLost) return null
    const coverage = parseFloat(activePolicy.coverage)
    const daily    = 700  // fallback — real value comes from user profile
    const hourly   = daily / 6
    return Math.min(Math.round(hourly * Number(form.hoursLost) / 50) * 50, coverage)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.policyId || !form.disruptionType || !form.hoursLost || !form.location || !form.description) {
      setError('Please fill in all required fields')
      return
    }
    if (Number(form.hoursLost) < 1 || Number(form.hoursLost) > 16) {
      setError('Hours lost must be between 1 and 16')
      return
    }

    try {
      setSubmitting(true)
      const disruptionLabel = DISRUPTION_TYPES.find(d => d.value === form.disruptionType)?.label || form.disruptionType
      const result = await submitClaim({
        policyId:    Number(form.policyId),
        amount:      estimatedPayout() || 500,
        description: `[${disruptionLabel}] ${form.date} — ${form.location} — ${form.description} (${form.hoursLost} hrs lost)`
      })
      setSubmitted(result)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit claim. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="dashboard-container">
      <Navbar />
      <div className="dashboard-content"><div className="loading">Loading...</div></div>
    </div>
  )

  // Success screen
  if (submitted) return (
    <div className="dashboard-container">
      <Navbar />
      <div className="dashboard-content">
        <div className="info-card" style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '48px', marginBottom: '1rem' }}>✅</div>
          <h2 style={{ marginBottom: '0.5rem' }}>Claim Submitted</h2>
          <p style={{ color: '#666', marginBottom: '1.5rem' }}>
            Your claim has been received. Our AI will review it and respond within 2 hours.
            You'll be notified via the dashboard when a decision is made.
          </p>
          <div className="info-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="info-item">
              <span className="label">Claim ID</span>
              <span className="value">#{submitted.claim?.id || '—'}</span>
            </div>
            <div className="info-item">
              <span className="label">Status</span>
              <span className={`status-badge ${submitted.claim?.status}`}>{submitted.claim?.status}</span>
            </div>
          </div>
          {submitted.fraudAlert && (
            <div className="error-message" style={{ marginBottom: '1rem' }}>
              ⚠️ Claim flagged for review: {submitted.fraudAlert.join('; ')}
            </div>
          )}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <Link to="/dashboard"><button className="submit-btn" style={{ width: 'auto' }}>Back to Dashboard</button></Link>
            <button className="action-btn activate" onClick={() => { setSubmitted(null); setForm(f => ({ ...f, disruptionType: '', hoursLost: '', description: '' })) }}>
              Submit Another
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="dashboard-container">
      <Navbar />
      <div className="dashboard-content">
        <h2 className="page-title">Submit Manual Claim</h2>

        {!activePolicy && (
          <div className="error-message" style={{ marginBottom: '1.5rem' }}>
            ⚠️ You don't have an active policy. <Link to="/policy">Create one first →</Link>
          </div>
        )}

        {/* What's covered notice */}
        <div className="info-card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid #667eea' }}>
          <h4 style={{ marginBottom: '0.5rem' }}>📌 Manual claims are for disruptions NOT caught by our live monitors</h4>
          <p style={{ fontSize: '13px', color: '#666' }}>
            If heavy rain, heat, or AQI crossed the trigger threshold, your claim was already filed automatically. Submit here only for localised events our APIs didn't capture.
          </p>
        </div>

        {/* Exclusions */}
        <div style={{ background: '#fff5f5', border: '1px solid #feb2b2', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem' }}>
          <p style={{ fontWeight: '600', color: '#c53030', marginBottom: '0.5rem', fontSize: '13px' }}>⚠️ WILL BE REJECTED — This policy does NOT cover:</p>
          {EXCLUSIONS.map(ex => (
            <div key={ex} style={{ fontSize: '12px', color: '#742a2a', marginBottom: '2px' }}>✗ {ex}</div>
          ))}
        </div>

        {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}

        <div className="info-card">
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="info-grid">
              {/* Policy */}
              <div className="form-group">
                <label>Policy *</label>
                <select
                  value={form.policyId}
                  onChange={e => setForm({ ...form, policyId: e.target.value })}
                  required
                  disabled={!policies.length}
                >
                  <option value="">Select policy</option>
                  {policies.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.type} Plan — ₹{p.coverage} cover ({p.status})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div className="form-group">
                <label>Date of disruption *</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm({ ...form, date: e.target.value })}
                  max={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>

              {/* Disruption type */}
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Type of disruption *</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {DISRUPTION_TYPES.map(dt => (
                    <label
                      key={dt.value}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '8px 12px', border: `2px solid ${form.disruptionType === dt.value ? '#667eea' : '#e2e8f0'}`,
                        borderRadius: '6px', cursor: 'pointer', fontSize: '13px',
                        background: form.disruptionType === dt.value ? '#ebf4ff' : 'white'
                      }}
                    >
                      <input
                        type="radio"
                        name="disruptionType"
                        value={dt.value}
                        checked={form.disruptionType === dt.value}
                        onChange={e => setForm({ ...form, disruptionType: e.target.value })}
                        style={{ display: 'none' }}
                      />
                      <span>{dt.icon}</span>
                      <span>{dt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Hours + location */}
              <div className="form-group">
                <label>Estimated hours of income lost (1–16) *</label>
                <input
                  type="number"
                  value={form.hoursLost}
                  onChange={e => setForm({ ...form, hoursLost: e.target.value })}
                  placeholder="e.g. 5"
                  min="1" max="16"
                  required
                />
                {estimatedPayout() && (
                  <p style={{ fontSize: '12px', color: '#667eea', marginTop: '4px' }}>
                    Estimated payout: ₹{estimatedPayout()} (based on your earnings profile)
                  </p>
                )}
              </div>

              <div className="form-group">
                <label>Your location during disruption *</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={e => setForm({ ...form, location: e.target.value })}
                  placeholder="e.g. T. Nagar, Chennai"
                  required
                />
              </div>

              {/* Description */}
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>What happened? (brief description) *</label>
                <textarea
                  rows="3"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g. Section 144 imposed in T. Nagar from 6am to 2pm — police blocked all roads, deliveries impossible in the zone."
                  style={{ resize: 'vertical' }}
                  required
                  minLength={20}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', alignItems: 'center' }}>
              <button
                type="submit"
                className="submit-btn"
                style={{ width: 'auto', flex: 1 }}
                disabled={submitting || !activePolicy}
              >
                {submitting ? 'Submitting...' : 'Submit Claim'}
              </button>
              <Link to="/dashboard">
                <button type="button" className="action-btn cancel">Cancel</button>
              </Link>
              <span style={{ fontSize: '12px', color: '#888' }}>AI review within 2 hours · No documents required</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ClaimSubmitPage
