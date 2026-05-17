/**
 * Synthetic Monitor
 * 
 * Continuously monitors system health by running synthetic transactions
 * and alerting on failures or degraded performance.
 */

const logger = require('../utils/logger')
const { executeVersionedAnalysis } = require('../orchestrator/versionedOrchestrator')

class SyntheticMonitor {
  constructor() {
    this.monitors = new Map() // monitorId -> monitor config
    this.results = new Map() // monitorId -> recent results
    this.alerts = []
    this.timers = new Map() // monitorId -> interval timer
  }

  /**
   * Create synthetic monitor
   */
  createMonitor(config) {
    const monitorId = this.generateMonitorId()

    const monitor = {
      id: monitorId,
      name: config.name,
      description: config.description,
      enabled: true,
      interval: config.interval || 60, // seconds
      timeout: config.timeout || 30, // seconds
      checks: config.checks || [],
      payload: config.payload,
      thresholds: {
        maxLatency: config.thresholds?.maxLatency || 5000,
        minSuccessRate: config.thresholds?.minSuccessRate || 95,
        maxErrorRate: config.thresholds?.maxErrorRate || 5
      },
      alerting: {
        enabled: config.alerting?.enabled || true,
        channels: config.alerting?.channels || ['log'],
        cooldown: config.alerting?.cooldown || 300 // seconds
      },
      createdAt: new Date(),
      lastRun: null,
      lastAlert: null,
      status: 'idle'
    }

    this.monitors.set(monitorId, monitor)
    this.results.set(monitorId, [])

    logger.info('Synthetic monitor created', {
      monitorId,
      name: monitor.name,
      interval: monitor.interval
    })

    return monitor
  }

  /**
   * Start monitor
   */
  startMonitor(monitorId) {
    const monitor = this.monitors.get(monitorId)
    if (!monitor) {
      throw new Error('Monitor not found')
    }

    if (this.timers.has(monitorId)) {
      throw new Error('Monitor already running')
    }

    monitor.enabled = true
    monitor.status = 'running'

    // Run immediately
    this.runCheck(monitorId)

    // Schedule recurring checks
    const timer = setInterval(() => {
      this.runCheck(monitorId)
    }, monitor.interval * 1000)

    this.timers.set(monitorId, timer)

    logger.info('Synthetic monitor started', {
      monitorId,
      name: monitor.name
    })

    return monitor
  }

  /**
   * Stop monitor
   */
  stopMonitor(monitorId) {
    const monitor = this.monitors.get(monitorId)
    if (!monitor) {
      throw new Error('Monitor not found')
    }

    const timer = this.timers.get(monitorId)
    if (timer) {
      clearInterval(timer)
      this.timers.delete(monitorId)
    }

    monitor.enabled = false
    monitor.status = 'stopped'

    logger.info('Synthetic monitor stopped', {
      monitorId,
      name: monitor.name
    })

    return monitor
  }

  /**
   * Run monitor check
   */
  async runCheck(monitorId) {
    const monitor = this.monitors.get(monitorId)
    if (!monitor || !monitor.enabled) {
      return
    }

    const startTime = Date.now()
    const result = {
      timestamp: new Date(),
      success: false,
      latency: 0,
      checks: [],
      error: null
    }

    try {
      monitor.status = 'checking'

      // Execute analysis
      const analysisResult = await Promise.race([
        executeVersionedAnalysis(monitor.payload.input, {
          organizationId: monitor.payload.organizationId,
          userId: 'synthetic-monitor',
          requestId: this.generateRequestId()
        }),
        this.timeout(monitor.timeout * 1000)
      ])

      result.latency = Date.now() - startTime
      result.analysisResult = analysisResult

      // Run checks
      for (const check of monitor.checks) {
        const checkResult = await this.runCheckAssertion(check, analysisResult)
        result.checks.push(checkResult)
      }

      // Determine overall success
      result.success = result.checks.every(c => c.passed)

      // Check thresholds
      if (result.latency > monitor.thresholds.maxLatency) {
        result.success = false
        result.checks.push({
          name: 'latency_threshold',
          passed: false,
          message: `Latency ${result.latency}ms exceeds threshold ${monitor.thresholds.maxLatency}ms`
        })
      }

      monitor.status = result.success ? 'healthy' : 'unhealthy'

    } catch (error) {
      result.success = false
      result.error = error.message
      result.latency = Date.now() - startTime
      monitor.status = 'error'

      logger.error('Synthetic monitor check failed', {
        monitorId,
        name: monitor.name,
        error: error.message
      })
    }

    // Store result
    const results = this.results.get(monitorId)
    results.push(result)

    // Keep only last 100 results
    if (results.length > 100) {
      results.shift()
    }

    monitor.lastRun = new Date()

    // Check if alert needed
    if (!result.success) {
      await this.handleFailure(monitor, result)
    }

    return result
  }

