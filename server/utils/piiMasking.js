/**
 * PII Masking Utility
 * 
 * Masks personally identifiable information in text and objects.
 * Supports multiple masking strategies and reversible masking.
 */

const { PII_TYPES, detectPII, getMaskingStrategy } = require('./dataClassification')

/**
 * Mask PII in text
 */
function maskText(text, options = {}) {
  if (!text || typeof text !== 'string') return text
  
  const {
    maskChar = '*',
    preserveLength = false,
    customStrategies = {}
  } = options
  
  const detected = detectPII(text)
  if (detected.length === 0) return text
  
  let maskedText = text
  
  // Sort by position (descending) to avoid index shifting
  detected.sort((a, b) => b.position - a.position)
  
  for (const pii of detected) {
    const strategy = customStrategies[pii.type] || getMaskingStrategy(pii.type)
    const masked = maskValue(pii.value, pii.type, strategy, maskChar, preserveLength)
    
    maskedText = 
      maskedText.substring(0, pii.position) +
      masked +
      maskedText.substring(pii.position + pii.value.length)
  }
  
  return maskedText
}

/**
 * Mask a single value based on PII type and strategy
 */
function maskValue(value, piiType, strategy, maskChar = '*', preserveLength = false) {
  if (!value) return value
  
  switch (strategy) {
    case 'full':
      return preserveLength 
        ? maskChar.repeat(value.length)
        : '[REDACTED]'
    
    case 'partial':
      return maskPartial(value, piiType, maskChar)
    
    case 'hash':
      return hashValue(value)
    
    case 'none':
      return value
    
    default:
      return '[REDACTED]'
  }
}

/**
 * Partial masking based on PII type
 */
function maskPartial(value, piiType, maskChar = '*') {
  const clean = value.trim()
  
  switch (piiType) {
    case PII_TYPES.PHONE:
      // Show last 4 digits: +91-98765*****
      return clean.length > 4
        ? maskChar.repeat(clean.length - 4) + clean.slice(-4)
        : maskChar.repeat(clean.length)
    
    case PII_TYPES.EMAIL:
      // Show first char + domain: a****@example.com
      const [local, domain] = clean.split('@')
      if (!domain) return maskChar.repeat(clean.length)
      return local[0] + maskChar.repeat(Math.max(0, local.length - 1)) + '@' + domain
    
    case PII_TYPES.CREDIT_CARD:
      // Show last 4 digits: ****-****-****-1234
      const digits = clean.replace(/\D/g, '')
      return maskChar.repeat(Math.max(0, digits.length - 4)) + digits.slice(-4)
    
    case PII_TYPES.NATIONAL_ID:
      // Show last 4 digits: ****-****-1234
      const idDigits = clean.replace(/\D/g, '')
      return maskChar.repeat(Math.max(0, idDigits.length - 4)) + idDigits.slice(-4)
    
    case PII_TYPES.UPI_ID:
      // Show first char + domain: a****@paytm
      const [upiLocal, upiDomain] = clean.split('@')
      if (!upiDomain) return maskChar.repeat(clean.length)
      return upiLocal[0] + maskChar.repeat(Math.max(0, upiLocal.length - 1)) + '@' + upiDomain
    
    case PII_TYPES.IP_ADDRESS:
      // Show first 2 octets: 192.168.*.*
      const octets = clean.split('.')
      if (octets.length !== 4) return maskChar.repeat(clean.length)
      return `${octets[0]}.${octets[1]}.${maskChar}.${maskChar}`
    
    case PII_TYPES.DATE_OF_BIRTH:
      // Show year only: **/**/1990
      const parts = clean.split(/[-/]/)
      if (parts.length !== 3) return maskChar.repeat(clean.length)
      return `${maskChar}${maskChar}/${maskChar}${maskChar}/${parts[2]}`
    
    default:
      // Default: show first and last char
      if (clean.length <= 2) return maskChar.repeat(clean.length)
      return clean[0] + maskChar.repeat(clean.length - 2) + clean[clean.length - 1]
  }
}

