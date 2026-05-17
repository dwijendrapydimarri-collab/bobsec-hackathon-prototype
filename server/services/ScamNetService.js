/**
 * ScamNet Service - Shared Scam Intelligence Layer
 * 
 * A cross-sector threat intelligence sharing system that enables:
 * - Real-time scam indicator sharing across sectors
 * - Privacy-preserving intelligence exchange
 * - Reputation scoring for entities (phones, URLs, UPIs)
 * - Pattern detection across the ecosystem
 * - Compliance-aware data sharing
 * 
 * Key Principles:
 * - Privacy-first: Only anonymized indicators are shared
 * - Sector-aware: Respects cross-sector sharing rules
 * - Region-aware: Respects data residency requirements
 * - Consent-driven: Organizations opt-in to sharing
 * - Governance: All sharing is audited and logged
 */

const logger = require('../utils/logger')
const { PlatformContext } = require('../models/PlatformContext')

class ScamNetService {
  constructor() {
    this.name = 'ScamNet'
    
    // In-memory intelligence store (in production, use Redis/database)
    this.indicators = {
      phone_numbers: new Map(),  // phone -> reputation data
      urls: new Map(),            // url -> reputation data
      upi_ids: new Map(),         // upi -> reputation data
      patterns: new Map()         // pattern_hash -> pattern data
    }
    
    // Sharing statistics
    this.stats = {
      total_contributions: 0,
      total_queries: 0,
      cross_sector_shares: 0,
      blocked_shares: 0
    }
  }
  
  // ════════════════════════════════════════════════════════════════════════════
  // Intelligence Contribution
  // ════════════════════════════════════════════════════════════════════════════
  
  /**
   * Contribute scam intelligence to ScamNet
   * 
   * @param {Object} intelligence - Intelligence data
   * @param {Object} context - Platform context
   * @returns {Promise<Object>} Contribution result
   */
  async contribute(intelligence, context) {
    logger.info('ScamNet: Receiving intelligence contribution', {
      sector: context.sector,
      region: context.region,
      indicatorCount: this.countIndicators(intelligence)
    })
    
    // Validate contribution
    const validation = this.validateContribution(intelligence, context)
    if (!validation.valid) {
      logger.warn('ScamNet: Invalid contribution', { errors: validation.errors })
      return {
        success: false,
        errors: validation.errors
      }
    }
    
    // Anonymize intelligence
    const anonymized = this.anonymizeIntelligence(intelligence, context)
    
    // Store indicators
    const stored = await this.storeIndicators(anonymized, context)
    
    // Update statistics
    this.stats.total_contributions++
    
    logger.info('ScamNet: Intelligence contribution accepted', {
      stored: stored.count,
      sector: context.sector
    })
    
    return {
      success: true,
      contribution_id: this.generateContributionId(),
      indicators_stored: stored.count,
      reputation_updated: stored.updated
    }
  }
  
