/**
 * Pipeline Version Manager
 * 
 * Manages pipeline versions, canary deployments, and A/B testing.
 * Routes requests to appropriate pipeline versions based on rollout strategy.
 */

const logger = require('../utils/logger')
const PipelineVersion = require('../models/PipelineVersion')

class PipelineVersionManager {
  constructor() {
    this.versions = new Map() // versionId -> PipelineVersion
    this.organizationVersions = new Map() // organizationId -> Set<versionId>
    this.defaultVersions = new Map() // organizationId -> versionId
    this.rolloutTimers = new Map() // versionId -> timer
  }

  /**
   * Register a pipeline version
   */
  async registerVersion(version) {
    // Validate
    const validation = version.validateConfig()
    if (!validation.valid) {
      throw new Error(`Invalid pipeline version: ${validation.errors.join(', ')}`)
    }

    // Store version
    this.versions.set(version.id, version)

    // Update organization index
    if (!this.organizationVersions.has(version.organizationId)) {
      this.organizationVersions.set(version.organizationId, new Set())
    }
    this.organizationVersions.get(version.organizationId).add(version.id)

    // Set as default if specified
    if (version.isDefault) {
      await this.setDefaultVersion(version.organizationId, version.id)
    }

    logger.info('Pipeline version registered', {
      versionId: version.id,
      version: version.version,
      organizationId: version.organizationId,
      strategy: version.strategy
    })

    return version
  }

  /**
   * Unregister a pipeline version
   */
  async unregisterVersion(versionId) {
    const version = this.versions.get(versionId)
    if (!version) {
      throw new Error('Pipeline version not found')
    }

    // Stop rollout timer if exists
    if (this.rolloutTimers.has(versionId)) {
      clearInterval(this.rolloutTimers.get(versionId))
      this.rolloutTimers.delete(versionId)
    }

    // Remove from organization index
    const orgVersions = this.organizationVersions.get(version.organizationId)
    if (orgVersions) {
      orgVersions.delete(versionId)
    }

    // Clear default if this was default
    if (this.defaultVersions.get(version.organizationId) === versionId) {
      this.defaultVersions.delete(version.organizationId)
    }

    // Remove version
    this.versions.delete(versionId)

    logger.info('Pipeline version unregistered', {
      versionId,
      version: version.version
    })
  }

  /**
   * Get version for request
   */
  async getVersionForRequest(organizationId, userId, requestId) {
    const orgVersions = this.organizationVersions.get(organizationId)
    if (!orgVersions || orgVersions.size === 0) {
      return null
    }

    // Get all active/canary versions for organization
    const activeVersions = Array.from(orgVersions)
      .map(id => this.versions.get(id))
      .filter(v => v && (v.status === 'active' || v.status === 'canary'))

    if (activeVersions.length === 0) {
      return null
    }

    // Check canary versions first (they have priority)
    const canaryVersions = activeVersions.filter(v => v.status === 'canary')
    for (const version of canaryVersions) {
      if (version.shouldHandleRequest(userId, requestId)) {
        return version
      }
    }

    // Fall back to default version
    const defaultVersionId = this.defaultVersions.get(organizationId)
    if (defaultVersionId) {
      const defaultVersion = this.versions.get(defaultVersionId)
      if (defaultVersion && defaultVersion.status === 'active') {
        return defaultVersion
      }
    }

    // Fall back to any active version
    const activeVersion = activeVersions.find(v => v.status === 'active')
    return activeVersion || null
  }

  /**
   * Set default version for organization
   */
  async setDefaultVersion(organizationId, versionId) {
    const version = this.versions.get(versionId)
    if (!version) {
      throw new Error('Pipeline version not found')
    }

    if (version.organizationId !== organizationId) {
      throw new Error('Version does not belong to organization')
    }

    // Unset previous default
    const previousDefaultId = this.defaultVersions.get(organizationId)
    if (previousDefaultId) {
      const previousDefault = this.versions.get(previousDefaultId)
      if (previousDefault) {
        previousDefault.unsetDefault()
      }
    }

    // Set new default
    this.defaultVersions.set(organizationId, versionId)
    version.setDefault()

    logger.info('Default pipeline version set', {
      organizationId,
      versionId,
      version: version.version
    })
  }

  /**
   * Start canary deployment
   */
  async startCanary(versionId, initialPercentage = 5) {
    const version = this.versions.get(versionId)
    if (!version) {
      throw new Error('Pipeline version not found')
    }

    // Start canary
    version.startCanary(initialPercentage)

    // Set up automatic rollout if configured
    if (version.rolloutInterval > 0 && version.rolloutStep > 0) {
      const timer = setInterval(async () => {
        try {
          await this.increaseRollout(versionId)
        } catch (error) {
          logger.error('Failed to increase rollout', {
            versionId,
            error: error.message
          })
        }
      }, version.rolloutInterval * 1000)

      this.rolloutTimers.set(versionId, timer)
    }

    logger.info('Canary deployment started', {
      versionId,
      version: version.version,
      initialPercentage,
      rolloutStep: version.rolloutStep,
      rolloutInterval: version.rolloutInterval
    })

    return version
  }

