/**
 * Ecosystem Health Monitor
 * 
 * Monitors health and performance of the entire BobSec ecosystem
 * Tracks metrics across sectors, regions, and organizations
 * 
 * Features:
 * - Real-time health monitoring
 * - Performance metrics tracking
 * - Anomaly detection
 * - Capacity planning
 * - SLA monitoring
 */

const logger = require('../utils/logger')

class EcosystemHealthMonitor {
  constructor() {
    this.name = 'EcosystemHealthMonitor'
    
    // Health metrics
    this.metrics = {
      sectors: new Map(),
      regions: new Map(),
      organizations: new Map(),
      global: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        avgResponseTime: 0,
        uptime: Date.now()
      }
    }
    
    // Anomalies detected
    this.anomalies = []
    
    // SLA thresholds
    this.slaThresholds = {
      responseTime: 2000, // 2 seconds
      successRate: 99.5, // 99.5%
      uptime: 99.9 // 99.9%
    }
  }
  
  // ════════════════════════════════════════════════════════════════════════════
  // Metrics Recording
  // ════════════════════════════════════════════════════════════════════════════
  
  /**
   * Record request metrics
   * 
   * @param {Object} request - Request details
   * @param {Object} response - Response details
   * @param {Object} context - Platform context
   */
  recordRequest(request, response, context) {
    const { sector, region, organizationId } = context
    const responseTime = response.duration || 0
    const success = response.status < 400
    
    // Update global metrics
    this.metrics.global.totalRequests++
    if (success) {
      this.metrics.global.successfulRequests++
    } else {
      this.metrics.global.failedRequests++
    }
    
    // Update average response time
    const totalTime = this.metrics.global.avgResponseTime * (this.metrics.global.totalRequests - 1)
    this.metrics.global.avgResponseTime = (totalTime + responseTime) / this.metrics.global.totalRequests
    
    // Update sector metrics
    if (!this.metrics.sectors.has(sector)) {
      this.metrics.sectors.set(sector, {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        avgResponseTime: 0
      })
    }
    const sectorMetrics = this.metrics.sectors.get(sector)
    sectorMetrics.totalRequests++
    if (success) {
      sectorMetrics.successfulRequests++
    } else {
      sectorMetrics.failedRequests++
    }
    const sectorTotalTime = sectorMetrics.avgResponseTime * (sectorMetrics.totalRequests - 1)
    sectorMetrics.avgResponseTime = (sectorTotalTime + responseTime) / sectorMetrics.totalRequests
    
    // Update region metrics
    if (!this.metrics.regions.has(region)) {
      this.metrics.regions.set(region, {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        avgResponseTime: 0
      })
    }
    const regionMetrics = this.metrics.regions.get(region)
    regionMetrics.totalRequests++
    if (success) {
      regionMetrics.successfulRequests++
    } else {
      regionMetrics.failedRequests++
    }
    const regionTotalTime = regionMetrics.avgResponseTime * (regionMetrics.totalRequests - 1)
    regionMetrics.avgResponseTime = (regionTotalTime + responseTime) / regionMetrics.totalRequests
    
    // Update organization metrics
    if (!this.metrics.organizations.has(organizationId)) {
      this.metrics.organizations.set(organizationId, {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        avgResponseTime: 0
      })
    }
    const orgMetrics = this.metrics.organizations.get(organizationId)
    orgMetrics.totalRequests++
    if (success) {
      orgMetrics.successfulRequests++
    } else {
      orgMetrics.failedRequests++
    }
    const orgTotalTime = orgMetrics.avgResponseTime * (orgMetrics.totalRequests - 1)
    orgMetrics.avgResponseTime = (orgTotalTime + responseTime) / orgMetrics.totalRequests
    
    // Check for anomalies
    this.detectAnomalies(request, response, context)
  }
  
  // ════════════════════════════════════════════════════════════════════════════
  // Anomaly Detection
  // ════════════════════════════════════════════════════════════════════════════
  
  /**
   * Detect anomalies in request/response
   */
  detectAnomalies(request, response, context) {
    const anomalies = []
    
    // Slow response time
    if (response.duration > this.slaThresholds.responseTime) {
      anomalies.push({
        type: 'SLOW_RESPONSE',
        severity: 'MEDIUM',
        message: `Response time ${response.duration}ms exceeds threshold ${this.slaThresholds.responseTime}ms`,
        context
      })
    }
    
    // High error rate
    const sectorMetrics = this.metrics.sectors.get(context.sector)
    if (sectorMetrics) {
      const errorRate = (sectorMetrics.failedRequests / sectorMetrics.totalRequests) * 100
      if (errorRate > (100 - this.slaThresholds.successRate)) {
        anomalies.push({
          type: 'HIGH_ERROR_RATE',
          severity: 'HIGH',
          message: `Sector ${context.sector} error rate ${errorRate.toFixed(2)}% exceeds threshold`,
          context
        })
      }
    }
    
    // Unusual request pattern
    if (request.type === 'ANALYSIS' && request.inputLength > 10000) {
      anomalies.push({
        type: 'UNUSUAL_REQUEST',
        severity: 'LOW',
        message: `Unusually large input: ${request.inputLength} characters`,
        context
      })
    }
    
    // Log and store anomalies
    anomalies.forEach(anomaly => {
      anomaly.timestamp = new Date()
      anomaly.id = `ANO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      this.anomalies.push(anomaly)
      
      logger.warn('EcosystemHealth: Anomaly detected', {
        anomalyId: anomaly.id,
        type: anomaly.type,
        severity: anomaly.severity
      })
    })
  }
  
  /**
   * Get recent anomalies
   */
  getAnomalies(filter = {}) {
    let anomalies = this.anomalies
    
    if (filter.severity) {
      anomalies = anomalies.filter(a => a.severity === filter.severity)
    }
    
    if (filter.type) {
      anomalies = anomalies.filter(a => a.type === filter.type)
    }
    
    if (filter.sector) {
      anomalies = anomalies.filter(a => a.context.sector === filter.sector)
    }
    
    if (filter.region) {
      anomalies = anomalies.filter(a => a.context.region === filter.region)
    }
    
    if (filter.limit) {
      anomalies = anomalies.slice(-filter.limit)
    }
    
    return anomalies.sort((a, b) => b.timestamp - a.timestamp)
  }
  
  // ════════════════════════════════════════════════════════════════════════════
  // Health Checks
  // ════════════════════════════════════════════════════════════════════════════
  
  /**
   * Get overall ecosystem health
   */
  getHealth() {
    const global = this.metrics.global
    const successRate = global.totalRequests > 0 ?
      (global.successfulRequests / global.totalRequests) * 100 : 100
    
    const uptime = Date.now() - global.uptime
    const uptimeHours = (uptime / (1000 * 60 * 60)).toFixed(2)
    
    // Determine health status
    let status = 'HEALTHY'
    let issues = []
    
    if (successRate < this.slaThresholds.successRate) {
      status = 'DEGRADED'
      issues.push(`Success rate ${successRate.toFixed(2)}% below threshold ${this.slaThresholds.successRate}%`)
    }
    
    if (global.avgResponseTime > this.slaThresholds.responseTime) {
      status = 'DEGRADED'
      issues.push(`Avg response time ${global.avgResponseTime.toFixed(0)}ms above threshold ${this.slaThresholds.responseTime}ms`)
    }
    
    const recentAnomalies = this.getAnomalies({ limit: 10 })
    const criticalAnomalies = recentAnomalies.filter(a => a.severity === 'HIGH' || a.severity === 'CRITICAL')
    if (criticalAnomalies.length > 0) {
      status = 'DEGRADED'
      issues.push(`${criticalAnomalies.length} critical anomalies detected`)
    }
    
    return {
      status,
      timestamp: new Date(),
      uptime: {
        milliseconds: uptime,
        hours: uptimeHours,
        formatted: this.formatUptime(uptime)
      },
      metrics: {
        totalRequests: global.totalRequests,
        successRate: successRate.toFixed(2) + '%',
        avgResponseTime: global.avgResponseTime.toFixed(0) + 'ms'
      },
      sla: {
        successRate: {
          threshold: this.slaThresholds.successRate + '%',
          current: successRate.toFixed(2) + '%',
          met: successRate >= this.slaThresholds.successRate
        },
        responseTime: {
          threshold: this.slaThresholds.responseTime + 'ms',
          current: global.avgResponseTime.toFixed(0) + 'ms',
          met: global.avgResponseTime <= this.slaThresholds.responseTime
        }
      },
      issues,
      recentAnomalies: recentAnomalies.length
    }
  }
  
  /**
   * Get sector health
   */
  getSectorHealth(sector) {
    const metrics = this.metrics.sectors.get(sector)
    
    if (!metrics) {
      return {
        sector,
        status: 'NO_DATA',
        message: 'No metrics available for this sector'
      }
    }
    
    const successRate = metrics.totalRequests > 0 ?
      (metrics.successfulRequests / metrics.totalRequests) * 100 : 100
    
    let status = 'HEALTHY'
    if (successRate < this.slaThresholds.successRate) {
      status = 'DEGRADED'
    }
    if (metrics.avgResponseTime > this.slaThresholds.responseTime) {
      status = 'DEGRADED'
    }
    
    return {
      sector,
      status,
      metrics: {
        totalRequests: metrics.totalRequests,
        successRate: successRate.toFixed(2) + '%',
        avgResponseTime: metrics.avgResponseTime.toFixed(0) + 'ms'
      }
    }
  }
  
  /**
   * Get region health
   */
  getRegionHealth(region) {
    const metrics = this.metrics.regions.get(region)
    
    if (!metrics) {
      return {
        region,
        status: 'NO_DATA',
        message: 'No metrics available for this region'
      }
    }
    
    const successRate = metrics.totalRequests > 0 ?
      (metrics.successfulRequests / metrics.totalRequests) * 100 : 100
    
    let status = 'HEALTHY'
    if (successRate < this.slaThresholds.successRate) {
      status = 'DEGRADED'
    }
    if (metrics.avgResponseTime > this.slaThresholds.responseTime) {
      status = 'DEGRADED'
    }
    
    return {
      region,
      status,
      metrics: {
        totalRequests: metrics.totalRequests,
        successRate: successRate.toFixed(2) + '%',
        avgResponseTime: metrics.avgResponseTime.toFixed(0) + 'ms'
      }
    }
  }
  
  /**
   * Get organization health
   */
  getOrganizationHealth(organizationId) {
    const metrics = this.metrics.organizations.get(organizationId)
    
    if (!metrics) {
      return {
        organizationId,
        status: 'NO_DATA',
        message: 'No metrics available for this organization'
      }
    }
    
    const successRate = metrics.totalRequests > 0 ?
      (metrics.successfulRequests / metrics.totalRequests) * 100 : 100
    
    let status = 'HEALTHY'
    if (successRate < this.slaThresholds.successRate) {
      status = 'DEGRADED'
    }
    if (metrics.avgResponseTime > this.slaThresholds.responseTime) {
      status = 'DEGRADED'
    }
    
    return {
      organizationId,
      status,
      metrics: {
        totalRequests: metrics.totalRequests,
        successRate: successRate.toFixed(2) + '%',
        avgResponseTime: metrics.avgResponseTime.toFixed(0) + 'ms'
      }
    }
  }
  
  // ════════════════════════════════════════════════════════════════════════════
  // Capacity Planning
  // ════════════════════════════════════════════════════════════════════════════
  
  /**
   * Get capacity metrics
   */
  getCapacityMetrics() {
    const global = this.metrics.global
    const uptime = Date.now() - global.uptime
    const uptimeHours = uptime / (1000 * 60 * 60)
    
    const requestsPerHour = uptimeHours > 0 ? global.totalRequests / uptimeHours : 0
    const requestsPerMinute = requestsPerHour / 60
    
    // Estimate capacity based on current load
    const maxCapacityPerHour = 10000 // Configurable based on infrastructure
    const currentUtilization = (requestsPerHour / maxCapacityPerHour) * 100
    
    return {
      current_load: {
        requests_per_hour: requestsPerHour.toFixed(0),
        requests_per_minute: requestsPerMinute.toFixed(2)
      },
      capacity: {
        max_requests_per_hour: maxCapacityPerHour,
        current_utilization: currentUtilization.toFixed(2) + '%',
        available_capacity: (maxCapacityPerHour - requestsPerHour).toFixed(0) + ' req/hour'
      },
      recommendations: this.getCapacityRecommendations(currentUtilization)
    }
  }
  
  /**
   * Get capacity recommendations
   */
  getCapacityRecommendations(utilization) {
    const recommendations = []
    
    if (utilization > 80) {
      recommendations.push({
        priority: 'HIGH',
        message: 'Capacity utilization above 80%. Consider scaling up infrastructure.',
        action: 'Add more server instances or increase resource allocation'
      })
    } else if (utilization > 60) {
      recommendations.push({
        priority: 'MEDIUM',
        message: 'Capacity utilization above 60%. Monitor closely and prepare for scaling.',
        action: 'Review scaling policies and prepare for increased load'
      })
    } else if (utilization < 20) {
      recommendations.push({
        priority: 'LOW',
        message: 'Capacity utilization below 20%. Consider optimizing resource allocation.',
        action: 'Review infrastructure costs and consider downsizing if sustained'
      })
    }
    
    return recommendations
  }
  
  // ════════════════════════════════════════════════════════════════════════════
  // Utilities
  // ════════════════════════════════════════════════════════════════════════════
  
  /**
   * Format uptime duration
   */
  formatUptime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    
    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }
  
  /**
   * Get comprehensive ecosystem report
   */
  getEcosystemReport() {
    const health = this.getHealth()
    const capacity = this.getCapacityMetrics()
    const anomalies = this.getAnomalies({ limit: 20 })
    
    // Sector breakdown
    const sectorBreakdown = []
    for (const [sector, metrics] of this.metrics.sectors.entries()) {
      const successRate = metrics.totalRequests > 0 ?
        (metrics.successfulRequests / metrics.totalRequests) * 100 : 100
      
      sectorBreakdown.push({
        sector,
        totalRequests: metrics.totalRequests,
        successRate: successRate.toFixed(2) + '%',
        avgResponseTime: metrics.avgResponseTime.toFixed(0) + 'ms'
      })
    }
    
    // Region breakdown
    const regionBreakdown = []
    for (const [region, metrics] of this.metrics.regions.entries()) {
      const successRate = metrics.totalRequests > 0 ?
        (metrics.successfulRequests / metrics.totalRequests) * 100 : 100
      
      regionBreakdown.push({
        region,
        totalRequests: metrics.totalRequests,
        successRate: successRate.toFixed(2) + '%',
        avgResponseTime: metrics.avgResponseTime.toFixed(0) + 'ms'
      })
    }
    
    return {
      timestamp: new Date(),
      overall_health: health,
      capacity: capacity,
      sectors: sectorBreakdown,
      regions: regionBreakdown,
      recent_anomalies: anomalies.slice(0, 10),
      total_organizations: this.metrics.organizations.size
    }
  }
  
  /**
   * Reset metrics (for testing)
   */
  reset() {
    this.metrics = {
      sectors: new Map(),
      regions: new Map(),
      organizations: new Map(),
      global: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        avgResponseTime: 0,
        uptime: Date.now()
      }
    }
    this.anomalies = []
    
    logger.info('EcosystemHealth: Metrics reset')
  }
}

// Singleton instance
const ecosystemHealthMonitor = new EcosystemHealthMonitor()

module.exports = ecosystemHealthMonitor

// Made with Bob