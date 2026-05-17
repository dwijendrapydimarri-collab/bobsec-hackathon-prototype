// Bob Orchestrator - Main coordination pipeline for BobSec
// This is where IBM Bob truly shines - orchestrating specialized agents

const { sanitizeInput } = require('../agents/promptFirewall')
const { analyzeMessage } = require('../agents/scamAgent')
const { enrichEntities } = require('../agents/intelAgent')
const { explainThreat } = require('../agents/explainerAgent')
const { generateReport } = require('../agents/reportDraftAgent')
const { enforcePolicy } = require('../agents/policyCheckAgent')

// Helper to generate analysis ID
function generateAnalysisId() {
  const now = new Date()
  const year = now.getFullYear()
  const secSinceMidnight = Math.floor(
    (now - new Date(year, now.getMonth(), now.getDate())) / 1000
  )
  return `BSC-${year}-${String(secSinceMidnight).padStart(6, '0')}`
}

// Helper to get IST timestamp
function getISTTimestamp() {
  const now = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} at ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())} IST`
}

// Detect if user is distressed (already victim)
function detectDistress(input) {
  const triggers = [
    'already clicked', 'already paid', 'gave my otp', 'i am scared',
    'what do i do', 'already transferred', 'entered my password',
    'shared my details', 'sent money', 'पहले ही क्लिक', 'डर लग रहा',
    'पैसे भेज दिए', 'otp दे दिया'
  ]
  const lower = input.toLowerCase()
  return triggers.some(t => lower.includes(t))
}

// Main orchestration pipeline
async function orchestrate(userInput, options = {}) {
  const pipelineStart = Date.now()
  const trace = []
  const analysisId = generateAnalysisId()
  const timestamp = getISTTimestamp()

  const {
    mode = 'pre_incident',
    victim_narrative = null,
    lang = 'en'
  } = options

  try {
    // ═══════════════════════════════════════════════════════════════════
    // STEP 1: PromptFirewall - Security & PII Redaction
    // ═══════════════════════════════════════════════════════════════════
    const firewallStart = Date.now()
    const firewallResult = sanitizeInput(userInput, {
      redact_pii: true,
      detect_jailbreak: true,
      detect_injection: true,
      block_on_jailbreak: false
    })

    trace.push({
      step: 1,
      agent: 'PromptFirewall',
      model: 'Security Layer',
      action: 'PII redaction + jailbreak detection',
      result: `${firewallResult.security_report.pii_redacted ? 'PII redacted' : 'No PII'} · ${firewallResult.security_report.jailbreak_detected ? 'Jailbreak detected' : 'Clean'} · PASS`,
      time_ms: Date.now() - firewallStart,
      policy_passed: !firewallResult.should_block,
      details: firewallResult.security_report
    })

    // Block if firewall detected critical issues
    if (firewallResult.should_block) {
      return {
        analysis_id: analysisId,
        timestamp_ist: timestamp,
        blocked: true,
        block_reason: firewallResult.security_report.block_reason,
        trace
      }
    }

    // Use sanitized input for analysis
    const inputForAnalysis = firewallResult.sanitized_input

    // ═══════════════════════════════════════════════════════════════════
    // STEP 2: ScamAgent - Entity extraction + Rule matching + Bob classification
    // ═══════════════════════════════════════════════════════════════════
    const scamStart = Date.now()
    const scamResult = await analyzeMessage(inputForAnalysis)

    trace.push({
      step: 2,
      agent: 'ScamAgent',
      model: 'IBM Granite via watsonx.ai',
      action: 'Extract entities → Match rules → Classify with Bob',
      result: `${scamResult.category} · Score ${scamResult.risk_score} · ${scamResult.matched_rules.length} rules matched · PASS`,
      time_ms: scamResult.processing_time_ms,
      policy_passed: true,
      details: {
        matched_rules: scamResult.matched_rules,
        top_rule: scamResult.top_rule,
        fallback_used: scamResult.fallback_used
      }
    })

    // ═══════════════════════════════════════════════════════════════════
    // STEP 3: IntelAgent - Threat intelligence enrichment
    // ═══════════════════════════════════════════════════════════════════
    const intelStart = Date.now()
    const intelResult = await enrichEntities(scamResult.entities)

    trace.push({
      step: 3,
      agent: 'IntelAgent',
      model: 'Threat Intelligence APIs',
      action: 'Enrich entities with reputation scoring',
      result: `Threat score: ${intelResult.threat_intel_summary.overall_threat_score}/100 · ${intelResult.threat_intel_summary.high_threat_entities.length} high-threat entities · PASS`,
      time_ms: intelResult.processing_time_ms,
      policy_passed: true,
      details: intelResult.threat_intel_summary
    })

    // ═══════════════════════════════════════════════════════════════════
    // STEP 4: ExplainerAgent - Generate bilingual explanations
    // ═══════════════════════════════════════════════════════════════════
    const explainerStart = Date.now()
    const explainerResult = await explainThreat(
      scamResult,
      intelResult.enriched_entities,
      scamResult.matched_rules
    )

    trace.push({
      step: 4,
      agent: 'ExplainerAgent',
      model: 'IBM Granite · Multilingual',
      action: 'Generate EN + HI explanations with parent mode',
      result: `Explanations generated · ${explainerResult.red_flags.length} red flags · PASS`,
      time_ms: explainerResult.processing_time_ms,
      policy_passed: true,
      details: {
        fallback_used: explainerResult.fallback_used
      }
    })

    // ═══════════════════════════════════════════════════════════════════
    // STEP 5: PolicyCheckAgent - Governance enforcement
    // ═══════════════════════════════════════════════════════════════════
    const policyStart = Date.now()
    const totalProcessingTime = Date.now() - pipelineStart

    const policyResult = enforcePolicy(
      {
        ...scamResult,
        red_flags: explainerResult.red_flags
      },
      {
        total_processing_time_ms: totalProcessingTime,
        pii_redacted: firewallResult.security_report.pii_redacted
      }
    )

    trace.push({
      step: 5,
      agent: 'PolicyCheckAgent',
      model: 'Governance Layer',
      action: 'Validate confidence, data privacy, human-in-loop rules',
      result: policyResult.policy_decision.policy_passed 
        ? '✓ All governance checks passed' 
        : `⚠ ${policyResult.policy_decision.modifications.length} modifications applied`,
      time_ms: policyResult.policy_decision.processing_time_ms,
      policy_passed: policyResult.policy_decision.policy_passed,
      checks: policyResult.policy_decision.checks,
      details: policyResult.policy_decision
    })

    // Use modified analysis if policy made changes
    const finalAnalysis = policyResult.modified_analysis

    // ═══════════════════════════════════════════════════════════════════
    // STEP 6: Detect distress (optional emergency path)
    // ═══════════════════════════════════════════════════════════════════
    const distressed = detectDistress(userInput)

    // ═══════════════════════════════════════════════════════════════════
    // Build final response
    // ═══════════════════════════════════════════════════════════════════
    const response = {
      analysis_id: analysisId,
      timestamp_ist: timestamp,
      
      // Classification
      risk_score: finalAnalysis.risk_score,
      risk_level: finalAnalysis.risk_level,
      category: finalAnalysis.category,
      sub_type: finalAnalysis.sub_type,
      confidence: finalAnalysis.confidence,
      
      // Explanations
      explanation_en: explainerResult.explanation_en,
      explanation_hi: explainerResult.explanation_hi,
      user_action: explainerResult.user_action,
      user_action_hi: explainerResult.user_action_hi,
      parent_mode_en: explainerResult.parent_mode_en,
      parent_mode_hi: explainerResult.parent_mode_hi,
      
      // Evidence
      red_flags: explainerResult.red_flags,
      entities: intelResult.enriched_entities,
      matched_rules: scamResult.matched_rules,
      
      // Metadata
      distressed,
      mode,
      trace,
      
      // Governance
      policy_decision: policyResult.policy_decision,
      downgraded: !!finalAnalysis.downgrade_reason,
      downgrade_reason: finalAnalysis.downgrade_reason || null,
      
      // Performance
      total_processing_time_ms: Date.now() - pipelineStart,
      
      // Security
      security_report: firewallResult.security_report
    }

    return response

  } catch (error) {
    console.error('Orchestration error:', error)
    
    // Return graceful fallback
    return {
      analysis_id: analysisId,
      timestamp_ist: timestamp,
      error: true,
      error_message: 'Analysis pipeline encountered an error',
      risk_score: 50,
      risk_level: 'UNKNOWN',
      category: 'UNKNOWN',
      sub_type: 'Analysis failed',
      confidence: 0,
      explanation_en: 'We encountered an error analyzing this message. Please try again or contact support.',
      explanation_hi: 'इस मैसेज का विश्लेषण करते समय एक त्रुटि हुई। कृपया पुनः प्रयास करें।',
      user_action: 'If you believe this message is suspicious, report it to 1930.',
      user_action_hi: 'यदि आपको लगता है कि यह मैसेज संदिग्ध है, तो 1930 पर रिपोर्ट करें।',
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
      trace: trace.length > 0 ? trace : [{
        step: 1,
        agent: 'ErrorHandler',
        model: 'System',
        action: 'Graceful fallback',
        result: 'Pipeline error - returning safe fallback',
        time_ms: Date.now() - pipelineStart,
        policy_passed: true
      }],
      total_processing_time_ms: Date.now() - pipelineStart
    }
  }
}

module.exports = { orchestrate, generateAnalysisId, getISTTimestamp }

// Made with Bob
