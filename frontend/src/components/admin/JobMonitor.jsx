import React, { useEffect, useState, useCallback } from 'react'
import {
  fetchJobHealth,
  fetchJobAudit,
  fetchDeadLetter,
  retryJob
} from '../../services/adminJobsService'

const PAGE_SIZE = 20
const AUTO_REFRESH_MS = 30_000

const JOB_NAME_OPTIONS = [
  { value: '', label: 'All jobs' },
  { value: 'parametric_claim_check', label: 'Parametric claim check' },
  { value: 'policy_auto_renewal',    label: 'Policy auto-renewal' }
]

const STATUS_OPTIONS = [
  { value: '',            label: 'All statuses' },
  { value: 'success',     label: 'Success' },
  { value: 'failed',      label: 'Failed' },
  { value: 'retried',     label: 'Retried' },
  { value: 'dead_letter', label: 'Dead letter' },
  { value: 'running',     label: 'Running' }
]

// ── Utilities ────────────────────────────────────────────────────────────────
const formatDate = (value) => {
  if (!value) return '—'
  try {
    const d = new Date(value)
    return d.toLocaleString(undefined, {
      year:   'numeric',
      month:  'short',
      day:    '2-digit',
      hour:   '2-digit',
      minute: '2-digit'
    })
  } catch {
    return String(value)
  }
}

const StatusBadge = ({ status }) => {
  const cls = `job-monitor-badge job-monitor-badge--${status || 'unknown'}`
  return <span className={cls}>{status || 'unknown'}</span>
}

const HealthCard = ({ label, value, tone = 'neutral', sublabel }) => (
  <div className={`job-monitor-stat job-monitor-stat--${tone}`}>
    <div className="job-monitor-stat__label">{label}</div>
    <div className="job-monitor-stat__value">{value}</div>
    {sublabel && <div className="job-monitor-stat__sublabel">{sublabel}</div>}
  </div>
)

