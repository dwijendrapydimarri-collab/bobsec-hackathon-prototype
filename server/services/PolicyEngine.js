/**
 * Policy Engine
 * 
 * Evaluates policy-as-code rules and executes actions.
 * Supports custom action handlers and test mode.
 */

const logger = require('../utils/logger')

class PolicyEngine {
  constructor() {
    this.actionHandlers = new Map()
    this.registerDefaultActions()
  }

  /**
   * Register default action handlers
   */
  registerDefaultActions() {
    // Send notification
    this.registerAction('send_notification', async (params, context) => {
      logger.info('Policy action: send_notification', { 
        recipient: params.recipient,
        message: params.message,
        organizationId: context.organizationId
      })
      // In production, integrate with notification service
      return { sent: true, recipient: params.recipient }
    })

    // Trigger webhook
    this.registerAction('trigger_webhook', async (params, context) => {
      logger.info('Policy action: trigger_webhook', {
        webhookId: params.webhookId,
        organizationId: context.organizationId
      })
      // In production, integrate with webhook service
      return { triggered: true, webhookId: params.webhookId }
    })

    // Block action
    this.registerAction('block_action', async (params, context) => {
      logger.warn('Policy action: block_action', {
        reason: params.reason,
        organizationId: context.organizationId
      })
      return { blocked: true, reason: params.reason }
    })

    // Escalate
    this.registerAction('escalate', async (params, context) => {
      logger.warn('Policy action: escalate', {
        level: params.level,
        assignee: params.assignee,
        organizationId: context.organizationId
      })
      return { escalated: true, level: params.level }
    })

    // Modify risk score
    this.registerAction('modify_risk_score', async (params, context) => {
      const adjustment = params.adjustment || 0
      const newScore = Math.max(0, Math.min(100, (context.analysis?.riskScore || 0) + adjustment))
      
      logger.info('Policy action: modify_risk_score', {
        originalScore: context.analysis?.riskScore,
        adjustment,
        newScore,
        organizationId: context.organizationId
      })
      
      return { modified: true, originalScore: context.analysis?.riskScore, newScore }
    })

    // Add tag
    this.registerAction('add_tag', async (params, context) => {
      logger.info('Policy action: add_tag', {
        tag: params.tag,
        organizationId: context.organizationId
      })
      return { tagged: true, tag: params.tag }
    })

    // Log event
    this.registerAction('log_event', async (params, context) => {
      const level = params.level || 'info'
      logger[level]('Policy action: log_event', {
        message: params.message,
        metadata: params.metadata,
        organizationId: context.organizationId
      })
      return { logged: true, level }
    })

    // Require human review
    this.registerAction('require_human_review', async (params, context) => {
      logger.info('Policy action: require_human_review', {
        reason: params.reason,
        priority: params.priority,
        organizationId: context.organizationId
      })
      return { reviewRequired: true, reason: params.reason, priority: params.priority }
    })
  }

  /**
   * Register a custom action handler
   */
  registerAction(type, handler) {
    if (typeof handler !== 'function') {
      throw new Error('Action handler must be a function')
    }
    this.actionHandlers.set(type, handler)
    logger.debug('Registered action handler', { type })
  }

  /**
   * Get available action types
   */
  getAvailableActions() {
    return Array.from(this.actionHandlers.keys()).map(type => ({
      type,
      description: this.getActionDescription(type)
    }))
  }

  /**
   * Get action description
   */
  getActionDescription(type) {
    const descriptions = {
      send_notification: 'Send a notification to specified recipient',
      trigger_webhook: 'Trigger a webhook with analysis data',
      block_action: 'Block the current action from proceeding',
      escalate: 'Escalate to a higher authority or team',
      modify_risk_score: 'Adjust the risk score by a specified amount',
      add_tag: 'Add a tag to the analysis for categorization',
      log_event: 'Log an event with specified severity',
      require_human_review: 'Flag for mandatory human review'
    }
    return descriptions[type] || 'Custom action'
  }

  /**
   * Get available operators
   */
  getAvailableOperators() {
    return [
      { operator: 'equals', description: 'Field equals value', example: 'riskScore equals 100' },
      { operator: 'not_equals', description: 'Field does not equal value', example: 'category not_equals SAFE' },
      { operator: 'greater_than', description: 'Field is greater than value', example: 'riskScore greater_than 80' },
      { operator: 'less_than', description: 'Field is less than value', example: 'confidence less_than 50' },
      { operator: 'greater_than_or_equal', description: 'Field is >= value', example: 'riskScore greater_than_or_equal 90' },
      { operator: 'less_than_or_equal', description: 'Field is <= value', example: 'confidence less_than_or_equal 60' },
      { operator: 'contains', description: 'Field contains substring', example: 'category contains FRAUD' },
      { operator: 'not_contains', description: 'Field does not contain substring', example: 'explanation not_contains safe' },
      { operator: 'in', description: 'Field is in array', example: 'riskLevel in [HIGH, MEDIUM]' },
      { operator: 'not_in', description: 'Field is not in array', example: 'category not_in [SAFE, UNKNOWN]' },
      { operator: 'matches_regex', description: 'Field matches regex pattern', example: 'phone matches_regex ^\\+91' },
      { operator: 'exists', description: 'Field exists', example: 'entities.urls exists' },
      { operator: 'not_exists', description: 'Field does not exist', example: 'entities.upi_ids not_exists' }
    ]
  }

