import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import api from '../services/api'
import '../styles/dashboard.css'

const PLATFORMS = ['Zomato', 'Swiggy', 'Zepto', 'Blinkit', 'Amazon', 'Flipkart', 'Other']

const ProfilePage = () => {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [msg,     setMsg]     = useState('')
  const [form, setForm] = useState({
    location: '', occupation: '', avgDailyEarnings: '', deliveryZone: '', platformId: ''
  })

  const fetchProfile = async () => {
    try {
      const res = await api.get('/auth/profile')
      setUser(res.data)
      setForm({
        location:         res.data.location         || '',
        occupation:       res.data.occupation       || '',
        avgDailyEarnings: res.data.avgDailyEarnings || '',
        deliveryZone:     res.data.deliveryZone     || '',
        platformId:       res.data.platformId       || '',
      })
    } catch (err) {
      console.error('Failed to load profile:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchProfile() }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    setMsg('')
    if (!form.location || !form.occupation) {
      setMsg('Work city and platform are required')
      return
    }
    if (form.avgDailyEarnings && (isNaN(form.avgDailyEarnings) || Number(form.avgDailyEarnings) <= 0)) {
      setMsg('Average daily earnings must be a positive number')
      return
    }
    try {
      setSaving(true)
      await api.put('/user/profile', {
        location:         form.location,
        occupation:       form.occupation,
        deliveryZone:     form.deliveryZone     || undefined,
        platformId:       form.platformId       || undefined,
        avgDailyEarnings: form.avgDailyEarnings ? parseFloat(form.avgDailyEarnings) : undefined,
      })
      setMsg('✅ Profile updated successfully!')
      setEditing(false)
      fetchProfile()
    } catch (err) {
      setMsg(err.response?.data?.message || 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="dashboard-container">
      <Navbar />
      <div className="dashboard-content"><div className="loading">Loading profile...</div></div>
    </div>
  )

  return (
    <div className="dashboard-container">
      <Navbar />
      <div className="dashboard-content">
        <h2 className="page-title">My Account</h2>

        {/* Account Details */}
        <section className="dashboard-section">
          <div className="info-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3>Account Details</h3>
              {!editing && (
                <button onClick={() => { setEditing(true); setMsg('') }}
                  style={{ background: '#667eea', color: 'white', border: 'none', borderRadius: 6, padding: '6px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  ✏️ Edit
                </button>
              )}
            </div>

            {msg && (
              <div className={msg.startsWith('✅') ? 'success-message' : 'error-message'} style={{ marginBottom: '1rem' }}>
                {msg}
              </div>
            )}

            {!editing ? (
              <div className="info-grid">
                {[
                  ['Full Name',            user?.name       || '—'],
                  ['Email',                user?.email      || '—'],
                  ['Work City',            user?.location   || <span style={{ color: '#aaa' }}>Not set</span>],
                  ['Delivery Platform',    user?.occupation || <span style={{ color: '#aaa' }}>Not set</span>],
                  // FIX: show new fields
                  ['Partner ID',           user?.platformId       || <span style={{ color: '#aaa' }}>Not set</span>],
                  ['Delivery Zone',        user?.deliveryZone     || <span style={{ color: '#aaa' }}>Not set</span>],
                  ['Avg Daily Earnings',   user?.avgDailyEarnings ? `₹${Number(user.avgDailyEarnings).toFixed(0)}` : <span style={{ color: '#aaa' }}>Not set (default ₹700)</span>],
                  ['Work Hours/Day',       user?.workHoursPerDay  ? `${user.workHoursPerDay} hrs` : '6 hrs (default)'],
                  ['Role',                 <span className={`status-badge ${user?.role}`}>{user?.role}</span>],
                  ['Member Since',         user?.createdAt ? new Date(user.createdAt).toDateString() : '—'],
                ].map(([label, val]) => (
                  <div key={label} className="info-item">
                    <span className="label">{label}</span>
                    <span className="value">{val}</span>
                  </div>
                ))}
              </div>
            ) : (
              <form onSubmit={handleSave} className="auth-form">
                {/* Read-only */}
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" value={user?.name || ''} disabled style={{ background: '#f5f5f5', cursor: 'not-allowed' }} />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={user?.email || ''} disabled style={{ background: '#f5f5f5', cursor: 'not-allowed' }} />
                </div>
                {/* Editable */}
                <div className="form-group">
                  <label>Work City / Location *</label>
                  <input type="text" value={form.location}
                    onChange={e => setForm({ ...form, location: e.target.value })}
                    placeholder="e.g. Chennai, Mumbai, Delhi" required />
                </div>
                <div className="form-group">
                  <label>Delivery Platform *</label>
                  <select value={form.occupation}
                    onChange={e => setForm({ ...form, occupation: e.target.value })} required>
                    <option value="">Select Platform</option>
                    {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                {/* FIX: new fields */}
                <div className="form-group">
                  <label>Platform Partner ID <small style={{ color: '#aaa' }}>(e.g. Z-CHN-48120)</small></label>
                  <input type="text" value={form.platformId}
                    onChange={e => setForm({ ...form, platformId: e.target.value })}
                    placeholder="Your Zomato / Swiggy partner ID" />
                </div>
                <div className="form-group">
                  <label>Delivery Zone <small style={{ color: '#aaa' }}>(optional)</small></label>
                  <input type="text" value={form.deliveryZone}
                    onChange={e => setForm({ ...form, deliveryZone: e.target.value })}
                    placeholder="e.g. T. Nagar / Mylapore" />
                </div>
                <div className="form-group">
                  <label>
                    Avg Daily Earnings (₹)
                    <small style={{ color: '#666', marginLeft: 6 }}>
                      Used to calculate your payout amount — the more accurate, the better
                    </small>
                  </label>
                  <input type="number" value={form.avgDailyEarnings}
                    onChange={e => setForm({ ...form, avgDailyEarnings: e.target.value })}
                    placeholder="e.g. 820 (default: 700)" min="100" max="5000" />
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="submit" className="submit-btn" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button type="button" className="action-btn cancel"
                    onClick={() => { setEditing(false); setMsg('') }}>
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>

        {/* Security — FIX: use Link not <a href> */}
        <section className="dashboard-section">
          <div className="info-card">
            <h3>Security</h3>
            <p style={{ color: '#666', fontSize: 14, marginBottom: '1rem' }}>
              Want to change your password?
            </p>
            <Link to="/forgot-password">
              <button className="action-btn activate">Reset Password</button>
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}

export default ProfilePage
