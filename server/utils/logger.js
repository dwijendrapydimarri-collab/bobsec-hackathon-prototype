// Structured JSON logger for production observability
// In production, pipe to a log aggregation service (e.g., CloudWatch, Datadog, ELK)

const { maskForLogging } = require('./piiMasking')

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  FATAL: 4
}

const LOG_LEVEL_NAMES = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL']

class Logger {
  constructor(options = {}) {
    this.minLevel = LOG_LEVELS[options.level || 'INFO']
    this.service = options.service || 'bobsec'
    this.version = options.version || '2.0.0'
  }

  _log(level, message, meta = {}) {
    if (LOG_LEVELS[level] < this.minLevel) {
      return // Skip logs below minimum level
    }

    // Mask PII in metadata before logging
    const maskedMeta = maskForLogging(meta)

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.service,
      version: this.version,
      message,
      ...maskedMeta
    }

    // In production, send to log aggregation service
    // For now, output to console
    const output = JSON.stringify(logEntry)
    
    if (level === 'ERROR' || level === 'FATAL') {
      console.error(output)
    } else if (level === 'WARN') {
      console.warn(output)
    } else {
      console.log(output)
    }
  }

  debug(message, meta = {}) {
    this._log('DEBUG', message, meta)
  }

  info(message, meta = {}) {
    this._log('INFO', message, meta)
  }

  warn(message, meta = {}) {
    this._log('WARN', message, meta)
  }

  error(message, meta = {}) {
    this._log('ERROR', message, meta)
  }

  fatal(message, meta = {}) {
    this._log('FATAL', message, meta)
  }

  // Request logging helper
  logRequest(req, res, duration) {
    const meta = {
      requestId: req.id,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      userId: req.auth?.userId || null,
      tenantId: req.auth?.tenantId || null,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent')
    }

    if (res.statusCode >= 500) {
      this.error('Request failed', meta)
    } else if (res.statusCode >= 400) {
      this.warn('Request error', meta)
    } else {
      this.info('Request completed', meta)
    }
  }

  // Agent execution logging
  logAgentExecution(agentName, action, result, duration, meta = {}) {
    this.info('Agent executed', {
      agent: agentName,
      action,
      result,
      duration,
      ...meta
    })
  }

  // Orchestration logging
  logOrchestration(phase, status, meta = {}) {
    this.info('Orchestration phase', {
      phase,
      status,
      ...meta
    })
  }

  // Security event logging
  logSecurityEvent(eventType, severity, meta = {}) {
    const logFn = severity === 'high' ? this.error : severity === 'medium' ? this.warn : this.info
    logFn.call(this, `Security event: ${eventType}`, {
      eventType,
      severity,
      ...meta
    })
  }

  // Database operation logging
  logDbOperation(operation, collection, duration, meta = {}) {
    this.debug('Database operation', {
      operation,
      collection,
      duration,
      ...meta
    })
  }
}

// Create singleton logger instance
const logger = new Logger({
  level: process.env.LOG_LEVEL || 'INFO',
  service: 'bobsec',
  version: '2.0.0'
})

module.exports = logger

// Made with Bob
