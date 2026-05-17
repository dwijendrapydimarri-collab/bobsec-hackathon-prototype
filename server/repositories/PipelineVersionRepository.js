/**
 * Pipeline Version Repository
 * 
 * Persistence layer for pipeline versions.
 * Handles CRUD operations and queries.
 */
const logger = require('../utils/logger')
const PipelineVersion = require('../models/PipelineVersion')
class PipelineVersionRepository {
  constructor() {
    // In-memory storage (replace with database in production)
    this.versions = new Map() // versionId -> version data
    this.organizationIndex = new Map() // organizationId -> Set<versionId>
    this.versionIndex = new Map() // organizationId -> Map<version string -> versionId>
  }
  /**
   * Create a new pipeline version
   */
  async create(versionData) {
    const version = new PipelineVersion(versionData)
    // Validate
    const validation = version.validateConfig()
    if (!validation.valid) {
      throw new Error(`Invalid pipeline version: ${validation.errors.join(', ')}`)
    }
    // Check for duplicate version string
    const orgVersions = this.versionIndex.get(version.organizationId)
    if (orgVersions && orgVersions.has(version.version)) {
      throw new Error(`Version ${version.version} already exists for this organization`)
    }
    // Store
    this.versions.set(version.id, version.toJSON())
    // Update indexes
    if (!this.organizationIndex.has(version.organizationId)) {
      this.organizationIndex.set(version.organizationId, new Set())
    }
    this.organizationIndex.get(version.organizationId).add(version.id)
    if (!this.versionIndex.has(version.organizationId)) {
      this.versionIndex.set(version.organizationId, new Map())
    }
    this.versionIndex.get(version.organizationId).set(version.version, version.id)
    logger.info('Pipeline version created', {
      versionId: version.id,
      version: version.version,
      organizationId: version.organizationId
    })
    return version
  }
  /**
   * Find version by ID
   */
  async findById(versionId) {
    const data = this.versions.get(versionId)
    if (!data) {
      return null
    }
    return new PipelineVersion(data)
  }
  /**
   * Find version by organization and version string
   */
  async findByVersion(organizationId, versionString) {
    const orgVersions = this.versionIndex.get(organizationId)
    if (!orgVersions) {
      return null
    }
    const versionId = orgVersions.get(versionString)
    if (!versionId) {
      return null
    }
    return this.findById(versionId)
  }
  /**
   * Find all versions for organization
   */
  async findByOrganization(organizationId, filters = {}) {
    const versionIds = this.organizationIndex.get(organizationId)
    if (!versionIds) {
      return []
    }
    let versions = Array.from(versionIds)
      .map(id => this.versions.get(id))
      .filter(Boolean)
      .map(data => new PipelineVersion(data))
    // Apply filters
    if (filters.status) {
      versions = versions.filter(v => v.status === filters.status)
    }
    if (filters.strategy) {
      versions = versions.filter(v => v.strategy === filters.strategy)
    }
    if (filters.isDefault !== undefined) {
      versions = versions.filter(v => v.isDefault === filters.isDefault)
    }
    // Sort by created date (newest first)
    versions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    return versions
  }
  /**
   * Find active versions for organization
   */
  async findActive(organizationId) {
    return this.findByOrganization(organizationId, { status: 'active' })
  }
  /**
   * Find canary versions for organization
   */
  async findCanary(organizationId) {
    return this.findByOrganization(organizationId, { status: 'canary' })
  }
  /**
   * Find default version for organization
   */
  async findDefault(organizationId) {
    const versions = await this.findByOrganization(organizationId, { isDefault: true })
    return versions[0] || null
  }
  /**
   * Update version
   */
  async update(versionId, updates) {
    const data = this.versions.get(versionId)
    if (!data) {
      throw new Error('Pipeline version not found')
    }
    // Create version instance
    const version = new PipelineVersion(data)
    // Apply updates
    Object.assign(version, updates)
    version.updatedAt = new Date()
    // Validate
    const validation = version.validateConfig()
    if (!validation.valid) {
      throw new Error(`Invalid pipeline version: ${validation.errors.join(', ')}`)
    }
    // Store
    this.versions.set(versionId, version.toJSON())
    logger.info('Pipeline version updated', {
      versionId,
      updates: Object.keys(updates)
    })
    return version
  }
  /**
   * Update version status
   */
  async updateStatus(versionId, status) {
    const data = this.versions.get(versionId)
    if (!data) {
      throw new Error('Pipeline version not found')
    }
    const version = new PipelineVersion(data)
    // Use status transition methods
    switch (status) {
      case 'testing':
        version.startTesting()
        break
      case 'canary':
        version.startCanary()
        break
      case 'active':
        version.activate()
        break
      case 'deprecated':
        version.deprecate()
        break
      case 'archived':
        version.archive()
        break
      default:
        throw new Error(`Invalid status: ${status}`)
    }
    // Store
    this.versions.set(versionId, version.toJSON())
    logger.info('Pipeline version status updated', {
      versionId,
      status
    })
    return version
  }
  /**
   * Update rollout percentage
   */
  async updateRollout(versionId, percentage) {
    const data = this.versions.get(versionId)
    if (!data) {
      throw new Error('Pipeline version not found')
    }
    const version = new PipelineVersion(data)
    version.rolloutPercentage = Math.max(0, Math.min(100, percentage))
    version.updatedAt = new Date()
    // Store
    this.versions.set(versionId, version.toJSON())
    logger.info('Pipeline version rollout updated', {
      versionId,
      percentage: version.rolloutPercentage
    })
    return version
  }
  /**
   * Record request metrics
   */
  async recordMetrics(versionId, success, latency, riskScore) {
    const data = this.versions.get(versionId)
    if (!data) {
      return
    }
    const version = new PipelineVersion(data)
    version.recordRequest(success, latency, riskScore)
    // Store
    this.versions.set(versionId, version.toJSON())
  }
  /**
   * Set as default version
   */
  async setDefault(versionId) {
    const data = this.versions.get(versionId)
    if (!data) {
      throw new Error('Pipeline version not found')
    }
    const version = new PipelineVersion(data)
    // Unset previous default
    const previousDefault = await this.findDefault(version.organizationId)
    if (previousDefault && previousDefault.id !== versionId) {
      previousDefault.unsetDefault()
      this.versions.set(previousDefault.id, previousDefault.toJSON())
    }
    // Set new default
    version.setDefault()
    this.versions.set(versionId, version.toJSON())
    logger.info('Default pipeline version set', {
      versionId,
      organizationId: version.organizationId
    })
    return version
  }
  /**
   * Delete version
   */
  async delete(versionId) {
    const data = this.versions.get(versionId)
    if (!data) {
      throw new Error('Pipeline version not found')
    }
    const version = new PipelineVersion(data)
    // Cannot delete active or canary versions
    if (version.status === 'active' || version.status === 'canary') {
      throw new Error('Cannot delete active or canary version')
    }
    // Remove from indexes
    const orgVersions = this.organizationIndex.get(version.organizationId)
    if (orgVersions) {
      orgVersions.delete(versionId)
    }
    const versionMap = this.versionIndex.get(version.organizationId)
    if (versionMap) {
      versionMap.delete(version.version)
    }
    // Delete
    this.versions.delete(versionId)
    logger.info('Pipeline version deleted', {
      versionId,
      version: version.version
    })
    return true
  }
  /**
   * Get statistics
   */
  async getStats(organizationId) {
    const versions = await this.findByOrganization(organizationId)
    const stats = {
      total: versions.length,
      byStatus: {
        draft: 0,
        testing: 0,
        canary: 0,
        active: 0,
        deprecated: 0,
        archived: 0
      },
      byStrategy: {
        canary: 0,
        blue_green: 0,
        rolling: 0,
        instant: 0
      },
      totalRequests: 0,
      totalErrors: 0,
      avgLatency: 0,
      avgRiskScore: 0
    }
    let totalLatency = 0
    let totalRiskScore = 0
    let requestCount = 0
    versions.forEach(version => {
      stats.byStatus[version.status]++
      stats.byStrategy[version.strategy]++
      stats.totalRequests += version.metrics.totalRequests
      stats.totalErrors += version.metrics.errorCount
      if (version.metrics.totalRequests > 0) {
        totalLatency += version.metrics.avgLatency * version.metrics.totalRequests
        totalRiskScore += version.metrics.avgRiskScore * version.metrics.totalRequests
        requestCount += version.metrics.totalRequests
      }
    })
    if (requestCount > 0) {
      stats.avgLatency = totalLatency / requestCount
      stats.avgRiskScore = totalRiskScore / requestCount
    }
    return stats
  }
  /**
   * Clean up old versions
   */
  async cleanup(organizationId, keepCount = 10) {
    const versions = await this.findByOrganization(organizationId)
    // Keep active, canary, and recent versions
    const toKeep = new Set()
    // Keep all active and canary
    versions.forEach(v => {
      if (v.status === 'active' || v.status === 'canary') {
        toKeep.add(v.id)
      }
    })
    // Keep most recent versions
    const sorted = versions
      .filter(v => !toKeep.has(v.id))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    sorted.slice(0, keepCount).forEach(v => toKeep.add(v.id))
    // Delete old versions
    const deleted = []
    for (const version of versions) {
      if (!toKeep.has(version.id) && version.status === 'archived') {
        try {
          await this.delete(version.id)
          deleted.push(version.id)
        } catch (error) {
          logger.error('Failed to delete version during cleanup', {
            versionId: version.id,
            error: error.message
          })
        }
      }
    }
    logger.info('Pipeline version cleanup completed', {
      organizationId,
      deleted: deleted.length,
      kept: toKeep.size
    })
    return { deleted: deleted.length, kept: toKeep.size }
  }
}
// Singleton instance
let instance = null
function getPipelineVersionRepository() {
  if (!instance) {
    instance = new PipelineVersionRepository()
  }
  return instance
}
module.exports = { PipelineVersionRepository, getPipelineVersionRepository }
// Made with Bob