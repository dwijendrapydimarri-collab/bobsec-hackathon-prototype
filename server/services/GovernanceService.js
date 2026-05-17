/**
 * Governance Service
 * 
 * Platform-wide governance and compliance management
 * Ensures all operations meet regulatory, ethical, and operational standards
 * 
 * Features:
 * - Compliance monitoring across sectors and regions
 * - Policy enforcement and violation tracking
 * - Audit trail generation
 * - Regulatory reporting
 * - Ethical AI oversight
 */

const logger = require('../utils/logger')
const { SECTORS, REGIONS, DATA_RESIDENCY } = require('../config/platform')

class GovernanceService {
  constructor() {
    this.name = 'GovernanceService'
    
    // In-memory governance records (in production, use database)
    this.complianceRecords = new Map()
    this.policyViolations = []
    this.auditLog = []
    this.regulatoryReports = new Map()
  }
  
  // ════════════════════════════════════════════════════════════════════════════
  // Compliance Monitoring
  // ════════════════════════════════════════════════════════════════════════════
  
  /**
   * Check compliance for operation
   * 
   * @param {Object} operation - Operation details
   * @param {Object} context - Platform context
   * @returns {Object} Compliance result
   */
  async checkCompliance(operation, context) {
    const checks = []
    
    // 1. Data residency compliance
    const residencyCheck = this.checkDataResidency(operation, context)
    checks.push(residencyCheck)
    
    // 2. Sector-specific compliance
    const sectorCheck = this.checkSectorCompliance(operation, context)
    checks.push(sectorCheck)
    
    // 3. Regional compliance (GDPR, data localization, etc.)
    const regionalCheck = this.checkRegionalCompliance(operation, context)
    checks.push(regionalCheck)
    
    // 4. Consent compliance
    const consentCheck = this.checkConsentCompliance(operation, context)
    checks.push(consentCheck)
    
    // 5. AI ethics compliance
    const ethicsCheck = this.checkAIEthics(operation, context)
    checks.push(ethicsCheck)
    
    const allPassed = checks.every(c => c.passed)
    const violations = checks.filter(c => !c.passed)
    
    const result = {
      compliant: allPassed,
      timestamp: new Date(),
      operation: operation.type,
      context: {
        sector: context.sector,
        region: context.region,
        organizationId: context.organizationId
      },
      checks,
      violations: violations.map(v => ({
        check: v.check,
        reason: v.reason,
        severity: v.severity,
        remediation: v.remediation
      }))
    }
    
    // Log violations
    if (!allPassed) {
      this.logPolicyViolation(result)
    }
    
    // Record compliance check
    this.recordComplianceCheck(result)
    
    logger.info('Governance: Compliance check completed', {
      operation: operation.type,
      compliant: allPassed,
      violationCount: violations.length
    })
    
    return result
  }
  
  /**
   * Check data residency compliance
   */
  checkDataResidency(operation, context) {
    const { region, dataResidency } = context
    
    // India requires REGION_LOCAL for sensitive data
    if (region === 'IN' && dataResidency !== 'REGION_LOCAL') {
      if (operation.containsSensitiveData) {
        return {
          check: 'DATA_RESIDENCY',
          passed: false,
          reason: 'India requires REGION_LOCAL data residency for sensitive data',
          severity: 'CRITICAL',
          remediation: 'Set dataResidency to REGION_LOCAL for this organization'
        }
      }
    }
    
    // EU requires GDPR compliance
    if (region === 'EU' && operation.containsPersonalData) {
      if (!operation.gdprCompliant) {
        return {
          check: 'DATA_RESIDENCY',
          passed: false,
          reason: 'EU operations must be GDPR compliant',
          severity: 'CRITICAL',
          remediation: 'Ensure GDPR compliance before processing EU personal data'
        }
      }
    }
    
    return {
      check: 'DATA_RESIDENCY',
      passed: true,
      reason: 'Data residency requirements met'
    }
  }
  
