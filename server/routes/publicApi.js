/**
 * Public API Routes for BobSec Platform
 * 
 * These routes are designed for external integrations (banks, telcos, wallets, etc.)
 * All routes require API key authentication and enforce rate limiting.
 * 
 * API Versioning: /api/v1/...
 * Authentication: Bearer token (API key)
 * Rate Limiting: Per API key, configurable by tier
 */

const express = require('express')
const router = express.Router()
const { authenticateApiKey } = require('../middleware/apiKeyAuth')
const { rateLimitByApiKey } = require('../middleware/rateLimiting')
const { enforceTenantIsolation } = require('../middleware/tenantIsolation')
const { validateRequest } = require('../middleware/validation')
const { PlatformContext } = require('../models/PlatformContext')
const bobOrchestrator = require('../orchestrator/bobOrchestrator')
const analysisRepository = require('../repositories/AnalysisRepository')
const webhookService = require('../services/WebhookService')
const logger = require('../utils/logger')

// ══════════════════════════════════════════════════════════════════════════════
// Middleware Stack for Public API
// ══════════════════════════════════════════════════════════════════════════════

router.use(authenticateApiKey)        // Validate API key
router.use(rateLimitByApiKey)         // Rate limit per API key
router.use(enforceTenantIsolation)    // Enforce tenant isolation

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/v1/analyse
// Core analysis endpoint - accepts suspicious content and returns verdict
// ══════════════════════════════════════════════════════════════════════════════

router.post('/analyse', validateRequest({
  body: {
    input: { type: 'string', required: true, minLength: 10, maxLength: 10000 },
    channel: { type: 'string', enum: ['web', 'api', 'sms', 'whatsapp', 'email'], default: 'api' },
    metadata: { type: 'object', required: false },
    webhookUrl: { type: 'string', required: false, format: 'url' },
    async: { type: 'boolean', default: false }
  }
}), async (req, res) => {
  const startTime = Date.now()
  
  try {
    const { input, channel, metadata, webhookUrl, async } = req.body
    
    // Create platform context from request
    const context = PlatformContext.fromRequest(req)
    context.channel = channel
    context.metadata = metadata || {}
    
    // Validate context
    const validation = context.validate()
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_CONTEXT',
        message: validation.errors.join(', ')
      })
    }
    
    // Async mode: Queue analysis and return immediately
    if (async) {
      const analysisId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // Queue analysis (in production, use message queue like RabbitMQ/SQS)
      setImmediate(async () => {
        try {
          const result = await bobOrchestrator.execute(input, context)
          
          // Save to database
          await analysisRepository.create({
            ...result,
            id: analysisId,
            apiKeyId: req.apiKey.id,
            tenantId: context.tenantId,
            organizationId: context.organizationId,
            sector: context.sector,
            region: context.region
          })
          
          // Trigger webhook if provided
          if (webhookUrl) {
            await webhookService.trigger(webhookUrl, {
              event: 'analysis.completed',
              analysisId,
              result
            }, req.apiKey)
          }
          
          logger.info('Async analysis completed', { analysisId, duration: Date.now() - startTime })
        } catch (error) {
          logger.error('Async analysis failed', { analysisId, error: error.message })
          
          // Trigger error webhook
          if (webhookUrl) {
            await webhookService.trigger(webhookUrl, {
              event: 'analysis.failed',
              analysisId,
              error: error.message
            }, req.apiKey)
          }
        }
      })
      
      return res.status(202).json({
        success: true,
        analysisId,
        status: 'queued',
        message: 'Analysis queued. You will receive a webhook notification when complete.',
        estimatedCompletionSeconds: 30
      })
    }
    
    // Sync mode: Execute analysis and return result
    const result = await bobOrchestrator.execute(input, context)
    
    // Save to database
    const analysisId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    await analysisRepository.create({
      ...result,
      id: analysisId,
      apiKeyId: req.apiKey.id,
      tenantId: context.tenantId,
      organizationId: context.organizationId,
      sector: context.sector,
      region: context.region
    })
    
    // Trigger webhook if provided
    if (webhookUrl) {
      setImmediate(async () => {
        await webhookService.trigger(webhookUrl, {
          event: 'analysis.completed',
          analysisId,
          result
        }, req.apiKey)
      })
    }
    
    const duration = Date.now() - startTime
    logger.info('Sync analysis completed', { analysisId, duration })
    
    return res.json({
      success: true,
      analysisId,
      result,
      metadata: {
        duration,
        apiVersion: 'v1',
        sector: context.sector,
        region: context.region
      }
    })
    
  } catch (error) {
    logger.error('Analysis failed', { error: error.message, stack: error.stack })
    
    return res.status(500).json({
      success: false,
      error: 'ANALYSIS_FAILED',
      message: error.message
    })
  }
})

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/v1/analysis/:id
// Retrieve analysis result by ID
// ══════════════════════════════════════════════════════════════════════════════

