/**
 * API Key Authentication Middleware
 * 
 * Authenticates requests using API keys instead of JWT tokens.
 * Used for programmatic access to BobSec API.
 */

const { getApiKeyRepository } = require('../repositories/ApiKeyRepository')
const logger = require('../utils/logger')

/**
 * Extract API key from request
 * Supports both Authorization header and query parameter
 */
function extractApiKey(req) {
  // Check Authorization header: "Bearer bsk_live_..."
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  // Check X-API-Key header
  const apiKeyHeader = req.headers['x-api-key']
  if (apiKeyHeader) {
    return apiKeyHeader
  }

  // Check query parameter (less secure, but convenient for testing)
  if (req.query.api_key) {
    return req.query.api_key
  }

  return null
}

/**
 * API Key Authentication Middleware
 */
async function apiKeyAuth(req, res, next) {
  try {
    const apiKey = extractApiKey(req)

    if (!apiKey) {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'API key required. Provide via Authorization header or X-API-Key header.'
      })
    }

    // Validate API key format
    if (!apiKey.startsWith('bsk_')) {
      return res.status(401).json({
        error: 'invalid_api_key',
        message: 'Invalid API key format. Keys must start with "bsk_".'
      })
    }

    // Find API key in repository
    const apiKeyRepo = getApiKeyRepository()
    const apiKeyObj = await apiKeyRepo.findByKey(apiKey)

    if (!apiKeyObj) {
      logger.warn('Invalid API key attempt', { keyPrefix: apiKey.substring(0, 16) })
      return res.status(401).json({
        error: 'invalid_api_key',
        message: 'Invalid or expired API key.'
      })
    }

    // Check if key is active and not expired
    if (!apiKeyObj.isValid()) {
      logger.warn('Inactive or expired API key used', { 
        keyId: apiKeyObj.id,
        isActive: apiKeyObj.isActive,
        expiresAt: apiKeyObj.expiresAt
      })
      return res.status(401).json({
        error: 'invalid_api_key',
        message: apiKeyObj.isExpired() 
          ? 'API key has expired.' 
          : 'API key is inactive.'
      })
    }

    // Record usage
    await apiKeyRepo.recordUsage(apiKeyObj.id)

    // Attach API key info to request
    req.apiKey = apiKeyObj
    req.organizationId = apiKeyObj.organizationId
    req.authType = 'api_key'

    logger.debug('API key authenticated', {
      keyId: apiKeyObj.id,
      organizationId: apiKeyObj.organizationId,
      permissions: apiKeyObj.permissions
    })

    next()
  } catch (error) {
    logger.error('API key authentication error', { error: error.message })
    res.status(500).json({
      error: 'authentication_error',
      message: 'Failed to authenticate API key.'
    })
  }
}

/**
 * Check if API key has specific permission
 */
function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.apiKey) {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'API key required.'
      })
    }

    if (!req.apiKey.hasPermission(permission)) {
      logger.warn('API key missing permission', {
        keyId: req.apiKey.id,
        required: permission,
        has: req.apiKey.permissions
      })
      return res.status(403).json({
        error: 'insufficient_permissions',
        message: `API key does not have '${permission}' permission.`,
        required: permission,
        available: req.apiKey.permissions
      })
    }

    next()
  }
}

/**
 * Rate limiting for API keys
 * Uses the rate limit specified in the API key
 */
const apiKeyRateLimits = new Map() // keyId -> { count, resetAt }

function apiKeyRateLimit(req, res, next) {
  if (!req.apiKey) {
    return next()
  }

  const keyId = req.apiKey.id
  const limit = req.apiKey.rateLimit
  const now = Date.now()

  // Get or create rate limit tracker
  let tracker = apiKeyRateLimits.get(keyId)
  
  if (!tracker || tracker.resetAt < now) {
    // Reset window (1 minute)
    tracker = {
      count: 0,
      resetAt: now + 60000
    }
    apiKeyRateLimits.set(keyId, tracker)
  }

  // Increment count
  tracker.count++

  // Set rate limit headers
  res.setHeader('X-RateLimit-Limit', limit)
  res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - tracker.count))
  res.setHeader('X-RateLimit-Reset', new Date(tracker.resetAt).toISOString())

  // Check if limit exceeded
  if (tracker.count > limit) {
    logger.warn('API key rate limit exceeded', {
      keyId,
      limit,
      count: tracker.count
    })
    return res.status(429).json({
      error: 'rate_limit_exceeded',
      message: `Rate limit of ${limit} requests per minute exceeded.`,
      limit,
      resetAt: new Date(tracker.resetAt).toISOString()
    })
  }

  next()
}

/**
 * Dual authentication middleware
 * Accepts either JWT token or API key
 */
async function dualAuth(req, res, next) {
  // Try JWT first
  const token = req.headers.authorization?.startsWith('Bearer ') 
    ? req.headers.authorization.substring(7) 
    : null

  if (token && !token.startsWith('bsk_')) {
    // This looks like a JWT token, use JWT auth
    const jwtAuth = require('./auth')
    return jwtAuth(req, res, next)
  }

  // Otherwise, try API key auth
  return apiKeyAuth(req, res, next)
}

module.exports = {
  apiKeyAuth,
  requirePermission,
  apiKeyRateLimit,
  dualAuth
}

// Made with Bob
