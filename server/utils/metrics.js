// In-memory metrics collection for observability
// In production, use a proper metrics backend (Prometheus, Datadog, CloudWatch)

class MetricsCollector {
  constructor() {
    this.metrics = {
      // Request metrics
      totalRequests: 0,
      totalErrors: 0,
      requestsByEndpoint: {},
      requestsByStatusCode: {},
      
      // Latency metrics (in milliseconds)
      latencyByEndpoint: {},
      
      // Analysis metrics
      totalAnalyses: 0,
      analysesByRiskLevel: {
        HIGH: 0,
        MEDIUM: 0,
        LOW: 0,
        SAFE: 0,
        UNKNOWN: 0
      },
      analysesByCategory: {},
      
      // Auth metrics
      totalLogins: 0,
      totalRegistrations: 0,
      failedLogins: 0,
      
      // Feedback metrics
      totalFeedback: 0,
      ruleSuggestionsGenerated: 0,
      
      // Rate limit metrics
      rateLimitHits: 0,
      
      // System metrics
      startTime: Date.now(),
      lastResetTime: Date.now()
    }
  }

  // Record a request
  recordRequest(method, path, statusCode, duration) {
    this.metrics.totalRequests++
    
    // Track by endpoint
    const endpoint = `${method} ${path}`
    if (!this.metrics.requestsByEndpoint[endpoint]) {
      this.metrics.requestsByEndpoint[endpoint] = 0
      this.metrics.latencyByEndpoint[endpoint] = []
    }
    this.metrics.requestsByEndpoint[endpoint]++
    
    // Track latency (keep last 100 samples per endpoint)
    this.metrics.latencyByEndpoint[endpoint].push(duration)
    if (this.metrics.latencyByEndpoint[endpoint].length > 100) {
      this.metrics.latencyByEndpoint[endpoint].shift()
    }
    
    // Track by status code
    if (!this.metrics.requestsByStatusCode[statusCode]) {
      this.metrics.requestsByStatusCode[statusCode] = 0
    }
    this.metrics.requestsByStatusCode[statusCode]++
    
    // Track errors
    if (statusCode >= 400) {
      this.metrics.totalErrors++
    }
  }

  // Record an analysis
  recordAnalysis(riskLevel, category) {
    this.metrics.totalAnalyses++
    
    if (riskLevel && this.metrics.analysesByRiskLevel[riskLevel] !== undefined) {
      this.metrics.analysesByRiskLevel[riskLevel]++
    }
    
    if (category) {
      if (!this.metrics.analysesByCategory[category]) {
        this.metrics.analysesByCategory[category] = 0
      }
      this.metrics.analysesByCategory[category]++
    }
  }

  // Record auth events
  recordLogin(success) {
    if (success) {
      this.metrics.totalLogins++
    } else {
      this.metrics.failedLogins++
    }
  }

  recordRegistration() {
    this.metrics.totalRegistrations++
  }

  // Record feedback
  recordFeedback(ruleSuggested = false) {
    this.metrics.totalFeedback++
    if (ruleSuggested) {
      this.metrics.ruleSuggestionsGenerated++
    }
  }

  // Record rate limit hit
  recordRateLimitHit() {
    this.metrics.rateLimitHits++
  }

  // Calculate statistics
  getStats() {
    const uptime = Date.now() - this.metrics.startTime
    const uptimeSeconds = Math.floor(uptime / 1000)
    
    // Calculate average latencies
    const avgLatencyByEndpoint = {}
    for (const [endpoint, latencies] of Object.entries(this.metrics.latencyByEndpoint)) {
      if (latencies.length > 0) {
        const sum = latencies.reduce((a, b) => a + b, 0)
        avgLatencyByEndpoint[endpoint] = Math.round(sum / latencies.length)
      }
    }
    
    // Calculate error rate
    const errorRate = this.metrics.totalRequests > 0
      ? ((this.metrics.totalErrors / this.metrics.totalRequests) * 100).toFixed(2)
      : 0
    
    // Calculate requests per second
    const requestsPerSecond = uptimeSeconds > 0
      ? (this.metrics.totalRequests / uptimeSeconds).toFixed(2)
      : 0
    
    return {
      uptime: {
        seconds: uptimeSeconds,
        formatted: this._formatUptime(uptimeSeconds)
      },
      requests: {
        total: this.metrics.totalRequests,
        errors: this.metrics.totalErrors,
        errorRate: `${errorRate}%`,
        requestsPerSecond: parseFloat(requestsPerSecond),
        byEndpoint: this.metrics.requestsByEndpoint,
        byStatusCode: this.metrics.requestsByStatusCode
      },
      latency: {
        avgByEndpoint: avgLatencyByEndpoint
      },
      analyses: {
        total: this.metrics.totalAnalyses,
        byRiskLevel: this.metrics.analysesByRiskLevel,
        byCategory: this.metrics.analysesByCategory
      },
      auth: {
        totalLogins: this.metrics.totalLogins,
        totalRegistrations: this.metrics.totalRegistrations,
        failedLogins: this.metrics.failedLogins
      },
      feedback: {
        total: this.metrics.totalFeedback,
        ruleSuggestionsGenerated: this.metrics.ruleSuggestionsGenerated
      },
      rateLimit: {
        hits: this.metrics.rateLimitHits
      },
      system: {
        startTime: new Date(this.metrics.startTime).toISOString(),
        lastResetTime: new Date(this.metrics.lastResetTime).toISOString()
      }
    }
  }

  // Reset metrics (useful for testing or periodic resets)
  reset() {
    const startTime = this.metrics.startTime
    this.metrics = {
      totalRequests: 0,
      totalErrors: 0,
      requestsByEndpoint: {},
      requestsByStatusCode: {},
      latencyByEndpoint: {},
      totalAnalyses: 0,
      analysesByRiskLevel: {
        HIGH: 0,
        MEDIUM: 0,
        LOW: 0,
        SAFE: 0,
        UNKNOWN: 0
      },
      analysesByCategory: {},
      totalLogins: 0,
      totalRegistrations: 0,
      failedLogins: 0,
      totalFeedback: 0,
      ruleSuggestionsGenerated: 0,
      rateLimitHits: 0,
      startTime,
      lastResetTime: Date.now()
    }
  }

  _formatUptime(seconds) {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    const parts = []
    if (days > 0) parts.push(`${days}d`)
    if (hours > 0) parts.push(`${hours}h`)
    if (minutes > 0) parts.push(`${minutes}m`)
    parts.push(`${secs}s`)
    
    return parts.join(' ')
  }
}

// Create singleton metrics collector
const metrics = new MetricsCollector()

module.exports = metrics

// Made with Bob
