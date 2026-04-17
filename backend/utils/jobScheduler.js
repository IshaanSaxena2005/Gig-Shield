/**
 * jobScheduler.js
 * ---------------
 * Class-based wrapper for background jobs with:
 *   - Long-form exponential backoff: 5min → 25min → 2hr → 6hr → dead letter
 *   - Non-blocking retries (scheduled via setTimeout — caller returns immediately)
 *   - Automatic audit logging to JobAudit table
 *   - Error tracking with full message capture
 *   - Alert hook on dead letter (console.error today; pluggable email/Slack later)
 *
 * Usage:
 *   const jobScheduler = require('../utils/jobScheduler')
 *   await jobScheduler.runJob('parametric_claim_check', async () => {
 *     // ...do work
 *     return { affectedCount: 5 }
 *   }, { policiesChecked: 42 })
 *
 * Design notes:
 *   - Each invocation of runJob() creates a fresh JobAudit row.
 *   - When a job fails, the row is updated to 'retried' (or 'dead_letter' on
 *     the final failure) and a new run is scheduled via setTimeout.
 *   - The retry chain is linked through context.parentAuditId and
 *     context.retryAttempt so the full history can be reconstructed.
 */

const JobAudit = require('../models/JobAudit')
const { Op, fn, col } = require('sequelize')

// Backoff schedule (seconds): 5min, 25min, 2hr, 6hr → dead letter after 4 retries
const RETRY_DELAYS_SEC = [300, 1500, 7200, 21600]

class JobScheduler {
  /**
   * Execute jobFunction with full audit + retry handling.
   *
   * @param {string}   jobName      stable job identifier
   * @param {function} jobFunction  async () => ({ affectedCount, ...metadata }) | void
   * @param {object}   [context]    free-form metadata stored on the audit row
   * @returns {object}  { status, ... } — 'success' | 'retried' | 'dead_letter'
   */
  async runJob(jobName, jobFunction, context = {}) {
    // Carry retry chain info forward from previous attempts
    const startingRetryCount = Number(context.retryAttempt) || 0

    const audit = await JobAudit.create({
      job_name:    jobName,
      started_at:  new Date(),
      status:      'running',
      metadata:    context,
      retry_count: startingRetryCount
    })

    try {
      const result = await jobFunction()

      await audit.update({
        completed_at:     new Date(),
        status:           'success',
        affected_records: result?.affectedCount || result?.affectedRecords || 0,
        metadata:         { ...context, ...(result?.metadata || {}) }
      })

      return result || { status: 'success' }
    } catch (error) {
      return this.handleJobFailure(audit, error, jobFunction, context)
    }
  }

  /**
   * Mark the run as 'retried' or 'dead_letter' and schedule the next attempt.
   */
  async handleJobFailure(audit, error, jobFunction, context) {
    const newRetryCount = (Number(audit.retry_count) || 0) + 1
    const errMsg = (error?.message || String(error) || 'Unknown error').slice(0, 10000)

    if (newRetryCount <= RETRY_DELAYS_SEC.length) {
      // ── Schedule retry with backoff ────────────────────────────────────────
      await audit.update({
        status:        'retried',
        error_message: errMsg,
        retry_count:   newRetryCount,
        completed_at:  new Date()
      })

      const delaySec = RETRY_DELAYS_SEC[newRetryCount - 1]
      const retryAt  = new Date(Date.now() + delaySec * 1000)

      console.warn(
        `[jobScheduler] ${audit.job_name} failed (attempt ${newRetryCount}/${RETRY_DELAYS_SEC.length + 1}). ` +
        `Retrying in ${delaySec}s at ${retryAt.toISOString()}: ${errMsg}`
      )

      // Non-blocking retry — caller returns immediately
      setTimeout(async () => {
        try {
          await this.runJob(audit.job_name, jobFunction, {
            ...context,
            isRetry:        true,
            retryAttempt:   newRetryCount,
            parentAuditId:  audit.id
          })
        } catch (retryErr) {
          console.error(`[jobScheduler] Retry of ${audit.job_name} crashed:`, retryErr.message)
        }
      }, delaySec * 1000).unref?.()  // .unref() so it doesn't block process exit

      return {
        status:   'retried',
        auditId:  audit.id,
        retryAt,
        attempt:  newRetryCount
      }
    }

    // ── Exhausted all retries — dead letter ──────────────────────────────────
    await audit.update({
      status:        'dead_letter',
      error_message: errMsg,
      retry_count:   newRetryCount,
      completed_at:  new Date()
    })

    await this.sendAlert(audit.job_name, error, audit.id)

    return {
      status:  'dead_letter',
      auditId: audit.id,
      error:   errMsg
    }
  }

  /**
   * Alert hook for dead-letter events. Currently logs to stderr; replace with
   * email/Slack/PagerDuty integration when ready.
   */
  async sendAlert(jobName, error, auditId) {
    const msg = error?.message || String(error)
    console.error(`[ALERT] Job ${jobName} failed permanently after all retries (audit #${auditId}): ${msg}`)
    // TODO: Add email/Slack webhook integration
    //   - SMTP via nodemailer (already in package.json)
    //   - Slack webhook: POST to process.env.SLACK_ALERT_WEBHOOK
    //   - PagerDuty Events API for on-call rotation
  }

