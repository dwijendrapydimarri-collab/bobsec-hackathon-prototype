/**
 * Webhook Service
 * 
 * Handles webhook delivery with retry logic, signature generation,
 * and event dispatching.
 */

const crypto = require('crypto')
const axios = require('axios')
const { getWebhookRepository } = require('../repositories/WebhookRepository')
const logger = require('../utils/logger')

class WebhookService {
  constructor() {
    this.webhookRepo = getWebhookRepository()
    this.deliveryQueue = [] // Simple in-memory queue
    this.isProcessing = false
  }

  /**
   * Generate HMAC signature for webhook payload
   */
  generateSignature(payload, secret) {
    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(JSON.stringify(payload))
    return hmac.digest('hex')
  }

  /**
   * Verify webhook signature
   */
  verifySignature(payload, signature, secret) {
    const expectedSignature = this.generateSignature(payload, secret)
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  }

  /**
   * Dispatch an event to all subscribed webhooks
   */
  async dispatch(event, data, organizationId) {
    logger.info('Dispatching webhook event', { event, organizationId })

    // Find all webhooks subscribed to this event
    const webhooks = await this.webhookRepo.findByEvent(event, organizationId)

    if (webhooks.length === 0) {
      logger.debug('No webhooks subscribed to event', { event, organizationId })
      return
    }

    // Queue deliveries
    for (const webhook of webhooks) {
      this.queueDelivery(webhook, event, data)
    }

    // Start processing queue if not already running
    if (!this.isProcessing) {
      this.processQueue()
    }
  }

  /**
   * Queue a webhook delivery
   */
  queueDelivery(webhook, event, data, attemptNumber = 1) {
    const delivery = {
      webhookId: webhook.id,
      webhook,
      event,
      payload: {
        id: crypto.randomUUID(),
        event,
        timestamp: new Date().toISOString(),
        data
      },
      attemptNumber,
      scheduledAt: Date.now()
    }

    this.deliveryQueue.push(delivery)
    logger.debug('Queued webhook delivery', { 
      webhookId: webhook.id, 
      event, 
      attemptNumber 
    })
  }

  /**
   * Process the delivery queue
   */
  async processQueue() {
    if (this.isProcessing) return
    this.isProcessing = true

    while (this.deliveryQueue.length > 0) {
      const delivery = this.deliveryQueue.shift()

      // Check if delivery should be delayed (for retries)
      const now = Date.now()
      if (delivery.scheduledAt > now) {
        // Re-queue for later
        this.deliveryQueue.push(delivery)
        await new Promise(resolve => setTimeout(resolve, 100))
        continue
      }

      await this.deliverWebhook(delivery)
    }

    this.isProcessing = false
  }

  /**
   * Deliver a webhook to its endpoint
   */
  async deliverWebhook(delivery) {
    const { webhook, payload, attemptNumber } = delivery

    try {
      logger.info('Delivering webhook', {
        webhookId: webhook.id,
        url: webhook.url,
        event: delivery.event,
        attempt: attemptNumber
      })

      // Generate signature
      const signature = this.generateSignature(payload, webhook.secret)

      // Prepare headers
      const headers = {
        'Content-Type': 'application/json',
        'X-BobSec-Signature': signature,
        'X-BobSec-Event': delivery.event,
        'X-BobSec-Delivery-ID': payload.id,
        'X-BobSec-Timestamp': payload.timestamp,
        'User-Agent': 'BobSec-Webhook/1.0',
        ...webhook.headers
      }

      // Send webhook
      const response = await axios.post(webhook.url, payload, {
        headers,
        timeout: 10000, // 10 second timeout
        validateStatus: (status) => status >= 200 && status < 300
      })

      // Record success
      await this.webhookRepo.recordSuccess(webhook.id)

      logger.info('Webhook delivered successfully', {
        webhookId: webhook.id,
        status: response.status,
        attempt: attemptNumber
      })

    } catch (error) {
      logger.error('Webhook delivery failed', {
        webhookId: webhook.id,
        error: error.message,
        attempt: attemptNumber
      })

      // Record failure
      const errorMessage = error.response 
        ? `HTTP ${error.response.status}: ${error.response.statusText}`
        : error.message

      await this.webhookRepo.recordFailure(webhook.id, errorMessage)

      // Retry if attempts remaining
      if (attemptNumber < webhook.retryPolicy.maxRetries) {
        const retryDelay = webhook.getRetryDelay(attemptNumber)
        
        logger.info('Scheduling webhook retry', {
          webhookId: webhook.id,
          attempt: attemptNumber + 1,
          delayMs: retryDelay
        })

        this.queueDelivery(
          webhook,
          delivery.event,
          delivery.payload.data,
          attemptNumber + 1
        )

        // Update scheduled time for retry
        const lastDelivery = this.deliveryQueue[this.deliveryQueue.length - 1]
        if (lastDelivery && lastDelivery.webhookId === webhook.id) {
          lastDelivery.scheduledAt = Date.now() + retryDelay
        }
      } else {
        logger.warn('Webhook delivery failed after max retries', {
          webhookId: webhook.id,
          maxRetries: webhook.retryPolicy.maxRetries
        })
      }
    }
  }

