/**
 * Versioned Pipeline Orchestrator
 * 
 * Routes analysis requests to appropriate pipeline versions.
 * Integrates with PipelineVersionManager for canary deployments.
 */
const { getPipelineVersionManager } = require('../services/PipelineVersionManager')
const { getPipelineVersionRepository } = require('../repositories/PipelineVersionRepository')
const logger = require('../utils/logger')
const bobOrchestrator = require('./bobOrchestrator')
const manager = getPipelineVersionManager()
const repository = getPipelineVersionRepository()
/**
 * Execute analysis with versioned pipeline
 */
async function executeVersionedAnalysis(input, context = {}) {
  const startTime = Date.now()
  const { organizationId, userId, requestId } = context
  try {
    // Get appropriate pipeline version
    const version = await manager.getVersionForRequest(
      organizationId,
      userId || 'anonymous',
      requestId || generateRequestId()
    )
    if (!version) {
      logger.warn('No pipeline version found, using default orchestrator', {
        organizationId,
        userId
      })
      return await bobOrchestrator.orchestrate(input, context)
    }
    logger.info('Using pipeline version', {
      versionId: version.id,
      version: version.version,
      status: version.status,
      rolloutPercentage: version.rolloutPercentage,
      organizationId,
      userId
    })
    // Execute analysis with version config
    const result = await executeWithConfig(input, version.config, context)
    // Record metrics
    const latency = Date.now() - startTime
    const success = !result.error
    const riskScore = result.risk_score || 0
    await manager.recordRequest(version.id, success, latency, riskScore)
    await repository.recordMetrics(version.id, success, latency, riskScore)
    // Add version metadata to result
    result.pipeline_version = {
      id: version.id,
      version: version.version,
      status: version.status
    }
    return result
  } catch (error) {
    const latency = Date.now() - startTime
    logger.error('Versioned analysis failed', {
      error: error.message,
      organizationId,
      userId,
      latency
    })
    // Record failure
    if (context.versionId) {
      await manager.recordRequest(context.versionId, false, latency, 0)
      await repository.recordMetrics(context.versionId, false, latency, 0)
    }
    throw error
  }
}
/**
 * Execute analysis with specific pipeline config
 */
async function executeWithConfig(input, config, context) {
  // Apply config overrides
  const orchestratorConfig = {
    ...context,
    agents: config.agents || {},
    plugins: config.plugins || [],
    policies: config.policies || {},
    thresholds: config.thresholds || {}
  }
  // Use Bob orchestrator with custom config
  return await bobOrchestrator.orchestrate(input, orchestratorConfig)
}
/**
 * Generate request ID for consistent hashing
 */
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}
/**
 * Initialize pipeline versions from repository
 */
async function initializePipelineVersions(organizationId) {
  try {
    // Load active and canary versions
    const activeVersions = await repository.findActive(organizationId)
    const canaryVersions = await repository.findCanary(organizationId)
    // Register with manager
    for (const version of [...activeVersions, ...canaryVersions]) {
      await manager.registerVersion(version)
    }
    // Set default version
    const defaultVersion = await repository.findDefault(organizationId)
    if (defaultVersion) {
      await manager.setDefaultVersion(organizationId, defaultVersion.id)
    }
    logger.info('Pipeline versions initialized', {
      organizationId,
      active: activeVersions.length,
      canary: canaryVersions.length,
      hasDefault: !!defaultVersion
    })
    return {
      active: activeVersions.length,
      canary: canaryVersions.length,
      default: defaultVersion?.version || null
    }
  } catch (error) {
    logger.error('Failed to initialize pipeline versions', {
      organizationId,
      error: error.message
    })
    throw error
  }
}
/**
 * Get version for specific request (for testing/debugging)
 */
async function getVersionForRequest(organizationId, userId, requestId) {
  return await manager.getVersionForRequest(organizationId, userId, requestId)
}
/**
 * Compare two pipeline versions
 */
async function compareVersions(versionId1, versionId2) {
  const version1 = await repository.findById(versionId1)
  const version2 = await repository.findById(versionId2)
  if (!version1 || !version2) {
    throw new Error('One or both versions not found')
  }
  return {
    version1: {
      id: version1.id,
      version: version1.version,
      metrics: version1.metrics
    },
    version2: {
      id: version2.id,
      version: version2.version,
      metrics: version2.metrics
    },
    comparison: version1.compareWithBaseline(version2.metrics)
  }
}
module.exports = {
  executeVersionedAnalysis,
  executeWithConfig,
  initializePipelineVersions,
  getVersionForRequest,
  compareVersions
}
// Made with Bob