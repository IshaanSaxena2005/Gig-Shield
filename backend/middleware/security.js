/**
 * security.js
 * -----------
 * Shared security middleware: global rate limiter, input sanitization,
 * and request body size enforcement.
 */

const rateLimit = require('express-rate-limit')

// ── Global API rate limiter ──────────────────────────────────────────────────
// 100 requests per 15 minutes per IP (applies to all /api/* routes)
const globalLimiter = rateLimit({
  windowMs:  15 * 60 * 1000,
  max:       100,
  message:   { message: 'Too many requests from this IP. Please slow down.' },
  standardHeaders: true,
  legacyHeaders:   false,
  skip: (req) => req.path === '/api/health' // don't rate-limit health checks
})

// ── Claims rate limiter ──────────────────────────────────────────────────────
// 10 claim submissions per 15 minutes per IP
const claimsLimiter = rateLimit({
  windowMs:  15 * 60 * 1000,
  max:       10,
  message:   { message: 'Too many claim submissions. Please try again later.' },
  standardHeaders: true,
  legacyHeaders:   false,
})

// ── Payment rate limiter ─────────────────────────────────────────────────────
// 5 payment attempts per 15 minutes per IP
const paymentLimiter = rateLimit({
  windowMs:  15 * 60 * 1000,
  max:       5,
  message:   { message: 'Too many payment attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders:   false,
})

// ── Input sanitization ───────────────────────────────────────────────────────
// Strips dangerous HTML/script tags from string fields in request body.
// Does NOT modify non-string fields.
const sanitizeInput = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body)
  }
  next()
}

const sanitizeObject = (obj) => {
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'string') {
      // Strip <script> tags and event handlers
      obj[key] = obj[key]
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
        .replace(/<\/?(?:script|iframe|object|embed|form|input)\b[^>]*>/gi, '')
    } else if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
      sanitizeObject(obj[key])
    }
  }
}

module.exports = {
  globalLimiter,
  claimsLimiter,
  paymentLimiter,
  sanitizeInput
}
