// Request logging middleware
// Logs all requests with timing, status, and context

const logger = require('../utils/logger')
const metrics = require('../utils/metrics')

function requestLoggerMiddleware(req, res, next) {
  const startTime = Date.now()
  
  // Log request start
  logger.debug('Request started', {
    requestId: req.id,
    method: req.method,
    path: req.path,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent')
  })
  
  // Capture response finish
  const originalEnd = res.end
  res.end = function(...args) {
    const duration = Date.now() - startTime
    
    // Log request completion
    logger.logRequest(req, res, duration)
    
    // Record metrics
    metrics.recordRequest(req.method, req.path, res.statusCode, duration)
    
    // Call original end
    originalEnd.apply(res, args)
  }
  
  next()
}

module.exports = requestLoggerMiddleware

// Made with Bob
