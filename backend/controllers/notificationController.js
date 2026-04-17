/**
 * notificationController.js
 * -------------------------
 * In-app notifications for the authenticated worker.
 *
 * Endpoints:
 *   GET  /api/user/notifications              — list unread (filterable by type)
 *   POST /api/user/notifications/:id/read     — mark one as read
 *   POST /api/user/notifications/read-all     — mark all as read (convenience)
 */

const {
  listNotifications,
  markAsRead,
  markAllAsRead,
  VALID_TYPES
} = require('../services/notificationService')

/**
 * GET /api/user/notifications?limit=20&type=weather_trigger_confirmation&unreadOnly=true
 */
exports.getNotifications = async (req, res) => {
  try {
    const { type } = req.query
    const limit    = parseInt(req.query.limit) || 20
    // Default: unread only (matches the spec). Pass ?unreadOnly=false to see all.
    const unreadOnly = req.query.unreadOnly !== 'false'

    if (type && !VALID_TYPES.includes(type)) {
      return res.status(400).json({
        message: `Invalid notification type. Allowed: ${VALID_TYPES.join(', ')}`
      })
    }

    const result = await listNotifications(req.user.id, { unreadOnly, type, limit })
    res.json(result)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

/**
 * POST /api/user/notifications/:id/read
 */
exports.markNotificationRead = async (req, res) => {
  try {
    const notificationId = parseInt(req.params.id)
    if (!Number.isFinite(notificationId) || notificationId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid notification id' })
    }

    const updated = await markAsRead(notificationId, req.user.id)
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Notification not found' })
    }

    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

/**
 * POST /api/user/notifications/read-all
 * Marks every unread notification for this worker as read.
 */
exports.markAllRead = async (req, res) => {
  try {
    const updated = await markAllAsRead(req.user.id)
    res.json({ success: true, updated })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}