  /**
   * Test a webhook endpoint
   */
  async testWebhook(webhookId) {
    const webhook = await this.webhookRepo.findById(webhookId)
    if (!webhook) {
      throw new Error('Webhook not found')
    }

    const testPayload = {
      id: crypto.randomUUID(),
      event: 'webhook.test',
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a test webhook from BobSec',
        webhookId: webhook.id
      }
    }

    const signature = this.generateSignature(testPayload, webhook.secret)

    const headers = {
      'Content-Type': 'application/json',
      'X-BobSec-Signature': signature,
      'X-BobSec-Event': 'webhook.test',
      'X-BobSec-Delivery-ID': testPayload.id,
      'X-BobSec-Timestamp': testPayload.timestamp,
      'User-Agent': 'BobSec-Webhook/1.0',
      ...webhook.headers
    }

    try {
      const response = await axios.post(webhook.url, testPayload, {
        headers,
        timeout: 10000,
        validateStatus: (status) => status >= 200 && status < 300
      })

      return {
        success: true,
        status: response.status,
        message: 'Webhook test successful'
      }
    } catch (error) {
      return {
        success: false,
        status: error.response?.status || 0,
        message: error.response 
          ? `HTTP ${error.response.status}: ${error.response.statusText}`
          : error.message
      }
    }
  }

  /**
   * Get available webhook events
   */
  getAvailableEvents() {
    return [
      {
        name: 'analysis.completed',
        description: 'Triggered when a scam analysis is completed',
        payload: {
          analysisId: 'string',
          riskLevel: 'HIGH | MEDIUM | LOW | SAFE | UNKNOWN',
          riskScore: 'number',
          category: 'string',
          timestamp: 'ISO 8601 string'
        }
      },
      {
        name: 'analysis.high_risk',
        description: 'Triggered when a high-risk scam is detected',
        payload: {
          analysisId: 'string',
          riskScore: 'number',
          category: 'string',
          redFlags: 'array',
          timestamp: 'ISO 8601 string'
        }
      },
      {
        name: 'user.distressed',
        description: 'Triggered when a distressed user is detected',
        payload: {
          analysisId: 'string',
          userId: 'string',
          timestamp: 'ISO 8601 string'
        }
      },
      {
        name: 'apikey.created',
        description: 'Triggered when a new API key is created',
        payload: {
          apiKeyId: 'string',
          name: 'string',
          permissions: 'array',
          timestamp: 'ISO 8601 string'
        }
      },
      {
        name: 'apikey.revoked',
        description: 'Triggered when an API key is revoked',
        payload: {
          apiKeyId: 'string',
          name: 'string',
          timestamp: 'ISO 8601 string'
        }
      },
      {
        name: '*',
        description: 'Subscribe to all events (wildcard)',
        payload: 'Varies by event'
      }
    ]
  }
}

// Singleton instance
let instance = null

module.exports = {
  WebhookService,
  getWebhookService: () => {
    if (!instance) {
      instance = new WebhookService()
    }
    return instance
  }
}

// Made with Bob