// ── Main component ───────────────────────────────────────────────────────────
const JobMonitor = () => {
  // Health summary
  const [health, setHealth]                 = useState(null)
  const [healthError, setHealthError]       = useState(null)

  // Audit table
  const [audit, setAudit]                   = useState({ runs: [], total: 0, page: 1, totalPages: 1 })
  const [auditLoading, setAuditLoading]     = useState(true)
  const [auditError, setAuditError]         = useState(null)

  // Dead letter
  const [deadLetter, setDeadLetter]         = useState({ runs: [], total: 0 })
  const [deadLetterOpen, setDeadLetterOpen] = useState(true)
  const [deadLetterError, setDeadLetterError] = useState(null)

  // Filters & pagination
  const [filterJobName, setFilterJobName]   = useState('')
  const [filterStatus, setFilterStatus]     = useState('')
  const [page, setPage]                     = useState(1)

  // Retry state — map of auditId → boolean (in flight)
  const [retrying, setRetrying]             = useState({})
  const [retryMessage, setRetryMessage]     = useState(null)

  // Auto-refresh toggle
  const [autoRefresh, setAutoRefresh]       = useState(true)

  // ── Data loaders ───────────────────────────────────────────────────────────
  const loadHealth = useCallback(async () => {
    try {
      const data = await fetchJobHealth(7)
      setHealth(data)
      setHealthError(null)
    } catch (err) {
      setHealthError(err.response?.data?.error || err.message || 'Failed to load health')
    }
  }, [])

  const loadAudit = useCallback(async () => {
    setAuditLoading(true)
    try {
      const data = await fetchJobAudit({
        limit:   PAGE_SIZE,
        offset:  (page - 1) * PAGE_SIZE,
        jobName: filterJobName || undefined,
        status:  filterStatus  || undefined
      })
      setAudit(data)
      setAuditError(null)
    } catch (err) {
      setAuditError(err.response?.data?.error || err.message || 'Failed to load audit log')
    } finally {
      setAuditLoading(false)
    }
  }, [page, filterJobName, filterStatus])

  const loadDeadLetter = useCallback(async () => {
    try {
      const data = await fetchDeadLetter(100)
      setDeadLetter(data)
      setDeadLetterError(null)
    } catch (err) {
      setDeadLetterError(err.response?.data?.error || err.message || 'Failed to load dead letter')
    }
  }, [])

  const refreshAll = useCallback(() => {
    loadHealth()
    loadAudit()
    loadDeadLetter()
  }, [loadHealth, loadAudit, loadDeadLetter])

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => { loadHealth() },     [loadHealth])
  useEffect(() => { loadAudit() },      [loadAudit])
  useEffect(() => { loadDeadLetter() }, [loadDeadLetter])

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return undefined
    const id = setInterval(refreshAll, AUTO_REFRESH_MS)
    return () => clearInterval(id)
  }, [autoRefresh, refreshAll])

  // Reset to page 1 whenever filters change
  useEffect(() => { setPage(1) }, [filterJobName, filterStatus])

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleRetry = async (auditId) => {
    setRetrying(prev => ({ ...prev, [auditId]: true }))
    setRetryMessage(null)
    try {
      await retryJob(auditId)
      setRetryMessage({ type: 'success', text: `Job ${auditId} re-queued successfully` })
      // Refresh dead-letter list and audit log so the user sees the change
      loadDeadLetter()
      loadAudit()
      loadHealth()
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Retry failed'
      setRetryMessage({ type: 'error', text: `Retry failed: ${msg}` })
    } finally {
      setRetrying(prev => ({ ...prev, [auditId]: false }))
    }
  }

  // ── Derived values for header cards ────────────────────────────────────────
  const overall      = health?.overall || {}
  const successRate  = Number(overall.success_rate) || 0
  const totalRuns    = Number(overall.total_runs)   || 0
  const deadLetterCount = deadLetter?.total || 0

  const successTone = successRate >= 95 ? 'success' : successRate >= 80 ? 'warning' : 'danger'
  const deadTone    = deadLetterCount === 0 ? 'success' : deadLetterCount < 5 ? 'warning' : 'danger'

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <section className="job-monitor">
      {/* Header */}
      <div className="job-monitor__header">
        <div>
          <h2 className="job-monitor__title">Background Job Monitor</h2>
          <p className="job-monitor__subtitle">
            Health, audit trail, and dead-letter queue for scheduled jobs
          </p>
        </div>
        <div className="job-monitor__controls">
          <label className="job-monitor__toggle">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            <span>Auto-refresh (30s)</span>
          </label>
          <button
            type="button"
            className="btn-secondary"
            onClick={refreshAll}
          >
            Refresh now
          </button>
        </div>
      </div>

      {/* Health cards */}
      <div className="job-monitor__stats">
        <HealthCard
          label="Success rate (7d)"
          value={`${successRate.toFixed(1)}%`}
          tone={successTone}
          sublabel={`${totalRuns} total runs`}
        />
        <HealthCard
          label="Total runs (7d)"
          value={totalRuns}
          tone="neutral"
        />
        <HealthCard
          label="Dead letter queue"
          value={deadLetterCount}
          tone={deadTone}
          sublabel={deadLetterCount === 0 ? 'All clear' : 'Needs attention'}
        />
      </div>

      {healthError && (
        <div className="job-monitor__error">Health summary error: {healthError}</div>
      )}

      {/* Per-job breakdown */}
      {health?.jobs && Object.keys(health.jobs).length > 0 && (
        <div className="job-monitor__per-job">
          {Object.entries(health.jobs).map(([jobName, counts]) => (
            <div key={jobName} className="job-monitor__per-job-card">
              <div className="job-monitor__per-job-name">{jobName}</div>
              <div className="job-monitor__per-job-counts">
                <span className="job-monitor__per-job-count job-monitor__per-job-count--success">
                  ✓ {counts.success || 0}
                </span>
                <span className="job-monitor__per-job-count job-monitor__per-job-count--retried">
                  ↻ {counts.retried || 0}
                </span>
                <span className="job-monitor__per-job-count job-monitor__per-job-count--failed">
                  ✗ {(counts.failed || 0) + (counts.dead_letter || 0)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Retry status banner */}
      {retryMessage && (
        <div className={`job-monitor__banner job-monitor__banner--${retryMessage.type}`}>
          {retryMessage.text}
          <button
            type="button"
            className="job-monitor__banner-close"
            onClick={() => setRetryMessage(null)}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* Dead letter section */}
      <div className="job-monitor__section">
        <button
          type="button"
          className="job-monitor__section-toggle"
          onClick={() => setDeadLetterOpen(o => !o)}
          aria-expanded={deadLetterOpen}
        >
          <span>{deadLetterOpen ? '▾' : '▸'}</span>
          <span>Dead letter queue ({deadLetterCount})</span>
        </button>

        {deadLetterOpen && (
          <div className="job-monitor__section-body">
            {deadLetterError && (
              <div className="job-monitor__error">{deadLetterError}</div>
            )}
            {!deadLetterError && deadLetter.runs.length === 0 && (
              <div className="job-monitor__empty">No failed jobs awaiting attention. 🎉</div>
            )}
            {deadLetter.runs.length > 0 && (
              <div className="table-card">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Job</th>
                      <th>Failed at</th>
                      <th>Retries</th>
                      <th>Error</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deadLetter.runs.map(run => (
                      <tr key={run.id}>
                        <td>#{run.id}</td>
                        <td>{run.job_name}</td>
                        <td>{formatDate(run.completed_at || run.started_at)}</td>
                        <td>{run.retry_count ?? 0}</td>
                        <td className="job-monitor__error-cell" title={run.error_message}>
                          {run.error_message || '—'}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="action-btn activate"
                            disabled={!!retrying[run.id]}
                            onClick={() => handleRetry(run.id)}
                          >
                            {retrying[run.id] ? 'Retrying…' : 'Retry'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="job-monitor__filters">
        <div className="form-group">
          <label htmlFor="job-monitor-filter-job">Job</label>
          <select
            id="job-monitor-filter-job"
            value={filterJobName}
            onChange={(e) => setFilterJobName(e.target.value)}
          >
            {JOB_NAME_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="job-monitor-filter-status">Status</label>
          <select
            id="job-monitor-filter-status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Audit table */}
      <div className="job-monitor__section">
        <h3 className="job-monitor__section-title">Recent runs</h3>

        {auditError && (
          <div className="job-monitor__error">{auditError}</div>
        )}

        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Job</th>
                <th>Started at</th>
                <th>Status</th>
                <th>Retries</th>
                <th>Affected</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              {auditLoading && (
                <tr><td colSpan="6" className="job-monitor__empty">Loading…</td></tr>
              )}
              {!auditLoading && audit.runs.length === 0 && (
                <tr><td colSpan="6" className="job-monitor__empty">No runs match the current filters.</td></tr>
              )}
              {!auditLoading && audit.runs.map(run => {
                const start = run.started_at ? new Date(run.started_at).getTime() : null
                const end   = run.completed_at ? new Date(run.completed_at).getTime() : null
                const durationMs = (start && end) ? (end - start) : null
                return (
                  <tr key={run.id}>
                    <td>{run.job_name}</td>
                    <td>{formatDate(run.started_at)}</td>
                    <td><StatusBadge status={run.status} /></td>
                    <td>{run.retry_count ?? 0}</td>
                    <td>{run.affected_records ?? 0}</td>
                    <td>{durationMs != null ? `${(durationMs / 1000).toFixed(2)}s` : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="job-monitor__pagination">
          <button
            type="button"
            className="btn-secondary"
            disabled={page <= 1 || auditLoading}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            ← Previous
          </button>
          <span className="job-monitor__page-info">
            Page {audit.page || page} of {audit.totalPages || 1}
            {audit.total != null && ` · ${audit.total} total`}
          </span>
          <button
            type="button"
            className="btn-secondary"
            disabled={(audit.totalPages || 1) <= page || auditLoading}
            onClick={() => setPage(p => p + 1)}
          >
            Next →
          </button>
        </div>
      </div>
    </section>
  )
}

export default JobMonitor
