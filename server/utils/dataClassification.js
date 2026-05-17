/**
 * Data Classification Utility
 * 
 * Classifies data into sensitivity levels and identifies PII/sensitive information.
 * Supports GDPR, CCPA, and other privacy regulations.
 */

/**
 * Data classification levels
 */
const CLASSIFICATION_LEVELS = {
  PUBLIC: 'PUBLIC',           // Can be freely shared
  INTERNAL: 'INTERNAL',       // Internal use only
  CONFIDENTIAL: 'CONFIDENTIAL', // Restricted access
  RESTRICTED: 'RESTRICTED',   // Highly restricted (PII, financial)
  CRITICAL: 'CRITICAL'        // Critical business data
}

/**
 * PII (Personally Identifiable Information) types
 */
const PII_TYPES = {
  // Direct identifiers
  FULL_NAME: 'FULL_NAME',
  EMAIL: 'EMAIL',
  PHONE: 'PHONE',
  NATIONAL_ID: 'NATIONAL_ID',     // Aadhaar, SSN, etc.
  PASSPORT: 'PASSPORT',
  DRIVERS_LICENSE: 'DRIVERS_LICENSE',
  
  // Financial
  CREDIT_CARD: 'CREDIT_CARD',
  BANK_ACCOUNT: 'BANK_ACCOUNT',
  UPI_ID: 'UPI_ID',
  IFSC_CODE: 'IFSC_CODE',
  
  // Location
  ADDRESS: 'ADDRESS',
  GPS_COORDINATES: 'GPS_COORDINATES',
  IP_ADDRESS: 'IP_ADDRESS',
  
  // Biometric
  FINGERPRINT: 'FINGERPRINT',
  FACE_IMAGE: 'FACE_IMAGE',
  
  // Health
  MEDICAL_RECORD: 'MEDICAL_RECORD',
  
  // Other
  DATE_OF_BIRTH: 'DATE_OF_BIRTH',
  USERNAME: 'USERNAME',
  PASSWORD: 'PASSWORD'
}

/**
 * Regex patterns for PII detection
 */
const PII_PATTERNS = {
  // Indian phone numbers
  PHONE: /(\+91[\s-]?)?[6-9]\d{9}\b/g,
  
  // Email addresses
  EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  
  // Aadhaar number (12 digits, optionally with spaces)
  AADHAAR: /\b\d{4}\s?\d{4}\s?\d{4}\b/g,
  
  // PAN card (ABCDE1234F format)
  PAN: /\b[A-Z]{5}\d{4}[A-Z]\b/g,
  
  // Credit card (13-19 digits, optionally with spaces/dashes)
  CREDIT_CARD: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  
  // UPI ID
  UPI: /\b[\w.-]+@[\w.-]+\b/g,
  
  // IFSC code
  IFSC: /\b[A-Z]{4}0[A-Z0-9]{6}\b/g,
  
  // IP address
  IP_ADDRESS: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  
  // Date of birth patterns
  DOB: /\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b/g,
  
  // Indian postal code
  POSTAL_CODE: /\b\d{6}\b/g
}

/**
 * Classify data based on content
 */
function classifyData(data) {
  const detectedPII = detectPII(data)
  
  // Determine classification level based on PII found
  if (detectedPII.length === 0) {
    return {
      level: CLASSIFICATION_LEVELS.PUBLIC,
      piiTypes: [],
      requiresConsent: false,
      retentionPeriod: null
    }
  }
  
  // Check for high-sensitivity PII
  const highSensitivityTypes = [
    PII_TYPES.NATIONAL_ID,
    PII_TYPES.PASSPORT,
    PII_TYPES.CREDIT_CARD,
    PII_TYPES.BANK_ACCOUNT,
    PII_TYPES.PASSWORD,
    PII_TYPES.MEDICAL_RECORD,
    PII_TYPES.FINGERPRINT,
    PII_TYPES.FACE_IMAGE
  ]
  
  const hasHighSensitivity = detectedPII.some(pii => 
    highSensitivityTypes.includes(pii.type)
  )
  
  if (hasHighSensitivity) {
    return {
      level: CLASSIFICATION_LEVELS.RESTRICTED,
      piiTypes: detectedPII.map(p => p.type),
      requiresConsent: true,
      retentionPeriod: '90_days',
      encryptionRequired: true
    }
  }
  
  // Medium sensitivity PII
  return {
    level: CLASSIFICATION_LEVELS.CONFIDENTIAL,
    piiTypes: detectedPII.map(p => p.type),
    requiresConsent: true,
    retentionPeriod: '180_days',
    encryptionRequired: false
  }
}

/**
 * Detect PII in text
 */
