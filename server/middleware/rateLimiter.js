// Simple in-memory rate limiter
// In production, use Redis-backed rate limiting (e.g., express-rate-limit with Redis store)

const logger = require('../utils/logger')
const metrics = require('../utils/metrics')

class RateLimiter {
  constructor() {
    // Store: Map<key, { count, resetTime }>
    this.store = new Map()
    
    // Cleanup old entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000)
  }

  cleanup() {
    const now = Date.now()
    for (const [key, data] of this.store.entries()) {
      if (data.resetTime < now) {
        this.store.delete(key)
      }
    }
  }

  check(key, limit, windowMs) {
    const now = Date.now()
    const data = this.store.get(key)

    if (!data || data.resetTime < now) {
      // New window
      this.store.set(key, {
        count: 1,
        resetTime: now + windowMs
      })
      return { allowed: true, remaining: limit - 1, resetTime: now + windowMs }
    }

    if (data.count >= limit) {
      // Rate limit exceeded
      return { allowed: false, remaining: 0, resetTime: data.resetTime }
    }

    // Increment count
    data.count++
    this.store.set(key, data)
    return { allowed: true, remaining: limit - data.count, resetTime: data.resetTime }
  }
}

const limiter = new RateLimiter()

// Rate limit by IP address
function rateLimitByIP(limit = 100, windowMs = 15 * 60 * 1000) {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress
    const key = `ip:${ip}`
    
    const result = limiter.check(key, limit, windowMs)
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', limit)
    res.setHeader('X-RateLimit-Remaining', result.remaining)
    res.setHeader('X-RateLimit-Reset', new Date(result.resetTime).toISOString())
    
    if (!result.allowed) {
      logger.warn('Rate limit exceeded (IP)', {
        requestId: req.id,
        ip,
        limit,
        path: req.path
      })
      metrics.recordRateLimitHit()
      
      return res.status(429).json({
        error: 'rate_limit_exceeded',
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
      })
    }
    
    next()
  }
}

// Rate limit by user ID (for authenticated requests)
function rateLimitByUser(limit = 200, windowMs = 15 * 60 * 1000) {
  return (req, res, next) => {
    if (!req.auth || !req.auth.userId) {
      // No auth, skip user-based rate limiting
      return next()
    }
    
    const userId = req.auth.userId
    const key = `user:${userId}`
    
    const result = limiter.check(key, limit, windowMs)
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-User-Limit', limit)
    res.setHeader('X-RateLimit-User-Remaining', result.remaining)
    res.setHeader('X-RateLimit-User-Reset', new Date(result.resetTime).toISOString())
    
    if (!result.allowed) {
      logger.warn('Rate limit exceeded (User)', {
        requestId: req.id,
        userId,
        limit,
        path: req.path
      })
      metrics.recordRateLimitHit()
      
      return res.status(429).json({
        error: 'rate_limit_exceeded',
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
      })
    }
    
    next()
  }
}

// Combined rate limiter (IP + User)
function combinedRateLimit(ipLimit = 100, userLimit = 200, windowMs = 15 * 60 * 1000) {
  return (req, res, next) => {
    // First check IP-based limit
    const ip = req.ip || req.connection.remoteAddress
    const ipKey = `ip:${ip}`
    const ipResult = limiter.check(ipKey, ipLimit, windowMs)
    
    res.setHeader('X-RateLimit-Limit', ipLimit)
    res.setHeader('X-RateLimit-Remaining', ipResult.remaining)
    res.setHeader('X-RateLimit-Reset', new Date(ipResult.resetTime).toISOString())
    
    if (!ipResult.allowed) {
      logger.warn('Rate limit exceeded (Combined - IP)', {
        requestId: req.id,
        ip,
        limit: ipLimit,
        path: req.path
      })
      metrics.recordRateLimitHit()
      
      return res.status(429).json({
        error: 'rate_limit_exceeded',
        message: 'Too many requests from this IP. Please try again later.',
        retryAfter: Math.ceil((ipResult.resetTime - Date.now()) / 1000)
      })
    }
    
    // Then check user-based limit if authenticated
    if (req.auth && req.auth.userId) {
      const userKey = `user:${req.auth.userId}`
      const userResult = limiter.check(userKey, userLimit, windowMs)
      
      res.setHeader('X-RateLimit-User-Limit', userLimit)
      res.setHeader('X-RateLimit-User-Remaining', userResult.remaining)
      res.setHeader('X-RateLimit-User-Reset', new Date(userResult.resetTime).toISOString())
      
      if (!userResult.allowed) {
        logger.warn('Rate limit exceeded (Combined - User)', {
          requestId: req.id,
          userId: req.auth.userId,
          limit: userLimit,
          path: req.path
        })
        metrics.recordRateLimitHit()
        
        return res.status(429).json({
          error: 'rate_limit_exceeded',
          message: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((userResult.resetTime - Date.now()) / 1000)
        })
      }
    }
    
    next()
  }
}

// Strict rate limit for sensitive endpoints (e.g., auth)
function strictRateLimit(limit = 5, windowMs = 15 * 60 * 1000) {
  return rateLimitByIP(limit, windowMs)
}

module.exports = {
  rateLimitByIP,
  rateLimitByUser,
  combinedRateLimit,
  strictRateLimit
}

// Made with Bob
