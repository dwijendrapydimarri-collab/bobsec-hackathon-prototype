/**
 * Investigation Routes
 * 
 * API endpoints for law enforcement and fraud investigators
 * Restricted to GOV sector and authorized investigators
 * 
 * Features:
 * - Create and manage investigation cases
 * - Link multiple analyses to cases
 * - Generate evidence packages
 * - Export for legal proceedings
 * - Track chain of custody
 */

const express = require('express')
const router = express.Router()
const { requireAuth } = require('../middleware/auth')
const investigationService = require('../services/InvestigationService')
const logger = require('../utils/logger')

// ════════════════════════════════════════════════════════════════════════════
// Middleware: Require GOV sector or authorized investigator
// ════════════════════════════════════════════════════════════════════════════

function requireInvestigator(req, res, next) {
  const context = req.platformContext
  
  if (!context) {
    return res.status(401).json({
      error: 'unauthorized',
      message: 'Platform context required'
    })
  }
  
  // Allow GOV sector or organizations with investigator role
  if (context.sector === 'GOV' || req.auth.role === 'INVESTIGATOR') {
    return next()
  }
  
  return res.status(403).json({
    error: 'forbidden',
    message: 'Investigation tools are restricted to authorized investigators and GOV sector'
  })
}

// ════════════════════════════════════════════════════════════════════════════
// Case Management
// ════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/investigations/cases
 * Create new investigation case
 */
router.post('/cases', requireAuth, requireInvestigator, async (req, res) => {
  try {
    const { title, description, category, priority, investigatorName, tags } = req.body
    
    // Validate required fields
    if (!title || !description || !category) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'title, description, and category are required'
      })
    }
    
    const context = req.platformContext
    const caseData = {
      title,
      description,
      category,
      priority: priority || 'MEDIUM',
      investigatorName: investigatorName || req.auth.email,
      tags: tags || []
    }
    
    const investigationCase = await investigationService.createCase(caseData, context)
    
    logger.info('Investigation: Case created via API', {
      caseId: investigationCase.id,
      userId: context.userId,
      organizationId: context.organizationId
    })
    
    return res.status(201).json({
      success: true,
      case: investigationCase
    })
  } catch (error) {
    logger.error('Investigation: Case creation failed', { error: error.message })
    return res.status(500).json({
      error: 'creation_failed',
      message: error.message
    })
  }
})

/**
 * GET /api/investigations/cases
 * List investigation cases
 */
router.get('/cases', requireAuth, requireInvestigator, async (req, res) => {
  try {
    const { status, category, priority } = req.query
    const context = req.platformContext
    
    const filter = {
      status,
      category,
      priority
    }
    
    const cases = await investigationService.listCases(filter, context)
    
    return res.json({
      success: true,
      total: cases.length,
      cases
    })
  } catch (error) {
    logger.error('Investigation: Case listing failed', { error: error.message })
    return res.status(500).json({
      error: 'fetch_failed',
      message: error.message
    })
  }
})

/**
 * GET /api/investigations/cases/:caseId
 * Get case details
 */
router.get('/cases/:caseId', requireAuth, requireInvestigator, async (req, res) => {
  try {
    const { caseId } = req.params
    const context = req.platformContext
    
    const investigationCase = await investigationService.getCase(caseId, context)
    
    return res.json({
      success: true,
      case: investigationCase
    })
  } catch (error) {
    logger.error('Investigation: Case fetch failed', { error: error.message, caseId: req.params.caseId })
    
    if (error.message === 'Case not found') {
      return res.status(404).json({
        error: 'not_found',
        message: error.message
      })
    }
    
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({
        error: 'forbidden',
        message: error.message
      })
    }
    
    return res.status(500).json({
      error: 'fetch_failed',
      message: error.message
    })
  }
})

/**
 * PATCH /api/investigations/cases/:caseId/status
 * Update case status
 */
router.patch('/cases/:caseId/status', requireAuth, requireInvestigator, async (req, res) => {
  try {
    const { caseId } = req.params
    const { status } = req.body
    const context = req.platformContext
    
    if (!status) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'status is required'
      })
    }
    
    const validStatuses = ['OPEN', 'IN_PROGRESS', 'UNDER_REVIEW', 'CLOSED', 'ARCHIVED']
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'validation_error',
        message: `status must be one of: ${validStatuses.join(', ')}`
      })
    }
    
    const investigationCase = await investigationService.updateCaseStatus(caseId, status, context)
    
    logger.info('Investigation: Case status updated', {
      caseId,
      status,
      userId: context.userId
    })
    
    return res.json({
      success: true,
      case: investigationCase
    })
  } catch (error) {
    logger.error('Investigation: Status update failed', { error: error.message, caseId: req.params.caseId })
    
    if (error.message === 'Case not found') {
      return res.status(404).json({
        error: 'not_found',
        message: error.message
      })
    }
    
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({
        error: 'forbidden',
        message: error.message
      })
    }
    
    return res.status(500).json({
      error: 'update_failed',
      message: error.message
    })
  }
})