/**
 * Hash value for reversible masking (with key)
 */
function hashValue(value) {
  const crypto = require('crypto')
  const hash = crypto.createHash('sha256').update(value).digest('hex')
  return `[HASH:${hash.substring(0, 16)}]`
}

/**
 * Mask PII in object (recursive)
 */
function maskObject(obj, options = {}) {
  if (!obj || typeof obj !== 'object') return obj
  
  const {
    sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'creditCard'],
    maskChar = '*',
    preserveLength = false
  } = options
  
  const masked = Array.isArray(obj) ? [] : {}
  
  for (const [key, value] of Object.entries(obj)) {
    // Check if field name indicates sensitive data
    const isSensitiveField = sensitiveFields.some(field => 
      key.toLowerCase().includes(field.toLowerCase())
    )
    
    if (isSensitiveField) {
      masked[key] = typeof value === 'string'
        ? (preserveLength ? maskChar.repeat(value.length) : '[REDACTED]')
        : '[REDACTED]'
    } else if (typeof value === 'string') {
      masked[key] = maskText(value, options)
    } else if (typeof value === 'object' && value !== null) {
      masked[key] = maskObject(value, options)
    } else {
      masked[key] = value
    }
  }
  
  return masked
}

/**
 * Mask PII in logs
 */
function maskForLogging(data) {
  if (typeof data === 'string') {
    return maskText(data, { maskChar: '*', preserveLength: false })
  }
  
  if (typeof data === 'object' && data !== null) {
    return maskObject(data, {
      sensitiveFields: [
        'password', 'token', 'secret', 'apiKey', 'api_key',
        'creditCard', 'credit_card', 'ssn', 'aadhaar',
        'pan', 'passport', 'drivingLicense', 'driving_license'
      ],
      maskChar: '*',
      preserveLength: false
    })
  }
  
  return data
}

/**
 * Create a masked copy with metadata
 */
function createMaskedCopy(data, options = {}) {
  const detected = typeof data === 'string' ? detectPII(data) : []
  
  return {
    original: data,
    masked: typeof data === 'string' 
      ? maskText(data, options)
      : maskObject(data, options),
    piiDetected: detected.length > 0,
    piiTypes: [...new Set(detected.map(p => p.type))],
    piiCount: detected.length,
    maskedAt: new Date().toISOString()
  }
}

/**
 * Redact specific PII types only
 */
function redactSpecificPII(text, piiTypes = []) {
  if (!text || typeof text !== 'string') return text
  
  const detected = detectPII(text)
  const filtered = detected.filter(pii => piiTypes.includes(pii.type))
  
  if (filtered.length === 0) return text
  
  let redacted = text
  filtered.sort((a, b) => b.position - a.position)
  
  for (const pii of filtered) {
    const masked = maskValue(pii.value, pii.type, 'full', '*', false)
    redacted = 
      redacted.substring(0, pii.position) +
      masked +
      redacted.substring(pii.position + pii.value.length)
  }
  
  return redacted
}

/**
 * Check if text contains PII
 */
function containsPII(text) {
  if (!text || typeof text !== 'string') return false
  const detected = detectPII(text)
  return detected.length > 0
}

/**
 * Get PII summary
 */
function getPIISummary(text) {
  if (!text || typeof text !== 'string') {
    return {
      hasPII: false,
      count: 0,
      types: []
    }
  }
  
  const detected = detectPII(text)
  
  return {
    hasPII: detected.length > 0,
    count: detected.length,
    types: [...new Set(detected.map(p => p.type))],
    details: detected.map(p => ({
      type: p.type,
      confidence: p.confidence,
      position: p.position
    }))
  }
}

module.exports = {
  maskText,
  maskValue,
  maskObject,
  maskForLogging,
  createMaskedCopy,
  redactSpecificPII,
  containsPII,
  getPIISummary
}

// Made with Bob