  /**
   * Increase rollout percentage
   */
  async increaseRollout(versionId) {
    const version = this.versions.get(versionId)
    if (!version) {
      throw new Error('Pipeline version not found')
    }

    // Check metrics before increasing
    if (version.baselineVersionId) {
      const baseline = this.versions.get(version.baselineVersionId)
      if (baseline) {
        const comparison = version.compareWithBaseline(baseline.metrics)
        
        // If metrics are worse, pause rollout
        if (comparison && comparison.verdict === 'worse') {
          logger.warn('Rollout paused due to worse metrics', {
            versionId,
            comparison
          })
          return { paused: true, reason: 'Metrics worse than baseline', comparison }
        }
      }
    }

    // Increase rollout
    const increased = version.increaseRollout()

    if (!increased) {
      // Rollout complete
      logger.info('Rollout complete', {
        versionId,
        version: version.version,
        finalPercentage: version.rolloutPercentage
      })

      // Stop timer
      if (this.rolloutTimers.has(versionId)) {
        clearInterval(this.rolloutTimers.get(versionId))
        this.rolloutTimers.delete(versionId)
      }

      // Promote to active if at 100%
      if (version.rolloutPercentage >= 100) {
        version.activate()
        await this.setDefaultVersion(version.organizationId, versionId)
      }

      return { complete: true, version }
    }

    logger.info('Rollout increased', {
      versionId,
      version: version.version,
      percentage: version.rolloutPercentage
    })

    return { increased: true, percentage: version.rolloutPercentage }
  }

  /**
   * Pause rollout
   */
  async pauseRollout(versionId) {
    if (this.rolloutTimers.has(versionId)) {
      clearInterval(this.rolloutTimers.get(versionId))
      this.rolloutTimers.delete(versionId)

      logger.info('Rollout paused', { versionId })
      return true
    }
    return false
  }

  /**
   * Resume rollout
   */
  async resumeRollout(versionId) {
    const version = this.versions.get(versionId)
    if (!version) {
      throw new Error('Pipeline version not found')
    }

    if (version.status !== 'canary') {
      throw new Error('Version is not in canary status')
    }

    // Resume automatic rollout
    if (version.rolloutInterval > 0 && version.rolloutStep > 0) {
      const timer = setInterval(async () => {
        try {
          await this.increaseRollout(versionId)
        } catch (error) {
          logger.error('Failed to increase rollout', {
            versionId,
            error: error.message
          })
        }
      }, version.rolloutInterval * 1000)

      this.rolloutTimers.set(versionId, timer)

      logger.info('Rollout resumed', { versionId })
      return true
    }

    return false
  }

  /**
   * Rollback to previous version
   */
  async rollback(versionId) {
    const version = this.versions.get(versionId)
    if (!version) {
      throw new Error('Pipeline version not found')
    }

    if (!version.canRollback || !version.previousVersionId) {
      throw new Error('Cannot rollback this version')
    }

    const previousVersion = this.versions.get(version.previousVersionId)
    if (!previousVersion) {
      throw new Error('Previous version not found')
    }

    // Stop current version
    await this.pauseRollout(versionId)
    version.deprecate()

    // Activate previous version
    previousVersion.activate()
    await this.setDefaultVersion(version.organizationId, version.previousVersionId)

    logger.info('Rolled back to previous version', {
      fromVersionId: versionId,
      toVersionId: version.previousVersionId,
      fromVersion: version.version,
      toVersion: previousVersion.version
    })

    return previousVersion
  }

  /**
   * Record request metrics
   */
  async recordRequest(versionId, success, latency, riskScore) {
    const version = this.versions.get(versionId)
    if (!version) {
      return
    }

    version.recordRequest(success, latency, riskScore)
  }

  /**
   * Get version by ID
   */
  getVersion(versionId) {
    return this.versions.get(versionId)
  }

  /**
   * Get all versions for organization
   */
  getVersionsByOrganization(organizationId) {
    const versionIds = this.organizationVersions.get(organizationId) || new Set()
    return Array.from(versionIds).map(id => this.versions.get(id)).filter(Boolean)
  }

  /**
   * Get default version for organization
   */
  getDefaultVersion(organizationId) {
    const versionId = this.defaultVersions.get(organizationId)
    return versionId ? this.versions.get(versionId) : null
  }

  /**
   * Get statistics
   */
  getStats(organizationId) {
    const versions = this.getVersionsByOrganization(organizationId)

    return {
      total: versions.length,
      byStatus: {
        draft: versions.filter(v => v.status === 'draft').length,
        testing: versions.filter(v => v.status === 'testing').length,
        canary: versions.filter(v => v.status === 'canary').length,
        active: versions.filter(v => v.status === 'active').length,
        deprecated: versions.filter(v => v.status === 'deprecated').length,
        archived: versions.filter(v => v.status === 'archived').length
      },
      activeRollouts: versions.filter(v => v.status === 'canary').length,
      defaultVersion: this.getDefaultVersion(organizationId)?.version || null
    }
  }
}

// Singleton instance
let instance = null

function getPipelineVersionManager() {
  if (!instance) {
    instance = new PipelineVersionManager()
  }
  return instance
}

module.exports = { PipelineVersionManager, getPipelineVersionManager }

// Made with Bob
