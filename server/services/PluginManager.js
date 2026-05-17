/**
 * Plugin Manager
 * 
 * Manages plugin lifecycle, hooks, and execution.
 * Provides sandboxed environment for plugin code.
 */

const logger = require('../utils/logger')
const Plugin = require('../models/Plugin')
const vm = require('vm')

class PluginManager {
  constructor() {
    this.plugins = new Map() // pluginId -> Plugin instance
    this.hooks = new Map()   // hookName -> [plugin handlers]
    this.sandboxes = new Map() // pluginId -> VM context
  }

  /**
   * Register a plugin
   */
  async registerPlugin(plugin) {
    // Validate manifest
    const validation = plugin.validateManifest()
    if (!validation.valid) {
      throw new Error(`Invalid plugin manifest: ${validation.errors.join(', ')}`)
    }

    // Check for conflicts
    const existing = Array.from(this.plugins.values()).find(
      p => p.slug === plugin.slug && p.organizationId === plugin.organizationId
    )
    if (existing) {
      throw new Error(`Plugin ${plugin.slug} already registered for this organization`)
    }

    // Store plugin
    this.plugins.set(plugin.id, plugin)

    // Register hooks
    if (plugin.manifest.hooks) {
      for (const hookName of plugin.manifest.hooks) {
        if (!this.hooks.has(hookName)) {
          this.hooks.set(hookName, [])
        }
        this.hooks.get(hookName).push({
          pluginId: plugin.id,
          handler: null // Will be loaded when plugin is enabled
        })
      }
    }

    logger.info('Plugin registered', {
      pluginId: plugin.id,
      slug: plugin.slug,
      version: plugin.version,
      organizationId: plugin.organizationId
    })

    return plugin
  }

  /**
   * Unregister a plugin
   */
  async unregisterPlugin(pluginId) {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) {
      throw new Error('Plugin not found')
    }

    // Disable if enabled
    if (plugin.enabled) {
      await this.disablePlugin(pluginId)
    }

    // Remove from hooks
    for (const [hookName, handlers] of this.hooks.entries()) {
      this.hooks.set(
        hookName,
        handlers.filter(h => h.pluginId !== pluginId)
      )
    }

    // Remove sandbox
    this.sandboxes.delete(pluginId)

    // Remove plugin
    this.plugins.delete(pluginId)