function detectPII(text) {
  if (!text || typeof text !== 'string') return []
  
  const detected = []
  
  // Phone numbers
  const phones = text.match(PII_PATTERNS.PHONE)
  if (phones) {
    phones.forEach(phone => {
      detected.push({
        type: PII_TYPES.PHONE,
        value: phone,
        position: text.indexOf(phone),
        confidence: 0.95
      })
    })
  }
  
  // Email addresses
  const emails = text.match(PII_PATTERNS.EMAIL)
  if (emails) {
    emails.forEach(email => {
      detected.push({
        type: PII_TYPES.EMAIL,
        value: email,
        position: text.indexOf(email),
        confidence: 0.98
      })
    })
  }
  
  // Aadhaar numbers
  const aadhaars = text.match(PII_PATTERNS.AADHAAR)
  if (aadhaars) {
    aadhaars.forEach(aadhaar => {
      // Validate Aadhaar checksum if needed
      detected.push({
        type: PII_TYPES.NATIONAL_ID,
        value: aadhaar,
        position: text.indexOf(aadhaar),
        confidence: 0.85,
        subtype: 'AADHAAR'
      })
    })
  }
  
  // PAN cards
  const pans = text.match(PII_PATTERNS.PAN)
  if (pans) {
    pans.forEach(pan => {
      detected.push({
        type: PII_TYPES.NATIONAL_ID,
        value: pan,
        position: text.indexOf(pan),
        confidence: 0.90,
        subtype: 'PAN'
      })
    })
  }
  
  // Credit cards
  const cards = text.match(PII_PATTERNS.CREDIT_CARD)
  if (cards) {
    cards.forEach(card => {
      // Validate using Luhn algorithm
      if (isValidCreditCard(card)) {
        detected.push({
          type: PII_TYPES.CREDIT_CARD,
          value: card,
          position: text.indexOf(card),
          confidence: 0.92
        })
      }
    })
  }
  
  // UPI IDs
  const upis = text.match(PII_PATTERNS.UPI)
  if (upis) {
    upis.forEach(upi => {
      // Filter out emails (UPI format is similar)
      if (!upi.includes('@gmail') && !upi.includes('@yahoo')) {
        detected.push({
          type: PII_TYPES.UPI_ID,
          value: upi,
          position: text.indexOf(upi),
          confidence: 0.80
        })
      }
    })
  }
  
  // IP addresses
  const ips = text.match(PII_PATTERNS.IP_ADDRESS)
  if (ips) {
    ips.forEach(ip => {
      detected.push({
        type: PII_TYPES.IP_ADDRESS,
        value: ip,
        position: text.indexOf(ip),
        confidence: 0.95
      })
    })
  }
  
  return detected
}

/**
 * Validate credit card using Luhn algorithm
 */
function isValidCreditCard(cardNumber) {
  const digits = cardNumber.replace(/\D/g, '')
  if (digits.length < 13 || digits.length > 19) return false
  
  let sum = 0
  let isEven = false
  
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i])
    
    if (isEven) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    
    sum += digit
    isEven = !isEven
  }
  
  return sum % 10 === 0
}

/**
 * Get masking strategy for PII type
 */
function getMaskingStrategy(piiType) {
  const strategies = {
    [PII_TYPES.PHONE]: 'partial',           // Show last 4 digits
    [PII_TYPES.EMAIL]: 'partial',           // Show first char + domain
    [PII_TYPES.NATIONAL_ID]: 'full',        // Completely mask
    [PII_TYPES.CREDIT_CARD]: 'partial',     // Show last 4 digits
    [PII_TYPES.BANK_ACCOUNT]: 'full',       // Completely mask
    [PII_TYPES.UPI_ID]: 'partial',          // Show first char + domain
    [PII_TYPES.PASSWORD]: 'full',           // Completely mask
    [PII_TYPES.IP_ADDRESS]: 'partial',      // Show first 2 octets
    [PII_TYPES.ADDRESS]: 'partial',         // Show city/state only
    [PII_TYPES.DATE_OF_BIRTH]: 'partial'    // Show year only
  }
  
  return strategies[piiType] || 'full'
}

/**
 * Check if data requires encryption at rest
 */
function requiresEncryption(classification) {
  return [
    CLASSIFICATION_LEVELS.RESTRICTED,
    CLASSIFICATION_LEVELS.CRITICAL
  ].includes(classification.level)
}

/**
 * Get retention period in days
 */
function getRetentionDays(retentionPeriod) {
  const periods = {
    '30_days': 30,
    '90_days': 90,
    '180_days': 180,
    '1_year': 365,
    '2_years': 730,
    '7_years': 2555,
    'indefinite': null
  }
  
  return periods[retentionPeriod] || null
}

module.exports = {
  CLASSIFICATION_LEVELS,
  PII_TYPES,
  classifyData,
  detectPII,
  getMaskingStrategy,
  requiresEncryption,
  getRetentionDays
}

// Made with Bob
