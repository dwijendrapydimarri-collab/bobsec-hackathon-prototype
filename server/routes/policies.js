/**
 * Policies Routes
 * 
 * Endpoints for managing policy-as-code rules.
 * Requires JWT authentication.
 */
const express = require('express')
const router = express.Router()
const { getPolicyRepository } = require('../repositories/PolicyRepository')
const { getPolicyEngine } = require('../services/PolicyEngine')
const logger = require('../utils/logger')
const { body, param, validationResult } = require('express-validator')
/**
 * Validation middleware
 */
function validate(req, res, next) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'validation_error', 
      details: errors.array() 
    })
  }
  next()
}
/**
 * GET /api/policies
 * List all policies for the authenticated user's organization
 */
router.get('/', async (req, res) => {
  try {
    const { scope, enabled } = req.query
    const policyRepo = getPolicyRepository()
    const options = {}
    if (scope) options.scope = scope
    if (enabled !== undefined) options.enabledOnly = enabled === 'true'
    const policies = await policyRepo.findByOrganization(req.organizationId, options)
    res.json({
      policies: policies.map(p => p.toJSON()),
      total: policies.length
    })
  } catch (error) {
    logger.error('Failed to list policies', { error: error.message })
    res.status(500).json({ 
      error: 'server_error', 
      message: 'Failed to list policies' 
    })
  }
})
/**
 * POST /api/policies
 * Create a new policy
 */
router.post('/',
  [
    body('name').trim().isLength({ min: 1, max: 200 })
      .withMessage('Name must be 1-200 characters'),
    body('description').optional().isString()
      .withMessage('Description must be a string'),
    body('conditions').isArray()
      .withMessage('Conditions must be an array'),
    body('actions').isArray()
      .withMessage('Actions must be an array'),
    body('scope').optional().isIn(['analysis', 'webhook', 'consent', 'data_retention'])
      .withMessage('Invalid scope'),
    body('priority').optional().isInt({ min: 0, max: 100 })
      .withMessage('Priority must be 0-100'),
    body('triggers').optional().isArray()
      .withMessage('Triggers must be an array'),
    validate
  ],
  async (req, res) => {
    try {
      const policyData = {
        organizationId: req.organizationId,
        createdBy: req.user.id,
        ...req.body
      }
      // Validate policy definition
      const policyEngine = getPolicyEngine()
      const validation = policyEngine.validatePolicy(policyData)
      if (!validation.valid) {
        return res.status(400).json({
          error: 'validation_error',
          message: 'Invalid policy definition',
          details: validation.errors
        })
      }
      // Check for duplicate names
      const policyRepo = getPolicyRepository()
      const repoValidation = await policyRepo.validate(policyData)
      if (!repoValidation.valid) {
        return res.status(400).json({
          error: 'validation_error',
          message: 'Policy validation failed',
          details: repoValidation.errors
        })
      }
      const policy = await policyRepo.create(policyData)
      logger.info('Policy created', {
        policyId: policy.id,
        organizationId: req.organizationId,
        createdBy: req.user.id,
        name: policy.name
      })
      res.status(201).json({ policy: policy.toJSON() })
    } catch (error) {
      logger.error('Failed to create policy', { error: error.message })
      res.status(500).json({ 
        error: 'server_error', 
        message: 'Failed to create policy' 
      })
    }
  }
)
/**
 * GET /api/policies/:id
 * Get a specific policy
 */
router.get('/:id',
  [
    param('id').isUUID().withMessage('Invalid policy ID'),
    validate
  ],
  async (req, res) => {
    try {
      const policyRepo = getPolicyRepository()
      const policy = await policyRepo.findById(req.params.id)
      if (!policy) {
        return res.status(404).json({ 
          error: 'not_found', 
          message: 'Policy not found' 
        })
      }
      // Check ownership
      if (policy.organizationId !== req.organizationId) {
        return res.status(403).json({ 
          error: 'forbidden', 
          message: 'Access denied' 
        })
      }
      res.json({ policy: policy.toJSON() })
    } catch (error) {
      logger.error('Failed to get policy', { error: error.message })
      res.status(500).json({ 
        error: 'server_error', 
        message: 'Failed to get policy' 
      })
    }
  }
)
/**
 * PATCH /api/policies/:id
 * Update a policy
 */
