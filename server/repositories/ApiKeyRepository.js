/**
 * API Key Repository
 * 
 * Handles persistence operations for API keys.
 * In-memory implementation with future database migration path.
 */

const crypto = require('crypto')
const ApiKey = require('../models/ApiKey')

class ApiKeyRepository {
  constructor() {
    this.apiKeys = new Map() // id -> ApiKey
    this.keyHashIndex = new Map() // keyHash -> id
    this.orgIndex = new Map() // organizationId -> Set of ids
  }

  /**
   * Generate a new API key
   * Format: bsk_live_<32 random chars> or bsk_test_<32 random chars>
   */
  generateKey(environment = 'live') {
    const randomBytes = crypto.randomBytes(24).toString('base64url')
    return `bsk_${environment}_${randomBytes}`
  }

  /**
   * Hash an API key for storage
   */
  hashKey(key) {
    return crypto.createHash('sha256').update(key).digest('hex')
  }

  /**
   * Create a new API key
   */
  async create(data) {
    const fullKey = this.generateKey(data.environment || 'live')
    const keyHash = this.hashKey(fullKey)
    const keyPrefix = fullKey.substring(0, 16) + '...' // First 16 chars for display

    const apiKey = new ApiKey({
      id: crypto.randomUUID(),
      ...data,
      keyPrefix,
      keyHash
    })

    this.apiKeys.set(apiKey.id, apiKey)
    this.keyHashIndex.set(keyHash, apiKey.id)

    // Update org index
    if (!this.orgIndex.has(apiKey.organizationId)) {
      this.orgIndex.set(apiKey.organizationId, new Set())
    }
    this.orgIndex.get(apiKey.organizationId).add(apiKey.id)

    return { apiKey, fullKey } // Return full key only once
  }

  /**
   * Find API key by full key (for authentication)
   */
  async findByKey(key) {
    const keyHash = this.hashKey(key)
    const id = this.keyHashIndex.get(keyHash)
    if (!id) return null

    const apiKey = this.apiKeys.get(id)
    if (!apiKey || !apiKey.isValid()) return null

    return apiKey
  }

  /**
   * Find API key by ID
   */
  async findById(id) {
    return this.apiKeys.get(id) || null
  }

  /**
   * Find all API keys for an organization
   */
  async findByOrganization(organizationId) {
    const ids = this.orgIndex.get(organizationId)
    if (!ids) return []

    return Array.from(ids)
      .map(id => this.apiKeys.get(id))
      .filter(Boolean)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }

  /**
   * Update an API key
   */
  async update(id, updates) {
    const apiKey = this.apiKeys.get(id)
    if (!apiKey) return null

    // Update allowed fields
    const allowedFields = ['name', 'permissions', 'rateLimit', 'isActive', 'expiresAt', 'metadata']
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        apiKey[field] = updates[field]
      }
    })

    apiKey.updatedAt = new Date().toISOString()
    return apiKey
  }

  /**
   * Delete an API key (soft delete by deactivating)
   */
  async delete(id) {
    const apiKey = this.apiKeys.get(id)
    if (!apiKey) return false

    apiKey.isActive = false
    apiKey.updatedAt = new Date().toISOString()
    return true
  }

  /**
   * Hard delete an API key (remove from storage)
   */
  async hardDelete(id) {
    const apiKey = this.apiKeys.get(id)
    if (!apiKey) return false

    // Remove from indexes
    this.keyHashIndex.delete(apiKey.keyHash)
    const orgKeys = this.orgIndex.get(apiKey.organizationId)
    if (orgKeys) {
      orgKeys.delete(id)
    }

    // Remove from main storage
    this.apiKeys.delete(id)
    return true
  }

  /**
   * Record API key usage
   */
  async recordUsage(id) {
    const apiKey = this.apiKeys.get(id)
    if (!apiKey) return false

    apiKey.incrementUsage()
    return true
  }

  /**
   * Get usage statistics for an organization
   */
  async getUsageStats(organizationId) {
    const keys = await this.findByOrganization(organizationId)
    
    return {
      totalKeys: keys.length,
      activeKeys: keys.filter(k => k.isActive).length,
      totalUsage: keys.reduce((sum, k) => sum + k.usageCount, 0),
      lastUsed: keys.reduce((latest, k) => {
        if (!k.lastUsedAt) return latest
        return !latest || new Date(k.lastUsedAt) > new Date(latest) 
          ? k.lastUsedAt 
          : latest
      }, null)
    }
  }
}

// Singleton instance
let instance = null

module.exports = {
  ApiKeyRepository,
  getApiKeyRepository: () => {
    if (!instance) {
      instance = new ApiKeyRepository()
    }
    return instance
  }
}

// Made with Bob
