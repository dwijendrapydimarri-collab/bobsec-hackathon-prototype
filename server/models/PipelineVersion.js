/**
 * Pipeline Version Model
 * 
 * Represents a versioned analysis pipeline configuration.
 * Enables A/B testing and gradual rollout of pipeline changes.
 */

const { v4: uuidv4 } = require('uuid')

class PipelineVersion {
  constructor(data) {
    this.id = data.id || uuidv4()
    this.organizationId = data.organizationId
    this.name = data.name
    this.version = data.version // Semver (e.g., 2.1.0)
    this.description = data.description || ''
    
    // Pipeline configuration
    this.config = data.config || {
      agents: [],           // Which agents to use
      agentConfig: {},      // Agent-specific configuration
      plugins: [],          // Which plugins to enable
      policies: [],         // Which policies to apply
      rules: [],            // Which rules to use
      thresholds: {}        // Custom thresholds
    }
    
    // Deployment strategy
    this.strategy = data.strategy || 'canary' // 'canary', 'blue_green', 'rolling', 'instant'
    this.rolloutPercentage = data.rolloutPercentage || 0 // 0-100
    this.targetPercentage = data.targetPercentage || 100
    this.rolloutStep = data.rolloutStep || 10 // Percentage to increase per step
    this.rolloutInterval = data.rolloutInterval || 3600 // Seconds between steps
    
    // Status
    this.status = data.status || 'draft' // 'draft', 'testing', 'canary', 'active', 'deprecated', 'archived'
    this.isDefault = data.isDefault !== undefined ? data.isDefault : false
    
    // Metrics
    this.metrics = data.metrics || {
      totalRequests: 0,
      successCount: 0,
      failureCount: 0,
      avgLatency: 0,
      avgRiskScore: 0,
      errorRate: 0
    }
    
    // Comparison baseline (for A/B testing)
    this.baselineVersionId = data.baselineVersionId || null
    this.comparisonMetrics = data.comparisonMetrics || null
    
    // Metadata
    this.createdBy = data.createdBy
    this.createdAt = data.createdAt || new Date().toISOString()
    this.updatedAt = data.updatedAt || new Date().toISOString()
    this.activatedAt = data.activatedAt || null
    this.deprecatedAt = data.deprecatedAt || null
    
    // Rollback information
    this.canRollback = data.canRollback !== undefined ? data.canRollback : true
    this.previousVersionId = data.previousVersionId || null
  }