/**
 * POST /api/investigations/cases/:caseId/link
 * Link analysis to case
 */
router.post('/cases/:caseId/link', requireAuth, requireInvestigator, async (req, res) => {
  try {
    const { caseId } = req.params
    const { analysisId, analysis } = req.body
    const context = req.platformContext
    
    if (!analysisId || !analysis) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'analysisId and analysis data are required'
      })
    }
    
    const investigationCase = await investigationService.linkAnalysis(caseId, analysisId, analysis, context)
    
    logger.info('Investigation: Analysis linked to case', {
      caseId,
      analysisId,
      userId: context.userId
    })
    
    return res.json({
      success: true,
      case: investigationCase
    })
  } catch (error) {
    logger.error('Investigation: Analysis linking failed', { error: error.message, caseId: req.params.caseId })
    
    if (error.message === 'Case not found') {
      return res.status(404).json({
        error: 'not_found',
        message: error.message
      })
    }
    
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({
        error: 'forbidden',
        message: error.message
      })
    }
    
    return res.status(500).json({
      error: 'link_failed',
      message: error.message
    })
  }
})

// ════════════════════════════════════════════════════════════════════════════
// Evidence Package Generation
// ════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/investigations/cases/:caseId/evidence
 * Generate evidence package
 */
router.get('/cases/:caseId/evidence', requireAuth, requireInvestigator, async (req, res) => {
  try {
    const { caseId } = req.params
    const context = req.platformContext
    
    const evidencePackage = await investigationService.generateEvidencePackage(caseId, context)
    
    logger.info('Investigation: Evidence package generated', {
      caseId,
      packageId: evidencePackage.package_id,
      userId: context.userId
    })
    
    return res.json({
      success: true,
      evidence: evidencePackage
    })
  } catch (error) {
    logger.error('Investigation: Evidence generation failed', { error: error.message, caseId: req.params.caseId })
    
    if (error.message === 'Case not found') {
      return res.status(404).json({
        error: 'not_found',
        message: error.message
      })
    }
    
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({
        error: 'forbidden',
        message: error.message
      })
    }
    
    return res.status(500).json({
      error: 'generation_failed',
      message: error.message
    })
  }
})

/**
 * GET /api/investigations/cases/:caseId/export/json
 * Export evidence as JSON
 */
router.get('/cases/:caseId/export/json', requireAuth, requireInvestigator, async (req, res) => {
  try {
    const { caseId } = req.params
    const context = req.platformContext
    
    const jsonData = await investigationService.exportJSON(caseId, context)
    
    logger.info('Investigation: Evidence exported as JSON', {
      caseId,
      userId: context.userId
    })
    
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="evidence-${caseId}.json"`)
    return res.send(jsonData)
  } catch (error) {
    logger.error('Investigation: JSON export failed', { error: error.message, caseId: req.params.caseId })
    
    if (error.message === 'Case not found') {
      return res.status(404).json({
        error: 'not_found',
        message: error.message
      })
    }
    
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({
        error: 'forbidden',
        message: error.message
      })
    }
    
    return res.status(500).json({
      error: 'export_failed',
      message: error.message
    })
  }
})

/**
 * GET /api/investigations/cases/:caseId/export/pdf
 * Export evidence as PDF
 */
router.get('/cases/:caseId/export/pdf', requireAuth, requireInvestigator, async (req, res) => {
  try {
    const { caseId } = req.params
    const context = req.platformContext
    
    const pdfBuffer = await investigationService.exportPDF(caseId, context)
    
    logger.info('Investigation: Evidence exported as PDF', {
      caseId,
      userId: context.userId
    })
    
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="evidence-${caseId}.pdf"`)
    return res.send(pdfBuffer)
  } catch (error) {
    logger.error('Investigation: PDF export failed', { error: error.message, caseId: req.params.caseId })
    
    if (error.message === 'Case not found') {
      return res.status(404).json({
        error: 'not_found',
        message: error.message
      })
    }
    
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({
        error: 'forbidden',
        message: error.message
      })
    }
    
    return res.status(500).json({
      error: 'export_failed',
      message: error.message
    })
  }
})

// ════════════════════════════════════════════════════════════════════════════
// Statistics
// ════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/investigations/stats
 * Get investigation statistics
 */
router.get('/stats', requireAuth, requireInvestigator, async (req, res) => {
  try {
    const stats = investigationService.getStats()
    
    return res.json({
      success: true,
      stats
    })
  } catch (error) {
    logger.error('Investigation: Stats fetch failed', { error: error.message })
    return res.status(500).json({
      error: 'fetch_failed',
      message: error.message
    })
  }
})

module.exports = router

// Made with Bob