/**
 * Webhook Model
 * 
 * Represents webhook endpoints for event notifications.
 * Organizations can configure webhooks to receive real-time updates.
 */

class Webhook {
  constructor(data) {
    this.id = data.id
    this.organizationId = data.organizationId
    this.url = data.url // Webhook endpoint URL
    this.events = data.events || ['analysis.completed'] // Events to subscribe to
    this.secret = data.secret // HMAC secret for signature verification
    this.isActive = data.isActive !== undefined ? data.isActive : true
    this.retryPolicy = data.retryPolicy || {
      maxRetries: 3,
      retryDelays: [60, 300, 900] // Seconds: 1min, 5min, 15min
    }
    this.headers = data.headers || {} // Custom headers to send
    this.lastTriggeredAt = data.lastTriggeredAt || null
    this.successCount = data.successCount || 0
    this.failureCount = data.failureCount || 0
    this.lastStatus = data.lastStatus || null // 'success' | 'failure'
    this.lastError = data.lastError || null
    this.createdBy = data.createdBy // User ID who created the webhook
    this.createdAt = data.createdAt || new Date().toISOString()
    this.updatedAt = data.updatedAt || new Date().toISOString()
    this.metadata = data.metadata || {} // Custom metadata
  }

  /**
   * Check if webhook subscribes to a specific event
   */
  subscribesTo(event) {
    return this.events.includes(event) || this.events.includes('*')
  }

  /**
   * Check if webhook is valid for use
   */
  isValid() {
    return this.isActive && this.url && this.secret
  }

  /**
   * Record successful delivery
   */
  recordSuccess() {
    this.successCount++
    this.lastStatus = 'success'
    this.lastTriggeredAt = new Date().toISOString()
    this.updatedAt = new Date().toISOString()
    this.lastError = null
  }

  /**
   * Record failed delivery
   */
  recordFailure(error) {
    this.failureCount++
    this.lastStatus = 'failure'
    this.lastTriggeredAt = new Date().toISOString()
    this.updatedAt = new Date().toISOString()
    this.lastError = error
  }

  /**
   * Get retry delay for attempt number
   */
  getRetryDelay(attemptNumber) {
    const delays = this.retryPolicy.retryDelays
    const index = Math.min(attemptNumber - 1, delays.length - 1)
    return delays[index] * 1000 // Convert to milliseconds
  }

  /**
   * Sanitize for API response (remove sensitive data)
   */
  toJSON() {
    return {
      id: this.id,
      organizationId: this.organizationId,
      url: this.url,
      events: this.events,
      isActive: this.isActive,
      retryPolicy: this.retryPolicy,
      headers: this.headers,
      lastTriggeredAt: this.lastTriggeredAt,
      successCount: this.successCount,
      failureCount: this.failureCount,
      lastStatus: this.lastStatus,
      lastError: this.lastError,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      metadata: this.metadata
    }
  }
}

module.exports = Webhook

// Made with Bob
