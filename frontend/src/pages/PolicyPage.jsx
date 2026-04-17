import React, { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { getPolicies, createPolicy, updatePolicyStatus } from '../services/policyService'
import { getDashboardData } from '../services/userService'
import '../styles/dashboard.css'

const PLANS = [
  {
    value:       'Basic',
    label:       'Shield Basic',
    rate:        '2.0%',
    description: 'Essential cover for weather disruptions',
    triggers:    ['Heavy rain (≥50mm/3hr)', 'Severe AQI (≥200)'],
    cap:         '₹2,500',
    color:       '#888'
  },
  {
    value:       'Standard',
    label:       'Shield Standard',
    rate:        '3.5%',
    description: 'Full weather + cyclone protection',
    triggers:    ['Heavy rain', 'Severe AQI', 'Extreme heat (≥42°C)', 'Cyclone / red alert'],
    cap:         '₹3,500',
    color:       '#378ADD',
    recommended: true
  },
  {
    value:       'Pro',
    label:       'Shield Pro',
    rate:        '5.0%',
    description: 'All triggers including civil disruptions',
    triggers:    ['Heavy rain', 'Severe AQI', 'Extreme heat', 'Cyclone', 'Curfew / hartal / strike'],
    cap:         '₹5,000',
    color:       '#534AB7'
  }
]

const OCCUPATIONS = ['Zomato', 'Swiggy', 'Zepto', 'Blinkit', 'Amazon', 'Flipkart', 'Other']

const statusColor = (s) => ({
  active: '#27ae60', paused: '#f39c12', cancelled: '#e74c3c', expired: '#95a5a6'
}[s?.toLowerCase()] || '#95a5a6')

const PolicyPage = () => {
  const [policies,      setPolicies]      = useState([])
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState('')
  const [success,       setSuccess]       = useState('')
  const [showForm,      setShowForm]      = useState(false)
  const [actionLoading, setActionLoading] = useState(null)
  const [formData,      setFormData]      = useState({ type: '', occupation: '', location: '' })
  const [formLoading,   setFormLoading]   = useState(false)
  const [formError,     setFormError]     = useState('')
  const [preview,       setPreview]       = useState(null)
  const [previewLoading,setPreviewLoading]= useState(false)

  // Get worker's daily earnings from localStorage (set at login/register)
  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}') } catch { return {} }
  })()
  const [dailyEarnings, setDailyEarnings] = useState(currentUser.avgDailyEarnings || 700)
  const weeklyEarnings = dailyEarnings * 7

  const fetchPolicies = async () => {
    try {
      setLoading(true)
      const data = await getPolicies()
      setPolicies(data)
      if (data.length === 0) setShowForm(true)
    } catch { setError('Failed to load policies') }
    finally  { setLoading(false) }
  }

  useEffect(() => { 
    fetchPolicies() 
    getDashboardData().then(data => {
      if (data?.user) {
        setDailyEarnings(data.user.avgDailyEarnings || 700)
        setFormData(prev => ({
          ...prev,
          occupation: prev.occupation || data.user.platform || data.user.occupation || '',
          location: prev.location || data.user.location || ''
        }))
      }
    }).catch(err => console.error("Failed to fetch fresh user data", err))
  }, [])

  // Fetch live preview whenever type or location changes
  useEffect(() => {
    if (!formData.type || !formData.location) { setPreview(null); return }
    let cancelled = false
    setPreviewLoading(true)
    createPolicy({ type: formData.type, occupation: formData.occupation || 'Other', location: formData.location, coverage: 0, previewOnly: true })
      .then(res => { if (!cancelled) setPreview(res) })
      .catch(() => { if (!cancelled) setPreview(null) })
      .finally(() => { if (!cancelled) setPreviewLoading(false) })
    return () => { cancelled = true }
  }, [formData.type, formData.location])

  const handleFormChange = (e) => {
    setFormData(p => ({ ...p, [e.target.name]: e.target.value }))
    setFormError('')
  }

  const handleCreatePolicy = async (e) => {
    e.preventDefault()
    const { type, occupation, location } = formData
    if (!type || !occupation || !location) { setFormError('Please fill in all fields'); return }
    try {
      setFormLoading(true)
      const result  = await createPolicy({ type, occupation, location, coverage: 0 })
      const plan    = PLANS.find(p => p.value === type)
      const pct     = result.contributionPct || plan?.rate || ''
      const premium = result.premium
      setSuccess(`${plan?.label} created! You contribute ${pct} of weekly earnings = ₹${premium}/week.`)
      setShowForm(false)
      setPreview(null)
      setFormData({ type: '', occupation: '', location: '' })
      await fetchPolicies()
      setTimeout(() => setSuccess(''), 7000)
    } catch (err) {
      // Solvency gate — backend returns 503 + code when reserves are critically low.
      // Show a calmer, user-friendly message instead of a generic "Failed to create policy".
      const code = err.response?.data?.code
      if (code === 'POLICY_SALES_HALTED') {
        setFormError(
          '🔒 New policy sign-ups are temporarily paused while we top up the ' +
          'claims reserve fund. This protects existing workers\' coverage. ' +
          'Please try again in a few hours — your existing policies are unaffected.'
        )
      } else {
        setFormError(err.response?.data?.message || 'Failed to create policy')
      }
    } finally {
      setFormLoading(false)
    }
  }

  const handleStatusChange = async (policyId, newStatus) => {
    const msgs = {
      cancelled: 'Cancel this policy? You will lose coverage immediately.',
      paused:    'Pause this policy? You will not be covered until reactivated.',
      active:    'Reactivate this policy?'
    }
    if (!window.confirm(msgs[newStatus])) return
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
    <div className="dashboard-container"><Navbar />
      <div className="dashboard-content"><div className="loading">Loading policies...</div></div>
    </div>
  )

  return (
    <div className="dashboard-container">
      <Navbar />
      <div className="dashboard-content">

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem' }}>
          <h2 className="page-title" style={{ margin: 0 }}>My Policies</h2>
          {!showForm && (
            <button className="submit-btn" style={{ width:'auto', padding:'0.5rem 1.5rem' }}
              onClick={() => setShowForm(true)}>
              + New Policy
            </button>
          )}
        </div>

        {error   && <div className="error-message"   style={{ marginBottom:'1rem' }}>{error}</div>}
        {success && <div className="success-message" style={{ marginBottom:'1rem' }}>{success}</div>}

        {/* ── Create policy form ── */}
        {showForm && (
          <section className="dashboard-section">
            <div className="policy-card">
              <h3>Choose Your Plan</h3>

              {/* How contribution pricing works */}
              <div style={{ background:'var(--color-background-info)', borderRadius:8, padding:'10px 14px', marginBottom:'1.25rem', fontSize:13, color:'var(--color-text-info)' }}>
                Your weekly premium is a fixed <strong>% of your weekly earnings</strong> — just like a small payroll deduction.
                At ₹{dailyEarnings}/day your weekly earnings are <strong>₹{weeklyEarnings.toLocaleString('en-IN')}</strong>.
              </div>

              {/* Plan comparison cards */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3, minmax(0,1fr))', gap:10, marginBottom:'1.5rem' }}>
                {PLANS.map(plan => {
                  const weeklyPrem = Math.round((weeklyEarnings * parseFloat(plan.rate) / 100) / 5) * 5
                  const selected   = formData.type === plan.value
                  return (
                    <div key={plan.value}
                      onClick={() => { setFormData(p => ({ ...p, type: plan.value })); setFormError('') }}
                      style={{
                        border: selected ? `2px solid ${plan.color}` : '0.5px solid var(--color-border-secondary)',
                        borderRadius: 10, padding: '12px 14px', cursor: 'pointer',
                        background: selected ? 'var(--color-background-primary)' : 'var(--color-background-secondary)',
                        position: 'relative', transition: 'border .15s'
                      }}>
                      {plan.recommended && (
                        <div style={{ position:'absolute', top:-10, left:'50%', transform:'translateX(-50%)', background:'#E6F1FB', color:'#0C447C', fontSize:10, fontWeight:500, padding:'2px 10px', borderRadius:12, whiteSpace:'nowrap' }}>
                          Recommended
                        </div>
                      )}
                      <div style={{ fontWeight:500, fontSize:14, color: plan.color, marginBottom:2 }}>{plan.label}</div>
                      <div style={{ fontSize:22, fontWeight:500, color:'var(--color-text-primary)', margin:'4px 0' }}>{plan.rate}<span style={{ fontSize:12, color:'var(--color-text-secondary)', marginLeft:2 }}>of earnings</span></div>
                      <div style={{ fontSize:13, fontWeight:500, color:'var(--color-text-primary)', marginBottom:4 }}>≈ ₹{weeklyPrem}/week</div>
                      <div style={{ fontSize:11, color:'var(--color-text-secondary)', marginBottom:6 }}>Max payout: {plan.cap}/week</div>
                      {plan.triggers.map(t => (
                        <div key={t} style={{ fontSize:11, color:'var(--color-text-secondary)', marginBottom:1 }}>✓ {t}</div>
                      ))}
                    </div>
                  )
                })}
              </div>

              {formError && <div className="error-message" style={{ marginBottom:'1rem' }}>{formError}</div>}

              <form onSubmit={handleCreatePolicy} className="auth-form">
                <div className="info-grid">
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

                {/* Live premium preview */}
                {previewLoading && (
                  <div style={{ fontSize:13, color:'var(--color-text-secondary)', margin:'0.5rem 0' }}>Calculating your premium...</div>
                )}
                {preview && !previewLoading && (
                  <div style={{ background:'var(--color-background-secondary)', borderRadius:8, padding:'12px 16px', margin:'0.75rem 0', fontSize:13 }}>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
                      {[
                        ['You pay',        preview.contributionPct || '—',                              `≈ ₹${preview.premium}/week`],
                        ['Of weekly pay',  `₹${(weeklyEarnings||0).toLocaleString('en-IN')}`,           `₹${dailyEarnings}/day × 7`],
                        ['Coverage cap',   `₹${(preview.coverage||0).toLocaleString('en-IN')}`,         'per week'],
                        ['City risk band', preview.cityRisk || '—',                                     null],
                      ].map(([lbl, val, sub]) => (
                        <div key={lbl}>
                          <div style={{ color:'var(--color-text-secondary)', fontSize:11, marginBottom:2 }}>{lbl}</div>
                          <div style={{ fontWeight:500, color:'var(--color-text-primary)', textTransform:'capitalize' }}>{val}</div>
                          {sub && <div style={{ color:'var(--color-text-tertiary)', fontSize:11, marginTop:2 }}>{sub}</div>}
                        </div>
                      ))}
                    </div>
                    {preview.premiumBreakdown?.affordabilityGap > 0 && (
                      <div style={{ marginTop:8, paddingTop:8, borderTop:'0.5px solid var(--color-border-tertiary)', fontSize:11, color:'var(--color-text-tertiary)' }}>
                        Actuarially fair price: ₹{preview.premiumBreakdown.actuarialFairPremium}/week —
                        affordability gap of ₹{preview.premiumBreakdown.affordabilityGap} covered by platform solidarity pool.
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display:'flex', gap:'1rem', marginTop:'1rem' }}>
                  <button type="submit" className="submit-btn" style={{ width:'auto', flex:1 }} disabled={formLoading || !formData.type}>
                    {formLoading ? 'Creating...' : `Activate ${PLANS.find(p=>p.value===formData.type)?.label || 'Plan'}`}
                  </button>
                  {policies.length > 0 && (
                    <button type="button" className="action-btn cancel" style={{ flex:1 }}
                      onClick={() => { setShowForm(false); setFormError(''); setPreview(null) }}>
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          </section>
        )}

        {/* ── Existing policies ── */}
        {policies.length === 0 && !showForm ? (
          <div className="info-card" style={{ textAlign:'center', padding:'2rem' }}>
            <p>You don't have any policies yet.</p>
            <button className="submit-btn" style={{ width:'auto', marginTop:'1rem' }}
              onClick={() => setShowForm(true)}>
              Create Your First Policy
            </button>
          </div>
        ) : (
          policies.map(policy => {
            const plan = PLANS.find(p => p.value === policy.type)
            return (
              <section key={policy.id} className="dashboard-section">
                <div className="policy-card">
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
                    <h3>{policy.type} Policy</h3>
                    <span style={{ background:statusColor(policy.status), color:'white', padding:'4px 14px', borderRadius:99, fontSize:13, fontWeight:500 }}>
                      {policy.status?.toUpperCase()}
                    </span>
                  </div>
                  <div className="policy-details">
                    {[
                      ['Weekly Contribution', `₹${Number(policy.premium).toFixed(0)} (${plan?.rate || '—'} of your earnings)`],
                      ['Coverage Cap',        `₹${Number(policy.coverage).toLocaleString('en-IN')}/week`],
                      ['Triggers Covered',    plan?.triggers.join(', ') || '—'],
                      ['Renews',              new Date(policy.endDate).toDateString()],
                    ].map(([lbl, val]) => (
                      <div key={lbl} className="policy-row">
                        <span className="policy-label">{lbl}:</span>
                        <span className="policy-value" style={{ maxWidth:'60%', textAlign:'right' }}>{val}</span>
                      </div>
                    ))}
                  </div>
                  <div className="policy-actions" style={{ marginTop:'1.5rem' }}>
                    {policy.status === 'paused'    && <button className="action-btn activate" disabled={actionLoading===policy.id} onClick={() => handleStatusChange(policy.id,'active')}>{actionLoading===policy.id?'Updating...':'▶ Reactivate'}</button>}
                    {policy.status === 'active'    && <button className="action-btn pause"    disabled={actionLoading===policy.id} onClick={() => handleStatusChange(policy.id,'paused')}>{actionLoading===policy.id?'Updating...':'⏸ Pause'}</button>}
                    {(policy.status==='active'||policy.status==='paused') && <button className="action-btn cancel" disabled={actionLoading===policy.id} onClick={() => handleStatusChange(policy.id,'cancelled')}>{actionLoading===policy.id?'Updating...':'✕ Cancel'}</button>}
                    {(policy.status==='cancelled'||policy.status==='expired') && <p style={{ color:'#95a5a6', fontSize:14 }}>Policy {policy.status}. Create a new one above.</p>}
                  </div>
                </div>
              </section>
            )
          })
        )}

        {/* ── Coverage / exclusions ── */}
        <section className="dashboard-section">
          <div className="info-card">
            <h3>How your contribution is calculated</h3>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, margin:'1rem 0' }}>
              {PLANS.map(p => {
                const wkPrem = Math.round((weeklyEarnings * parseFloat(p.rate) / 100) / 5) * 5
                return (
                  <div key={p.value} style={{ background:'var(--color-background-secondary)', borderRadius:8, padding:'10px 12px', fontSize:12 }}>
                    <div style={{ fontWeight:500, color:'var(--color-text-primary)', marginBottom:4 }}>{p.label}</div>
                    <div style={{ color:'var(--color-text-secondary)' }}>{p.rate} × ₹{weeklyEarnings.toLocaleString('en-IN')}/week</div>
                    <div style={{ fontWeight:500, fontSize:14, color: p.color, margin:'4px 0' }}>= ₹{wkPrem}/week</div>
                    <div style={{ color:'var(--color-text-tertiary)' }}>≈ ₹{Math.round(wkPrem*4.33).toLocaleString('en-IN')}/month</div>
                  </div>
                )
              })}
            </div>
            <p style={{ fontSize:12, color:'var(--color-text-secondary)' }}>
              Based on your declared earnings of ₹{dailyEarnings}/day. Update in your profile to recalculate.
            </p>

            <h3 style={{ marginTop:'1.5rem' }}>What's covered</h3>
            <ul className="coverage-list">
              <li>✓ Loss of income from heavy rain (≥50mm/3hr) — all plans</li>
              <li>✓ Loss of income from severe AQI (≥200 CPCB) — all plans</li>
              <li>✓ Extreme heat (≥42°C sustained) — Standard & Pro</li>
              <li>✓ Cyclone / state red alert — Standard & Pro</li>
              <li>✓ Curfew / hartal / local strike — Pro only</li>
            </ul>
            <h3 style={{ marginTop:'1rem', color:'#e74c3c' }}>Strictly excluded</h3>
            <ul className="coverage-list" style={{ color:'#e74c3c' }}>
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