  // ── Admin / observability helpers ──────────────────────────────────────────

  /**
   * Get recent job runs with pagination and filters.
   * Used by admin dashboard.
   */
  async getRecentRuns({
    limit     = 50,
    offset    = 0,
    jobName   = null,
    status    = null,
    startDate = null,
    endDate   = null
  } = {}) {
    const where = {}

    if (jobName) where.job_name = jobName
    if (status)  where.status   = status
    if (startDate && endDate) {
      where.started_at = { [Op.between]: [startDate, endDate] }
    }

    const safeLimit  = Math.min(Math.max(1, Number(limit)  || 50), 500)
    const safeOffset = Math.max(0, Number(offset) || 0)

    const { count, rows } = await JobAudit.findAndCountAll({
      where,
      order:  [['started_at', 'DESC']],
      limit:  safeLimit,
      offset: safeOffset
    })

    return {
      total:      count,
      page:       Math.floor(safeOffset / safeLimit) + 1,
      totalPages: Math.ceil(count / safeLimit),
      runs:       rows
    }
  }

  /**
   * Get dead-letter jobs (failed permanently).
   * Used by admin dashboard for monitoring.
   */
  async getDeadLetterRuns({ limit = 100 } = {}) {
    const safeLimit = Math.min(Math.max(1, Number(limit) || 100), 500)
    const runs = await JobAudit.findAll({
      where: { status: 'dead_letter' },
      order: [['started_at', 'DESC']],
      limit: safeLimit
    })

    return { total: runs.length, runs }
  }

  /**
   * Get job health summary over the last `days` days.
   * Returns per-job status breakdown plus an overall success rate.
   */
  async getJobHealth(days = 7) {
    const safeDays  = Math.min(Math.max(1, Number(days) || 7), 90)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - safeDays)

    const stats = await JobAudit.findAll({
      where: { started_at: { [Op.gte]: startDate } },
      attributes: [
        'job_name',
        'status',
        [fn('COUNT', col('id')), 'count']
      ],
      group: ['job_name', 'status']
    })

    const summary = {}
    stats.forEach(stat => {
      const count = Number(stat.dataValues.count) || 0
      if (!summary[stat.job_name]) {
        summary[stat.job_name] = {
          total:       0,
          success:     0,
          failed:      0,
          retried:     0,
          dead_letter: 0,
          running:     0
        }
      }
      summary[stat.job_name][stat.status] = count
      summary[stat.job_name].total += count
    })

    const totalRuns = stats.reduce((sum, s) => sum + (Number(s.dataValues.count) || 0), 0)

    return {
      period_days: safeDays,
      jobs:        summary,
      overall: {
        total_runs:   totalRuns,
        success_rate: this.calculateSuccessRate(stats)
      }
    }
  }

  /**
   * Manually retry a dead-letter job. Resets the audit row and re-runs the
   * underlying job function by looking it up in the job registry.
   */
  async retryDeadLetterJob(auditId) {
    const audit = await JobAudit.findByPk(auditId)

    if (!audit) {
      throw new Error(`Job audit with id ${auditId} not found`)
    }

    if (audit.status !== 'dead_letter') {
      throw new Error(`Job ${auditId} is not in dead_letter state (current: ${audit.status})`)
    }

    const jobFunction = this.getJobFunctionByName(audit.job_name)
    if (!jobFunction) {
      throw new Error(`No job function registered for "${audit.job_name}"`)
    }

    // Reset the original audit row (historical marker that a manual retry was triggered)
    await audit.update({
      status:        'retried',
      retry_count:   0,
      error_message: null,
      completed_at:  new Date()
    })

    // Re-run — creates a fresh audit row tagged with isManualRetry
    return this.runJob(audit.job_name, jobFunction, {
      ...(audit.metadata || {}),
      isManualRetry:     true,
      originalAuditId:   audit.id
    })
  }

  /**
   * Registry lookup for jobs that can be manually retried.
   * Each module in backend/jobs/ exports the pure worker function.
   */
  getJobFunctionByName(jobName) {
    const jobs = {
      parametric_claim_check:    require('../jobs/parametricClaimCheck'),
      policy_auto_renewal:       require('../jobs/policyAutoRenewal'),
      daily_premium_collection:  require('../jobs/dailyPremiumCollection'),
      retry_failed_premiums:     require('../jobs/retryFailedPremiums')
    }
    return jobs[jobName] || null
  }

  /**
   * Success rate (%) across all jobs in the given stats set.
   */
  calculateSuccessRate(stats) {
    const total = stats.reduce((sum, s) => sum + (Number(s.dataValues.count) || 0), 0)
    const successes = stats
      .filter(s => s.status === 'success')
      .reduce((sum, s) => sum + (Number(s.dataValues.count) || 0), 0)
    return total === 0 ? 0 : Number(((successes / total) * 100).toFixed(2))
  }
}

// Export a singleton — one scheduler instance shared across the app
module.exports = new JobScheduler()
module.exports.JobScheduler = JobScheduler
module.exports.RETRY_DELAYS_SEC = RETRY_DELAYS_SEC