  /**
   * Run check assertion
   */
  async runCheckAssertion(check, analysisResult) {
    const result = {
      name: check.name,
      type: check.type,
      passed: false,
      message: ''
    }

    try {
      switch (check.type) {
        case 'response_time':
          result.passed = analysisResult.latency <= check.threshold
          result.message = result.passed
            ? `Response time ${analysisResult.latency}ms within threshold`
            : `Response time ${analysisResult.latency}ms exceeds ${check.threshold}ms`
          break

        case 'risk_score':
          result.passed = analysisResult.risk_score >= check.min && analysisResult.risk_score <= check.max
          result.message = result.passed
            ? `Risk score ${analysisResult.risk_score} within range`
            : `Risk score ${analysisResult.risk_score} outside range [${check.min}, ${check.max}]`
          break

        case 'risk_level':
          result.passed = analysisResult.risk_level === check.expected
          result.message = result.passed
            ? `Risk level ${analysisResult.risk_level} matches expected`
            : `Risk level ${analysisResult.risk_level} does not match ${check.expected}`
          break

        case 'category':
          result.passed = analysisResult.category === check.expected
          result.message = result.passed
            ? `Category ${analysisResult.category} matches expected`
            : `Category ${analysisResult.category} does not match ${check.expected}`
          break

        case 'confidence':
          result.passed = analysisResult.confidence >= check.min
          result.message = result.passed
            ? `Confidence ${analysisResult.confidence}% meets minimum`
            : `Confidence ${analysisResult.confidence}% below minimum ${check.min}%`
          break

        case 'entities':
          const hasEntities = check.entities.every(entity => {
            if (entity.type === 'phone') {
              return analysisResult.entities.phone_numbers?.some(p => p.value === entity.value)
            } else if (entity.type === 'url') {
              return analysisResult.entities.urls?.some(u => u.value === entity.value)
            } else if (entity.type === 'upi') {
              return analysisResult.entities.upi_ids?.some(u => u.value === entity.value)
            }
            return false
          })
          result.passed = hasEntities
          result.message = result.passed
            ? 'All expected entities found'
            : 'Some expected entities missing'
          break

        case 'custom':
          // Custom JavaScript assertion
          const fn = new Function('result', check.assertion)
          result.passed = fn(analysisResult)
          result.message = result.passed ? 'Custom check passed' : 'Custom check failed'
          break

        default:
          result.passed = false
          result.message = `Unknown check type: ${check.type}`
      }
    } catch (error) {
      result.passed = false
      result.message = `Check error: ${error.message}`
    }

    return result
  }

  /**
   * Handle monitor failure
   */
  async handleFailure(monitor, result) {
    if (!monitor.alerting.enabled) {
      return
    }

    // Check cooldown
    if (monitor.lastAlert) {
      const timeSinceLastAlert = (Date.now() - monitor.lastAlert.getTime()) / 1000
      if (timeSinceLastAlert < monitor.alerting.cooldown) {
        return
      }
    }

    const alert = {
      id: this.generateAlertId(),
      monitorId: monitor.id,
      monitorName: monitor.name,
      timestamp: new Date(),
      severity: 'high',
      message: `Synthetic monitor "${monitor.name}" failed`,
      details: {
        latency: result.latency,
        error: result.error,
        failedChecks: result.checks.filter(c => !c.passed)
      }
    }

    this.alerts.push(alert)
    monitor.lastAlert = new Date()

    // Send alerts
    for (const channel of monitor.alerting.channels) {
      await this.sendAlert(channel, alert)
    }

    logger.warn('Synthetic monitor alert triggered', {
      monitorId: monitor.id,
      monitorName: monitor.name,
      alert
    })
  }

  /**
   * Send alert to channel
   */
  async sendAlert(channel, alert) {
    switch (channel) {
      case 'log':
        logger.error('SYNTHETIC MONITOR ALERT', alert)
        break

      case 'webhook':
        // Send to webhook (implement webhook integration)
        break

      case 'email':
        // Send email (implement email integration)
        break

      case 'slack':
        // Send to Slack (implement Slack integration)
        break

      default:
        logger.warn('Unknown alert channel', { channel })
    }
  }

  /**
   * Get monitor
   */
  getMonitor(monitorId) {
    return this.monitors.get(monitorId)
  }

  /**
   * Get all monitors
   */
  getAllMonitors() {
    return Array.from(this.monitors.values())
  }

  /**
   * Get monitor results
   */
  getResults(monitorId, limit = 100) {
    const results = this.results.get(monitorId) || []
    return results.slice(-limit)
  }

  /**
   * Get monitor statistics
   */
  getStatistics(monitorId, timeWindow = 3600) {
    const results = this.results.get(monitorId) || []
    const cutoff = Date.now() - (timeWindow * 1000)
    const recentResults = results.filter(r => r.timestamp.getTime() > cutoff)

    if (recentResults.length === 0) {
      return null
    }

    const successCount = recentResults.filter(r => r.success).length
    const latencies = recentResults.map(r => r.latency)

    return {
      totalChecks: recentResults.length,
      successCount,
      failureCount: recentResults.length - successCount,
      successRate: (successCount / recentResults.length) * 100,
      avgLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length,
      minLatency: Math.min(...latencies),
      maxLatency: Math.max(...latencies),
      p95Latency: this.percentile(latencies.sort((a, b) => a - b), 95)
    }
  }

  /**
   * Get all alerts
   */
  getAlerts(limit = 100) {
    return this.alerts.slice(-limit)
  }

  /**
   * Delete monitor
   */
  deleteMonitor(monitorId) {
    this.stopMonitor(monitorId)
    this.monitors.delete(monitorId)
    this.results.delete(monitorId)

    logger.info('Synthetic monitor deleted', { monitorId })
  }

  /**
   * Timeout promise
   */
  timeout(ms) {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), ms)
    )
  }

  /**
   * Calculate percentile
   */
  percentile(sorted, p) {
    const index = Math.ceil((p / 100) * sorted.length) - 1
    return sorted[index] || 0
  }

  /**
   * Generate monitor ID
   */
  generateMonitorId() {
    return `monitor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Generate request ID
   */
  generateRequestId() {
    return `synthetic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Generate alert ID
   */
  generateAlertId() {
    return `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}

// Singleton instance
let instance = null

function getSyntheticMonitor() {
  if (!instance) {
    instance = new SyntheticMonitor()
  }
  return instance
}

module.exports = { SyntheticMonitor, getSyntheticMonitor }

// Made with Bob
