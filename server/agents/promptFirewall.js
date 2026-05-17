// PromptFirewall - Security layer for PII redaction and jailbreak detection
// Protects user privacy and system integrity

// PII patterns to detect and redact
const PII_PATTERNS = {
  // Indian phone numbers
  phone: {
    pattern: /(?:\+91[-\s]?)?[6-9]\d{9}/g,
    replacement: '[PHONE_REDACTED]',
    label: 'Phone Number'
  },
  // Email addresses
  email: {
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    replacement: '[EMAIL_REDACTED]',
    label: 'Email Address'
  },
  // UPI IDs
  upi: {
    pattern: /[a-zA-Z0-9._-]+@[a-zA-Z]{3,}/g,
    replacement: '[UPI_REDACTED]',
    label: 'UPI ID'
  },
  // Aadhaar numbers (12 digits)
  aadhaar: {
    pattern: /\b\d{4}\s?\d{4}\s?\d{4}\b/g,
    replacement: '[AADHAAR_REDACTED]',
    label: 'Aadhaar Number'
  },
  // PAN card (ABCDE1234F format)
  pan: {
    pattern: /\b[A-Z]{5}\d{4}[A-Z]\b/g,
    replacement: '[PAN_REDACTED]',
    label: 'PAN Card'
  },
  // Credit/Debit card numbers (13-19 digits with optional spaces/dashes)
  card: {
    pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4,7}\b/g,
    replacement: '[CARD_REDACTED]',
    label: 'Card Number'
  },
  // Bank account numbers (9-18 digits)
  account: {
    pattern: /\b\d{9,18}\b/g,
    replacement: '[ACCOUNT_REDACTED]',
    label: 'Account Number'
  },
  // Indian postal PIN codes
  pincode: {
    pattern: /\b\d{6}\b/g,
    replacement: '[PIN_REDACTED]',
    label: 'PIN Code'
  }
}

// Jailbreak attempt patterns
const JAILBREAK_PATTERNS = [
  /ignore (previous|all|above) instructions?/i,
  /disregard (previous|all|above) (instructions?|prompts?)/i,
  /forget (everything|all|previous)/i,
  /you are now/i,
  /new (role|character|persona)/i,
  /act as (if )?you (are|were)/i,
  /pretend (you are|to be)/i,
  /system prompt/i,
  /reveal (your|the) (prompt|instructions?)/i,
  /what (are|were) your (instructions?|prompts?)/i,
  /bypass (security|safety|filters?)/i,
  /override (security|safety|filters?)/i,
  /sudo mode/i,
  /developer mode/i,
  /admin mode/i,
  /jailbreak/i
]

// Detect PII in input
function detectPii(input) {
  const detected = []
  
  Object.entries(PII_PATTERNS).forEach(([type, config]) => {
    const matches = input.match(config.pattern)
    if (matches && matches.length > 0) {
      detected.push({
        type,
        label: config.label,
        count: matches.length,
        samples: matches.slice(0, 2) // First 2 samples only
      })
    }
  })

  return detected
}

// Redact PII from input
function redactPii(input) {
  let redacted = input
  const redactions = []

  Object.entries(PII_PATTERNS).forEach(([type, config]) => {
    const matches = redacted.match(config.pattern)
    if (matches && matches.length > 0) {
      redacted = redacted.replace(config.pattern, config.replacement)
      redactions.push({
        type,
        label: config.label,
        count: matches.length
      })
    }
  })

  return {
    redacted_input: redacted,
    redactions,
    pii_detected: redactions.length > 0
  }
}

// Detect jailbreak attempts
function detectJailbreak(input) {
  const detected = []
  const inputLower = input.toLowerCase()

  JAILBREAK_PATTERNS.forEach((pattern, index) => {
    if (pattern.test(inputLower)) {
      detected.push({
        pattern_id: index,
        pattern: pattern.source,
        matched: inputLower.match(pattern)?.[0]
      })
    }
  })

  return {
    jailbreak_detected: detected.length > 0,
    attempts: detected,
    severity: detected.length > 2 ? 'HIGH' : detected.length > 0 ? 'MEDIUM' : 'NONE'
  }
}

// Check for suspicious prompt injection
function detectPromptInjection(input) {
  const suspiciousPatterns = [
    /\[SYSTEM\]/i,
    /\[INST\]/i,
    /\[\/INST\]/i,
    /<\|system\|>/i,
    /<\|user\|>/i,
    /<\|assistant\|>/i,
    /```system/i,
    /role:\s*system/i
  ]

  const detected = suspiciousPatterns.filter(pattern => pattern.test(input))

  return {
    injection_detected: detected.length > 0,
    patterns_matched: detected.length,
    severity: detected.length > 1 ? 'HIGH' : detected.length > 0 ? 'MEDIUM' : 'NONE'
  }
}

// Main PromptFirewall function
function sanitizeInput(input, options = {}) {
  const startTime = Date.now()
  
  const {
    redact_pii = true,
    detect_jailbreak = true,
    detect_injection = true,
    block_on_jailbreak = false
  } = options

  // Step 1: Detect PII
  const piiDetection = detectPii(input)

  // Step 2: Redact PII if enabled
  let sanitized = input
  let redactionResult = { redacted_input: input, redactions: [], pii_detected: false }
  
  if (redact_pii && piiDetection.length > 0) {
    redactionResult = redactPii(input)
    sanitized = redactionResult.redacted_input
  }

  // Step 3: Detect jailbreak attempts
  const jailbreakDetection = detect_jailbreak 
    ? detectJailbreak(input) 
    : { jailbreak_detected: false, attempts: [], severity: 'NONE' }

  // Step 4: Detect prompt injection
  const injectionDetection = detect_injection
    ? detectPromptInjection(input)
    : { injection_detected: false, patterns_matched: 0, severity: 'NONE' }

  // Step 5: Determine if input should be blocked
  const shouldBlock = (
    (block_on_jailbreak && jailbreakDetection.jailbreak_detected) ||
    (injectionDetection.severity === 'HIGH')
  )

  // Build security report
  const securityReport = {
    pii_detected: piiDetection.length > 0,
    pii_types: piiDetection.map(p => p.label),
    pii_redacted: redact_pii && piiDetection.length > 0,
    redaction_count: redactionResult.redactions.length,
    
    jailbreak_detected: jailbreakDetection.jailbreak_detected,
    jailbreak_severity: jailbreakDetection.severity,
    jailbreak_attempts: jailbreakDetection.attempts.length,
    
    injection_detected: injectionDetection.injection_detected,
    injection_severity: injectionDetection.severity,
    
    input_blocked: shouldBlock,
    block_reason: shouldBlock 
      ? (jailbreakDetection.jailbreak_detected ? 'Jailbreak attempt detected' : 'Prompt injection detected')
      : null,
    
    processing_time_ms: Date.now() - startTime
  }

  return {
    sanitized_input: sanitized,
    original_input: input,
    security_report: securityReport,
    should_block: shouldBlock,
    pii_details: piiDetection,
    jailbreak_details: jailbreakDetection,
    injection_details: injectionDetection
  }
}

// Get firewall configuration
function getFirewallConfig() {
  return {
    pii_patterns: Object.keys(PII_PATTERNS),
    jailbreak_patterns_count: JAILBREAK_PATTERNS.length,
    default_redact_pii: true,
    default_detect_jailbreak: true,
    default_detect_injection: true,
    default_block_on_jailbreak: false
  }
}

module.exports = { 
  sanitizeInput, 
  detectPii, 
  redactPii, 
  detectJailbreak,
  detectPromptInjection,
  getFirewallConfig 
}

// Made with Bob
