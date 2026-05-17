/**
 * Platform Configuration
 * 
 * Multi-region and multi-tenant platform configuration.
 */

const { REGIONS, DATA_RESIDENCY } = require('../models/PlatformContext')

// Current instance configuration
const PLATFORM_CONFIG = {
  // Region where this instance is deployed
  regionId: process.env.PLATFORM_REGION || REGIONS.IN,
  
  // Instance identifier
  instanceId: process.env.PLATFORM_INSTANCE_ID || `instance-${Date.now()}`,
  
  // Data sharing configuration
  dataSharing: {
    // Allow sharing anonymized intel outside the region
    allowCrossRegionIntel: process.env.ALLOW_CROSS_REGION_INTEL === 'true',
    
    // Allow sharing with other sectors
    allowCrossSectorIntel: process.env.ALLOW_CROSS_SECTOR_INTEL === 'true',
    
    // Anonymization level for shared intel
    anonymizationLevel: process.env.ANONYMIZATION_LEVEL || 'high', // low, medium, high
    
    // Retention period for shared intel (days)
    intelRetentionDays: parseInt(process.env.INTEL_RETENTION_DAYS || '90')
  },
  
  // Tenant isolation configuration
  tenantIsolation: {
    // Enforce strict tenant isolation in queries
    enforceStrictIsolation: process.env.ENFORCE_STRICT_ISOLATION !== 'false',
    
    // Log all cross-tenant access attempts
    logCrossTenantAccess: process.env.LOG_CROSS_TENANT_ACCESS !== 'false',
    
    // Block cross-tenant access (vs just log)
    blockCrossTenantAccess: process.env.BLOCK_CROSS_TENANT_ACCESS !== 'false'
  },
  
  // Regional compliance
  compliance: {
    // GDPR compliance (EU)
    gdprEnabled: process.env.GDPR_ENABLED === 'true',
    
    // Data localization (India)
    dataLocalizationEnabled: process.env.DATA_LOCALIZATION_ENABLED === 'true',
    
    // Audit log retention (days)
    auditLogRetentionDays: parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || '365')
  },
  
  // Feature flags per region
  regionalFeatures: {
    [REGIONS.IN]: {
      enableNCRPIntegration: true,
      enableUPIAnalysis: true,
      enableAadhaarMasking: true,
      emergencyNumber: '1930'
    },
    [REGIONS.APAC]: {
      enableNCRPIntegration: false,
      enableUPIAnalysis: false,
      enableAadhaarMasking: false,
      emergencyNumber: null
    },
    [REGIONS.EU]: {
      enableNCRPIntegration: false,
      enableUPIAnalysis: false,
      enableAadhaarMasking: false,
      emergencyNumber: '112',
      gdprCompliance: true
    },
    [REGIONS.US]: {
      enableNCRPIntegration: false,
      enableUPIAnalysis: false,
      enableAadhaarMasking: false,
      emergencyNumber: '911'
    },
    [REGIONS.GLOBAL]: {
      enableNCRPIntegration: false,
      enableUPIAnalysis: false,
      enableAadhaarMasking: false,
      emergencyNumber: null
    }
  },
  
  // Performance limits
  limits: {
    // Max concurrent analyses per tenant
    maxConcurrentAnalysesPerTenant: parseInt(process.env.MAX_CONCURRENT_ANALYSES || '100'),
    
    // Max API requests per minute per tenant
    maxRequestsPerMinutePerTenant: parseInt(process.env.MAX_REQUESTS_PER_MINUTE || '1000'),
    
    // Max storage per tenant (MB)
    maxStoragePerTenantMB: parseInt(process.env.MAX_STORAGE_PER_TENANT_MB || '10240')
  }
}

/**
 * Get regional features for current instance
 */
function getRegionalFeatures() {
  return PLATFORM_CONFIG.regionalFeatures[PLATFORM_CONFIG.regionId] || 
         PLATFORM_CONFIG.regionalFeatures[REGIONS.GLOBAL]
}

/**
 * Check if cross-region sharing is allowed
 */
function isCrossRegionSharingAllowed(sourceRegion, targetRegion) {
  // Same region always allowed
  if (sourceRegion === targetRegion) {
    return true
  }
  
  // Check platform config
  if (!PLATFORM_CONFIG.dataSharing.allowCrossRegionIntel) {
    return false
  }
  
  // Check regional compliance
  if (sourceRegion === REGIONS.EU && PLATFORM_CONFIG.compliance.gdprEnabled) {
    // GDPR: only share with adequate protection
    return targetRegion === REGIONS.EU || targetRegion === REGIONS.US
  }
  
  if (sourceRegion === REGIONS.IN && PLATFORM_CONFIG.compliance.dataLocalizationEnabled) {
    // India data localization: no cross-border sharing
    return false
  }
  
  return true
}

/**
 * Check if cross-sector sharing is allowed
 */
function isCrossSectorSharingAllowed(sourceSector, targetSector) {
  // Same sector always allowed
  if (sourceSector === targetSector) {
    return true
  }
  
  // Check platform config
  return PLATFORM_CONFIG.dataSharing.allowCrossSectorIntel
}

/**
 * Get anonymization level for intel sharing
 */
function getAnonymizationLevel() {
  return PLATFORM_CONFIG.dataSharing.anonymizationLevel
}

/**
 * Validate platform context against configuration
 */
function validatePlatformContext(context) {
  const errors = []
  
  // Validate region matches instance region (for strict isolation)
  if (PLATFORM_CONFIG.tenantIsolation.enforceStrictIsolation) {
    if (context.region !== PLATFORM_CONFIG.regionId && context.region !== REGIONS.GLOBAL) {
      errors.push(`Context region ${context.region} does not match instance region ${PLATFORM_CONFIG.regionId}`)
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

module.exports = {
  PLATFORM_CONFIG,
  getRegionalFeatures,
  isCrossRegionSharingAllowed,
  isCrossSectorSharingAllowed,
  getAnonymizationLevel,
  validatePlatformContext
}

// Made with Bob