  /**
   * Validate intelligence contribution
   */
  validateContribution(intelligence, context) {
    const errors = []
    
    // Check if organization has opted into sharing
    if (!context.features?.enableScamIntel) {
      errors.push('Organization has not opted into ScamNet intelligence sharing')
    }
    
    // Check if intelligence has required fields
    if (!intelligence.risk_score || intelligence.risk_score < 50) {
      errors.push('Only high-confidence intelligence (risk_score >= 50) can be contributed')
    }
    
    if (!intelligence.entities) {
      errors.push('Intelligence must include entities')
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  }
  
  /**
   * Anonymize intelligence before sharing
   */
  anonymizeIntelligence(intelligence, context) {
    return {
      // Remove identifying information
      risk_score: intelligence.risk_score,
      risk_level: intelligence.risk_level,
      category: intelligence.category,
      
      // Anonymized entities
      entities: {
        phone_numbers: intelligence.entities.phone_numbers?.map(p => ({
          value: this.hashEntity(p.value || p),
          verdict: p.verdict || 'FLAGGED'
        })) || [],
        urls: intelligence.entities.urls?.map(u => ({
          value: this.normalizeUrl(u.value || u),
          verdict: u.verdict || 'MALICIOUS'
        })) || [],
        upi_ids: intelligence.entities.upi_ids?.map(u => ({
          value: this.hashEntity(u.value || u),
          verdict: u.verdict || 'FLAGGED'
        })) || []
      },
      
      // Metadata (anonymized)
      metadata: {
        sector: context.sector,
        region: context.region,
        timestamp: new Date().toISOString(),
        confidence: intelligence.confidence
      }
    }
  }
  
  /**
   * Store indicators in ScamNet
   */
  async storeIndicators(intelligence, context) {
    let count = 0
    let updated = 0
    
    // Store phone numbers
    for (const phone of intelligence.entities.phone_numbers) {
      const existing = this.indicators.phone_numbers.get(phone.value)
      
      if (existing) {
        // Update reputation
        existing.report_count++
        existing.sectors.add(context.sector)
        existing.last_seen = new Date()
        updated++
      } else {
        // New indicator
        this.indicators.phone_numbers.set(phone.value, {
          value: phone.value,
          verdict: phone.verdict,
          report_count: 1,
          sectors: new Set([context.sector]),
          regions: new Set([context.region]),
          first_seen: new Date(),
          last_seen: new Date()
        })
        count++
      }
    }
    
    // Store URLs
    for (const url of intelligence.entities.urls) {
      const existing = this.indicators.urls.get(url.value)
      
      if (existing) {
        existing.report_count++
        existing.sectors.add(context.sector)
        existing.last_seen = new Date()
        updated++
      } else {
        this.indicators.urls.set(url.value, {
          value: url.value,
          verdict: url.verdict,
          report_count: 1,
          sectors: new Set([context.sector]),
          regions: new Set([context.region]),
          first_seen: new Date(),
          last_seen: new Date()
        })
        count++
      }
    }
    
    // Store UPI IDs
    for (const upi of intelligence.entities.upi_ids) {
      const existing = this.indicators.upi_ids.get(upi.value)
      
      if (existing) {
        existing.report_count++
        existing.sectors.add(context.sector)
        existing.last_seen = new Date()
        updated++
      } else {
        this.indicators.upi_ids.set(upi.value, {
          value: upi.value,
          verdict: upi.verdict,
          report_count: 1,
          sectors: new Set([context.sector]),
          regions: new Set([context.region]),
          first_seen: new Date(),
          last_seen: new Date()
        })
        count++
      }
    }
    
    return { count, updated }
  }
  
  // ════════════════════════════════════════════════════════════════════════════
  // Intelligence Query
  // ════════════════════════════════════════════════════════════════════════════
  
  /**
   * Query ScamNet for intelligence about entities
   * 
   * @param {Object} entities - Entities to query
   * @param {Object} context - Platform context
   * @returns {Promise<Object>} Intelligence results
   */
  async query(entities, context) {
    logger.info('ScamNet: Querying intelligence', {
      sector: context.sector,
      region: context.region,
      entityCount: this.countIndicators({ entities })
    })
    
    // Check if organization can access ScamNet
    if (!context.features?.enableScamIntel) {
      logger.warn('ScamNet: Organization not enabled for intelligence queries')
      return {
        success: false,
        error: 'ScamNet intelligence not enabled for this organization'
      }
    }
    
    // Query indicators
    const results = {
      phone_numbers: [],
      urls: [],
      upi_ids: [],
      patterns: []
    }
    
    // Query phone numbers
    if (entities.phone_numbers) {
      for (const phone of entities.phone_numbers) {
        const hash = this.hashEntity(phone.value || phone)
        const intel = this.indicators.phone_numbers.get(hash)
        
        if (intel && this.canShare(intel, context)) {
          results.phone_numbers.push({
            value: phone.value || phone,
            verdict: intel.verdict,
            report_count: intel.report_count,
            sectors: Array.from(intel.sectors),
            confidence: this.calculateConfidence(intel)
          })
        }
      }
    }
    
    // Query URLs
    if (entities.urls) {
      for (const url of entities.urls) {
        const normalized = this.normalizeUrl(url.value || url)
        const intel = this.indicators.urls.get(normalized)
        
        if (intel && this.canShare(intel, context)) {
          results.urls.push({
            value: url.value || url,
            verdict: intel.verdict,
            report_count: intel.report_count,
            sectors: Array.from(intel.sectors),
            confidence: this.calculateConfidence(intel)
          })
        }
      }
    }
    
    // Query UPI IDs
    if (entities.upi_ids) {
      for (const upi of entities.upi_ids) {
        const hash = this.hashEntity(upi.value || upi)
        const intel = this.indicators.upi_ids.get(hash)
        
        if (intel && this.canShare(intel, context)) {
          results.upi_ids.push({
            value: upi.value || upi,
            verdict: intel.verdict,
            report_count: intel.report_count,
            sectors: Array.from(intel.sectors),
            confidence: this.calculateConfidence(intel)
          })
        }
      }
    }
    
    // Update statistics
    this.stats.total_queries++
    
    logger.info('ScamNet: Query complete', {
      phones: results.phone_numbers.length,
      urls: results.urls.length,
      upis: results.upi_ids.length
    })
    
    return {
      success: true,
      results,
      metadata: {
        query_time: new Date().toISOString(),
        sector: context.sector,
        region: context.region
      }
    }
  }
  
  /**
   * Check if intelligence can be shared with requesting context
   */
  canShare(intel, context) {
    // Same sector: Always allowed
    if (intel.sectors.has(context.sector)) {
      return true
    }
    
    // Check cross-sector sharing rules
    const canShareCrossSector = context.canShareWithSector 
      ? Array.from(intel.sectors).some(sector => context.canShareWithSector(sector))
      : false
    
    if (canShareCrossSector) {
      this.stats.cross_sector_shares++
      return true
    }
    
    // Check cross-region sharing rules
    const canShareCrossRegion = context.canShareWithRegion
      ? Array.from(intel.regions).some(region => context.canShareWithRegion(region))
      : false
    
    if (!canShareCrossRegion) {
      this.stats.blocked_shares++
      return false
    }
    
    return true
  }
  
  /**
   * Calculate confidence score for intelligence
   */
  calculateConfidence(intel) {
    // More reports = higher confidence
    const reportScore = Math.min(intel.report_count * 10, 50)
    
    // Multiple sectors = higher confidence
    const sectorScore = Math.min(intel.sectors.size * 15, 30)
    
    // Recency bonus
    const daysSinceLastSeen = (new Date() - intel.last_seen) / (1000 * 60 * 60 * 24)
    const recencyScore = daysSinceLastSeen < 7 ? 20 : daysSinceLastSeen < 30 ? 10 : 0
    
    return Math.min(reportScore + sectorScore + recencyScore, 100)
  }
  
  // ════════════════════════════════════════════════════════════════════════════
  // Statistics and Monitoring
  // ════════════════════════════════════════════════════════════════════════════
  
  /**
   * Get ScamNet statistics
   */
  getStats() {
    return {
      ...this.stats,
      indicators: {
        phone_numbers: this.indicators.phone_numbers.size,
        urls: this.indicators.urls.size,
        upi_ids: this.indicators.upi_ids.size,
        patterns: this.indicators.patterns.size
      },
      health: 'operational'
    }
  }
  
  /**
   * Get top indicators by report count
   */
  getTopIndicators(type, limit = 10) {
    const indicators = Array.from(this.indicators[type].values())
      .sort((a, b) => b.report_count - a.report_count)
      .slice(0, limit)
      .map(i => ({
        value: i.value,
        report_count: i.report_count,
        sectors: Array.from(i.sectors),
        confidence: this.calculateConfidence(i)
      }))
    
    return indicators
  }
  
  // ════════════════════════════════════════════════════════════════════════════
  // Helper Methods
  // ════════════════════════════════════════════════════════════════════════════
  
  /**
   * Hash entity for privacy
   */
  hashEntity(value) {
    const crypto = require('crypto')
    return crypto.createHash('sha256').update(value.toLowerCase()).digest('hex').substring(0, 16)
  }
  
  /**
   * Normalize URL for consistent matching
   */
  normalizeUrl(url) {
    return url.toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '')
  }
  
  /**
   * Count indicators in intelligence
   */
  countIndicators(intelligence) {
    if (!intelligence.entities) return 0
    
    return (intelligence.entities.phone_numbers?.length || 0) +
           (intelligence.entities.urls?.length || 0) +
           (intelligence.entities.upi_ids?.length || 0)
  }
  
  /**
   * Generate contribution ID
   */
  generateContributionId() {
    return `scamnet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

// Singleton instance
const scamNetService = new ScamNetService()

module.exports = scamNetService

// Made with Bob