router.patch('/:id',
  [
    param('id').isUUID().withMessage('Invalid policy ID'),
    body('name').optional().trim().isLength({ min: 1, max: 200 })
      .withMessage('Name must be 1-200 characters'),
    body('description').optional().isString()
      .withMessage('Description must be a string'),
    body('conditions').optional().isArray()
      .withMessage('Conditions must be an array'),
    body('actions').optional().isArray()
      .withMessage('Actions must be an array'),
    body('enabled').optional().isBoolean()
      .withMessage('Enabled must be boolean'),
    body('priority').optional().isInt({ min: 0, max: 100 })
      .withMessage('Priority must be 0-100'),
    body('testMode').optional().isBoolean()
      .withMessage('Test mode must be boolean'),
    validate
  ],
  async (req, res) => {
    try {
      const policyRepo = getPolicyRepository()
      const policy = await policyRepo.findById(req.params.id)
      if (!policy) {
        return res.status(404).json({ 
          error: 'not_found', 
          message: 'Policy not found' 
        })
      }
      // Check ownership
      if (policy.organizationId !== req.organizationId) {
        return res.status(403).json({ 
          error: 'forbidden', 
          message: 'Access denied' 
        })
      }
      // Validate if conditions or actions are being updated
      if (req.body.conditions || req.body.actions) {
        const policyEngine = getPolicyEngine()
        const validation = policyEngine.validatePolicy({
          ...policy,
          ...req.body
        })
        if (!validation.valid) {
          return res.status(400).json({
            error: 'validation_error',
            message: 'Invalid policy definition',
            details: validation.errors
          })
        }
      }
      const updated = await policyRepo.update(req.params.id, req.body)
      logger.info('Policy updated', {
        policyId: policy.id,
        organizationId: req.organizationId,
        updatedBy: req.user.id,
        updates: Object.keys(req.body)
      })
      res.json({ policy: updated.toJSON() })
    } catch (error) {
      logger.error('Failed to update policy', { error: error.message })
      res.status(500).json({ 
        error: 'server_error', 
        message: 'Failed to update policy' 
      })
    }
  }
)
/**
 * DELETE /api/policies/:id
 * Delete a policy
 */
router.delete('/:id',
  [
    param('id').isUUID().withMessage('Invalid policy ID'),
    validate
  ],
  async (req, res) => {
    try {
      const policyRepo = getPolicyRepository()
      const policy = await policyRepo.findById(req.params.id)
      if (!policy) {
        return res.status(404).json({ 
          error: 'not_found', 
          message: 'Policy not found' 
        })
      }
      // Check ownership
      if (policy.organizationId !== req.organizationId) {
        return res.status(403).json({ 
          error: 'forbidden', 
          message: 'Access denied' 
        })
      }
      await policyRepo.delete(req.params.id)
      logger.info('Policy deleted', {
        policyId: policy.id,
        organizationId: req.organizationId,
        deletedBy: req.user.id
      })
      res.json({ 
        message: 'Policy deleted successfully',
        policyId: req.params.id
      })
    } catch (error) {
      logger.error('Failed to delete policy', { error: error.message })
      res.status(500).json({ 
        error: 'server_error', 
        message: 'Failed to delete policy' 
      })
    }
  }
)
/**
 * POST /api/policies/:id/toggle
 * Toggle policy enabled status
 */
router.post('/:id/toggle',
  [
    param('id').isUUID().withMessage('Invalid policy ID'),
    validate
  ],
  async (req, res) => {
    try {
      const policyRepo = getPolicyRepository()
      const policy = await policyRepo.findById(req.params.id)
      if (!policy) {
        return res.status(404).json({ 
          error: 'not_found', 
          message: 'Policy not found' 
        })
      }
      // Check ownership
      if (policy.organizationId !== req.organizationId) {
        return res.status(403).json({ 
          error: 'forbidden', 
          message: 'Access denied' 
        })
      }
      const updated = await policyRepo.toggleEnabled(req.params.id)
      logger.info('Policy toggled', {
        policyId: policy.id,
        organizationId: req.organizationId,
        toggledBy: req.user.id,
        enabled: updated.enabled
      })
      res.json({ policy: updated.toJSON() })
    } catch (error) {
      logger.error('Failed to toggle policy', { error: error.message })
      res.status(500).json({ 
        error: 'server_error', 
        message: 'Failed to toggle policy' 
      })
    }
  }
)
/**
 * POST /api/policies/:id/duplicate
 * Duplicate a policy
 */
