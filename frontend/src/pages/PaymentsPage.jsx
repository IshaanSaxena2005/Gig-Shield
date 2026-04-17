import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { getPolicies } from '../services/policyService'
import { initiateUpiPayment, confirmPayment, getPaymentHistory } from '../services/paymentService'
import '../styles/dashboard.css'

const PaymentsPage = () => {
  const [policies, setPolicies] = useState([])
  const [history, setHistory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [paymentLoading, setPaymentLoading] = useState(null)
  const [activePayment, setActivePayment] = useState(null)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [tab, setTab] = useState('pay') // 'pay' | 'history' | 'settings'

  const fetchData = useCallback(async () => {
    try {
      const [policiesData, historyData] = await Promise.all([
        getPolicies(),
        getPaymentHistory()
      ])
      setPolicies(policiesData.filter(p => p.status === 'active' || p.status === 'paused'))
      setHistory(historyData)
    } catch (err) {
      console.error('Failed to load payments data:', err)
      setMessage({ text: 'Failed to load payment data', type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handlePayPremium = async (policyId) => {
    try {
      setPaymentLoading(policyId)
      setMessage({ text: '', type: '' })
      const paymentIntent = await initiateUpiPayment(policyId)
      setActivePayment(paymentIntent)
    } catch (err) {
      setMessage({ text: err.response?.data?.message || 'Payment initiation failed', type: 'error' })
    } finally {
      setPaymentLoading(null)
    }
  }

  const handleConfirmPayment = async () => {
    if (!activePayment) return
    try {
      setPaymentLoading('confirming')
      const result = await confirmPayment(activePayment.paymentId, activePayment.policyId)
      setMessage({ text: result.message || 'Payment confirmed successfully!', type: 'success' })
      setActivePayment(null)
      fetchData()
    } catch (err) {
      if (err.response?.data?.alreadyPaid) {
        setMessage({ text: 'Premium already paid for today!', type: 'info' })
      } else {
        setMessage({ text: err.response?.data?.message || 'Payment confirmation failed', type: 'error' })
      }
    } finally {
      setPaymentLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="dashboard-container">
        <Navbar />
        <div className="dashboard-content"><div className="loading">Loading payments...</div></div>
      </div>
    )
  }

  const summary = history?.summary || { totalPremiumsPaid: '0.00', totalPayoutsReceived: '0.00', netBalance: '0.00', transactionCount: 0 }
  const payoutSettings = history?.payoutSettings || {}

  return (
    <div className="dashboard-container">
      <Navbar />
      <div className="dashboard-content">
        <h2 className="page-title">💳 Payments & Billing</h2>

        {/* Message Banner */}
        {message.text && (
          <div style={{
            padding: '1rem',
            marginBottom: '1.5rem',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: '500',
            background: message.type === 'success' ? '#e8f5e9' : message.type === 'info' ? '#e3f2fd' : '#ffebee',
            color: message.type === 'success' ? '#2e7d32' : message.type === 'info' ? '#1565c0' : '#c62828',
            border: `1px solid ${message.type === 'success' ? '#c8e6c9' : message.type === 'info' ? '#90caf9' : '#ffcdd2'}`
          }}>
            {message.text}
          </div>
        )}

        {/* Summary Cards */}
        <section className="dashboard-section">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '12px', padding: '1.25rem', color: 'white'
            }}>
              <div style={{ fontSize: '12px', opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Premiums Paid</div>
              <div style={{ fontSize: '28px', fontWeight: '700', marginTop: '0.5rem' }}>₹{parseFloat(summary.totalPremiumsPaid).toLocaleString('en-IN')}</div>
            </div>
            <div style={{
              background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
              borderRadius: '12px', padding: '1.25rem', color: 'white'
            }}>
              <div style={{ fontSize: '12px', opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Payouts Received</div>
              <div style={{ fontSize: '28px', fontWeight: '700', marginTop: '0.5rem' }}>₹{parseFloat(summary.totalPayoutsReceived).toLocaleString('en-IN')}</div>
            </div>
            <div style={{
              background: parseFloat(summary.netBalance) >= 0
                ? 'linear-gradient(135deg, #56ab2f 0%, #a8e063 100%)'
                : 'linear-gradient(135deg, #eb3349 0%, #f45c43 100%)',
              borderRadius: '12px', padding: '1.25rem', color: 'white'
            }}>
              <div style={{ fontSize: '12px', opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Net Balance</div>
              <div style={{ fontSize: '28px', fontWeight: '700', marginTop: '0.5rem' }}>₹{parseFloat(summary.netBalance).toLocaleString('en-IN')}</div>
            </div>
          </div>
        </section>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '0', marginBottom: '1.5rem', borderBottom: '2px solid #e2e8f0' }}>
          {[
            { key: 'pay', label: '💰 Pay Premium' },
            { key: 'history', label: '📋 Transaction History' },
            { key: 'settings', label: '⚙️ Payout Settings' }
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '0.75rem 1.25rem',
                border: 'none',
                borderBottom: tab === t.key ? '3px solid #667eea' : '3px solid transparent',
                background: 'transparent',
                color: tab === t.key ? '#667eea' : '#64748b',
                fontWeight: tab === t.key ? '600' : '400',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── PAY PREMIUM TAB ── */}
        {tab === 'pay' && (
          <>
            {/* Active UPI Payment Modal */}
            {activePayment && (
              <section className="dashboard-section">
                <div className="info-card" style={{
                  background: 'linear-gradient(135deg, #667eea08 0%, #764ba208 100%)',
                  border: '2px solid #667eea40',
                  position: 'relative'
                }}>
                  <button
                    onClick={() => setActivePayment(null)}
                    style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' }}
                  >✕</button>

                  <h3 style={{ marginBottom: '1rem', color: '#334155' }}>🔐 Complete Your Payment</h3>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
                    {/* QR Code */}
                    <div style={{ textAlign: 'center' }}>
                      <img
                        src={activePayment.qrCode}
                        alt="UPI QR Code"
                        style={{ width: '180px', height: '180px', borderRadius: '12px', border: '4px solid #e2e8f0', margin: '0 auto' }}
                      />
                      <p style={{ fontSize: '12px', color: '#64748b', marginTop: '0.75rem' }}>Scan with any UPI app</p>
                    </div>

                    {/* Payment Details */}
                    <div>
                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>Amount</div>
                        <div style={{ fontSize: '32px', fontWeight: '700', color: '#0f172a' }}>₹{activePayment.amount}</div>
                        <div style={{ fontSize: '13px', color: '#64748b' }}>{activePayment.description}</div>
                      </div>

                      <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '0.25rem' }}>
                          <span style={{ color: '#64748b' }}>Payment ID</span>
                          <span style={{ fontFamily: 'monospace', color: '#334155' }}>{activePayment.paymentId}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                          <span style={{ color: '#64748b' }}>Expires</span>
                          <span style={{ color: '#334155' }}>{new Date(activePayment.expiresAt).toLocaleTimeString()}</span>
                        </div>
                      </div>

                      <a
                        href={activePayment.upiDeeplink}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'block',
                          width: '100%',
                          padding: '0.75rem',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: 'white',
                          textAlign: 'center',
                          borderRadius: '8px',
                          textDecoration: 'none',
                          fontWeight: '600',
                          fontSize: '14px',
                          marginBottom: '0.75rem'
                        }}
                      >
                        📱 Open UPI App
                      </a>

                      <button
                        onClick={handleConfirmPayment}
                        disabled={paymentLoading === 'confirming'}
                        className="submit-btn"
                        style={{ width: '100%', background: '#22c55e' }}
                      >
                        {paymentLoading === 'confirming' ? '⏳ Verifying...' : '✅ I Have Paid — Confirm'}
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Policy Payment Cards */}
            {policies.length === 0 ? (
              <div className="info-card" style={{ textAlign: 'center', padding: '2.5rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
                <p style={{ color: '#64748b', marginBottom: '1rem' }}>No active policies found. Create a policy first to start paying premiums.</p>
                <Link to="/policy" className="submit-btn" style={{ display: 'inline-block', width: 'auto', padding: '0.75rem 2rem', textDecoration: 'none' }}>
                  Create Policy →
                </Link>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {policies.map(policy => {
                  const dailyPremium = (parseFloat(policy.premium) / 7).toFixed(0)
                  const isPaused = policy.status === 'paused'
                  return (
                    <div key={policy.id} className="info-card" style={{
                      border: '1px solid #e2e8f0',
                      opacity: isPaused ? 0.6 : 1
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                          <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem' }}>
                            {policy.type} Plan
                            <span style={{
                              marginLeft: '0.75rem',
                              fontSize: '11px',
                              padding: '3px 10px',
                              borderRadius: '99px',
                              background: isPaused ? '#fef3c7' : '#dcfce7',
                              color: isPaused ? '#92400e' : '#166534',
                              fontWeight: '500'
                            }}>
                              {policy.status.toUpperCase()}
                            </span>
                          </h3>
                          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                            Weekly premium: ₹{parseFloat(policy.premium).toFixed(0)} · Daily: ₹{dailyPremium} · Coverage: ₹{parseFloat(policy.coverage).toLocaleString('en-IN')}
                          </p>
                        </div>
                        <button
                          onClick={() => handlePayPremium(policy.id)}
                          disabled={paymentLoading === policy.id || isPaused}
                          className="submit-btn"
                          style={{
                            width: 'auto',
                            padding: '0.6rem 1.5rem',
                            fontSize: '14px',
                            background: isPaused ? '#94a3b8' : undefined,
                            cursor: isPaused ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {paymentLoading === policy.id ? '⏳ Loading...' : isPaused ? '⏸ Paused' : `💰 Pay ₹${dailyPremium}`}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ── TRANSACTION HISTORY TAB ── */}
        {tab === 'history' && (
          <section className="dashboard-section">
            {/* Premium Charges */}
            <div className="table-card" style={{ marginBottom: '1.5rem' }}>
              <h3>Premium Payments</h3>
              {(!history?.premiumCharges || history.premiumCharges.length === 0) ? (
                <p style={{ color: '#94a3b8', padding: '1rem' }}>No premium payments recorded yet.</p>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Plan</th>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Status</th>
                      <th>Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.premiumCharges.map(charge => (
                      <tr key={charge.id}>
                        <td>{new Date(charge.date || charge.createdAt).toLocaleDateString()}</td>
                        <td>{charge.policyType}</td>
                        <td style={{ fontWeight: '600' }}>₹{charge.amount.toFixed(0)}</td>
                        <td style={{ textTransform: 'uppercase', fontSize: '12px' }}>{charge.method}</td>
                        <td>
                          <span className={`status-badge ${charge.status}`}>{charge.status}</span>
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '11px', color: '#64748b' }}>{charge.reference || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Payouts Received */}
            <div className="table-card">
              <h3>Payouts Received</h3>
              {(!history?.payouts || history.payouts.length === 0) ? (
                <p style={{ color: '#94a3b8', padding: '1rem' }}>No payouts received yet. Claims are processed automatically when triggers are detected.</p>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Trigger</th>
                      <th>Description</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.payouts.map(payout => (
                      <tr key={payout.id}>
                        <td>{new Date(payout.date).toLocaleDateString()}</td>
                        <td style={{ textTransform: 'capitalize' }}>{payout.triggerType || '-'}</td>
                        <td>{payout.description}</td>
                        <td style={{ fontWeight: '600', color: '#16a34a' }}>+₹{payout.amount.toFixed(0)}</td>
                        <td><span className={`status-badge ${payout.status}`}>{payout.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        )}

        {/* ── PAYOUT SETTINGS TAB ── */}
        {tab === 'settings' && (
          <section className="dashboard-section">
            <div className="info-card" style={{ border: '1px solid #e2e8f0' }}>
              <h3 style={{ marginBottom: '1rem' }}>🏦 Your Payout Destination</h3>
              <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '1.5rem' }}>
                When a claim is approved, the payout is sent directly to this destination. Update it in your Profile settings.
              </p>

              <div style={{ display: 'grid', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '28px' }}>📱</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Method</div>
                    <div style={{ fontWeight: '600', fontSize: '15px', color: '#0f172a' }}>
                      {payoutSettings.method === 'UPI' ? '📱 UPI' : payoutSettings.method === 'BANK_TRANSFER' ? '🏦 Bank Transfer' : 'Not configured'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '28px' }}>🔑</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Destination</div>
                    <div style={{ fontWeight: '600', fontSize: '15px', fontFamily: 'monospace', color: '#0f172a' }}>
                      {payoutSettings.handle || 'No UPI ID or account set'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '28px' }}>👤</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Account Holder</div>
                    <div style={{ fontWeight: '600', fontSize: '15px', color: '#0f172a' }}>
                      {payoutSettings.accountName || 'Not set'}
                    </div>
                  </div>
                </div>

                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.75rem 1rem', borderRadius: '8px',
                  background: payoutSettings.consentGiven ? '#dcfce7' : '#fef3c7',
                  border: `1px solid ${payoutSettings.consentGiven ? '#86efac' : '#fde68a'}`,
                  fontSize: '13px', fontWeight: '500',
                  color: payoutSettings.consentGiven ? '#166534' : '#92400e'
                }}>
                  {payoutSettings.consentGiven ? '✅ Direct payout consent active' : '⚠️ Direct payout consent not given'}
                </div>
              </div>

              <Link
                to="/profile"
                style={{
                  display: 'inline-block',
                  marginTop: '1.5rem',
                  padding: '0.75rem 1.5rem',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '14px'
                }}
              >
                ✏️ Update Payout Settings
              </Link>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

export default PaymentsPage
