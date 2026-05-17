/**
 * Webhook Repository
 * 
 * Handles persistence operations for webhooks.
 * In-memory implementation with future database migration path.
 */

const crypto = require('crypto')
const Webhook = require('../models/Webhook')

class WebhookRepository {
  constructor() {
    this.webhooks = new Map() // id -> Webhook
    this.orgIndex = new Map() // organizationId -> Set of ids
    this.eventIndex = new Map() // event -> Set of ids
  }

  /**
   * Generate a webhook secret for HMAC signing
   */
  generateSecret() {
    return crypto.randomBytes(32).toString('base64url')
  }

  /**
   * Create a new webhook
   */
  async create(data) {
    const webhook = new Webhook({
      id: crypto.randomUUID(),
      secret: this.generateSecret(),
      ...data
    })

    this.webhooks.set(webhook.id, webhook)

    // Update org index
    if (!this.orgIndex.has(webhook.organizationId)) {
      this.orgIndex.set(webhook.organizationId, new Set())
    }
    this.orgIndex.get(webhook.organizationId).add(webhook.id)

    // Update event index
    webhook.events.forEach(event => {
      if (!this.eventIndex.has(event)) {
        this.eventIndex.set(event, new Set())
      }
      this.eventIndex.get(event).add(webhook.id)
    })

    return webhook
  }

  /**
   * Find webhook by ID
   */
  async findById(id) {
    return this.webhooks.get(id) || null
  }

  /**
   * Find all webhooks for an organization
   */
  async findByOrganization(organizationId) {
    const ids = this.orgIndex.get(organizationId)
    if (!ids) return []

    return Array.from(ids)
      .map(id => this.webhooks.get(id))
      .filter(Boolean)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }

  /**
   * Find all active webhooks subscribed to an event
   */
  async findByEvent(event, organizationId = null) {
    const webhooks = []

    // Check exact event match
    const exactIds = this.eventIndex.get(event) || new Set()
    
    // Check wildcard subscriptions
    const wildcardIds = this.eventIndex.get('*') || new Set()
    
    // Combine both sets
    const allIds = new Set([...exactIds, ...wildcardIds])

    for (const id of allIds) {
      const webhook = this.webhooks.get(id)
      if (!webhook || !webhook.isValid()) continue
      
      // Filter by organization if specified
      if (organizationId && webhook.organizationId !== organizationId) continue
      
      webhooks.push(webhook)
    }

    return webhooks
  }

  /**
   * Update a webhook
   */
  async update(id, updates) {
    const webhook = this.webhooks.get(id)
    if (!webhook) return null

    // If events are being updated, update the event index
    if (updates.events) {
      // Remove from old event indexes
      webhook.events.forEach(event => {
        const eventWebhooks = this.eventIndex.get(event)
        if (eventWebhooks) {
          eventWebhooks.delete(id)
        }
      })

      // Add to new event indexes
      updates.events.forEach(event => {
        if (!this.eventIndex.has(event)) {
          this.eventIndex.set(event, new Set())
        }
        this.eventIndex.get(event).add(id)
      })
    }

    // Update allowed fields
    const allowedFields = ['url', 'events', 'isActive', 'retryPolicy', 'headers', 'metadata']
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        webhook[field] = updates[field]
      }
    })

    webhook.updatedAt = new Date().toISOString()
    return webhook
  }

  /**
   * Delete a webhook (soft delete by deactivating)
   */
  async delete(id) {
    const webhook = this.webhooks.get(id)
    if (!webhook) return false

    webhook.isActive = false
    webhook.updatedAt = new Date().toISOString()
    return true
  }

  /**
   * Hard delete a webhook (remove from storage)
   */
  async hardDelete(id) {
    const webhook = this.webhooks.get(id)
    if (!webhook) return false

    // Remove from event indexes
    webhook.events.forEach(event => {
      const eventWebhooks = this.eventIndex.get(event)
      if (eventWebhooks) {
        eventWebhooks.delete(id)
      }
    })

    // Remove from org index
    const orgWebhooks = this.orgIndex.get(webhook.organizationId)
    if (orgWebhooks) {
      orgWebhooks.delete(id)
    }

    // Remove from main storage
    this.webhooks.delete(id)
    return true
  }

  /**
   * Record successful webhook delivery
   */
  async recordSuccess(id) {
    const webhook = this.webhooks.get(id)
    if (!webhook) return false

    webhook.recordSuccess()
    return true
  }

  /**
   * Record failed webhook delivery
   */
  async recordFailure(id, error) {
    const webhook = this.webhooks.get(id)
    if (!webhook) return false

    webhook.recordFailure(error)
    return true
  }

  /**
   * Get delivery statistics for an organization
   */
  async getDeliveryStats(organizationId) {
    const webhooks = await this.findByOrganization(organizationId)
    
    return {
      totalWebhooks: webhooks.length,
      activeWebhooks: webhooks.filter(w => w.isActive).length,
      totalDeliveries: webhooks.reduce((sum, w) => sum + w.successCount + w.failureCount, 0),
      successfulDeliveries: webhooks.reduce((sum, w) => sum + w.successCount, 0),
      failedDeliveries: webhooks.reduce((sum, w) => sum + w.failureCount, 0),
      lastTriggered: webhooks.reduce((latest, w) => {
        if (!w.lastTriggeredAt) return latest
        return !latest || new Date(w.lastTriggeredAt) > new Date(latest) 
          ? w.lastTriggeredAt 
          : latest
      }, null)
    }
  }

  /**
   * Regenerate webhook secret
   */
  async regenerateSecret(id) {
    const webhook = this.webhooks.get(id)
    if (!webhook) return null

    webhook.secret = this.generateSecret()
    webhook.updatedAt = new Date().toISOString()
    return webhook
  }
}

// Singleton instance
let instance = null

module.exports = {
  WebhookRepository,
  getWebhookRepository: () => {
    if (!instance) {
      instance = new WebhookRepository()
    }
    return instance
  }
}

// Made with Bob
