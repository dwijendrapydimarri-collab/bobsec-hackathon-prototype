/**
 * BankSideAgent - Specialized agent for banking sector
 * 
 * Optimized for:
 * - Transaction fraud detection
 * - Account takeover prevention
 * - Phishing detection
 * - Regulatory compliance
 * - High precision (low false positives)
 */

const logger = require('../utils/logger')

class BankSideAgent {
  constructor() {
    this.name = 'BankSideAgent'
    this.sector = 'BANK'
    this.capabilities = [
      'transaction_analysis',
      'account_takeover_detection',
      'phishing_detection',
      'regulatory_compliance',
      'fraud_scoring',
      'customer_protection'
    ]
  }
  
  /**
   * Analyse content from banking perspective
   * 
   * @param {string} input - Suspicious content
   * @param {Object} context - Platform context
   * @returns {Promise<Object>} Analysis result
   */
  async analyse(input, context) {
    logger.info('BankSideAgent: Starting analysis', { 
      sector: this.sector,
      channel: context.channel 
    })
    
    const startTime = Date.now()
    
    // Extract financial entities
    const entities = await this.extractFinancialEntities(input)
    
    // Classify threat type
    const classification = await this.classifyThreat(input, entities)
    
    // Calculate fraud score (banking-focused)
    const fraudScore = await this.calculateFraudScore(input, entities, classification)
    
    // Assess account takeover risk
    const accountTakeoverRisk = await this.assessAccountTakeoverRisk(input, entities)
    
    // Check regulatory compliance
    const complianceFlags = await this.checkCompliance(input, entities, classification)
    
    // Generate technical analysis
    const analysis = await this.generateTechnicalAnalysis(
      input,
      entities,
      classification,
      fraudScore,
      accountTakeoverRisk
    )
    
    // Determine recommended action
    const recommendedAction = await this.determineAction(
      fraudScore,
      accountTakeoverRisk,
      classification
    )
    
    const duration = Date.now() - startTime
    
    logger.info('BankSideAgent: Analysis complete', { 
      fraudScore, 
      category: classification.category,
      accountTakeoverRisk,
      duration 
    })
    
    return {
      agent: this.name,
      sector: this.sector,
      risk_score: fraudScore,
      risk_level: this.getRiskLevel(fraudScore),
      category: classification.category,
      sub_type: classification.subType,
      red_flags: classification.redFlags,
      entities,
      technical_analysis: analysis,
      account_takeover_risk: accountTakeoverRisk,
      compliance_flags: complianceFlags,
      recommended_action: recommendedAction,
      confidence: classification.confidence,
      requires_human_review: fraudScore >= 70,
      duration
    }
  }
  
  /**
   * Extract financial entities (bank-specific)
   */
  async extractFinancialEntities(input) {
    const entities = {
      phone_numbers: [],
      urls: [],
      upi_ids: [],
      account_numbers: [],
      card_numbers: [],
      transaction_ids: [],
      amounts: [],
      bank_names: [],
      credential_requests: []
    }
    
    // Phone numbers
    const phoneRegex = /(\+91[-\s]?)?[6-9]\d{9}/g
    entities.phone_numbers = (input.match(phoneRegex) || []).map(p => p.trim())
    
    // URLs and domains
    const urlRegex = /(https?:\/\/[^\s]+)|([a-z0-9-]+\.(com|in|tk|xyz|net|org|co\.in))/gi
    entities.urls = (input.match(urlRegex) || []).map(u => u.trim())
    
    // UPI IDs
    const upiRegex = /[a-z0-9._-]+@[a-z]+/gi
    entities.upi_ids = (input.match(upiRegex) || []).map(u => u.trim())
    
    // Account numbers (masked)
    const accountRegex = /\d{4,16}/g
    const potentialAccounts = input.match(accountRegex) || []
    entities.account_numbers = potentialAccounts
      .filter(num => num.length >= 8 && num.length <= 16)
      .map(num => `****${num.slice(-4)}`)
    
    // Transaction amounts
    const amountRegex = /₹\s*[\d,]+|Rs\.?\s*[\d,]+/gi
    entities.amounts = (input.match(amountRegex) || []).map(a => a.trim())
    
    // Bank names
    const bankKeywords = [
      'HDFC', 'ICICI', 'SBI', 'Axis', 'Kotak', 'Yes Bank', 'IDFC',
      'IndusInd', 'Bank of Baroda', 'PNB', 'Canara Bank'
    ]
    entities.bank_names = bankKeywords.filter(bank => 
      input.toLowerCase().includes(bank.toLowerCase())
    )
    
    // Credential requests
    const credentialKeywords = [
      'OTP', 'password', 'PIN', 'CVV', 'card number', 'expiry date',
      'account number', 'user ID', 'MPIN', 'net banking password'
    ]
    entities.credential_requests = credentialKeywords.filter(cred =>
      input.toLowerCase().includes(cred.toLowerCase())
    )
    
    return entities
  }
  
