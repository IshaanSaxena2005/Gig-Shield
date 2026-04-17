import React, { useState, useEffect, useCallback } from 'react'
import Navbar       from '../components/Navbar'
import StatCard     from '../components/StatCard'
import JobMonitor   from '../components/admin/JobMonitor'
import AuditPanel   from '../components/admin/AuditPanel'
import '../styles/dashboard.css'
import {
  getDashboardStats, getRiskZones, getFraudAlerts,
  getAllClaims, getFlaggedClaims, updateClaimStatus,
  getReserveHealth
} from '../services/adminService'

// ── Reserve health sub-panel ─────────────────────────────────────────────────
// Colour-coded solvency snapshot. `band` comes from the backend so the UI
// doesn't have to duplicate the threshold constants (they live in reserveService).
const BAND_STYLE = {
  healthy:  { color: '#27ae60', label: 'Healthy'       },
  warn:     { color: '#f39c12', label: 'Caution'       },
  low:      { color: '#e67e22', label: 'Low — alert'   },
  critical: { color: '#e74c3c', label: 'Critical — sales halted' }
}

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`

const ReserveHealthPanel = ({ reserves }) => {
  const { snapshot, band, policySalesHalted, payoutsBlocked, recentEntries = [] } = reserves
  const style   = BAND_STYLE[band] || BAND_STYLE.healthy
  const ratioStr = snapshot.ratio == null ? '∞' : snapshot.ratio.toFixed(3)

  return (
    <section className="dashboard-section">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.5rem' }}>
        <h3 style={{ margin: 0 }}>Reserve Health</h3>
        <span style={{
          background: style.color, color:'white', padding:'3px 12px',
          borderRadius:99, fontSize:12, fontWeight:500
        }}>
          {style.label}
        </span>
      </div>

      <div className="info-card">
        <div className="info-grid">
          <div className="info-item">
            <span className="label">Solvency Ratio</span>
            <span className="value" style={{ color: style.color, fontWeight: 700 }}>{ratioStr}</span>
          </div>
          <div className="info-item">
            <span className="label">Liquidity</span>
            <span className="value">{inr(snapshot.liquidity)}</span>
          </div>
          <div className="info-item">
            <span className="label">Reinsurance Recoverable</span>
            <span className="value">{inr(snapshot.reinsurance)}</span>
          </div>
          <div className="info-item">
            <span className="label">Claims Pending</span>
            <span className="value" style={{ color: snapshot.claimsPending > 0 ? '#e67e22' : 'inherit' }}>
              {inr(snapshot.claimsPending)}
            </span>
          </div>
          <div className="info-item">
            <span className="label">Operational Reserve</span>
            <span className="value">{inr(snapshot.operational)}</span>
          </div>
          <div className="info-item">
            <span className="label">Safety Margin</span>
            <span className="value">{snapshot.safetyMargin}×</span>
          </div>
        </div>

        {(payoutsBlocked || policySalesHalted) && (
          <div style={{
            marginTop:'0.75rem', padding:'8px 12px', borderRadius:6,
            background:'rgba(231, 76, 60, 0.08)', border:'1px solid #e74c3c',
            fontSize:12, color:'#c0392b'
          }}>
            {policySalesHalted && <div>⚠ New policy sales auto-halted (ratio &lt; 0.6). Top up liquidity to restore.</div>}
            {payoutsBlocked    && <div>⚠ Individual payouts will be blocked (ratio &lt; 1.0).</div>}
          </div>
        )}

        <p style={{ fontSize:'12px', color:'#888', marginTop:'0.75rem' }}>
          Formula: (Liquidity + Reinsurance) / (Claims Pending × {snapshot.safetyMargin}). Healthy ≥ 1.0. Alert &lt; 0.8. Critical &lt; 0.6.
        </p>

        {recentEntries.length > 0 && (
          <details style={{ marginTop:'0.75rem' }}>
            <summary style={{ cursor:'pointer', fontSize:13, fontWeight:500 }}>
              Recent ledger entries ({recentEntries.length})
            </summary>
            <div style={{ marginTop:'0.5rem', maxHeight:200, overflowY:'auto', fontSize:12 }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ textAlign:'left', color:'#888', borderBottom:'1px solid #eee' }}>
                    <th style={{ padding:'4px 6px' }}>When</th>
                    <th style={{ padding:'4px 6px' }}>Type</th>
                    <th style={{ padding:'4px 6px', textAlign:'right' }}>Amount</th>
                    <th style={{ padding:'4px 6px' }}>Reference</th>
                    <th style={{ padding:'4px 6px' }}>Claim</th>
                  </tr>
                </thead>
                <tbody>
                  {recentEntries.map(e => {
                    const amt = parseFloat(e.amount)
                    return (
                      <tr key={e.id} style={{ borderBottom:'1px solid #f5f5f5' }}>
                        <td style={{ padding:'4px 6px', color:'#666' }}>{new Date(e.created_at).toLocaleString('en-IN', { dateStyle:'short', timeStyle:'short' })}</td>
                        <td style={{ padding:'4px 6px' }}>{e.reserve_type}</td>
                        <td style={{ padding:'4px 6px', textAlign:'right', color: amt < 0 ? '#e74c3c' : '#27ae60', fontWeight:500 }}>
                          {amt < 0 ? '−' : '+'}{inr(Math.abs(amt))}
                        </td>
                        <td style={{ padding:'4px 6px', color:'#888', fontFamily:'monospace', fontSize:11 }}>{e.reference || '—'}</td>
                        <td style={{ padding:'4px 6px', color:'#888' }}>{e.allocated_to_claim_id || '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </div>
    </section>
  )
}

// ── Overview panel (the original AdminDashboard content) ─────────────────────
// Kept as an inner component so it shares no cross-tab state with the others.
const OverviewPanel = () => {
  const [metrics,       setMetrics]       = useState({ workersInsured:0, activePolicies:0, totalPremium:0, totalPayout:0, lossRatio:0, combinedRatio:0, targetLossRatio:65, flaggedClaims:0 })
  const [claimsOverview,setClaimsOverview]= useState({ claimsToday:0, claimsThisWeek:0, totalPayout:0 })
  const [fraudAlerts,   setFraudAlerts]   = useState([])
  const [riskZones,     setRiskZones]     = useState([])
  const [claims,        setClaims]        = useState([])
  const [claimPage,     setClaimPage]     = useState(1)
  const [claimTotal,    setClaimTotal]    = useState(0)
  const [claimFilter,   setClaimFilter]   = useState('all')   // 'all' | 'flagged'
  const [actionLoading, setActionLoading] = useState(null)
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState(null)
  const [reserves,      setReserves]      = useState(null)

  const fetchClaims = useCallback(async (page = 1, filter = 'all') => {
    try {
      const res = filter === 'flagged'
        ? await getFlaggedClaims(page)
        : await getAllClaims(page)
      setClaims(res.claims || [])
      setClaimTotal(res.pagination?.total || 0)
    } catch { /* silent — main load already shows error if needed */ }
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        const [stats, zones, fraud, reserveData] = await Promise.all([
          getDashboardStats(), getRiskZones(), getFraudAlerts(),
          getReserveHealth().catch(() => null)   // non-blocking — panel just hides if backend lacks the endpoint
        ])
        setMetrics(stats.platformMetrics)
        setClaimsOverview(stats.claimsOverview)
        setRiskZones(zones)
        setFraudAlerts(fraud)
        setReserves(reserveData)
        await fetchClaims(1, 'all')
      } catch (err) {
        setError('Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [fetchClaims])

  const handleFilterChange = (f) => {
    setClaimFilter(f)
    setClaimPage(1)
    fetchClaims(1, f)
  }

  const handleClaimAction = async (claimId, status) => {
    const notes = status === 'rejected'
      ? window.prompt('Reason for rejection (shown to worker):') ?? ''
      : ''
    if (status === 'rejected' && notes === null) return // cancelled prompt
    try {
      setActionLoading(claimId)
      await updateClaimStatus(claimId, status, notes)
      fetchClaims(claimPage, claimFilter)
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed')
    } finally {
      setActionLoading(null)
    }
  }

  const handlePageChange = (p) => {
    setClaimPage(p)
    fetchClaims(p, claimFilter)
  }

  if (loading) return <div className="loading">Loading dashboard...</div>
  if (error)   return <div className="error">{error}</div>

  const lrColor = metrics.lossRatio > 80 ? '#e74c3c' : metrics.lossRatio > 65 ? '#f39c12' : '#27ae60'

  return (
    <>
      {/* Platform Metrics */}
      <section className="dashboard-section">
        <h3>Platform Metrics</h3>
        <div className="stats-grid">
          <StatCard title="Workers Insured"         value={metrics.workersInsured}                       icon="👥" />
          <StatCard title="Active Policies"         value={metrics.activePolicies}                       icon="📋" />
          <StatCard title="Total Premium Collected" value={`₹${metrics.totalPremium.toLocaleString()}`}  icon="💰" />
          <StatCard title="Total Payout"            value={`₹${metrics.totalPayout.toLocaleString()}`}   icon="💸" />
        </div>
      </section>

      {/* Reserve Health — solvency ratio, liquidity pools, gating state */}
      {reserves && <ReserveHealthPanel reserves={reserves} />}

      {/* Actuarial Metrics */}
      <section className="dashboard-section">
        <h3>Actuarial Health</h3>
        <div className="info-card">
          <div className="info-grid">
            <div className="info-item">
              <span className="label">Loss Ratio</span>
              <span className="value" style={{ color: lrColor, fontWeight: 700 }}>
                {metrics.lossRatio}%
              </span>
            </div>
            <div className="info-item">
              <span className="label">Combined Ratio</span>
              <span className="value">{metrics.combinedRatio}%</span>
            </div>
            <div className="info-item">
              <span className="label">Target Loss Ratio</span>
              <span className="value">{metrics.targetLossRatio}%</span>
            </div>
            <div className="info-item">
              <span className="label">Flagged Claims</span>
              <span className="value" style={{ color: metrics.flaggedClaims > 0 ? '#e74c3c' : 'inherit' }}>
                {metrics.flaggedClaims}
              </span>
            </div>
            <div className="info-item">
              <span className="label">Claims Today</span>
              <span className="value">{claimsOverview.claimsToday}</span>
            </div>
            <div className="info-item">
              <span className="label">Claims This Week</span>
              <span className="value">{claimsOverview.claimsThisWeek}</span>
            </div>
          </div>
          <p style={{ fontSize: '12px', color: '#888', marginTop: '0.75rem' }}>
            Target loss ratio: 63–68%. Above 80% is a loss-making position.
          </p>
        </div>
      </section>

      {/* Claims Management */}
      <section className="dashboard-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 style={{ margin: 0 }}>Claims Management</h3>
          <div style={{ display: 'flex', gap: '6px' }}>
            {['all', 'flagged'].map(f => (
              <button key={f} onClick={() => handleFilterChange(f)}
                style={{
                  padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                  border: '1px solid var(--color-border-secondary)',
                  background: claimFilter === f ? 'var(--color-text-primary)' : 'transparent',
                  color: claimFilter === f ? 'var(--color-background-primary)' : 'var(--color-text-secondary)'
                }}>
                {f === 'all' ? `All (${claimTotal})` : `Flagged (${metrics.flaggedClaims})`}
              </button>
            ))}
          </div>
        </div>
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th><th>Worker</th><th>Trigger / Type</th><th>Amount</th><th>Date</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {claims.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', color: '#888', padding: '1.5rem' }}>No claims found.</td></tr>
              ) : claims.map(claim => (
                <tr key={claim.id}>
                  <td style={{ fontSize: '12px', color: '#888' }}>#{claim.id}</td>
                  <td>
                    <div style={{ fontSize: '13px', fontWeight: 500 }}>{claim.user?.name || '—'}</div>
                    <div style={{ fontSize: '11px', color: '#888' }}>{claim.user?.email}</div>
                  </td>
                  <td style={{ fontSize: '12px', maxWidth: '180px' }}>
                    <div style={{ fontWeight: 500 }}>{claim.triggerType || 'Manual'}</div>
                    <div style={{ color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {claim.description?.slice(0, 60)}{claim.description?.length > 60 ? '…' : ''}
                    </div>
                  </td>
                  <td style={{ fontWeight: 600 }}>₹{Number(claim.amount).toLocaleString()}</td>
                  <td style={{ fontSize: '12px', color: '#888' }}>
                    {new Date(claim.submittedAt).toLocaleDateString('en-IN')}
                  </td>
                  <td>
                    <span className={`status-badge ${claim.status?.toLowerCase()}`}>
                      {claim.status}
                    </span>
                  </td>
                  <td>
                    {(claim.status === 'pending' || claim.status === 'flagged') ? (
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button className="action-btn activate"
                          style={{ padding: '3px 10px', fontSize: '12px' }}
                          disabled={actionLoading === claim.id}
                          onClick={() => handleClaimAction(claim.id, 'approved')}>
                          {actionLoading === claim.id ? '…' : '✓'}
                        </button>
                        <button className="action-btn cancel"
                          style={{ padding: '3px 10px', fontSize: '12px' }}
                          disabled={actionLoading === claim.id}
                          onClick={() => handleClaimAction(claim.id, 'rejected')}>
                          {actionLoading === claim.id ? '…' : '✕'}
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#aaa' }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {claimTotal > 20 && (
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', padding: '0.75rem', borderTop: '1px solid var(--color-border-tertiary)' }}>
              <button disabled={claimPage === 1} onClick={() => handlePageChange(claimPage - 1)}
                style={{ padding: '4px 12px', fontSize: '12px', cursor: 'pointer', borderRadius: '6px', border: '1px solid var(--color-border-secondary)', background: 'transparent', color: 'var(--color-text-primary)' }}>
                ← Prev
              </button>
              <span style={{ fontSize: '12px', color: '#888', alignSelf: 'center' }}>
                Page {claimPage} of {Math.ceil(claimTotal / 20)}
              </span>
              <button disabled={claimPage >= Math.ceil(claimTotal / 20)} onClick={() => handlePageChange(claimPage + 1)}
                style={{ padding: '4px 12px', fontSize: '12px', cursor: 'pointer', borderRadius: '6px', border: '1px solid var(--color-border-secondary)', background: 'transparent', color: 'var(--color-text-primary)' }}>
                Next →
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Fraud Alerts */}
      <section className="dashboard-section">
        <h3>Fraud Detection Alerts</h3>
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr><th>Worker</th><th>Claims (7d)</th><th>Risk Score</th><th>Severity</th><th>Reasons</th></tr>
            </thead>
            <tbody>
              {fraudAlerts.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', color: '#888', padding: '1.5rem' }}>No fraud alerts this week.</td></tr>
              ) : fraudAlerts.map(alert => (
                <tr key={alert.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{alert.userName || '—'}</div>
                  </td>
                  <td style={{ textAlign: 'center' }}>{alert.claimCount}</td>
                  <td style={{ textAlign: 'center', fontWeight: 600,
                    color: alert.riskScore > 50 ? '#e74c3c' : alert.riskScore > 20 ? '#f39c12' : '#27ae60' }}>
                    {alert.riskScore}
                  </td>
                  <td>
                    <span className={`severity-badge ${alert.severity}`}>
                      {alert.severity?.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ fontSize: '12px', color: '#666' }}>
                    {alert.reasons?.join('; ') || alert.type}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Risk Zones */}
      <section className="dashboard-section">
        <h3>Risk Zones</h3>
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr><th>City</th><th>Risk Level</th><th>Peak Hazard</th></tr>
            </thead>
            <tbody>
              {riskZones.map((zone, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 500 }}>{zone.location}</td>
                  <td>
                    <span className={`risk-badge ${zone.riskLevel?.toLowerCase()}`}>
                      {zone.riskLevel}
                    </span>
                  </td>
                  <td style={{ fontSize: '12px', color: '#666' }}>
                    {zone.weatherConditions?.primaryHazard || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}

// ── Tab configuration ────────────────────────────────────────────────────────
const TABS = [
  { id: 'overview', name: 'Overview',    Component: OverviewPanel },
  { id: 'audit',    name: 'Fraud Audit', Component: AuditPanel },
  { id: 'jobs',     name: 'Job Monitor', Component: JobMonitor }
]

// ── Root AdminDashboard with tab switcher ────────────────────────────────────
const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview')
  const active = TABS.find(t => t.id === activeTab) || TABS[0]
  const ActiveComponent = active.Component

  return (
    <div className="dashboard-container">
      <Navbar />
      <div className="dashboard-content">
        <h2 className="page-title">Admin Dashboard</h2>

        <nav className="admin-tabs" role="tablist" aria-label="Admin sections">
          {TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`admin-tab-${tab.id}`}
              aria-selected={activeTab === tab.id}
              aria-controls={`admin-tabpanel-${tab.id}`}
              className={`admin-tabs__tab ${activeTab === tab.id ? 'admin-tabs__tab--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.name}
            </button>
          ))}
        </nav>

        <div
          id={`admin-tabpanel-${active.id}`}
          role="tabpanel"
          aria-labelledby={`admin-tab-${active.id}`}
          className="admin-tabs__panel"
        >
          <ActiveComponent />
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
