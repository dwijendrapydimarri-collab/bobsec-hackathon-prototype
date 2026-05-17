/**
 * Governance Routes
 * 
 * API endpoints for platform governance and compliance
 * Restricted to ADMIN and COMPLIANCE_OFFICER roles
 * 
 * Features:
 * - Compliance monitoring
 * - Policy violation tracking
 * - Audit log access
 * - Regulatory reporting
 * - Ecosystem health monitoring
 */

const express = require('express')
const router = express.Router()
const { requireAuth } = require('../middleware/auth')
const governanceService = require('../services/GovernanceService')
const ecosystemHealthMonitor = require('../services/EcosystemHealthMonitor')
const logger = require('../utils/logger')

// ════════════════════════════════════════════════════════════════════════════
// Middleware: Require ADMIN or COMPLIANCE_OFFICER role
// ════════════════════════════════════════════════════════════════════════════

function requireGovernanceAccess(req, res, next) {
  const { role } = req.auth
  
  if (role === 'ADMIN' || role === 'COMPLIANCE_OFFICER') {
    return next()
  }
  
  return res.status(403).json({
    error: 'forbidden',
    message: 'Governance endpoints require ADMIN or COMPLIANCE_OFFICER role'
  })
}

// ════════════════════════════════════════════════════════════════════════════
// Compliance Monitoring
// ════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/governance/compliance/check
 * Check compliance for operation
 */
router.post('/compliance/check', requireAuth, requireGovernanceAccess, async (req, res) => {
  try {
    const { operation } = req.body
    const context = req.platformContext
    
    if (!operation) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'operation is required'
      })
    }
    
    const result = await governanceService.checkCompliance(operation, context)
    
    return res.json({
      success: true,
      compliance: result
    })
  } catch (error) {
    logger.error('Governance: Compliance check failed', { error: error.message })
    return res.status(500).json({
      error: 'check_failed',
      message: error.message
    })
  }
})

/**
 * GET /api/governance/compliance/stats
 * Get compliance statistics
 */
router.get('/compliance/stats', requireAuth, requireGovernanceAccess, async (req, res) => {
  try {
    const stats = governanceService.getStats()
    
    return res.json({
      success: true,
      stats
    })
  } catch (error) {
    logger.error('Governance: Stats fetch failed', { error: error.message })
    return res.status(500).json({
      error: 'fetch_failed',
      message: error.message
    })
  }
})

// ════════════════════════════════════════════════════════════════════════════
// Policy Violations
// ════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/governance/violations
 * Get policy violations
 */
router.get('/violations', requireAuth, requireGovernanceAccess, async (req, res) => {
  try {
    const { severity, status, sector, region } = req.query
    
    const filter = {
      severity,
      status,
      sector,
      region
    }
    
    const violations = governanceService.getPolicyViolations(filter)
    
    return res.json({
      success: true,
      total: violations.length,
      violations
    })
  } catch (error) {
    logger.error('Governance: Violations fetch failed', { error: error.message })
    return res.status(500).json({
      error: 'fetch_failed',
      message: error.message
    })
  }
})

/**
 * POST /api/governance/violations/:violationId/resolve
 * Resolve policy violation
 */
router.post('/violations/:violationId/resolve', requireAuth, requireGovernanceAccess, async (req, res) => {
  try {
    const { violationId } = req.params
    const { action, notes } = req.body
    const { userId } = req.auth
    
    if (!action) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'action is required'
      })
    }
    
    const resolution = {
      resolvedBy: userId,
      action,
      notes: notes || ''
    }
    
    const violation = governanceService.resolveViolation(violationId, resolution)
    
    logger.info('Governance: Violation resolved', {
      violationId,
      resolvedBy: userId
    })
    
    return res.json({
      success: true,
      violation
    })
  } catch (error) {
    logger.error('Governance: Violation resolution failed', { error: error.message, violationId: req.params.violationId })
    
    if (error.message === 'Violation not found') {
      return res.status(404).json({
        error: 'not_found',
        message: error.message
      })
    }
    
    return res.status(500).json({
      error: 'resolution_failed',
      message: error.message
    })
  }
})

// ════════════════════════════════════════════════════════════════════════════
// Audit Log
// ════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/governance/audit
 * Get audit log
 */
router.get('/audit', requireAuth, requireGovernanceAccess, async (req, res) => {
  try {
    const { startDate, endDate, event } = req.query
    
    const filter = {
      startDate,
      endDate,
      event
    }
    
    const auditLog = governanceService.getAuditLog(filter)
    
    return res.json({
      success: true,
      total: auditLog.length,
      audit_log: auditLog
    })
  } catch (error) {
    logger.error('Governance: Audit log fetch failed', { error: error.message })
    return res.status(500).json({
      error: 'fetch_failed',
      message: error.message
    })
  }
})

// ════════════════════════════════════════════════════════════════════════════
// Regulatory Reporting
// ════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/governance/reports
 * Generate regulatory report
 */
