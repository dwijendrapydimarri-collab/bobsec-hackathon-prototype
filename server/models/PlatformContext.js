/**
 * Platform Context
 * 
 * Central context object used by orchestrator and policies containing
 * tenant, organization, sector, region, and pipeline metadata.
 */
const logger = require('../utils/logger')
// Sector types
const SECTORS = {
  CONSUMER: 'CONSUMER',
  BANK: 'BANK',
  TELCO: 'TELCO',
  GOV: 'GOV',
  WALLET: 'WALLET',
  NGO: 'NGO'
}
// Region codes (ISO 3166-1 alpha-2)
const REGIONS = {
  IN: 'IN',      // India
  APAC: 'APAC',  // Asia-Pacific
  EU: 'EU',      // European Union
  US: 'US',      // United States
  GLOBAL: 'GLOBAL'
}
// Data residency policies
const DATA_RESIDENCY = {
  REGION_LOCAL: 'REGION_LOCAL',       // Data must stay in region
  GLOBAL_ALLOWED: 'GLOBAL_ALLOWED',   // Data can be shared globally
  RESTRICTED: 'RESTRICTED'             // Highly restricted, no sharing
}
class PlatformContext {
  constructor(data = {}) {
    // Core identifiers
    this.tenantId = data.tenantId || null
    this.organizationId = data.organizationId || null
    this.userId = data.userId || null
    this.requestId = data.requestId || this.generateRequestId()
    // Sector and region
    this.sector = data.sector || SECTORS.CONSUMER
    this.region = data.region || REGIONS.IN
    this.dataResidency = data.dataResidency || DATA_RESIDENCY.REGION_LOCAL
    // Pipeline configuration
    this.pipelineVersion = data.pipelineVersion || null
    this.policyProfileId = data.policyProfileId || null
    // Channel and source
    this.channel = data.channel || 'web'  // web, api, sms, whatsapp, email
    this.sourceIp = data.sourceIp || null
    this.userAgent = data.userAgent || null
    // Feature flags
    this.features = {
      enableScamIntel: data.features?.enableScamIntel !== false,
      enableCrossSectorSharing: data.features?.enableCrossSectorSharing || false,
      enableCrossRegionSharing: data.features?.enableCrossRegionSharing || false,
      enableInvestigation: data.features?.enableInvestigation || false
    }
    // Metadata
    this.metadata = data.metadata || {}
    this.createdAt = new Date()
  }
  /**
   * Validate context
   */
  validate() {
    const errors = []
    if (!this.tenantId) {
      errors.push('tenantId is required')
    }
    if (!this.organizationId) {
      errors.push('organizationId is required')
    }
    if (!Object.values(SECTORS).includes(this.sector)) {
      errors.push(`Invalid sector: ${this.sector}`)
    }
    if (!Object.values(REGIONS).includes(this.region)) {
      errors.push(`Invalid region: ${this.region}`)
    }
    if (!Object.values(DATA_RESIDENCY).includes(this.dataResidency)) {
      errors.push(`Invalid data residency: ${this.dataResidency}`)
    }
    return {
      valid: errors.length === 0,
      errors
    }
  }
  /**
   * Check if cross-sector sharing is allowed
   */
  canShareWithSector(targetSector) {
    // Same sector always allowed
    if (this.sector === targetSector) {
      return true
    }
    // Check feature flag
    if (!this.features.enableCrossSectorSharing) {
      return false
    }
    // GOV can receive from all sectors
    if (targetSector === SECTORS.GOV) {
      return true
    }
    // CONSUMER can share with BANK, TELCO, WALLET
    if (this.sector === SECTORS.CONSUMER) {
      return [SECTORS.BANK, SECTORS.TELCO, SECTORS.WALLET].includes(targetSector)
    }
    // BANK can share with WALLET
    if (this.sector === SECTORS.BANK && targetSector === SECTORS.WALLET) {
      return true
    }
    // Default: no cross-sector sharing
    return false
  }
  /**
   * Check if cross-region sharing is allowed
   */
  canShareWithRegion(targetRegion) {
    // Same region always allowed
    if (this.region === targetRegion) {
      return true
    }
    // Check data residency policy
    if (this.dataResidency === DATA_RESIDENCY.REGION_LOCAL) {
      return false
    }
    if (this.dataResidency === DATA_RESIDENCY.RESTRICTED) {
      return false
    }
    // Check feature flag
    if (!this.features.enableCrossRegionSharing) {
      return false
    }
    // GLOBAL_ALLOWED: can share with any region
    return this.dataResidency === DATA_RESIDENCY.GLOBAL_ALLOWED
  }
  /**
   * Check if data can be shared with target context
   */
  canShareWith(targetContext) {
    // Same tenant/org always allowed
    if (this.tenantId === targetContext.tenantId && 
        this.organizationId === targetContext.organizationId) {
      return true
    }
    // Check sector sharing
    if (!this.canShareWithSector(targetContext.sector)) {
      return false
    }
    // Check region sharing
    if (!this.canShareWithRegion(targetContext.region)) {
      return false
    }
    return true
  }
  /**
   * Get sector-specific configuration
   */
  getSectorConfig() {
    const configs = {
      [SECTORS.CONSUMER]: {
        defaultThresholds: {
          highRisk: 80,
          mediumRisk: 50,
          lowRisk: 20
        },
        requireHumanReview: false,
        enablePublicReporting: true,
        enableFamilyMode: true
      },
      [SECTORS.BANK]: {
        defaultThresholds: {
          highRisk: 70,
          mediumRisk: 40,
          lowRisk: 15
        },
        requireHumanReview: true,
        enablePublicReporting: false,
        enableTransactionAnalysis: true
      },
      [SECTORS.TELCO]: {
        defaultThresholds: {
          highRisk: 75,
          mediumRisk: 45,
          lowRisk: 20
        },
        requireHumanReview: false,
        enablePublicReporting: false,
        enableRouteAnalysis: true
      },
      [SECTORS.GOV]: {
        defaultThresholds: {
          highRisk: 60,
          mediumRisk: 35,
          lowRisk: 10
        },
        requireHumanReview: true,
        enablePublicReporting: true,
        enableInvestigation: true
      },
      [SECTORS.WALLET]: {
        defaultThresholds: {
          highRisk: 75,
          mediumRisk: 45,
          lowRisk: 20
        },
        requireHumanReview: true,
        enablePublicReporting: false,
        enableTransactionAnalysis: true
      },
      [SECTORS.NGO]: {
        defaultThresholds: {
          highRisk: 80,
          mediumRisk: 50,
          lowRisk: 25
        },
        requireHumanReview: false,
        enablePublicReporting: true,
        enableAwarenessMode: true
      }
    }
    return configs[this.sector] || configs[SECTORS.CONSUMER]
  }
  /**
   * Get region-specific configuration
   */
  getRegionConfig() {
    const configs = {
      [REGIONS.IN]: {
        timezone: 'Asia/Kolkata',
        currency: 'INR',
        languages: ['en', 'hi'],
        emergencyNumber: '1930',
        reportingPortal: 'cybercrime.gov.in'
      },
      [REGIONS.APAC]: {
        timezone: 'Asia/Singapore',
        currency: 'USD',
        languages: ['en'],
        emergencyNumber: null,
        reportingPortal: null
      },
      [REGIONS.EU]: {
        timezone: 'Europe/Brussels',
        currency: 'EUR',
        languages: ['en'],
        emergencyNumber: '112',
        reportingPortal: null
      },
      [REGIONS.US]: {
        timezone: 'America/New_York',
        currency: 'USD',
        languages: ['en'],
        emergencyNumber: '911',
        reportingPortal: 'ic3.gov'
      },
      [REGIONS.GLOBAL]: {
        timezone: 'UTC',
        currency: 'USD',
        languages: ['en'],
        emergencyNumber: null,
        reportingPortal: null
      }
    }
    return configs[this.region] || configs[REGIONS.GLOBAL]
  }
  /**
   * Create audit log entry
   */
  createAuditLog(action, details = {}) {
    return {
      timestamp: new Date(),
      requestId: this.requestId,
      tenantId: this.tenantId,
      organizationId: this.organizationId,
      userId: this.userId,
      sector: this.sector,
      region: this.region,
      action,
      details,
      sourceIp: this.sourceIp,
      userAgent: this.userAgent
    }
  }
  /**
   * Generate request ID
   */
  generateRequestId() {
    return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
  /**
   * Convert to JSON
   */
  toJSON() {
    return {
      tenantId: this.tenantId,
      organizationId: this.organizationId,
      userId: this.userId,
      requestId: this.requestId,
      sector: this.sector,
      region: this.region,
      dataResidency: this.dataResidency,
      pipelineVersion: this.pipelineVersion,
      policyProfileId: this.policyProfileId,
      channel: this.channel,
      features: this.features,
      metadata: this.metadata,
      createdAt: this.createdAt
    }
  }
  /**
   * Create from request
   */
  static fromRequest(req) {
    return new PlatformContext({
      tenantId: req.user?.tenantId,
      organizationId: req.user?.organizationId,
      userId: req.user?.id,
      requestId: req.id,
      sector: req.user?.organization?.sector || SECTORS.CONSUMER,
      region: req.user?.organization?.region || REGIONS.IN,
      dataResidency: req.user?.organization?.dataResidency || DATA_RESIDENCY.REGION_LOCAL,
      channel: req.headers['x-channel'] || 'web',
      sourceIp: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: {
        path: req.path,
        method: req.method
      }
    })
  }
}
module.exports = {
  PlatformContext,
  SECTORS,
  REGIONS,
  DATA_RESIDENCY
}
// Made with Bob