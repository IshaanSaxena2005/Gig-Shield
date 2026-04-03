import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { getPolicies } from '../services/policyService'
import { submitClaim } from '../services/claimService'
import '../styles/dashboard.css'

const DISRUPTION_TYPES = [
  { value: 'Heavy rain (not auto-detected)',            label: '🌧️ Heavy rain (not auto-detected)' },
  { value: 'Extreme heat (not auto-detected)',          label: '🌡️ Extreme heat (not auto-detected)' },
  { value: 'Severe AQI / air quality (not detected)',   label: '😷 Severe AQI / air quality' },
  { value: 'Local market closure / hartal',             label: '🚫 Local market closure / hartal' },
  { value: 'Section 144 curfew',                        label: '🚔 Section 144 curfew' },
  { value: 'Road flooding / waterlogging',              label: '🌊 Road flooding / waterlogging' },
  { value: 'Localised strike blocking delivery zone',   label: '✊ Localised strike blocking zone' },
  { value: 'Other income-disrupting event',             label: '📝 Other income-disrupting event' },
]

// Estimated payout helper shown to user
const estimatePayout = (hoursLost, dailyEarnings, coverageCap) => {
  const hourlyRate = dailyEarnings / 6
  const raw = hourlyRate * hoursLost
  const capped = Math.min(raw, coverageCap)
  return Math.round(capped / 50) * 50
}