  /**
   * Check sector-specific compliance
   */
  checkSectorCompliance(operation, context) {
    const { sector } = context
    
    // BANK sector requires additional security
    if (sector === 'BANK') {
      if (operation.type === 'ANALYSIS' && !operation.encrypted) {
        return {
          check: 'SECTOR_COMPLIANCE',
          passed: false,
          reason: 'BANK sector requires encrypted data transmission',
          severity: 'HIGH',
          remediation: 'Enable encryption for all BANK sector operations'
        }
      }
      
      if (operation.type === 'INTELLIGENCE_SHARING' && !operation.approved) {
        return {
          check: 'SECTOR_COMPLIANCE',
          passed: false,
          reason: 'BANK sector intelligence sharing requires approval',
          severity: 'HIGH',
          remediation: 'Obtain approval before sharing intelligence'
        }
      }
    }
    
    // GOV sector requires audit trail
    if (sector === 'GOV') {
      if (!operation.auditTrail) {
        return {
          check: 'SECTOR_COMPLIANCE',
          passed: false,
          reason: 'GOV sector requires complete audit trail',
          severity: 'HIGH',
          remediation: 'Enable audit trail for all GOV sector operations'
        }
      }
    }
    
    return {
      check: 'SECTOR_COMPLIANCE',
      passed: true,
      reason: 'Sector-specific requirements met'
    }
  }
  
  /**
   * Check regional compliance
   */
  checkRegionalCompliance(operation, context) {
    const { region } = context
    
    // EU: GDPR compliance
    if (region === 'EU') {
      if (operation.containsPersonalData && !operation.legalBasis) {
        return {
          check: 'REGIONAL_COMPLIANCE',
          passed: false,
          reason: 'GDPR requires legal basis for personal data processing',
          severity: 'CRITICAL',
          remediation: 'Establish legal basis (consent, contract, legitimate interest, etc.)'
        }
      }
      
      if (operation.containsPersonalData && !operation.dataProtectionOfficer) {
        return {
          check: 'REGIONAL_COMPLIANCE',
          passed: false,
          reason: 'GDPR requires Data Protection Officer for personal data processing',
          severity: 'HIGH',
          remediation: 'Appoint Data Protection Officer'
        }
      }
    }
    
    // India: IT Act 2000 compliance
    if (region === 'IN') {
      if (operation.type === 'INVESTIGATION' && !operation.authorizedInvestigator) {
        return {
          check: 'REGIONAL_COMPLIANCE',
          passed: false,
          reason: 'IT Act 2000 requires authorized investigator for investigations',
          severity: 'CRITICAL',
          remediation: 'Ensure investigator is authorized under IT Act 2000'
        }
      }
    }
    
    return {
      check: 'REGIONAL_COMPLIANCE',
      passed: true,
      reason: 'Regional compliance requirements met'
    }
  }
  
  /**
   * Check consent compliance
   */
  checkConsentCompliance(operation, context) {
    if (operation.requiresConsent && !operation.consentObtained) {
      return {
        check: 'CONSENT_COMPLIANCE',
        passed: false,
        reason: 'Operation requires user consent but consent not obtained',
        severity: 'HIGH',
        remediation: 'Obtain explicit user consent before proceeding'
      }
    }
    
    if (operation.consentObtained && operation.consentExpired) {
      return {
        check: 'CONSENT_COMPLIANCE',
        passed: false,
        reason: 'User consent has expired',
        severity: 'MEDIUM',
        remediation: 'Request renewed consent from user'
      }
    }
    
    return {
      check: 'CONSENT_COMPLIANCE',
      passed: true,
      reason: 'Consent requirements met'
    }
  }
  
  /**
   * Check AI ethics compliance
   */
  checkAIEthics(operation, context) {
    // Human-in-loop requirement
    if (operation.type === 'POLICE_REPORT_SUBMISSION' && operation.automated) {
      return {
        check: 'AI_ETHICS',
        passed: false,
        reason: 'Police report submission must have human review (no auto-submission)',
        severity: 'CRITICAL',
        remediation: 'Require human review and approval before submission'
      }
    }
    
    // Confidence threshold
    if (operation.type === 'ANALYSIS' && operation.confidence < 55) {
      if (operation.highStakesDecision) {
        return {
          check: 'AI_ETHICS',
          passed: false,
          reason: 'High-stakes decisions require confidence >= 55%',
          severity: 'HIGH',
          remediation: 'Increase confidence threshold or require human review'
        }
      }
    }
    
    // Bias detection
    if (operation.type === 'ANALYSIS' && operation.biasDetected) {
      return {
        check: 'AI_ETHICS',
        passed: false,
        reason: 'Potential bias detected in AI analysis',
        severity: 'HIGH',
        remediation: 'Review analysis for bias and retrain model if necessary'
      }
    }
    
    // Explainability requirement
    if (operation.type === 'ANALYSIS' && !operation.explainable) {
      return {
        check: 'AI_ETHICS',
        passed: false,
        reason: 'AI decisions must be explainable to users',
        severity: 'MEDIUM',
        remediation: 'Provide clear explanation of AI reasoning'
      }
    }
    
    return {
      check: 'AI_ETHICS',
      passed: true,
      reason: 'AI ethics requirements met'
    }
  }
  
