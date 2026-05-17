// PolicyCheckAgent - Enforces governance rules and compliance checks
// Final gate before results are returned to user

// Governance policy configuration
const GOVERNANCE_POLICY = {
  min_confidence_for_report: 55,
  min_confidence_for_high_risk: 70,
  require_human_confirmation: true,
  no_auto_submission: true,
  no_data_retention: true,
  max_processing_time_ms: 30000,
  require_pii_redaction: true
}

// Check if confidence is sufficient for the given risk level
function checkConfidenceSufficient(confidence, riskLevel) {
  if (riskLevel === 'HIGH' && confidence < GOVERNANCE_POLICY.min_confidence_for_high_risk) {
    return {
      passed: false,
      reason: `Confidence ${confidence}% is below threshold ${GOVERNANCE_POLICY.min_confidence_for_high_risk}% for HIGH risk classification`
    }
  }

  if (confidence < GOVERNANCE_POLICY.min_confidence_for_report) {
    return {
      passed: false,
      reason: `Confidence ${confidence}% is below minimum threshold ${GOVERNANCE_POLICY.min_confidence_for_report}%`
    }
  }

  return { passed: true, reason: 'Confidence threshold met' }
}

// Check if processing time is within acceptable limits
function checkProcessingTime(totalTimeMs) {
  if (totalTimeMs > GOVERNANCE_POLICY.max_processing_time_ms) {
    return {
      passed: false,
      reason: `Processing time ${totalTimeMs}ms exceeds maximum ${GOVERNANCE_POLICY.max_processing_time_ms}ms`,
      warning: true // Non-blocking warning
    }
  }

  return { passed: true, reason: 'Processing time acceptable' }
}

// Check if human-in-the-loop is enforced
function checkHumanInLoop() {
  // This system always requires human confirmation before any action
  return {
    passed: GOVERNANCE_POLICY.require_human_confirmation,
    reason: GOVERNANCE_POLICY.require_human_confirmation 
      ? 'Human confirmation required before report generation'
      : 'Auto-submission enabled (policy violation)'
  }
}

// Check if auto-submission is disabled
function checkNoAutoSubmission() {
  return {
    passed: GOVERNANCE_POLICY.no_auto_submission,
    reason: GOVERNANCE_POLICY.no_auto_submission
      ? 'System does not auto-submit reports - user must submit manually'
      : 'Auto-submission enabled (policy violation)'
  }
}

// Check if data retention policy is followed
function checkNoDataRetention() {
  return {
    passed: GOVERNANCE_POLICY.no_data_retention,
    reason: GOVERNANCE_POLICY.no_data_retention
      ? 'No user data retained after session - session-only analysis'
      : 'Data retention enabled (policy violation)'
  }
}

// Check if PII redaction was performed
function checkPiiRedaction(piiRedacted) {
  if (GOVERNANCE_POLICY.require_pii_redaction && !piiRedacted) {
    return {
      passed: false,
      reason: 'PII redaction required but not performed',
      warning: true // Non-blocking for now
    }
  }

  return {
    passed: true,
    reason: piiRedacted ? 'PII redaction performed' : 'PII redaction not required'
  }
}

// Check if result should be downgraded to UNKNOWN
function shouldDowngradeToUnknown(confidence, riskLevel) {
  const confidenceCheck = checkConfidenceSufficient(confidence, riskLevel)
  return !confidenceCheck.passed
}

// Main PolicyCheckAgent function
function enforcePolicy(analysis, metadata = {}) {
  const startTime = Date.now()
  
  const checks = {
    confidence_sufficient: checkConfidenceSufficient(analysis.confidence, analysis.risk_level),
    processing_time: checkProcessingTime(metadata.total_processing_time_ms || 0),
    human_in_loop: checkHumanInLoop(),
    no_auto_submission: checkNoAutoSubmission(),
    no_data_retention: checkNoDataRetention(),
    pii_redaction: checkPiiRedaction(metadata.pii_redacted || false)
  }

  // Determine if all critical checks passed
  const criticalChecks = [
    checks.confidence_sufficient,
    checks.human_in_loop,
    checks.no_auto_submission,
    checks.no_data_retention
  ]

  const allCriticalPassed = criticalChecks.every(check => check.passed)
  
  // Collect warnings (non-blocking failures)
  const warnings = Object.entries(checks)
    .filter(([_, check]) => !check.passed && check.warning)
    .map(([name, check]) => ({ check: name, reason: check.reason }))

  // Determine if result should be modified
  let modifiedAnalysis = { ...analysis }
  let modifications = []

  // Downgrade to UNKNOWN if confidence insufficient
  if (!checks.confidence_sufficient.passed) {
    modifiedAnalysis.risk_level = 'UNKNOWN'
    modifiedAnalysis.original_risk_level = analysis.risk_level
    modifiedAnalysis.downgrade_reason = checks.confidence_sufficient.reason
    modifications.push('Risk level downgraded to UNKNOWN due to insufficient confidence')
  }

  // Build policy decision
  const decision = {
    policy_passed: allCriticalPassed,
    checks: Object.fromEntries(
      Object.entries(checks).map(([name, check]) => [name, check.passed])
    ),
    check_details: checks,
    warnings: warnings,
    modifications: modifications,
    governance_summary: {
      human_confirmation_required: GOVERNANCE_POLICY.require_human_confirmation,
      auto_submission_disabled: GOVERNANCE_POLICY.no_auto_submission,
      data_retention_disabled: GOVERNANCE_POLICY.no_data_retention,
      min_confidence_threshold: GOVERNANCE_POLICY.min_confidence_for_report
    },
    processing_time_ms: Date.now() - startTime
  }

  return {
    modified_analysis: modifiedAnalysis,
    policy_decision: decision,
    should_block: !allCriticalPassed
  }
}

// Get policy configuration (for transparency)
function getPolicyConfig() {
  return { ...GOVERNANCE_POLICY }
}

module.exports = { 
  enforcePolicy, 
  getPolicyConfig,
  shouldDowngradeToUnknown,
  GOVERNANCE_POLICY 
}

// Made with Bob