router.get('/analysis/:id', async (req, res) => {
  try {
    const { id } = req.params
    
    // Retrieve analysis with tenant filtering
    const analysis = await analysisRepository.findById(id, req.tenantContext)
    
    if (!analysis) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Analysis not found or you do not have access to it'
      })
    }
    
    return res.json({
      success: true,
      analysis
    })
    
  } catch (error) {
    logger.error('Failed to retrieve analysis', { error: error.message })
    
    return res.status(500).json({
      success: false,
      error: 'RETRIEVAL_FAILED',
      message: error.message
    })
  }
})

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/v1/batch-analyse
// Batch analysis endpoint - accepts multiple inputs
// ══════════════════════════════════════════════════════════════════════════════

router.post('/batch-analyse', validateRequest({
  body: {
    inputs: { 
      type: 'array', 
      required: true, 
      minItems: 1, 
      maxItems: 100,
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', required: true },
          input: { type: 'string', required: true, minLength: 10, maxLength: 10000 },
          metadata: { type: 'object', required: false }
        }
      }
    },
    webhookUrl: { type: 'string', required: false, format: 'url' }
  }
}), async (req, res) => {
  try {
    const { inputs, webhookUrl } = req.body
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Create platform context
    const context = PlatformContext.fromRequest(req)
    
    // Queue batch analysis
    setImmediate(async () => {
      const results = []
      
      for (const item of inputs) {
        try {
          const result = await bobOrchestrator.execute(item.input, {
            ...context,
            metadata: item.metadata || {}
          })
          
          const analysisId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          
          await analysisRepository.create({
            ...result,
            id: analysisId,
            batchId,
            batchItemId: item.id,
            apiKeyId: req.apiKey.id,
            tenantId: context.tenantId,
            organizationId: context.organizationId,
            sector: context.sector,
            region: context.region
          })
          
          results.push({
            id: item.id,
            analysisId,
            success: true,
            result
          })
          
        } catch (error) {
          results.push({
            id: item.id,
            success: false,
            error: error.message
          })
        }
      }
      
      // Trigger webhook with batch results
      if (webhookUrl) {
        await webhookService.trigger(webhookUrl, {
          event: 'batch.completed',
          batchId,
          results
        }, req.apiKey)
      }
      
      logger.info('Batch analysis completed', { batchId, count: inputs.length })
    })
    
    return res.status(202).json({
      success: true,
      batchId,
      status: 'queued',
      itemCount: inputs.length,
      message: 'Batch analysis queued. You will receive a webhook notification when complete.',
      estimatedCompletionSeconds: inputs.length * 5
    })
    
  } catch (error) {
    logger.error('Batch analysis failed', { error: error.message })
    
    return res.status(500).json({
      success: false,
      error: 'BATCH_FAILED',
      message: error.message
    })
  }
})

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/v1/history
// Retrieve analysis history with pagination and filtering
// ══════════════════════════════════════════════════════════════════════════════