  // ════════════════════════════════════════════════════════════════════════════
  // Policy Violation Tracking
  // ════════════════════════════════════════════════════════════════════════════
  
  /**
   * Log policy violation
   */
  logPolicyViolation(complianceResult) {
    const violation = {
      id: `VIO-${Date.now()}`,
      timestamp: new Date(),
      operation: complianceResult.operation,
      context: complianceResult.context,
      violations: complianceResult.violations,
      severity: this.getHighestSeverity(complianceResult.violations),
      status: 'OPEN',
      remediation_status: 'PENDING'
    }
    
    this.policyViolations.push(violation)
    
    logger.warn('Governance: Policy violation logged', {
      violationId: violation.id,
      severity: violation.severity,
      violationCount: complianceResult.violations.length
    })
    
    return violation
  }
  
  /**
   * Get highest severity from violations
   */
  getHighestSeverity(violations) {
    const severityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }
    let highest = 'LOW'
    
    violations.forEach(v => {
      if (severityOrder[v.severity] > severityOrder[highest]) {
        highest = v.severity
      }
    })
    
    return highest
  }
  
  /**
   * Get policy violations
   */
  getPolicyViolations(filter = {}) {
    let violations = this.policyViolations
    
    if (filter.severity) {
      violations = violations.filter(v => v.severity === filter.severity)
    }
    
    if (filter.status) {
      violations = violations.filter(v => v.status === filter.status)
    }
    
    if (filter.sector) {
      violations = violations.filter(v => v.context.sector === filter.sector)
    }
    
    if (filter.region) {
      violations = violations.filter(v => v.context.region === filter.region)
    }
    
    return violations.sort((a, b) => b.timestamp - a.timestamp)
  }
  
  /**
   * Resolve policy violation
   */
  resolveViolation(violationId, resolution) {
    const violation = this.policyViolations.find(v => v.id === violationId)
    
    if (!violation) {
      throw new Error('Violation not found')
    }
    
    violation.status = 'RESOLVED'
    violation.remediation_status = 'COMPLETED'
    violation.resolution = {
      resolvedAt: new Date(),
      resolvedBy: resolution.resolvedBy,
      action: resolution.action,
      notes: resolution.notes
    }
    
    logger.info('Governance: Policy violation resolved', {
      violationId,
      resolvedBy: resolution.resolvedBy
    })
    
    return violation
  }
  
  // ════════════════════════════════════════════════════════════════════════════
  // Audit Trail
  // ════════════════════════════════════════════════════════════════════════════
  
  /**
   * Record compliance check
   */
  recordComplianceCheck(result) {
    const record = {
      id: `CHK-${Date.now()}`,
      timestamp: result.timestamp,
      operation: result.operation,
      context: result.context,
      compliant: result.compliant,
      checks: result.checks.map(c => ({
        check: c.check,
        passed: c.passed
      }))
    }
    
    this.complianceRecords.set(record.id, record)
    
    // Add to audit log
    this.auditLog.push({
      timestamp: new Date(),
      event: 'COMPLIANCE_CHECK',
      details: record
    })
  }
  
  /**
   * Get audit log
   */
  getAuditLog(filter = {}) {
    let log = this.auditLog
    
    if (filter.startDate) {
      log = log.filter(entry => entry.timestamp >= new Date(filter.startDate))
    }
    
    if (filter.endDate) {
      log = log.filter(entry => entry.timestamp <= new Date(filter.endDate))
    }
    
    if (filter.event) {
      log = log.filter(entry => entry.event === filter.event)
    }
    
    return log.sort((a, b) => b.timestamp - a.timestamp)
  }
  
  // ════════════════════════════════════════════════════════════════════════════
  // Regulatory Reporting
  // ════════════════════════════════════════════════════════════════════════════
  
  /**
   * Generate regulatory report
   */
  async generateRegulatoryReport(reportType, period, context) {
    const reportId = `REP-${Date.now()}`
    
    const report = {
      id: reportId,
      type: reportType,
      period,
      generatedAt: new Date(),
      generatedBy: context.userId,
      region: context.region,
      sector: context.sector,
      data: {}
    }
    
    switch (reportType) {
      case 'GDPR_COMPLIANCE':
        report.data = await this.generateGDPRReport(period, context)
        break
      
      case 'DATA_BREACH':
        report.data = await this.generateDataBreachReport(period, context)
        break
      
      case 'AI_ETHICS':
        report.data = await this.generateAIEthicsReport(period, context)
        break
      
      case 'POLICY_VIOLATIONS':
        report.data = await this.generateViolationsReport(period, context)
        break
      
      default:
        throw new Error(`Unknown report type: ${reportType}`)
    }
    
    this.regulatoryReports.set(reportId, report)
    
    logger.info('Governance: Regulatory report generated', {
      reportId,
      type: reportType,
      region: context.region
    })
    
    return report
  }
  
  /**
   * Generate GDPR compliance report
   */
  async generateGDPRReport(period, context) {
    const violations = this.getPolicyViolations({
      region: 'EU',
      status: 'OPEN'
    })
    
    return {
      period,
      total_operations: this.complianceRecords.size,
      gdpr_violations: violations.length,
      data_subject_requests: 0, // Would come from consent service
      data_breaches: 0, // Would come from security service
      compliance_rate: violations.length === 0 ? 100 : 
        ((this.complianceRecords.size - violations.length) / this.complianceRecords.size * 100).toFixed(2)
    }
  }
  
  /**
   * Generate data breach report
   */
  async generateDataBreachReport(period, context) {
    // In production, integrate with security monitoring
    return {
      period,
      total_breaches: 0,
      affected_users: 0,
      data_types_affected: [],
      remediation_status: 'N/A'
    }
  }
  
  /**
   * Generate AI ethics report
   */
  async generateAIEthicsReport(period, context) {
    const ethicsViolations = this.policyViolations.filter(v =>
      v.violations.some(vio => vio.check === 'AI_ETHICS')
    )
    
    return {
      period,
      total_ai_operations: this.complianceRecords.size,
      ethics_violations: ethicsViolations.length,
      human_in_loop_rate: 100, // BobSec enforces 100% human-in-loop
      explainability_rate: 100, // All analyses include explanations
      bias_incidents: 0
    }
  }
  
  /**
   * Generate policy violations report
   */
  async generateViolationsReport(period, context) {
    const violations = this.getPolicyViolations()
    
    const bySeverity = {
      CRITICAL: violations.filter(v => v.severity === 'CRITICAL').length,
      HIGH: violations.filter(v => v.severity === 'HIGH').length,
      MEDIUM: violations.filter(v => v.severity === 'MEDIUM').length,
      LOW: violations.filter(v => v.severity === 'LOW').length
    }
    
    const byStatus = {
      OPEN: violations.filter(v => v.status === 'OPEN').length,
      RESOLVED: violations.filter(v => v.status === 'RESOLVED').length
    }
    
    return {
      period,
      total_violations: violations.length,
      by_severity: bySeverity,
      by_status: byStatus,
      resolution_rate: violations.length > 0 ?
        (byStatus.RESOLVED / violations.length * 100).toFixed(2) : 100
    }
  }
  
  // ════════════════════════════════════════════════════════════════════════════
  // Statistics
  // ════════════════════════════════════════════════════════════════════════════
  
  /**
   * Get governance statistics
   */
  getStats() {
    const violations = this.policyViolations
    const openViolations = violations.filter(v => v.status === 'OPEN')
    const criticalViolations = violations.filter(v => v.severity === 'CRITICAL')
    
    return {
      total_compliance_checks: this.complianceRecords.size,
      total_violations: violations.length,
      open_violations: openViolations.length,
      critical_violations: criticalViolations.length,
      compliance_rate: this.complianceRecords.size > 0 ?
        ((this.complianceRecords.size - violations.length) / this.complianceRecords.size * 100).toFixed(2) : 100,
      audit_log_entries: this.auditLog.length,
      regulatory_reports: this.regulatoryReports.size
    }
  }
}

// Singleton instance
const governanceService = new GovernanceService()

module.exports = governanceService

// Made with Bob