    logger.info('Plugin unregistered', {
      pluginId,
      slug: plugin.slug
    })
  }

  /**
   * Enable a plugin
   */
  async enablePlugin(pluginId) {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) {
      throw new Error('Plugin not found')
    }

    if (plugin.enabled) {
      return plugin
    }

    try {
      // Create sandbox
      const sandbox = this.createSandbox(plugin)
      this.sandboxes.set(pluginId, sandbox)

      // Load plugin code
      await this.loadPluginCode(plugin, sandbox)

      // Enable plugin
      plugin.enable()

      logger.info('Plugin enabled', {
        pluginId,
        slug: plugin.slug
      })

      return plugin
    } catch (error) {
      plugin.setStatus('error', error.message)
      logger.error('Failed to enable plugin', {
        pluginId,
        slug: plugin.slug,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Disable a plugin
   */
  async disablePlugin(pluginId) {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) {
      throw new Error('Plugin not found')
    }

    if (!plugin.enabled) {
      return plugin
    }

    // Disable plugin
    plugin.disable()

    // Remove sandbox
    this.sandboxes.delete(pluginId)

    logger.info('Plugin disabled', {
      pluginId,
      slug: plugin.slug
    })

    return plugin
  }

  /**
   * Create sandboxed environment for plugin
   */
  createSandbox(plugin) {
    const sandbox = {
      // Safe globals
      console: {
        log: (...args) => logger.info(`[Plugin:${plugin.slug}]`, ...args),
        error: (...args) => logger.error(`[Plugin:${plugin.slug}]`, ...args),
        warn: (...args) => logger.warn(`[Plugin:${plugin.slug}]`, ...args)
      },
      setTimeout,
      setInterval,
      clearTimeout,
      clearInterval,
      Promise,
      JSON,
      Math,
      Date,
      
      // Plugin API
      plugin: {
        id: plugin.id,
        name: plugin.name,
        version: plugin.version,
        config: plugin.config,
        
        // Storage API (scoped to plugin)
        storage: {
          get: async (key) => {
            // TODO: Implement plugin-scoped storage
            return null
          },
          set: async (key, value) => {
            // TODO: Implement plugin-scoped storage
          },
          delete: async (key) => {
            // TODO: Implement plugin-scoped storage
          }
        },
        
        // HTTP API (if permission granted)
        http: plugin.hasPermission('http') ? {
          get: async (url, options) => {
            // TODO: Implement safe HTTP client
            throw new Error('HTTP not implemented yet')
          },
          post: async (url, data, options) => {
            // TODO: Implement safe HTTP client
            throw new Error('HTTP not implemented yet')
          }
        } : undefined,
        
        // Emit events
        emit: (eventName, data) => {
          logger.info('Plugin event', {
            pluginId: plugin.id,
            event: eventName,
            data
          })
        }
      }
    }

    return vm.createContext(sandbox)
  }

  /**
   * Load plugin code into sandbox
   */
  async loadPluginCode(plugin, sandbox) {
    // In production, this would load from plugin.entrypoint
    // For now, we'll use a simple eval approach
    
    // Example plugin code structure:
    // module.exports = {
    //   hooks: {
    //     'analysis.pre': async (context) => { ... },
    //     'analysis.post': async (context) => { ... }
    //   }
    // }

    try {
      // TODO: Load actual plugin code from storage/filesystem
      // For now, just mark as loaded
      logger.debug('Plugin code loaded', {
        pluginId: plugin.id,
        entrypoint: plugin.entrypoint
      })
    } catch (error) {
      throw new Error(`Failed to load plugin code: ${error.message}`)
    }
  }

  /**
   * Execute hook
   */
  async executeHook(hookName, context, organizationId) {
    const handlers = this.hooks.get(hookName) || []
    const results = []

    for (const { pluginId, handler } of handlers) {
      const plugin = this.plugins.get(pluginId)
      
      // Skip if plugin not enabled or wrong organization
      if (!plugin || !plugin.enabled || plugin.organizationId !== organizationId) {
        continue
      }

      try {
        const startTime = Date.now()
        
        // Execute handler in sandbox
        const sandbox = this.sandboxes.get(pluginId)
        if (!sandbox || !handler) {
          continue
        }

        const result = await handler(context)
        const duration = Date.now() - startTime

        plugin.recordExecution(true)
        
        results.push({
          pluginId,
          pluginName: plugin.name,
          success: true,
          result,
          duration
        })

        logger.debug('Hook executed', {
          hookName,
          pluginId,
          duration
        })
      } catch (error) {
        plugin.recordExecution(false)
        
        results.push({
          pluginId,
          pluginName: plugin.name,
          success: false,
          error: error.message
        })

        logger.error('Hook execution failed', {
          hookName,
          pluginId,
          error: error.message
        })
      }
    }

    return results
  }

  /**
   * Get all plugins for organization
   */
  getPluginsByOrganization(organizationId) {
    return Array.from(this.plugins.values())
      .filter(p => p.organizationId === organizationId)
  }

  /**
   * Get plugin by ID
   */
  getPlugin(pluginId) {
    return this.plugins.get(pluginId)
  }

  /**
   * Get available hooks
   */
  getAvailableHooks() {
    return [
      {
        name: 'analysis.pre',
        description: 'Called before analysis starts',
        context: { input: 'string', mode: 'string', lang: 'string' }
      },
      {
        name: 'analysis.post',
        description: 'Called after analysis completes',
        context: { analysis: 'object', input: 'string' }
      },
      {
        name: 'entity.extracted',
        description: 'Called when entities are extracted',
        context: { entities: 'object', input: 'string' }
      },
      {
        name: 'risk.calculated',
        description: 'Called when risk score is calculated',
        context: { riskScore: 'number', riskLevel: 'string', analysis: 'object' }
      },
      {
        name: 'webhook.triggered',
        description: 'Called when webhook is triggered',
        context: { event: 'string', payload: 'object', webhookId: 'string' }
      },
      {
        name: 'policy.evaluated',
        description: 'Called when policy is evaluated',
        context: { policy: 'object', result: 'object' }
      }
    ]
  }

  /**
   * Get plugin statistics
   */
  getStats(organizationId) {
    const plugins = this.getPluginsByOrganization(organizationId)
    
    return {
      total: plugins.length,
      enabled: plugins.filter(p => p.enabled).length,
      disabled: plugins.filter(p => !p.enabled).length,
      error: plugins.filter(p => p.status === 'error').length,
      totalExecutions: plugins.reduce((sum, p) => sum + p.stats.totalExecutions, 0),
      successRate: this.calculateSuccessRate(plugins)
    }
  }

  /**
   * Calculate success rate
   */
  calculateSuccessRate(plugins) {
    const total = plugins.reduce((sum, p) => sum + p.stats.totalExecutions, 0)
    const success = plugins.reduce((sum, p) => sum + p.stats.successCount, 0)
    return total > 0 ? Math.round((success / total) * 100) : 0
  }
}

// Singleton instance
let instance = null

function getPluginManager() {
  if (!instance) {
    instance = new PluginManager()
  }
  return instance
}

module.exports = { PluginManager, getPluginManager }

// Made with Bob
