// Request ID middleware for distributed tracing
// Generates a unique ID for each request and attaches it to req.id

const crypto = require('crypto')

function generateRequestId() {
  // Generate a short, URL-safe request ID
  // Format: timestamp-random (e.g., 1715875200-a3f9c2)
  const timestamp = Math.floor(Date.now() / 1000)
  const random = crypto.randomBytes(3).toString('hex')
  return `${timestamp}-${random}`
}

function requestIdMiddleware(req, res, next) {
  // Check if request already has an ID (from upstream proxy/load balancer)
  const existingId = req.get('X-Request-ID') || req.get('X-Correlation-ID')
  
  // Use existing ID or generate new one
  req.id = existingId || generateRequestId()
  
  // Set response header so client can reference this request
  res.setHeader('X-Request-ID', req.id)
  
  next()
}

module.exports = requestIdMiddleware

// Made with Bob