const SubmitClaim = () => {
  const navigate = useNavigate()
  const [policies,      setPolicies]      = useState([])
  const [loadingPolicy, setLoadingPolicy] = useState(true)
  const [submitting,    setSubmitting]    = useState(false)
  const [submitted,     setSubmitted]     = useState(false)
  const [result,        setResult]        = useState(null)
  const [error,         setError]         = useState('')
  const [form, setForm] = useState({
    policyId:      '',
    disruptionType: '',
    date:          new Date().toISOString().split('T')[0],
    hoursLost:     '4',
    location:      '',
    description:   '',
    estimatedLoss: '',
  })

  // Fetch user's saved avg earnings from localStorage user object
  const savedUser = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}') } catch { return {} } })()

  useEffect(() => {
    getPolicies()
      .then(data => setPolicies(data.filter(p => p.status === 'active')))
      .catch(() => setError('Could not load policies'))
      .finally(() => setLoadingPolicy(false))
  }, [])

  const activePolicy = policies.find(p => p.id === parseInt(form.policyId))
  const coverageCap  = activePolicy ? parseFloat(activePolicy.coverage) : 3500
  const estPayout    = estimatePayout(parseFloat(form.hoursLost) || 0, parseFloat(form.estimatedLoss) || 700, coverageCap)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const { policyId, disruptionType, date, hoursLost, location, description, estimatedLoss } = form

    if (!policyId || !disruptionType || !date || !hoursLost || !location || !description) {
      setError('Please fill in all required fields')
      return
    }
    if (description.trim().length < 20) {
      setError('Please provide more detail in your description (at least 20 characters)')
      return
    }

    try {
      setSubmitting(true)
      const fullDescription =
        `[${disruptionType}] on ${date} — ${hoursLost} hrs lost. Location: ${location}. ${description.trim()}`

      const data = await submitClaim({
        policyId: parseInt(policyId),
        amount:   estPayout,
        description: fullDescription
      })
      setResult(data)
      setSubmitted(true)
    } catch (err) {
      setError(err.response?.data?.message || 'Submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingPolicy) return (
    <div className="dashboard-container">
      <Navbar />
      <div className="dashboard-content"><div className="loading">Loading...</div></div>
    </div>
  )

  // Success screen
  if (submitted && result) {
    const isFlagged = result.claim?.status === 'flagged'
    return (
      <div className="dashboard-container">
        <Navbar />
        <div className="dashboard-content">
          <div className="info-card" style={{ textAlign: 'center', padding: '2.5rem' }}>
            <div style={{ fontSize: 48, marginBottom: '1rem' }}>{isFlagged ? '🔍' : '✅'}</div>
            <h2>{isFlagged ? 'Claim Under Review' : 'Claim Submitted!'}</h2>
            <p style={{ color: '#666', margin: '1rem 0', fontSize: 15 }}>
              {result.message}
            </p>
            {!isFlagged && (
              <div className="earnings-card" style={{ marginTop: '1.5rem' }}>
                <h3>Estimated Payout</h3>
                <p className="earnings-amount">₹{result.claim?.amount}</p>
                <p style={{ color: '#888', fontSize: 13 }}>Pending review · Paid within 4 hours if approved</p>
              </div>
            )}
            {result.fraudAlert && (
              <div className="error-message" style={{ marginTop: '1rem', textAlign: 'left' }}>
                <strong>Review reasons:</strong>
                <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                  {result.fraudAlert.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem' }}>
              <button className="submit-btn" style={{ width: 'auto' }} onClick={() => navigate('/dashboard')}>
                Back to Dashboard
              </button>
              <button className="action-btn activate" style={{ width: 'auto' }}
                onClick={() => { setSubmitted(false); setResult(null); setForm({ policyId: '', disruptionType: '', date: new Date().toISOString().split('T')[0], hoursLost: '4', location: '', description: '', estimatedLoss: '' }) }}>
                Submit Another
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      <Navbar />
      <div className="dashboard-content">
        <h2 className="page-title">Submit a Claim</h2>
        <p style={{ color: '#666', marginBottom: '1.5rem', fontSize: 14 }}>
          For disruptions not auto-detected by our parametric system. Our AI reviews within 2 hours.
        </p>

        {/* Coverage exclusion warning */}
        <div style={{ background: '#fff5f5', border: '1px solid #fcc', borderRadius: 8, padding: '12px 16px', marginBottom: '1.5rem' }}>
          <strong style={{ color: '#c00', fontSize: 13 }}>⚠️ Claims will be rejected if they cover:</strong>
          <span style={{ color: '#c00', fontSize: 12, marginLeft: 8 }}>
            health / medical · vehicle repair · accidents · life insurance · lost equipment
          </span>
        </div>

        {policies.length === 0 ? (
          <div className="info-card" style={{ textAlign: 'center', padding: '2rem' }}>
            <p>You don't have an active policy. <a href="/policy">Create one first →</a></p>
          </div>
        ) : (
          <div className="policy-card">
            {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="info-grid">
                <div className="form-group">
                  <label>Policy *</label>
                  <select name="policyId" value={form.policyId} onChange={handleChange} required>
                    <option value="">Select active policy</option>
                    {policies.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.type} Plan — Coverage ₹{Number(p.coverage).toFixed(0)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Disruption Type *</label>
                  <select name="disruptionType" value={form.disruptionType} onChange={handleChange} required>
                    <option value="">Select disruption</option>
                    {DISRUPTION_TYPES.map(d => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Date of Disruption *</label>
                  <input type="date" name="date" value={form.date} onChange={handleChange}
                    max={new Date().toISOString().split('T')[0]} required />
                </div>

                <div className="form-group">
                  <label>Hours of Income Lost (estimate) *</label>
                  <input type="number" name="hoursLost" value={form.hoursLost}
                    onChange={handleChange} min="1" max="12" required />
                </div>

                <div className="form-group">
                  <label>Your Location at Time *</label>
                  <input type="text" name="location" value={form.location}
                    onChange={handleChange} placeholder="e.g. T. Nagar, Chennai" required />
                </div>

                <div className="form-group">
                  <label>Avg Daily Earnings (₹) <small style={{ color: '#aaa' }}>for payout calculation</small></label>
                  <input type="number" name="estimatedLoss" value={form.estimatedLoss}
                    onChange={handleChange} placeholder="e.g. 820 (default: 700)" min="100" max="5000" />
                </div>
              </div>

              <div className="form-group">
                <label>Description of Disruption * <small style={{ color: '#aaa' }}>(min 20 characters)</small></label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Describe what happened — e.g. 'Section 144 was imposed in T. Nagar from 6am to 2pm. I could not enter the zone to pick up orders. My usual delivery route was blocked by police checkpoints.'"
                  required
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', fontFamily: 'inherit', fontSize: 14, resize: 'vertical' }}
                />
              </div>

              {/* Live payout estimate */}
              {form.hoursLost && parseFloat(form.hoursLost) > 0 && (
                <div style={{ background: '#f0f9f4', border: '1px solid #27ae60', borderRadius: 8, padding: '12px 16px', marginBottom: '1.5rem' }}>
                  <strong style={{ color: '#27ae60' }}>Estimated Payout: ₹{estPayout}</strong>
                  <span style={{ color: '#666', fontSize: 12, marginLeft: 8 }}>
                    based on {form.hoursLost} hrs × ₹{Math.round((parseFloat(form.estimatedLoss) || 700) / 6)}/hr hourly rate,
                    capped at ₹{coverageCap}
                  </span>
                </div>
              )}

              <button type="submit" className="submit-btn" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Claim for Review'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

export default SubmitClaim