  /**
   * Classify threat type (banking-specific)
   */
  async classifyThreat(input, entities) {
    const lower = input.toLowerCase()
    const redFlags = []
    let category = 'UNKNOWN'
    let subType = ''
    let confidence = 50
    
    // Phishing patterns
    if ((lower.includes('kyc') || lower.includes('verify') || lower.includes('update')) &&
        (entities.urls.length > 0 || entities.phone_numbers.length > 0)) {
      category = 'PHISHING'
      subType = 'Credential Harvesting'
      confidence = 92
      redFlags.push('Phishing attempt to steal credentials')
      redFlags.push('Unofficial communication channel')
    }
    
    // Account takeover patterns
    if (entities.credential_requests.length > 0) {
      category = 'ACCOUNT_TAKEOVER'
      subType = 'Credential Theft Attempt'
      confidence = 95
      redFlags.push(`Requests sensitive credentials: ${entities.credential_requests.join(', ')}`)
      redFlags.push('Banks never ask for OTP/password via SMS/call')
    }
    
    // Transaction fraud patterns
    if ((lower.includes('transaction') || lower.includes('payment') || lower.includes('transfer')) &&
        (lower.includes('failed') || lower.includes('pending') || lower.includes('verify'))) {
      category = 'TRANSACTION_FRAUD'
      subType = 'Fake Transaction Alert'
      confidence = 88
      redFlags.push('Fake transaction notification')
      redFlags.push('Attempts to create panic and urgency')
    }
    
    // Impersonation patterns
    if (entities.bank_names.length > 0 && 
        (entities.urls.some(url => !this.isOfficialBankDomain(url, entities.bank_names[0])) ||
         entities.phone_numbers.length > 0)) {
      category = 'IMPERSONATION'
      subType = `Fake ${entities.bank_names[0]} Communication`
      confidence = 90
      redFlags.push(`Impersonates ${entities.bank_names[0]}`)
      redFlags.push('Uses unofficial domain or phone number')
    }
    
    // Urgency indicators
    const urgencyKeywords = ['urgent', 'immediately', 'within 24 hours', 'suspended', 'blocked']
    if (urgencyKeywords.some(keyword => lower.includes(keyword))) {
      redFlags.push('Creates false sense of urgency')
    }
    
    return {
      category,
      subType,
      redFlags,
      confidence
    }
  }
  
  /**
   * Calculate fraud score (banking-optimized)
   */
  async calculateFraudScore(input, entities, classification) {
    let score = 0
    
    // Base score from classification
    score += classification.confidence * 0.5
    
    // High-risk indicators
    if (entities.credential_requests.length > 0) score += 25
    if (entities.urls.length > 0) score += 15
    if (entities.phone_numbers.length > 0) score += 10
    if (entities.upi_ids.length > 0) score += 10
    
    // Bank impersonation
    if (entities.bank_names.length > 0) {
      const hasOfficialDomain = entities.urls.some(url => 
        this.isOfficialBankDomain(url, entities.bank_names[0])
      )
      if (!hasOfficialDomain && entities.urls.length > 0) {
        score += 20
      }
    }
    
    // Category-specific adjustments
    if (classification.category === 'ACCOUNT_TAKEOVER') score += 15
    if (classification.category === 'PHISHING') score += 10
    
    // Precision adjustment (banking requires high precision)
    if (score < 70 && classification.confidence < 85) {
      score *= 0.9  // Reduce score slightly for uncertain cases
    }
    
    return Math.min(100, Math.round(score))
  }
  
  /**
   * Assess account takeover risk
   */
  async assessAccountTakeoverRisk(input, entities) {
    let risk = 'LOW'
    
    if (entities.credential_requests.length >= 3) {
      risk = 'CRITICAL'
    } else if (entities.credential_requests.length >= 2) {
      risk = 'HIGH'
    } else if (entities.credential_requests.length >= 1) {
      risk = 'MEDIUM'
    }
    
    // Escalate if multiple attack vectors
    if (entities.urls.length > 0 && entities.phone_numbers.length > 0) {
      if (risk === 'MEDIUM') risk = 'HIGH'
      if (risk === 'HIGH') risk = 'CRITICAL'
    }
    
    return risk
  }
  
