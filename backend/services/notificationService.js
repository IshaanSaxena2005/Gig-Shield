/**
 * notificationService.js
 * ----------------------
 * Thin wrapper over the Notification model. Centralises creation, listing,
 * and read-marking so controllers don't replicate query logic.
 *
 * Notification types (see models/Notification.js):
 *   - weather_trigger_confirmation
 *   - claim_confirmed
 *   - claim_disputed
 *   - payout_sent
 *   - audit_selected
 *   - clawback_initiated
 *   - policy_renewal
 *   - payment_failed
 *   - policy_reactivated
 */

const Notification = require('../models/Notification')
const { Op } = require('sequelize')

const VALID_TYPES = Notification.NOTIFICATION_TYPES

/**
 * Create a notification for a user.
 * Throws on invalid type so misspelt types don't silently succeed.
 */
const createNotification = async ({
  userId,
  type,
  title,
  message,
  data = null,
  expiresInMs = 30 * 24 * 60 * 60 * 1000  // 30 days
}) => {
  if (!userId)                    throw new Error('userId is required')
  if (!VALID_TYPES.includes(type)) throw new Error(`Invalid notification type: ${type}`)
  if (!title)                     throw new Error('title is required')
  if (!message)                   throw new Error('message is required')

  return Notification.create({
    user_id:    userId,
    type,
    title,
    message,
    data,
    is_read:    false,
    expires_at: new Date(Date.now() + expiresInMs),
    created_at: new Date()
  })
}

/**
 * List notifications for a user.
 *
 * @param {number}  userId
 * @param {object}  [opts]
 * @param {boolean} [opts.unreadOnly=true]  only return unread
 * @param {string}  [opts.type]             filter by type
 * @param {number}  [opts.limit=20]         cap (1–100)
 */
const listNotifications = async (userId, { unreadOnly = true, type, limit = 20 } = {}) => {
  const safeLimit = Math.min(Math.max(1, Number(limit) || 20), 100)
  const where = {
    user_id:    userId,
    expires_at: { [Op.gt]: new Date() }  // hide expired rows
  }
  if (unreadOnly) where.is_read = false
  if (type)       where.type    = type

  const [notifications, unread_count] = await Promise.all([
    Notification.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: safeLimit
    }),
    Notification.count({
      where: {
        user_id:    userId,
        is_read:    false,
        expires_at: { [Op.gt]: new Date() }
      }
    })
  ])

  return { notifications, unread_count }
}

/**
 * Mark a single notification as read (owner-check enforced by caller).
 * Returns the updated row, or null if not found.
 */
const markAsRead = async (notificationId, userId) => {
  const notification = await Notification.findOne({
    where: { id: notificationId, user_id: userId }
  })
  if (!notification) return null

  if (!notification.is_read) {
    // beforeUpdate hook on the model auto-sets read_at
    notification.is_read = true
    await notification.save()
  }
  return notification
}

/**
 * Mark all unread notifications for a user as read. Returns the count updated.
 */
const markAllAsRead = async (userId) => {
  const [affected] = await Notification.update(
    { is_read: true, read_at: new Date() },
    { where: { user_id: userId, is_read: false } }
  )
  return affected
}

/**
 * Cleanup — delete expired notifications. Called by a background job.
 */
const cleanupExpired = async () => {
  return Notification.destroy({
    where: { expires_at: { [Op.lt]: new Date() } }
  })
}

module.exports = {
  createNotification,
  listNotifications,
  markAsRead,
  markAllAsRead,
  cleanupExpired,
  VALID_TYPES
}
