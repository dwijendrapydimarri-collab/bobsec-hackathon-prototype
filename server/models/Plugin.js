/**
 * Plugin Model
 * 
 * Represents an installable plugin that extends BobSec functionality.
 * Plugins can add custom agents, actions, validators, and UI components.
 */

const { v4: uuidv4 } = require('uuid')

class Plugin {
  constructor(data) {
    this.id = data.id || uuidv4()
    this.organizationId = data.organizationId
    this.name = data.name
    this.slug = data.slug // Unique identifier (e.g., 'custom-threat-intel')
    this.version = data.version || '1.0.0'
    this.description = data.description || ''
    this.author = data.author || ''
    this.homepage = data.homepage || ''
    this.repository = data.repository || ''
    
    // Plugin type
    this.type = data.type || 'extension' // 'extension', 'agent', 'integration', 'ui'
    
    // Plugin status
    this.status = data.status || 'installed' // 'installed', 'enabled', 'disabled', 'error'
    this.enabled = data.enabled !== undefined ? data.enabled : false
    
    // Plugin manifest
    this.manifest = data.manifest || {
      hooks: [],           // Extension points this plugin uses
      permissions: [],     // Required permissions
      dependencies: [],    // Other plugins this depends on
      config: {}          // Plugin configuration schema
    }
    
    // Plugin code/assets
    this.entrypoint = data.entrypoint || 'index.js' // Main file
    this.assets = data.assets || {} // Additional files (UI components, etc.)
    
    // Plugin configuration
    this.config = data.config || {} // User-provided configuration
    
    // Installation metadata
    this.installedBy = data.installedBy
    this.installedAt = data.installedAt || new Date().toISOString()
    this.updatedAt = data.updatedAt || new Date().toISOString()
    this.lastEnabledAt = data.lastEnabledAt || null
    
    // Runtime state
    this.errorMessage = data.errorMessage || null
    this.stats = data.stats || {
      totalExecutions: 0,
      successCount: 0,
      failureCount: 0,
      lastExecutedAt: null
    }
    
    // Security
    this.sandboxed = data.sandboxed !== undefined ? data.sandboxed : true
    this.verified = data.verified !== undefined ? data.verified : false
    this.signature = data.signature || null
  }

  /**
   * Validate plugin manifest
   */
  validateManifest() {
    const errors = []

    if (!this.name || this.name.length < 3) {
      errors.push('Plugin name must be at least 3 characters')
    }

    if (!this.slug || !/^[a-z0-9-]+$/.test(this.slug)) {
      errors.push('Plugin slug must be lowercase alphanumeric with hyphens')
    }

    if (!this.version || !/^\d+\.\d+\.\d+$/.test(this.version)) {
      errors.push('Plugin version must follow semver (e.g., 1.0.0)')
    }

    if (!this.type || !['extension', 'agent', 'integration', 'ui'].includes(this.type)) {
      errors.push('Plugin type must be: extension, agent, integration, or ui')
    }

    // Validate hooks
    if (this.manifest.hooks && !Array.isArray(this.manifest.hooks)) {
      errors.push('Manifest hooks must be an array')
    }

    // Validate permissions
    if (this.manifest.permissions && !Array.isArray(this.manifest.permissions)) {
      errors.push('Manifest permissions must be an array')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Check if plugin has required permission
   */
  hasPermission(permission) {
    return this.manifest.permissions?.includes(permission) || false
  }

  /**
   * Check if plugin uses a specific hook
   */
  usesHook(hookName) {
    return this.manifest.hooks?.includes(hookName) || false
  }

  /**
   * Update plugin status
   */
  setStatus(status, errorMessage = null) {
    this.status = status
    this.errorMessage = errorMessage
    this.updatedAt = new Date().toISOString()
  }

  /**
   * Enable plugin
   */
  enable() {
    this.enabled = true
    this.status = 'enabled'
    this.lastEnabledAt = new Date().toISOString()
    this.updatedAt = new Date().toISOString()
  }

  /**
   * Disable plugin
   */
  disable() {
    this.enabled = false
    this.status = 'disabled'
    this.updatedAt = new Date().toISOString()
  }

  /**
   * Record plugin execution
   */
  recordExecution(success) {
    this.stats.totalExecutions++
    if (success) {
      this.stats.successCount++
    } else {
      this.stats.failureCount++
    }
    this.stats.lastExecutedAt = new Date().toISOString()
  }

  /**
   * Update plugin configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig }
    this.updatedAt = new Date().toISOString()
  }

  /**
   * Convert to JSON
   */
  toJSON() {
    return {
      id: this.id,
      organizationId: this.organizationId,
      name: this.name,
      slug: this.slug,
      version: this.version,
      description: this.description,
      author: this.author,
      homepage: this.homepage,
      repository: this.repository,
      type: this.type,
      status: this.status,
      enabled: this.enabled,
      manifest: this.manifest,
      entrypoint: this.entrypoint,
      config: this.config,
      installedBy: this.installedBy,
      installedAt: this.installedAt,
      updatedAt: this.updatedAt,
      lastEnabledAt: this.lastEnabledAt,
      errorMessage: this.errorMessage,
      stats: this.stats,
      sandboxed: this.sandboxed,
      verified: this.verified
    }
  }

  /**
   * Create from JSON
   */
  static fromJSON(data) {
    return new Plugin(data)
  }
}

module.exports = Plugin

// Made with Bob