router.get('/history', validateRequest({
  query: {
    page: { type: 'number', default: 1, min: 1 },
    limit: { type: 'number', default: 20, min: 1, max: 100 },
    riskLevel: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW', 'SAFE', 'UNKNOWN'], required: false },
    category: { type: 'string', required: false },
    startDate: { type: 'string', format: 'date', required: false },
    endDate: { type: 'string', format: 'date', required: false }
  }
}), async (req, res) => {
  try {
    const { page, limit, riskLevel, category, startDate, endDate } = req.query
    
    // Build filter
    const filter = {
      tenantId: req.tenantContext.tenantId,
      organizationId: req.tenantContext.organizationId
    }
    
    if (riskLevel) filter.risk_level = riskLevel
    if (category) filter.category = category
    if (startDate || endDate) {
      filter.createdAt = {}
      if (startDate) filter.createdAt.$gte = new Date(startDate)
      if (endDate) filter.createdAt.$lte = new Date(endDate)
    }
    
    // Retrieve with pagination
    const skip = (page - 1) * limit
    const analyses = await analysisRepository.find(filter, {
      skip,
      limit,
      sort: { createdAt: -1 }
    })
    
    const total = await analysisRepository.count(filter)
    
    return res.json({
      success: true,
      data: analyses,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
    
  } catch (error) {
    logger.error('Failed to retrieve history', { error: error.message })
    
    return res.status(500).json({
      success: false,
      error: 'RETRIEVAL_FAILED',
      message: error.message
    })
  }
})

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/v1/stats
// Retrieve aggregated statistics
// ══════════════════════════════════════════════════════════════════════════════

router.get('/stats', validateRequest({
  query: {
    period: { type: 'string', enum: ['day', 'week', 'month', 'year'], default: 'month' }
  }
}), async (req, res) => {
  try {
    const { period } = req.query
    
    // Calculate date range
    const now = new Date()
    const startDate = new Date()
    
    switch (period) {
      case 'day':
        startDate.setDate(now.getDate() - 1)
        break
      case 'week':
        startDate.setDate(now.getDate() - 7)
        break
      case 'month':
        startDate.setMonth(now.getMonth() - 1)
        break
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1)
        break
    }
    
    // Aggregate statistics
    const stats = await analysisRepository.aggregate([
      {
        $match: {
          tenantId: req.tenantContext.tenantId,
          organizationId: req.tenantContext.organizationId,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          high: { $sum: { $cond: [{ $eq: ['$risk_level', 'HIGH'] }, 1, 0] } },
          medium: { $sum: { $cond: [{ $eq: ['$risk_level', 'MEDIUM'] }, 1, 0] } },
          low: { $sum: { $cond: [{ $eq: ['$risk_level', 'LOW'] }, 1, 0] } },
          safe: { $sum: { $cond: [{ $eq: ['$risk_level', 'SAFE'] }, 1, 0] } },
          avgRiskScore: { $avg: '$risk_score' },
          avgConfidence: { $avg: '$confidence' }
        }
      }
    ])
    
    const categoryBreakdown = await analysisRepository.aggregate([
      {
        $match: {
          tenantId: req.tenantContext.tenantId,
          organizationId: req.tenantContext.organizationId,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ])
    
    return res.json({
      success: true,
      period,
      startDate,
      endDate: now,
      stats: stats[0] || {
        total: 0,
        high: 0,
        medium: 0,
        low: 0,
        safe: 0,
        avgRiskScore: 0,
        avgConfidence: 0
      },
      categoryBreakdown
    })
    
  } catch (error) {
    logger.error('Failed to retrieve stats', { error: error.message })
    
    return res.status(500).json({
      success: false,
      error: 'STATS_FAILED',
      message: error.message
    })
  }
})

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/v1/health
// Health check endpoint (no authentication required)
// ══════════════════════════════════════════════════════════════════════════════

router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    version: 'v1',
    timestamp: new Date().toISOString()
  })
})

module.exports = router

// Made with Bob
