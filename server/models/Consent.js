/**
 * Consent Model
 * 
 * Represents user consent for data processing activities.
 * Supports GDPR, CCPA, and other privacy regulations.
 */

class Consent {
  constructor(data) {
    this.id = data.id
    this.userId = data.userId
    this.organizationId = data.organizationId
    this.consentType = data.consentType // 'data_processing', 'analytics', 'marketing', 'third_party_sharing'
    this.purpose = data.purpose // Specific purpose description
    this.granted = data.granted !== undefined ? data.granted : false
    this.grantedAt = data.grantedAt || null
    this.revokedAt = data.revokedAt || null
    this.expiresAt = data.expiresAt || null // Optional expiration
    this.version = data.version || '1.0' // Policy version
    this.ipAddress = data.ipAddress || null // IP when consent was given
    this.userAgent = data.userAgent || null // Browser/device info
    this.method = data.method || 'explicit' // 'explicit', 'implicit', 'opt_out'
    this.metadata = data.metadata || {}
    this.createdAt = data.createdAt || new Date().toISOString()
    this.updatedAt = data.updatedAt || new Date().toISOString()
  }

  /**
   * Check if consent is currently valid
   */
  isValid() {
    if (!this.granted) return false
    if (this.revokedAt) return false
    if (this.expiresAt && new Date(this.expiresAt) < new Date()) return false
    return true
  }

  /**
   * Grant consent
   */
  grant(ipAddress, userAgent) {
    this.granted = true
    this.grantedAt = new Date().toISOString()
    this.revokedAt = null
    this.ipAddress = ipAddress
    this.userAgent = userAgent
    this.updatedAt = new Date().toISOString()
  }

  /**
   * Revoke consent
   */
  revoke() {
    this.granted = false
    this.revokedAt = new Date().toISOString()
    this.updatedAt = new Date().toISOString()
  }

  /**
   * Check if consent has expired
   */
  isExpired() {
    if (!this.expiresAt) return false
    return new Date(this.expiresAt) < new Date()
  }

  /**
   * Get consent status
   */
  getStatus() {
    if (!this.granted) return 'not_granted'
    if (this.revokedAt) return 'revoked'
    if (this.isExpired()) return 'expired'
    return 'active'
  }

  /**
   * Sanitize for API response
   */
  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      organizationId: this.organizationId,
      consentType: this.consentType,
      purpose: this.purpose,
      granted: this.granted,
      grantedAt: this.grantedAt,
      revokedAt: this.revokedAt,
      expiresAt: this.expiresAt,
      version: this.version,
      method: this.method,
      status: this.getStatus(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    }
  }
}

module.exports = Consent

// Made with Bob
