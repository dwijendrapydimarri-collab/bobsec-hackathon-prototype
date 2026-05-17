const express = require('express')
const router = express.Router()
const { orchestrate } = require('../orchestrator/bobOrchestrator')
const { optionalAuth, demoModeCompatible } = require('../middleware/auth')
const { dualAuth } = require('../middleware/apiKeyAuth')
const AnalysisRepository = require('../repositories/AnalysisRepository')
const { validate, validateAnalysisRequest } = require('../schemas/validation')
const { getWebhookService } = require('../services/WebhookService')
const { getPolicyRepository } = require('../repositories/PolicyRepository')
const { getPolicyEngine } = require('../services/PolicyEngine')
const logger = require('../utils/logger')
const metrics = require('../utils/metrics')

// ── POST /api/analyse — Bob-native orchestration pipeline ─────────────────

router.post('/analyse', dualAuth, demoModeCompatible, validate(validateAnalysisRequest), async (req, res) => {
  const startTime = Date.now()
  const { input, lang = 'en', mode = 'pre_incident', victim_narrative = null } = req.body
  
  // Extract auth context (supports both JWT and API key)
  const userId = req.auth?.userId || req.user?.id || null
  const tenantId = req.auth?.tenantId || req.organizationId || 'demo'
  const isDemo = req.auth?.isDemo || false
  const authType = req.authType || 'jwt' // 'jwt' or 'api_key'

  logger.info('Analysis started', {
    requestId: req.id,
    userId,
    tenantId,
    authType,
    mode,
    inputLength: input.length,
    lang
  })

  try {
    // Check if mock mode is enabled
    if (process.env.MOCK_MODE === 'true') {
      // Try to detect and return mock response
      const { detectMockKey, getMockResponse } = require('../mocks/mockResponses')
      const mockKey = detectMockKey(input)
      
      if (mockKey) {
        const mockData = getMockResponse(mockKey)
        return res.json({ ...mockData, source: 'mock' })
      }
      
      // If no mock match, return generic fallback
      return res.json({
        analysis_id: `BSC-${Date.now()}`,
        timestamp_ist: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        risk_score: 50,
        risk_level: 'UNKNOWN',
        category: 'UNKNOWN',
        sub_type: 'Mock mode - no match found',
        confidence: 40,
        explanation_en: 'Mock mode is enabled. This is a demo response.',
        explanation_hi: 'Mock mode चालू है। यह एक demo response है।',
        user_action: 'Verify through official channels.',
        user_action_hi: 'Official channels से verify करें।',
        red_flags: [],
        entities: {
          phone_numbers: [],
          urls: [],
          upi_ids: [],
          amounts: [],
          dates: [],
          impersonated_org: '',
          urgency_phrases: []
        },
        distressed: false,
        trace: [],
        source: 'mock_fallback'
      })
    }

    // Run Bob orchestration pipeline
    const result = await orchestrate(input, { mode, victim_narrative, lang })
    
    const duration = Date.now() - startTime
    
    // Log analysis completion
    logger.info('Analysis completed', {
      requestId: req.id,
      userId,
      tenantId,
      analysisId: result.analysis_id,
      riskLevel: result.risk_level,
      category: result.category,
      duration
    })
    
    // Record metrics
    metrics.recordAnalysis(result.risk_level, result.category)
    
    // Save analysis to repository (with user/tenant context)
    try {
      await AnalysisRepository.saveAnalysis({
        ...result,
        userId,
        tenantId,
        mode
      })
    } catch (saveError) {
      logger.error('Failed to save analysis', {
        requestId: req.id,
        analysisId: result.analysis_id,
        error: saveError.message
      })
      // Don't fail the request if save fails
    }
    
    // Dispatch webhook events
    try {
      const webhookService = getWebhookService()
      
      // Always dispatch analysis.completed
      await webhookService.dispatch('analysis.completed', {
        analysisId: result.analysis_id,
        riskLevel: result.risk_level,
        riskScore: result.risk_score,
        category: result.category,
        timestamp: result.timestamp_ist
      }, tenantId)
      
      // Dispatch high_risk event if applicable
      if (result.risk_level === 'HIGH') {
        await webhookService.dispatch('analysis.high_risk', {
          analysisId: result.analysis_id,
          riskScore: result.risk_score,
          category: result.category,
          redFlags: result.red_flags,
          timestamp: result.timestamp_ist
        }, tenantId)
      }
      
      // Dispatch distressed event if applicable
      if (result.distressed) {
        await webhookService.dispatch('user.distressed', {
          analysisId: result.analysis_id,
          userId,
          timestamp: result.timestamp_ist
        }, tenantId)
      }
    } catch (webhookError) {
      logger.error('Failed to dispatch webhooks', {
        requestId: req.id,
        analysisId: result.analysis_id,
        error: webhookError.message
      })
      // Don't fail the request if webhook dispatch fails
    }
    
    // Evaluate policies for analysis.completed event
    try {
      const policyRepo = getPolicyRepository()
      const policyEngine = getPolicyEngine()
      
      // Find policies for this event and organization
      const policies = await policyRepo.findByEvent('analysis.completed', tenantId)
      
      if (policies.length > 0) {
        const policyContext = {
          event: 'analysis.completed',
          organizationId: tenantId,
          userId,
          analysis: {
            analysisId: result.analysis_id,
            riskScore: result.risk_score,
            riskLevel: result.risk_level,
            category: result.category,
            confidence: result.confidence,
            distressed: result.distressed
          },
          entities: result.entities,
          redFlags: result.red_flags
        }
        
        const policyResults = await policyEngine.evaluatePolicies(policies, policyContext)
        
        logger.info('Policies evaluated', {
          requestId: req.id,
          analysisId: result.analysis_id,
          policiesEvaluated: policyResults.totalEvaluated,
          policiesBlocked: policyResults.totalBlocked
        })
        
        // Add policy results to trace if any actions were executed
        if (policyResults.results.some(r => r.actionsExecuted?.length > 0)) {
          result.trace = result.trace || []
          result.trace.push({
            step: result.trace.length + 1,
            agent: 'PolicyEngine',
            model: 'Policy-as-Code',
            action: 'Evaluate and execute policies',
            result: `${policyResults.totalEvaluated} policies evaluated, ${policyResults.results.filter(r => r.conditionsMet).length} triggered`,
            time_ms: 50,
            policy_passed: true
          })
        }
      }
    } catch (policyError) {
      logger.error('Failed to evaluate policies', {
        requestId: req.id,
        analysisId: result.analysis_id,
        error: policyError.message
      })
      // Don't fail the request if policy evaluation fails
    }
    
    // Return result
    return res.json(result)

  } catch (error) {
    logger.error('Analysis failed', {
      requestId: req.id,
      userId,
      tenantId,
      error: error.message,
      stack: error.stack
    })
    
    // Return error response
    return res.status(500).json({
      error: 'analysis_failed',
      message: 'An error occurred during analysis. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// ── POST /api/generate-report ──────────────────────────────────────────────

router.post('/generate-report', (req, res) => {
  const { analysis_id, user_confirmed } = req.body
  if (!user_confirmed) {
    return res.status(403).json({ error: 'User confirmation required before generating police report.' })
  }
  res.json({ success: true, message: 'Report generation approved. Client will build report from stored analysis data.' })
})

module.exports = router

// Made with Bob
