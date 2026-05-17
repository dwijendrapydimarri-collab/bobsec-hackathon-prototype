// Feedback route - Handles user feedback and rule suggestions

const express = require('express')
const router = express.Router()
const { processFeedback, getAllSuggestions, updateSuggestionStatus } = require('../agents/ruleSuggestionAgent')
const { optionalAuth, demoModeCompatible, requireReviewer } = require('../middleware/auth')
const FeedbackRepository = require('../repositories/FeedbackRepository')
const RuleSuggestionRepository = require('../repositories/RuleSuggestionRepository')
const { validate, validateFeedbackRequest, validateSuggestionStatusUpdate } = require('../schemas/validation')
const logger = require('../utils/logger')
const metrics = require('../utils/metrics')

// POST /api/feedback - Submit feedback and get rule suggestion
router.post('/feedback', optionalAuth, demoModeCompatible, validate(validateFeedbackRequest), async (req, res) => {
  const userId = req.auth?.userId || null
  const tenantId = req.auth?.tenantId || 'demo'
  const {
    message,
    verdict,
    matchedRules,
    userComment,
    entities,
    feedbackType = 'incorrect_verdict'
  } = req.body

  try {
    // Process feedback and potentially generate rule suggestion
    const result = await processFeedback({
      message,
      verdict,
      matchedRules: matchedRules || [],
      userComment: userComment || '',
      entities: entities || {},
      feedbackType
    })

    // Log feedback
    logger.info('Feedback received', {
      requestId: req.id,
      userId,
      tenantId,
      feedbackType,
      ruleSuggested: result.rule_suggested
    })
    
    // Record metrics
    metrics.recordFeedback(result.rule_suggested)
    
    // Save feedback to repository
    try {
      await FeedbackRepository.saveFeedback({
        userId,
        tenantId,
        message,
        verdict,
        matchedRules: matchedRules || [],
        userComment: userComment || '',
        entities: entities || {},
        feedbackType,
        ruleSuggested: result.rule_suggested,
        suggestionId: result.suggestion?.rule?.id || null
      })
    } catch (saveError) {
      logger.error('Failed to save feedback', {
        requestId: req.id,
        error: saveError.message
      })
      // Don't fail the request if save fails
    }

    return res.json({
      success: true,
      feedback_received: true,
      rule_suggested: result.rule_suggested,
      suggestion: result.suggestion || null,
      reason: result.reason,
      processing_time_ms: result.processing_time_ms,
      message: result.rule_suggested
        ? 'Thank you! Your feedback helped us identify a new scam pattern.'
        : 'Thank you for your feedback. We\'re continuously improving our detection.'
    })

  } catch (error) {
    logger.error('Feedback processing failed', {
      requestId: req.id,
      userId,
      tenantId,
      error: error.message,
      stack: error.stack
    })
    
    return res.status(500).json({
      error: 'feedback_processing_failed',
      message: 'Unable to process feedback at this time',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// GET /api/feedback/suggestions - Get all rule suggestions (for Labs view)
// Requires REVIEWER or ADMIN role
router.get('/feedback/suggestions', requireReviewer, async (req, res) => {
  try {
    const tenantId = req.auth.tenantId
    const suggestions = await RuleSuggestionRepository.listAllByTenant(tenantId)
    
    return res.json({
      success: true,
      total: suggestions.length,
      pending: suggestions.filter(s => s.metadata.status === 'pending_review').length,
      approved: suggestions.filter(s => s.metadata.status === 'approved').length,
      rejected: suggestions.filter(s => s.metadata.status === 'rejected').length,
      suggestions: suggestions
    })

  } catch (error) {
    logger.error('Failed to fetch suggestions', {
      requestId: req.id,
      tenantId: req.auth.tenantId,
      error: error.message
    })
    
    return res.status(500).json({
      error: 'fetch_failed',
      message: 'Unable to fetch suggestions',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// PATCH /api/feedback/suggestions/:ruleId - Update suggestion status
// Requires REVIEWER or ADMIN role
router.patch('/feedback/suggestions/:ruleId', requireReviewer, validate(validateSuggestionStatusUpdate), async (req, res) => {
  const { ruleId } = req.params
  const { status, comment } = req.body

  try {
    const updated = await updateSuggestionStatus(ruleId, status, comment)
    
    if (!updated) {
      logger.warn('Rule suggestion not found', {
        requestId: req.id,
        ruleId,
        userId: req.auth.userId
      })
      return res.status(404).json({
        error: 'not_found',
        message: 'Rule suggestion not found'
      })
    }

    logger.info('Rule suggestion status updated', {
      requestId: req.id,
      ruleId,
      status,
      userId: req.auth.userId,
      tenantId: req.auth.tenantId
    })

    return res.json({
      success: true,
      message: `Rule suggestion ${status}`,
      rule_id: ruleId,
      status: status
    })

  } catch (error) {
    logger.error('Failed to update suggestion', {
      requestId: req.id,
      ruleId,
      error: error.message,
      stack: error.stack
    })
    
    return res.status(500).json({
      error: 'update_failed',
      message: 'Unable to update suggestion',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

module.exports = router

// Made with Bob