router.post('/reports', requireAuth, requireGovernanceAccess, async (req, res) => {
  try {
    const { reportType, period } = req.body
    const context = req.platformContext
    
    if (!reportType || !period) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'reportType and period are required'
      })
    }
    
    const validReportTypes = ['GDPR_COMPLIANCE', 'DATA_BREACH', 'AI_ETHICS', 'POLICY_VIOLATIONS']
    if (!validReportTypes.includes(reportType)) {
      return res.status(400).json({
        error: 'validation_error',
        message: `reportType must be one of: ${validReportTypes.join(', ')}`
      })
    }
    
    const report = await governanceService.generateRegulatoryReport(reportType, period, context)
    
    logger.info('Governance: Regulatory report generated', {
      reportId: report.id,
      type: reportType,
      userId: context.userId
    })
    
    return res.json({
      success: true,
      report
    })
  } catch (error) {
    logger.error('Governance: Report generation failed', { error: error.message })
    return res.status(500).json({
      error: 'generation_failed',
      message: error.message
    })
  }
})

// ════════════════════════════════════════════════════════════════════════════
// Ecosystem Health
// ════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/governance/health
 * Get overall ecosystem health
 */
router.get('/health', requireAuth, requireGovernanceAccess, async (req, res) => {
  try {
    const health = ecosystemHealthMonitor.getHealth()
    
    return res.json({
      success: true,
      health
    })
  } catch (error) {
    logger.error('Governance: Health check failed', { error: error.message })
    return res.status(500).json({
      error: 'check_failed',
      message: error.message
    })
  }
})

/**
 * GET /api/governance/health/sector/:sector
 * Get sector health
 */
router.get('/health/sector/:sector', requireAuth, requireGovernanceAccess, async (req, res) => {
  try {
    const { sector } = req.params
    const health = ecosystemHealthMonitor.getSectorHealth(sector)
    
    return res.json({
      success: true,
      health
    })
  } catch (error) {
    logger.error('Governance: Sector health check failed', { error: error.message })
    return res.status(500).json({
      error: 'check_failed',
      message: error.message
    })
  }
})

/**
 * GET /api/governance/health/region/:region
 * Get region health
 */
router.get('/health/region/:region', requireAuth, requireGovernanceAccess, async (req, res) => {
  try {
    const { region } = req.params
    const health = ecosystemHealthMonitor.getRegionHealth(region)
    
    return res.json({
      success: true,
      health
    })
  } catch (error) {
    logger.error('Governance: Region health check failed', { error: error.message })
    return res.status(500).json({
      error: 'check_failed',
      message: error.message
    })
  }
})

/**
 * GET /api/governance/health/organization/:organizationId
 * Get organization health
 */
router.get('/health/organization/:organizationId', requireAuth, requireGovernanceAccess, async (req, res) => {
  try {
    const { organizationId } = req.params
    const health = ecosystemHealthMonitor.getOrganizationHealth(organizationId)
    
    return res.json({
      success: true,
      health
    })
  } catch (error) {
    logger.error('Governance: Organization health check failed', { error: error.message })
    return res.status(500).json({
      error: 'check_failed',
      message: error.message
    })
  }
})

/**
 * GET /api/governance/anomalies
 * Get detected anomalies
 */
router.get('/anomalies', requireAuth, requireGovernanceAccess, async (req, res) => {
  try {
    const { severity, type, sector, region, limit } = req.query
    
    const filter = {
      severity,
      type,
      sector,
      region,
      limit: limit ? parseInt(limit) : undefined
    }
    
    const anomalies = ecosystemHealthMonitor.getAnomalies(filter)
    
    return res.json({
      success: true,
      total: anomalies.length,
      anomalies
    })
  } catch (error) {
    logger.error('Governance: Anomalies fetch failed', { error: error.message })
    return res.status(500).json({
      error: 'fetch_failed',
      message: error.message
    })
  }
})

/**
 * GET /api/governance/capacity
 * Get capacity metrics
 */
router.get('/capacity', requireAuth, requireGovernanceAccess, async (req, res) => {
  try {
    const capacity = ecosystemHealthMonitor.getCapacityMetrics()
    
    return res.json({
      success: true,
      capacity
    })
  } catch (error) {
    logger.error('Governance: Capacity metrics fetch failed', { error: error.message })
    return res.status(500).json({
      error: 'fetch_failed',
      message: error.message
    })
  }
})

/**
 * GET /api/governance/ecosystem
 * Get comprehensive ecosystem report
 */
router.get('/ecosystem', requireAuth, requireGovernanceAccess, async (req, res) => {
  try {
    const report = ecosystemHealthMonitor.getEcosystemReport()
    
    return res.json({
      success: true,
      report
    })
  } catch (error) {
    logger.error('Governance: Ecosystem report fetch failed', { error: error.message })
    return res.status(500).json({
      error: 'fetch_failed',
      message: error.message
    })
  }
})

module.exports = router

// Made with Bob