router.post('/:id/duplicate',
  [
    param('id').isUUID().withMessage('Invalid policy ID'),
    body('name').optional().trim().isLength({ min: 1, max: 200 })
      .withMessage('Name must be 1-200 characters'),
    validate
  ],
  async (req, res) => {
    try {
      const policyRepo = getPolicyRepository()
      const policy = await policyRepo.findById(req.params.id)
      if (!policy) {
        return res.status(404).json({ 
          error: 'not_found', 
          message: 'Policy not found' 
        })
      }
      // Check ownership
      if (policy.organizationId !== req.organizationId) {
        return res.status(403).json({ 
          error: 'forbidden', 
          message: 'Access denied' 
        })
      }
      const duplicate = await policyRepo.duplicate(req.params.id, req.body.name)
      logger.info('Policy duplicated', {
        originalId: policy.id,
        duplicateId: duplicate.id,
        organizationId: req.organizationId,
        duplicatedBy: req.user.id
      })
      res.status(201).json({ policy: duplicate.toJSON() })
    } catch (error) {
      logger.error('Failed to duplicate policy', { error: error.message })
      res.status(500).json({ 
        error: 'server_error', 
        message: 'Failed to duplicate policy' 
      })
    }
  }
)
/**
 * POST /api/policies/:id/test
 * Test a policy against sample context
 */
router.post('/:id/test',
  [
    param('id').isUUID().withMessage('Invalid policy ID'),
    body('context').isObject().withMessage('Context must be an object'),
    validate
  ],
  async (req, res) => {
    try {
      const policyRepo = getPolicyRepository()
      const policy = await policyRepo.findById(req.params.id)
      if (!policy) {
        return res.status(404).json({ 
          error: 'not_found', 
          message: 'Policy not found' 
        })
      }
      // Check ownership
      if (policy.organizationId !== req.organizationId) {
        return res.status(403).json({ 
          error: 'forbidden', 
          message: 'Access denied' 
        })
      }
      const policyEngine = getPolicyEngine()
      const result = await policyEngine.evaluatePolicy(policy, {
        ...req.body.context,
        organizationId: req.organizationId
      })
      logger.info('Policy tested', {
        policyId: policy.id,
        organizationId: req.organizationId,
        testedBy: req.user.id,
        result: result.conditionsMet
      })
      res.json({ result })
    } catch (error) {
      logger.error('Failed to test policy', { error: error.message })
      res.status(500).json({ 
        error: 'server_error', 
        message: 'Failed to test policy' 
      })
    }
  }
)
/**
 * GET /api/policies/stats/summary
 * Get policy statistics for the organization
 */
router.get('/stats/summary', async (req, res) => {
  try {
    const policyRepo = getPolicyRepository()
    const stats = await policyRepo.getStats(req.organizationId)
    res.json({ stats })
  } catch (error) {
    logger.error('Failed to get policy stats', { error: error.message })
    res.status(500).json({ 
      error: 'server_error', 
      message: 'Failed to get policy statistics' 
    })
  }
})
/**
 * GET /api/policies/stats/execution-history
 * Get policy execution history
 */
router.get('/stats/execution-history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100
    const policyRepo = getPolicyRepository()
    const history = await policyRepo.getExecutionHistory(req.organizationId, limit)
    res.json({ history, total: history.length })
  } catch (error) {
    logger.error('Failed to get execution history', { error: error.message })
    res.status(500).json({ 
      error: 'server_error', 
      message: 'Failed to get execution history' 
    })
  }
})
/**
 * GET /api/policies/metadata/actions
 * Get available action types
 */
router.get('/metadata/actions', (req, res) => {
  try {
    const policyEngine = getPolicyEngine()
    const actions = policyEngine.getAvailableActions()
    res.json({ actions })
  } catch (error) {
    logger.error('Failed to get available actions', { error: error.message })
    res.status(500).json({ 
      error: 'server_error', 
      message: 'Failed to get available actions' 
    })
  }
})
/**
 * GET /api/policies/metadata/operators
 * Get available operators
 */
router.get('/metadata/operators', (req, res) => {
  try {
    const policyEngine = getPolicyEngine()
    const operators = policyEngine.getAvailableOperators()
    res.json({ operators })
  } catch (error) {
    logger.error('Failed to get available operators', { error: error.message })
    res.status(500).json({ 
      error: 'server_error', 
      message: 'Failed to get available operators' 
    })
  }
})
module.exports = router
// Made with Bob