  /**
   * Validate pipeline configuration
   */
  validateConfig() {
    const errors = []

    if (!this.name || this.name.length < 3) {
      errors.push('Pipeline name must be at least 3 characters')
    }

    if (!this.version || !/^\d+\.\d+\.\d+$/.test(this.version)) {
      errors.push('Version must follow semver (e.g., 2.1.0)')
    }

    if (!this.config || typeof this.config !== 'object') {
      errors.push('Config must be an object')
    }

    if (!['canary', 'blue_green', 'rolling', 'instant'].includes(this.strategy)) {
      errors.push('Invalid deployment strategy')
    }

    if (this.rolloutPercentage < 0 || this.rolloutPercentage > 100) {
      errors.push('Rollout percentage must be 0-100')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Check if this version should handle a request
   */
  shouldHandleRequest(userId, requestId) {
    // If not active, don't handle
    if (this.status !== 'active' && this.status !== 'canary') {
      return false
    }

    // If default version, always handle
    if (this.isDefault) {
      return true
    }

    // If canary, use percentage-based routing
    if (this.status === 'canary') {
      // Use consistent hashing for stable routing
      const hash = this.hashString(`${userId || 'anonymous'}-${this.id}`)
      const bucket = hash % 100
      return bucket < this.rolloutPercentage
    }

    return false
  }

  /**
   * Hash string to number (simple hash for consistent routing)
   */
  hashString(str) {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }

  /**
   * Update metrics
   */
  recordRequest(success, latency, riskScore) {
    this.metrics.totalRequests++
    
    if (success) {
      this.metrics.successCount++
    } else {
      this.metrics.failureCount++
    }

    // Update average latency (moving average)
    this.metrics.avgLatency = (
      (this.metrics.avgLatency * (this.metrics.totalRequests - 1) + latency) /
      this.metrics.totalRequests
    )

    // Update average risk score
    if (riskScore !== null && riskScore !== undefined) {
      this.metrics.avgRiskScore = (
        (this.metrics.avgRiskScore * (this.metrics.totalRequests - 1) + riskScore) /
        this.metrics.totalRequests
      )
    }

    // Update error rate
    this.metrics.errorRate = (this.metrics.failureCount / this.metrics.totalRequests) * 100

    this.updatedAt = new Date().toISOString()
  }

  /**
   * Increase rollout percentage
   */
  increaseRollout() {
    if (this.rolloutPercentage >= this.targetPercentage) {
      return false
    }

    this.rolloutPercentage = Math.min(
      this.targetPercentage,
      this.rolloutPercentage + this.rolloutStep
    )

    this.updatedAt = new Date().toISOString()
    return true
  }

  /**
   * Activate version
   */
  activate() {
    this.status = 'active'
    this.activatedAt = new Date().toISOString()
    this.updatedAt = new Date().toISOString()
  }

  /**
   * Start canary deployment
   */
  startCanary(initialPercentage = 5) {
    this.status = 'canary'
    this.rolloutPercentage = initialPercentage
    this.updatedAt = new Date().toISOString()
  }

  /**
   * Deprecate version
   */
  deprecate() {
    this.status = 'deprecated'
    this.deprecatedAt = new Date().toISOString()
    this.updatedAt = new Date().toISOString()
  }

  /**
   * Archive version
   */
  archive() {
    this.status = 'archived'
    this.updatedAt = new Date().toISOString()
  }

  /**
   * Set as default
   */
  setDefault() {
    this.isDefault = true
    this.updatedAt = new Date().toISOString()
  }

  /**
   * Unset as default
   */
  unsetDefault() {
    this.isDefault = false
    this.updatedAt = new Date().toISOString()
  }

  /**
   * Compare metrics with baseline
   */
  compareWithBaseline(baselineMetrics) {
    if (!baselineMetrics) {
      return null
    }

    const comparison = {
      latencyDiff: this.metrics.avgLatency - baselineMetrics.avgLatency,
      latencyDiffPercent: ((this.metrics.avgLatency - baselineMetrics.avgLatency) / baselineMetrics.avgLatency) * 100,
      errorRateDiff: this.metrics.errorRate - baselineMetrics.errorRate,
      riskScoreDiff: this.metrics.avgRiskScore - baselineMetrics.avgRiskScore,
      requestCountDiff: this.metrics.totalRequests - baselineMetrics.totalRequests
    }

    // Determine if metrics are better, worse, or similar
    comparison.verdict = 'similar'
    if (comparison.errorRateDiff > 5 || comparison.latencyDiffPercent > 20) {
      comparison.verdict = 'worse'
    } else if (comparison.errorRateDiff < -2 && comparison.latencyDiffPercent < -10) {
      comparison.verdict = 'better'
    }

    this.comparisonMetrics = comparison
    return comparison
  }

  /**
   * Convert to JSON
   */
  toJSON() {
    return {
      id: this.id,
      organizationId: this.organizationId,
      name: this.name,
      version: this.version,
      description: this.description,
      config: this.config,
      strategy: this.strategy,
      rolloutPercentage: this.rolloutPercentage,
      targetPercentage: this.targetPercentage,
      rolloutStep: this.rolloutStep,
      rolloutInterval: this.rolloutInterval,
      status: this.status,
      isDefault: this.isDefault,
      metrics: this.metrics,
      baselineVersionId: this.baselineVersionId,
      comparisonMetrics: this.comparisonMetrics,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      activatedAt: this.activatedAt,
      deprecatedAt: this.deprecatedAt,
      canRollback: this.canRollback,
      previousVersionId: this.previousVersionId
    }
  }

  /**
   * Create from JSON
   */
  static fromJSON(data) {
    return new PipelineVersion(data)
  }
}

module.exports = PipelineVersion

// Made with Bob
