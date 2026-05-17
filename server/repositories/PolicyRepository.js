/**
 * Policy Repository
 * 
 * Handles persistence operations for policies.
 * In-memory implementation with future database migration path.
 */

const crypto = require('crypto')
const Policy = require('../models/Policy')

class PolicyRepository {
  constructor() {
    this.policies = new Map() // id -> Policy
    this.orgIndex = new Map() // organizationId -> Set of policy ids
    this.scopeIndex = new Map() // scope -> Set of policy ids
  }

  /**
   * Create a new policy
   */
  async create(data) {
    const policy = new Policy({
      id: crypto.randomUUID(),
      ...data
    })

    this.policies.set(policy.id, policy)

    // Update org index
    if (!this.orgIndex.has(policy.organizationId)) {
      this.orgIndex.set(policy.organizationId, new Set())
    }
    this.orgIndex.get(policy.organizationId).add(policy.id)

    // Update scope index
    if (!this.scopeIndex.has(policy.scope)) {
      this.scopeIndex.set(policy.scope, new Set())
    }
    this.scopeIndex.get(policy.scope).add(policy.id)

    return policy
  }

  /**
   * Find policy by ID
   */
  async findById(id) {
    return this.policies.get(id) || null
  }

  /**
   * Find all policies for an organization
   */
  async findByOrganization(organizationId, options = {}) {
    const ids = this.orgIndex.get(organizationId)
    if (!ids) return []

    let policies = Array.from(ids)
      .map(id => this.policies.get(id))
      .filter(Boolean)

    // Filter by enabled status
    if (options.enabledOnly) {
      policies = policies.filter(p => p.enabled)
    }

    // Filter by scope
    if (options.scope) {
      policies = policies.filter(p => p.scope === options.scope)
    }

    // Sort by priority (descending) then by name
    policies.sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority
      }
      return a.name.localeCompare(b.name)
    })

    return policies
  }

  /**
   * Find policies by scope
   */
  async findByScope(scope, organizationId = null) {
    const ids = this.scopeIndex.get(scope)
    if (!ids) return []

    let policies = Array.from(ids)
      .map(id => this.policies.get(id))
      .filter(Boolean)

    // Filter by organization if specified
    if (organizationId) {
      policies = policies.filter(p => p.organizationId === organizationId)
    }

    // Only return enabled policies
    policies = policies.filter(p => p.enabled)

    // Sort by priority
    policies.sort((a, b) => b.priority - a.priority)

    return policies
  }

  /**
   * Find policies that should be evaluated for an event
   */
  async findByEvent(event, organizationId) {
    const orgPolicies = await this.findByOrganization(organizationId, { enabledOnly: true })
    
    return orgPolicies.filter(policy => policy.shouldEvaluate(event))
  }

  /**
   * Update a policy
   */
  async update(id, updates) {
    const policy = this.policies.get(id)
    if (!policy) return null

    // If scope is being updated, update the scope index
    if (updates.scope && updates.scope !== policy.scope) {
      // Remove from old scope index
      const oldScopePolicies = this.scopeIndex.get(policy.scope)
      if (oldScopePolicies) {
        oldScopePolicies.delete(id)
      }

      // Add to new scope index
      if (!this.scopeIndex.has(updates.scope)) {
        this.scopeIndex.set(updates.scope, new Set())
      }
      this.scopeIndex.get(updates.scope).add(id)
    }

    // Update allowed fields
    const allowedFields = [
      'name', 'description', 'version', 'enabled', 'conditions', 
      'actions', 'priority', 'scope', 'triggers', 'testMode', 'metadata'
    ]
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        policy[field] = updates[field]
      }
    })

    policy.updatedAt = new Date().toISOString()
    return policy
  }

  /**
   * Delete a policy
   */
  async delete(id) {
    const policy = this.policies.get(id)
    if (!policy) return false

    // Remove from org index
    const orgPolicies = this.orgIndex.get(policy.organizationId)
    if (orgPolicies) {
      orgPolicies.delete(id)
    }

    // Remove from scope index
    const scopePolicies = this.scopeIndex.get(policy.scope)
    if (scopePolicies) {
      scopePolicies.delete(id)
    }

    // Remove from main storage
    this.policies.delete(id)
    return true
  }

  /**
   * Toggle policy enabled status
   */
  async toggleEnabled(id) {
    const policy = this.policies.get(id)
    if (!policy) return null

    policy.enabled = !policy.enabled
    policy.updatedAt = new Date().toISOString()
    return policy
  }

  /**
   * Duplicate a policy
   */
  async duplicate(id, newName) {
    const original = this.policies.get(id)
    if (!original) return null

    const duplicate = await this.create({
      organizationId: original.organizationId,
      name: newName || `${original.name} (Copy)`,
      description: original.description,
      version: '1.0.0',
      enabled: false, // Start disabled
      conditions: JSON.parse(JSON.stringify(original.conditions)),
      actions: JSON.parse(JSON.stringify(original.actions)),
      priority: original.priority,
      scope: original.scope,
      triggers: [...original.triggers],
      testMode: true, // Start in test mode
      createdBy: original.createdBy,
      metadata: { ...original.metadata, duplicatedFrom: id }
    })

    return duplicate
  }

  /**
   * Get policy statistics for an organization
   */
  async getStats(organizationId) {
    const policies = await this.findByOrganization(organizationId)

    const stats = {
      total: policies.length,
      enabled: 0,
      disabled: 0,
      testMode: 0,
      byScope: {},
      totalExecutions: 0,
      totalSuccesses: 0,
      totalFailures: 0
    }

    policies.forEach(policy => {
      if (policy.enabled) stats.enabled++
      else stats.disabled++
      
      if (policy.testMode) stats.testMode++

      // Count by scope
      if (!stats.byScope[policy.scope]) {
        stats.byScope[policy.scope] = 0
      }
      stats.byScope[policy.scope]++

      // Aggregate execution stats
      stats.totalExecutions += policy.executionCount
      stats.totalSuccesses += policy.successCount
      stats.totalFailures += policy.failureCount
    })

    return stats
  }

  /**
   * Get policy execution history
   */
  async getExecutionHistory(organizationId, limit = 100) {
    const policies = await this.findByOrganization(organizationId)

    return policies
      .filter(p => p.lastExecutedAt)
      .sort((a, b) => new Date(b.lastExecutedAt) - new Date(a.lastExecutedAt))
      .slice(0, limit)
      .map(p => ({
        policyId: p.id,
        policyName: p.name,
        lastExecutedAt: p.lastExecutedAt,
        executionCount: p.executionCount,
        successRate: p.getStats().successRate
      }))
  }

  /**
   * Validate policy before saving
   */
  async validate(policyData) {
    const errors = []

    // Check for duplicate names in the same organization
    if (policyData.organizationId && policyData.name) {
      const existing = await this.findByOrganization(policyData.organizationId)
      const duplicate = existing.find(p => 
        p.name === policyData.name && p.id !== policyData.id
      )
      if (duplicate) {
        errors.push('A policy with this name already exists')
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

// Singleton instance
let instance = null

module.exports = {
  PolicyRepository,
  getPolicyRepository: () => {
    if (!instance) {
      instance = new PolicyRepository()
    }
    return instance
  }
}

// Made with Bob
