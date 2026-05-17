/**
 * API Key Model
 * 
 * Represents API keys for programmatic access to BobSec.
 * Each key belongs to an organization and has specific permissions.
 */

class ApiKey {
  constructor(data) {
    this.id = data.id
    this.organizationId = data.organizationId
    this.name = data.name
    this.keyPrefix = data.keyPrefix // First 8 chars for display (e.g., "bsk_live_")
    this.keyHash = data.keyHash // SHA-256 hash of full key
    this.permissions = data.permissions || ['analyse'] // ['analyse', 'history', 'webhooks']
    this.rateLimit = data.rateLimit || 100 // Requests per minute
    this.isActive = data.isActive !== undefined ? data.isActive : true
    this.lastUsedAt = data.lastUsedAt || null
    this.usageCount = data.usageCount || 0
    this.expiresAt = data.expiresAt || null // Optional expiration
    this.createdBy = data.createdBy // User ID who created the key
    this.createdAt = data.createdAt || new Date().toISOString()
    this.updatedAt = data.updatedAt || new Date().toISOString()
    this.metadata = data.metadata || {} // Custom metadata
  }

  /**
   * Check if key has a specific permission
   */
  hasPermission(permission) {
    return this.permissions.includes(permission)
  }

  /**
   * Check if key is expired
   */
  isExpired() {
    if (!this.expiresAt) return false
    return new Date(this.expiresAt) < new Date()
  }

  /**
   * Check if key is valid for use
   */
  isValid() {
    return this.isActive && !this.isExpired()
  }

  /**
   * Increment usage count
   */
  incrementUsage() {
    this.usageCount++
    this.lastUsedAt = new Date().toISOString()
    this.updatedAt = new Date().toISOString()
  }

  /**
   * Sanitize for API response (remove sensitive data)
   */
  toJSON() {
    return {
      id: this.id,
      organizationId: this.organizationId,
      name: this.name,
      keyPrefix: this.keyPrefix,
      permissions: this.permissions,
      rateLimit: this.rateLimit,
      isActive: this.isActive,
      lastUsedAt: this.lastUsedAt,
      usageCount: this.usageCount,
      expiresAt: this.expiresAt,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      metadata: this.metadata
    }
  }
}

module.exports = ApiKey

// Made with Bob
