import React, { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import api from '../services/api'
import '../styles/dashboard.css'

const PLATFORMS = ['Zomato', 'Swiggy', 'Zepto', 'Amazon', 'Flipkart', 'Other']

const ProfilePage = () => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState({
    location: '',
    occupation: ''
  })

  const fetchProfile = async () => {
    try {
      const res = await api.get('/auth/profile')
      setUser(res.data)
      setForm({
        location: res.data.location || '',
        occupation: res.data.occupation || ''
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
      setMsg('Please fill in both fields')
      return
    }
    try {
      setSaving(true)
      await api.put('/user/profile', form)
      setMsg('✅ Profile updated successfully!')
      setEditing(false)
      fetchProfile()
    } catch (err) {
      setMsg(err.response?.data?.message || 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="dashboard-container">
        <Navbar />
        <div className="dashboard-content">
          <div className="loading">Loading profile...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      <Navbar />
      <div className="dashboard-content">
        <h2 className="page-title">My Account</h2>

        {/* Account Details Card */}
        <section className="dashboard-section">
          <div className="info-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3>Account Details</h3>
              {!editing && (
                <button
                  onClick={() => { setEditing(true); setMsg('') }}
                  style={{
                    background: '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 16px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    width: 'auto'
                  }}
                >
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
              /* View mode */
              <div className="info-grid">
                <div className="info-item">
                  <span className="label">Full Name</span>
                  <span className="value">{user?.name || '—'}</span>
                </div>
                <div className="info-item">
                  <span className="label">Email</span>
                  <span className="value">{user?.email || '—'}</span>
                </div>
                <div className="info-item">
                  <span className="label">Work Location</span>
                  <span className="value">{user?.location || <span style={{color:'#aaa'}}>Not set</span>}</span>
                </div>
                <div className="info-item">
                  <span className="label">Delivery Platform</span>
                  <span className="value">{user?.occupation || <span style={{color:'#aaa'}}>Not set</span>}</span>
                </div>
                <div className="info-item">
                  <span className="label">Role</span>
                  <span className={`status-badge ${user?.role}`}>{user?.role}</span>
                </div>
                <div className="info-item">
                  <span className="label">Member Since</span>
                  <span className="value">{user?.createdAt ? new Date(user.createdAt).toDateString() : '—'}</span>
                </div>
              </div>
            ) : (
              /* Edit mode */
              <form onSubmit={handleSave} className="auth-form">
                {/* Read-only fields */}
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" value={user?.name || ''} disabled style={{ background: '#f5f5f5', cursor: 'not-allowed' }} />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={user?.email || ''} disabled style={{ background: '#f5f5f5', cursor: 'not-allowed' }} />
                </div>
                {/* Editable fields */}
                <div className="form-group">
                  <label>Work City / Location</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={e => setForm({ ...form, location: e.target.value })}
                    placeholder="e.g. Mumbai, Delhi, Bangalore"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Delivery Platform</label>
                  <select
                    value={form.occupation}
                    onChange={e => setForm({ ...form, occupation: e.target.value })}
                    required
                  >
                    <option value="">Select Platform</option>
                    {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="submit" className="submit-btn" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    className="action-btn cancel"
                    onClick={() => { setEditing(false); setMsg('') }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>

        {/* Password Reset Link */}
        <section className="dashboard-section">
          <div className="info-card">
            <h3>Security</h3>
            <p style={{ color: '#666', fontSize: '14px', marginBottom: '1rem' }}>
              Want to change your password?
            </p>
            <a href="/forgot-password">
              <button className="action-btn activate">Reset Password</button>
            </a>
          </div>
        </section>

      </div>
    </div>
  )
}

export default ProfilePage  