  /**
   * Evaluate a single policy
   */
  async evaluatePolicy(policy, context) {
    const startTime = Date.now()
    
    try {
      // Check if policy should evaluate for this event
      if (!policy.shouldEvaluate(context.event)) {
        return {
          evaluated: false,
          reason: 'Event does not match policy triggers',
          executionTime: Date.now() - startTime
        }
      }

      // Evaluate conditions
      const conditionsMet = policy.evaluateConditions(context)

      if (!conditionsMet) {
        return {
          evaluated: true,
          conditionsMet: false,
          actionsExecuted: [],
          executionTime: Date.now() - startTime
        }
      }

      // Execute actions (unless in test mode)
      const actionsExecuted = []
      
      if (!policy.testMode) {
        for (const action of policy.actions) {
          try {
            const result = await this.executeAction(action, context)
            actionsExecuted.push({
              type: action.type,
              success: true,
              result
            })

            // If action is block_action, stop further evaluation
            if (action.type === 'block_action') {
              break
            }
          } catch (error) {
            logger.error('Action execution failed', {
              policyId: policy.id,
              actionType: action.type,
              error: error.message
            })
            actionsExecuted.push({
              type: action.type,
              success: false,
              error: error.message
            })
          }
        }

        // Record execution
        policy.recordExecution(true)
      }

      return {
        evaluated: true,
        conditionsMet: true,
        actionsExecuted,
        testMode: policy.testMode,
        executionTime: Date.now() - startTime
      }
    } catch (error) {
      logger.error('Policy evaluation failed', {
        policyId: policy.id,
        error: error.message
      })
      
      policy.recordExecution(false)
      
      return {
        evaluated: true,
        error: error.message,
        executionTime: Date.now() - startTime
      }
    }
  }

  /**
   * Evaluate multiple policies
   */
  async evaluatePolicies(policies, context) {
    // Sort by priority (higher first)
    const sortedPolicies = [...policies].sort((a, b) => b.priority - a.priority)

    const results = []
    let blocked = false

    for (const policy of sortedPolicies) {
      if (blocked) {
        results.push({
          policyId: policy.id,
          policyName: policy.name,
          evaluated: false,
          reason: 'Blocked by previous policy'
        })
        continue
      }

      const result = await this.evaluatePolicy(policy, context)
      results.push({
        policyId: policy.id,
        policyName: policy.name,
        ...result
      })

      // Check if any action was block_action
      if (result.actionsExecuted?.some(a => a.type === 'block_action' && a.success)) {
        blocked = true
      }
    }

    return {
      results,
      totalEvaluated: results.filter(r => r.evaluated).length,
      totalBlocked: blocked ? 1 : 0
    }
  }

  /**
   * Execute an action
   */
  async executeAction(action, context) {
    const handler = this.actionHandlers.get(action.type)
    
    if (!handler) {
      throw new Error(`Unknown action type: ${action.type}`)
    }

    return await handler(action.params || {}, context)
  }

  /**
   * Validate policy definition
   */
  validatePolicy(policyData) {
    const errors = []

    // Validate conditions
    if (!Array.isArray(policyData.conditions)) {
      errors.push('Conditions must be an array')
    } else {
      policyData.conditions.forEach((condition, index) => {
        if (!condition.field) {
          errors.push(`Condition ${index}: field is required`)
        }
        if (!condition.operator) {
          errors.push(`Condition ${index}: operator is required`)
        }
        if (condition.value === undefined && !['exists', 'not_exists'].includes(condition.operator)) {
          errors.push(`Condition ${index}: value is required for operator ${condition.operator}`)
        }
      })
    }

    // Validate actions
    if (!Array.isArray(policyData.actions)) {
      errors.push('Actions must be an array')
    } else {
      policyData.actions.forEach((action, index) => {
        if (!action.type) {
          errors.push(`Action ${index}: type is required`)
        }
        if (!this.actionHandlers.has(action.type)) {
          errors.push(`Action ${index}: unknown action type ${action.type}`)
        }
      })
    }

    // Validate scope
    const validScopes = ['analysis', 'webhook', 'consent', 'data_retention']
    if (policyData.scope && !validScopes.includes(policyData.scope)) {
      errors.push(`Invalid scope: ${policyData.scope}. Must be one of: ${validScopes.join(', ')}`)
    }

    // Validate priority
    if (policyData.priority !== undefined) {
      if (typeof policyData.priority !== 'number' || policyData.priority < 0 || policyData.priority > 100) {
        errors.push('Priority must be a number between 0 and 100')
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

function getPolicyEngine() {
  if (!instance) {
    instance = new PolicyEngine()
  }
  return instance
}

module.exports = { PolicyEngine, getPolicyEngine }

// Made with Bob
