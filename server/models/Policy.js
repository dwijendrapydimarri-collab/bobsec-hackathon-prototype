/**
 * Policy Model
 * 
 * Represents a policy-as-code rule that can be evaluated against analysis results.
 * Supports custom conditions, actions, and versioning.
 */

class Policy {
  constructor(data) {
    this.id = data.id
    this.organizationId = data.organizationId
    this.name = data.name
    this.description = data.description || ''
    this.version = data.version || '1.0.0'
    this.enabled = data.enabled !== undefined ? data.enabled : true
    
    // Policy definition
    this.conditions = data.conditions || [] // Array of condition objects
    this.actions = data.actions || [] // Array of action objects
    this.priority = data.priority || 0 // Higher priority policies evaluated first
    
    // Scope
    this.scope = data.scope || 'analysis' // 'analysis', 'webhook', 'consent', 'data_retention'
    this.triggers = data.triggers || ['analysis.completed'] // Events that trigger this policy
    
    // Metadata
    this.createdBy = data.createdBy
    this.createdAt = data.createdAt || new Date().toISOString()
    this.updatedAt = data.updatedAt || new Date().toISOString()
    this.lastExecutedAt = data.lastExecutedAt || null
    this.executionCount = data.executionCount || 0
    this.successCount = data.successCount || 0
    this.failureCount = data.failureCount || 0
    
    // Testing
    this.testMode = data.testMode || false // If true, policy runs but doesn't execute actions
    this.metadata = data.metadata || {}
  }

  /**
   * Check if policy should be evaluated for a given event
   */
  shouldEvaluate(event) {
    if (!this.enabled) return false
    if (this.triggers.includes('*')) return true
    return this.triggers.includes(event)
  }

  /**
   * Evaluate conditions against context
   */
  evaluateConditions(context) {
    if (this.conditions.length === 0) return true
    
    // All conditions must pass (AND logic)
    return this.conditions.every(condition => {
      return this.evaluateCondition(condition, context)
    })
  }

  /**
   * Evaluate a single condition
   */
  evaluateCondition(condition, context) {
    const { field, operator, value } = condition
    const actualValue = this.getFieldValue(field, context)
    
    switch (operator) {
      case 'equals':
        return actualValue === value
      case 'not_equals':
        return actualValue !== value
      case 'greater_than':
        return actualValue > value
      case 'less_than':
        return actualValue < value
      case 'greater_than_or_equal':
        return actualValue >= value
      case 'less_than_or_equal':
        return actualValue <= value
      case 'contains':
        return String(actualValue).includes(value)
      case 'not_contains':
        return !String(actualValue).includes(value)
      case 'in':
        return Array.isArray(value) && value.includes(actualValue)
      case 'not_in':
        return Array.isArray(value) && !value.includes(actualValue)
      case 'matches_regex':
        return new RegExp(value).test(String(actualValue))
      case 'exists':
        return actualValue !== undefined && actualValue !== null
      case 'not_exists':
        return actualValue === undefined || actualValue === null
      default:
        return false
    }
  }

  /**
   * Get field value from context using dot notation
   */
  getFieldValue(field, context) {
    const parts = field.split('.')
    let value = context
    
    for (const part of parts) {
      if (value === undefined || value === null) return undefined
      value = value[part]
    }
    
    return value
  }

  /**
   * Record execution
   */
  recordExecution(success) {
    this.executionCount++
    if (success) {
      this.successCount++
    } else {
      this.failureCount++
    }
    this.lastExecutedAt = new Date().toISOString()
    this.updatedAt = new Date().toISOString()
  }

  /**
   * Get execution statistics
   */
  getStats() {
    const successRate = this.executionCount > 0 
      ? (this.successCount / this.executionCount) * 100 
      : 0
    
    return {
      executionCount: this.executionCount,
      successCount: this.successCount,
      failureCount: this.failureCount,
      successRate: Math.round(successRate * 100) / 100,
      lastExecutedAt: this.lastExecutedAt
    }
  }

  /**
   * Sanitize for API response
   */
  toJSON() {
    return {
      id: this.id,
      organizationId: this.organizationId,
      name: this.name,
      description: this.description,
      version: this.version,
      enabled: this.enabled,
      conditions: this.conditions,
      actions: this.actions,
      priority: this.priority,
      scope: this.scope,
      triggers: this.triggers,
      testMode: this.testMode,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      stats: this.getStats(),
      metadata: this.metadata
    }
  }
}

module.exports = Policy

// Made with Bob