  /**
   * Check regulatory compliance
   */
  async checkCompliance(input, entities, classification) {
    const flags = []
    
    // RBI guidelines: Banks never ask for credentials
    if (entities.credential_requests.length > 0) {
      flags.push({
        regulation: 'RBI Guidelines',
        violation: 'Requests customer credentials',
        severity: 'CRITICAL',
        reference: 'RBI/2021-22/125'
      })
    }
    
    // Data protection: Unauthorized data collection
    if (classification.category === 'PHISHING') {
      flags.push({
        regulation: 'IT Act 2000',
        violation: 'Unauthorized data collection attempt',
        severity: 'HIGH',
        reference: 'Section 43'
      })
    }
    
    // Consumer protection: Misleading communication
    if (classification.category === 'IMPERSONATION') {
      flags.push({
        regulation: 'Consumer Protection Act',
        violation: 'Misleading/deceptive communication',
        severity: 'HIGH',
        reference: 'Section 2(47)'
      })
    }
    
    return flags
  }
  
  /**
   * Generate technical analysis for fraud teams
   */
  async generateTechnicalAnalysis(input, entities, classification, fraudScore, accountTakeoverRisk) {
    return {
      threat_vector: classification.category,
      attack_method: classification.subType,
      target_assets: this.identifyTargetAssets(entities),
      indicators_of_compromise: {
        urls: entities.urls,
        phone_numbers: entities.phone_numbers,
        upi_ids: entities.upi_ids
      },
      fraud_score: fraudScore,
      account_takeover_risk: accountTakeoverRisk,
      recommended_controls: this.recommendControls(classification, fraudScore)
    }
  }
  
  /**
   * Identify target assets
   */
  identifyTargetAssets(entities) {
    const assets = []
    
    if (entities.credential_requests.includes('OTP')) assets.push('Two-factor authentication')
    if (entities.credential_requests.includes('password')) assets.push('Account credentials')
    if (entities.credential_requests.includes('CVV')) assets.push('Card details')
    if (entities.account_numbers.length > 0) assets.push('Account information')
    if (entities.upi_ids.length > 0) assets.push('UPI payment credentials')
    
    return assets.length > 0 ? assets : ['Customer trust', 'Brand reputation']
  }
  
  /**
   * Recommend security controls
   */
  recommendControls(classification, fraudScore) {
    const controls = []
    
    if (fraudScore >= 80) {
      controls.push('Block sender immediately')
      controls.push('Alert affected customers')
      controls.push('Escalate to fraud investigation team')
    }
    
    if (classification.category === 'PHISHING') {
      controls.push('Add URL to blocklist')
      controls.push('Report to domain registrar')
    }
    
    if (classification.category === 'ACCOUNT_TAKEOVER') {
      controls.push('Enable additional authentication for affected accounts')
      controls.push('Monitor for suspicious login attempts')
    }
    
    controls.push('File report with CERT-In')
    controls.push('Update customer awareness materials')
    
    return controls
  }
  
  /**
   * Determine recommended action
   */
  async determineAction(fraudScore, accountTakeoverRisk, classification) {
    if (fraudScore >= 90 || accountTakeoverRisk === 'CRITICAL') {
      return {
        action: 'BLOCK',
        reason: 'Critical fraud risk detected',
        notify_customer: true,
        escalate_to_fraud_team: true,
        file_regulatory_report: true
      }
    }
    
    if (fraudScore >= 70 || accountTakeoverRisk === 'HIGH') {
      return {
        action: 'WARN',
        reason: 'High fraud risk detected',
        notify_customer: true,
        escalate_to_fraud_team: true,
        file_regulatory_report: false
      }
    }
    
    if (fraudScore >= 50) {
      return {
        action: 'FLAG',
        reason: 'Moderate fraud risk detected',
        notify_customer: false,
        escalate_to_fraud_team: false,
        file_regulatory_report: false
      }
    }
    
    return {
      action: 'ALLOW',
      reason: 'Low fraud risk',
      notify_customer: false,
      escalate_to_fraud_team: false,
      file_regulatory_report: false
    }
  }
  
  /**
   * Check if URL is official bank domain
   */
  isOfficialBankDomain(url, bankName) {
    const officialDomains = {
      'HDFC': ['hdfcbank.com', 'hdfcbank.co.in'],
      'ICICI': ['icicibank.com', 'icicibank.co.in'],
      'SBI': ['onlinesbi.com', 'sbi.co.in'],
      'Axis': ['axisbank.com', 'axisbank.co.in'],
      'Kotak': ['kotak.com', 'kotakbank.com']
    }
    
    const domains = officialDomains[bankName] || []
    return domains.some(domain => url.toLowerCase().includes(domain))
  }
  
  /**
   * Get risk level from score (banking-optimized thresholds)
   */
  getRiskLevel(score) {
    if (score >= 70) return 'HIGH'      // Lower threshold for HIGH
    if (score >= 40) return 'MEDIUM'
    if (score >= 15) return 'LOW'
    return 'SAFE'
  }
}

module.exports = BankSideAgent

// Made with Bob
