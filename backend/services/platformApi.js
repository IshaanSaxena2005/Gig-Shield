/**
 * platformApi.js
 * --------------
 * STUB for gig-platform integrations (Zomato, Swiggy, Zepto, Blinkit, Amazon, Flipkart).
 *
 * In production, each platform would have its own HTTP client (or SDK) hitting
 * that platform's partner API to deduct the daily premium slice from the
 * worker's pending earnings before payout. Since no real integration exists
 * yet, this stub:
 *
 *   - Simulates ~90% success rate by default
 *   - Returns a realistic-looking transaction id
 *   - Honours PLATFORM_API_MODE=always-fail|always-succeed for testing
 *   - Rejects unknown platforms (so typos fail loudly, not silently)
 *
 * When you sign partnership deals, replace each case below with a real client.
 * Keep the (platform, platformUserId, amount, reference) signature stable so
 * callers don't need to change.
 */

const { randomUUID } = require('crypto')

const SUPPORTED_PLATFORMS = ['Zomato', 'Swiggy', 'Zepto', 'Blinkit', 'Amazon', 'Flipkart', 'Other']

/**
 * Attempt to deduct `amount` from the worker's pending earnings on `platform`.
 *
 * @param {string} platform         e.g. 'Zomato' (must match User.platform ENUM)
 * @param {string} platformUserId   Partner id assigned by the platform (e.g. 'Z-CHN-48120')
 * @param {number} amount           ₹ to deduct
 * @param {string} reference        Our-side idempotency key (PremiumCharge id)
 * @returns {Promise<{success: boolean, transaction_id?: string, error?: string}>}
 */
const deductFromEarnings = async (platform, platformUserId, amount, reference) => {
  if (!platform || !SUPPORTED_PLATFORMS.includes(platform)) {
    return { success: false, error: `Unsupported platform: ${platform}` }
  }
  if (!platformUserId) {
    return { success: false, error: 'Missing platformUserId — worker has not linked their platform account' }
  }
  if (!amount || amount <= 0) {
    return { success: false, error: 'Invalid amount' }
  }
  if (!reference) {
    return { success: false, error: 'Missing reference — every call needs an idempotency key' }
  }

  // Test hooks for exercising success / failure paths deterministically
  if (process.env.PLATFORM_API_MODE === 'always-fail') {
    return { success: false, error: 'Stub: forced failure via PLATFORM_API_MODE' }
  }
  if (process.env.PLATFORM_API_MODE === 'always-succeed') {
    return { success: true, transaction_id: `stub_${platform.toLowerCase()}_${randomUUID()}` }
  }

  // Default: ~90% success rate simulation
  const successful = Math.random() > 0.1
  if (!successful) {
    return { success: false, error: `Stub: ${platform} reported insufficient pending earnings (simulated)` }
  }
  return {
    success:        true,
    transaction_id: `stub_${platform.toLowerCase()}_${randomUUID()}`
  }
}

module.exports = { deductFromEarnings, SUPPORTED_PLATFORMS }
