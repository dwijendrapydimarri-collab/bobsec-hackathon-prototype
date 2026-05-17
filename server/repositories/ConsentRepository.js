/**
 * Consent Repository
 * 
 * Handles persistence operations for user consent records.
 * In-memory implementation with future database migration path.
 */

const crypto = require('crypto')
const Consent = require('../models/Consent')

class ConsentRepository {
  constructor() {
    this.consents = new Map() // id -> Consent
    this.userIndex = new Map() // userId -> Set of consent ids
    this.orgIndex = new Map() // organizationId -> Set of consent ids
    this.typeIndex = new Map() // consentType -> Set of consent ids
  }

  /**
   * Create a new consent record
   */
  async create(data) {
    const consent = new Consent({
      id: crypto.randomUUID(),
      ...data
    })

    this.consents.set(consent.id, consent)

    // Update user index
    if (!this.userIndex.has(consent.userId)) {
      this.userIndex.set(consent.userId, new Set())
    }
    this.userIndex.get(consent.userId).add(consent.id)

    // Update org index
    if (!this.orgIndex.has(consent.organizationId)) {
      this.orgIndex.set(consent.organizationId, new Set())
    }
    this.orgIndex.get(consent.organizationId).add(consent.id)

    // Update type index
    if (!this.typeIndex.has(consent.consentType)) {
      this.typeIndex.set(consent.consentType, new Set())
    }
    this.typeIndex.get(consent.consentType).add(consent.id)

    return consent
  }

  /**
   * Find consent by ID
   */
  async findById(id) {
    return this.consents.get(id) || null
  }

  /**
   * Find all consents for a user
   */
  async findByUser(userId) {
    const ids = this.userIndex.get(userId)
    if (!ids) return []

    return Array.from(ids)
      .map(id => this.consents.get(id))
      .filter(Boolean)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }

  /**
   * Find consent by user and type
   */
  async findByUserAndType(userId, consentType) {
    const userConsents = await this.findByUser(userId)
    return userConsents.find(c => c.consentType === consentType) || null
  }

  /**
   * Find all consents for an organization
   */
  async findByOrganization(organizationId) {
    const ids = this.orgIndex.get(organizationId)
    if (!ids) return []

    return Array.from(ids)
      .map(id => this.consents.get(id))
      .filter(Boolean)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }

  /**
   * Check if user has granted consent for a specific type
   */
  async hasConsent(userId, consentType) {
    const consent = await this.findByUserAndType(userId, consentType)
    return consent ? consent.isValid() : false
  }

  /**
   * Grant consent
   */
  async grantConsent(userId, consentType, purpose, ipAddress, userAgent, organizationId) {
    // Check if consent already exists
    let consent = await this.findByUserAndType(userId, consentType)

    if (consent) {
      // Update existing consent
      consent.grant(ipAddress, userAgent)
    } else {
      // Create new consent
      consent = await this.create({
        userId,
        organizationId,
        consentType,
        purpose,
        granted: true,
        grantedAt: new Date().toISOString(),
        ipAddress,
        userAgent
      })
    }

    return consent
  }

  /**
   * Revoke consent
   */
  async revokeConsent(userId, consentType) {
    const consent = await this.findByUserAndType(userId, consentType)
    if (!consent) return null

    consent.revoke()
    return consent
  }

  /**
   * Update consent
   */
  async update(id, updates) {
    const consent = this.consents.get(id)
    if (!consent) return null

    // Update allowed fields
    const allowedFields = ['purpose', 'expiresAt', 'metadata']
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        consent[field] = updates[field]
      }
    })

    consent.updatedAt = new Date().toISOString()
    return consent
  }

  /**
   * Delete consent
   */
  async delete(id) {
    const consent = this.consents.get(id)
    if (!consent) return false

    // Remove from indexes
    const userConsents = this.userIndex.get(consent.userId)
    if (userConsents) {
      userConsents.delete(id)
    }

    const orgConsents = this.orgIndex.get(consent.organizationId)
    if (orgConsents) {
      orgConsents.delete(id)
    }

    const typeConsents = this.typeIndex.get(consent.consentType)
    if (typeConsents) {
      typeConsents.delete(id)
    }

    // Remove from main storage
    this.consents.delete(id)
    return true
  }

  /**
   * Get consent statistics for an organization
   */
  async getStats(organizationId) {
    const consents = await this.findByOrganization(organizationId)

    const stats = {
      total: consents.length,
      granted: 0,
      revoked: 0,
      expired: 0,
      active: 0,
      byType: {}
    }

    consents.forEach(consent => {
      const status = consent.getStatus()

      if (status === 'active') stats.active++
      if (status === 'revoked') stats.revoked++
      if (status === 'expired') stats.expired++
      if (consent.granted) stats.granted++

      // Count by type
      if (!stats.byType[consent.consentType]) {
        stats.byType[consent.consentType] = {
          total: 0,
          active: 0,
          revoked: 0
        }
      }
      stats.byType[consent.consentType].total++
      if (status === 'active') stats.byType[consent.consentType].active++
      if (status === 'revoked') stats.byType[consent.consentType].revoked++
    })

    return stats
  }

  /**
   * Get consent audit trail for a user
   */
  async getAuditTrail(userId) {
    const consents = await this.findByUser(userId)

    return consents.map(consent => ({
      id: consent.id,
      consentType: consent.consentType,
      purpose: consent.purpose,
      status: consent.getStatus(),
      grantedAt: consent.grantedAt,
      revokedAt: consent.revokedAt,
      ipAddress: consent.ipAddress,
      userAgent: consent.userAgent,
      version: consent.version
    }))
  }

  /**
   * Expire old consents
   */
  async expireOldConsents() {
    const now = new Date()
    let expiredCount = 0

    for (const consent of this.consents.values()) {
      if (consent.expiresAt && new Date(consent.expiresAt) < now && consent.granted) {
        consent.revoke()
        expiredCount++
      }
    }

    return expiredCount
  }
}

// Singleton instance
let instance = null

module.exports = {
  ConsentRepository,
  getConsentRepository: () => {
    if (!instance) {
      instance = new ConsentRepository()
    }
    return instance
  }
}

// Made with Bob
