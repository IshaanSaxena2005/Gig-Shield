import React from 'react'

/**
 * AuditPanel — Fraud audit & self-certification queue.
 *
 * Placeholder for Phase 2. Requires backend endpoints that don't exist yet:
 *   - GET  /api/admin/verification/pending-audit
 *   - POST /api/admin/verification/:id/audit
 *   - POST /api/admin/verification/:id/clawback
 *
 * Replaces this placeholder once those routes are built.
 */
const AuditPanel = () => {
  return (
    <section className="admin-panel-placeholder">
      <div className="admin-panel-placeholder__inner">
        <div className="admin-panel-placeholder__icon" aria-hidden="true">🔍</div>
        <h3 className="admin-panel-placeholder__title">Fraud Audit Panel</h3>
        <p className="admin-panel-placeholder__subtitle">
          Self-certification review and clawback tools will live here.
        </p>
        <ul className="admin-panel-placeholder__checklist">
          <li>Pending self-certification queue</li>
          <li>Fraud flag with clawback action</li>
          <li>Audit notes and worker history</li>
        </ul>
        <p className="admin-panel-placeholder__status">
          Status: backend endpoints pending (Phase 2)
        </p>
      </div>
    </section>
  )
}

export default AuditPanel
