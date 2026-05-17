/**
 * ConsumerAgent - Specialized agent for consumer-facing applications
 * 
 * Optimized for:
 * - Family safety features
 * - Plain-language explanations
 * - Emotional support for distressed users
 * - Educational content
 * - Low false-positive tolerance
 */

const logger = require('../utils/logger')

class ConsumerAgent {
  constructor() {
    this.name = 'ConsumerAgent'
    this.sector = 'CONSUMER'
    this.capabilities = [
      'family_mode',
      'parent_mode',
      'emotional_support',
      'educational_content',
      'plain_language',
      'multilingual'
    ]
  }
  
  /**
   * Analyse content from consumer perspective
   * 
   * @param {string} input - Suspicious content
   * @param {Object} context - Platform context
   * @returns {Promise<Object>} Analysis result
   */
  async analyse(input, context) {
    logger.info('ConsumerAgent: Starting analysis', { 
      sector: this.sector,
      familyMode: context.features?.familyMode 
    })
    
    const startTime = Date.now()
    
    // Extract entities
    const entities = await this.extractEntities(input)
    
    // Classify scam type
    const classification = await this.classifyScam(input, entities)
    
    // Calculate risk score (consumer-focused)
    const riskScore = await this.calculateConsumerRisk(input, entities, classification)
    
    // Generate explanations (plain language, empathetic)
    const explanations = await this.generateExplanations(
      input, 
      entities, 
      classification,
      context.lang || 'en'
    )
    
    // Check for distress signals
    const distressed = this.detectDistress(input)
    
    // Generate action steps
    const actions = await this.generateActions(
      classification,
      riskScore,
      distressed,
      context
    )
    
    const duration = Date.now() - startTime
    
    logger.info('ConsumerAgent: Analysis complete', { 
      riskScore, 
      category: classification.category,
      distressed,
      duration 
    })
    
    return {
      agent: this.name,
      sector: this.sector,
      risk_score: riskScore,
      risk_level: this.getRiskLevel(riskScore),
      category: classification.category,
      sub_type: classification.subType,
      red_flags: classification.redFlags,
      entities,
      explanation_en: explanations.en,
      explanation_hi: explanations.hi,
      user_action: actions.immediate,
      user_action_hi: actions.immediate_hi,
      next_steps: distressed ? actions.distressedSteps : null,
      educational_content: actions.educational,
      confidence: classification.confidence,
      distressed,
      family_friendly: true,
      duration
    }
  }
  
  /**
   * Extract entities with consumer-friendly labels
   */
  async extractEntities(input) {
    const entities = {
      phone_numbers: [],
      urls: [],
      upi_ids: [],
      impersonated_org: '',
      urgency_phrases: [],
      money_amounts: [],
      personal_info_requests: []
    }
    
    // Phone numbers
    const phoneRegex = /(\+91[-\s]?)?[6-9]\d{9}/g
    const phones = input.match(phoneRegex) || []
    entities.phone_numbers = phones.map(p => ({
      value: p.trim(),
      label: 'Phone number'
    }))
    
    // URLs
    const urlRegex = /(https?:\/\/[^\s]+)|([a-z0-9-]+\.(com|in|tk|xyz|net|org|co\.in))/gi
    const urls = input.match(urlRegex) || []
    entities.urls = urls.map(u => ({
      value: u.trim(),
      label: 'Website link'
    }))
    
    // UPI IDs
    const upiRegex = /[a-z0-9._-]+@[a-z]+/gi
    const upis = input.match(upiRegex) || []
    entities.upi_ids = upis.map(u => ({
      value: u.trim(),
      label: 'Payment ID'
    }))
    
    // Money amounts
    const moneyRegex = /₹\s*[\d,]+|Rs\.?\s*[\d,]+/gi
    const amounts = input.match(moneyRegex) || []
    entities.money_amounts = amounts.map(a => ({
      value: a.trim(),
      label: 'Money amount'
    }))
    
    // Urgency phrases
    const urgencyKeywords = [
      'urgent', 'immediately', 'within 24 hours', 'expire', 'suspended',
      'blocked', 'last chance', 'limited time', 'act now', 'hurry'
    ]
    entities.urgency_phrases = urgencyKeywords
      .filter(keyword => input.toLowerCase().includes(keyword))
      .map(keyword => input.match(new RegExp(`[^.!?]*${keyword}[^.!?]*[.!?]`, 'i'))?.[0]?.trim())
      .filter(Boolean)
    
    // Personal info requests
    const personalInfoKeywords = [
      'otp', 'password', 'pin', 'cvv', 'card number', 'account number',
      'aadhar', 'pan', 'date of birth', 'mother name'
    ]
    entities.personal_info_requests = personalInfoKeywords
      .filter(keyword => input.toLowerCase().includes(keyword))
    
    // Impersonated organization
    const orgKeywords = {
      'hdfc': 'HDFC Bank',
      'icici': 'ICICI Bank',
      'sbi': 'State Bank of India',
      'axis': 'Axis Bank',
      'paytm': 'Paytm',
      'amazon': 'Amazon',
      'flipkart': 'Flipkart',
      'kbc': 'KBC (Kaun Banega Crorepati)',
      'trai': 'TRAI',
      'sebi': 'SEBI',
      'income tax': 'Income Tax Department',
      'police': 'Police'
    }
    
    for (const [keyword, org] of Object.entries(orgKeywords)) {
      if (input.toLowerCase().includes(keyword)) {
        entities.impersonated_org = org
        break
      }
    }
    
    return entities
  }
  
  /**
   * Classify scam type with consumer-friendly categories
   */
  async classifyScam(input, entities) {
    const lower = input.toLowerCase()
    const redFlags = []
    let category = 'UNKNOWN'
    let subType = ''
    let confidence = 50
    
    // Financial fraud patterns
    if (lower.includes('kyc') || lower.includes('account') && lower.includes('suspend')) {
      category = 'FINANCIAL_FRAUD'
      subType = 'Fake KYC Update'
      confidence = 90
      redFlags.push('Fake KYC update request')
      redFlags.push('Threatens account suspension')
    }
    
    // Job scam patterns
    if ((lower.includes('work from home') || lower.includes('earn')) && 
        (lower.includes('registration fee') || lower.includes('₹') && lower.includes('fee'))) {
      category = 'JOB_SCAM'
      subType = 'Advance Fee Job Fraud'
      confidence = 88
      redFlags.push('Asks for upfront payment')
      redFlags.push('Promises unrealistic income')
    }
    
    // Lottery scam patterns
    if ((lower.includes('won') || lower.includes('winner') || lower.includes('congratulations')) &&
        (lower.includes('lottery') || lower.includes('prize') || lower.includes('kbc'))) {
      category = 'LOTTERY_SCAM'
      subType = 'Fake Prize/Lottery'
      confidence = 95
      redFlags.push('Unsolicited prize notification')
      redFlags.push('Asks for processing fee')
    }
    
    // Impersonation patterns
    if (entities.impersonated_org && 
        (lower.includes('verify') || lower.includes('update') || lower.includes('confirm'))) {
      category = 'IMPERSONATION'
      subType = `Fake ${entities.impersonated_org} Message`
      confidence = 92
      redFlags.push(`Pretends to be ${entities.impersonated_org}`)
    }
    
    // Digital arrest (extreme severity)
    if (lower.includes('digital arrest') || 
        (lower.includes('trai') && lower.includes('cyber cell'))) {
      category = 'IMPERSONATION'
      subType = 'Digital Arrest Scam (EXTREME)'
      confidence = 99
      redFlags.push('"Digital arrest" does not exist in Indian law')
      redFlags.push('Threatens immediate police action')
      redFlags.push('Instructs victim not to contact anyone')
    }
    
    // Investment scam patterns
    if ((lower.includes('invest') || lower.includes('returns') || lower.includes('profit')) &&
        (lower.includes('guaranteed') || lower.includes('sebi'))) {
      category = 'INVESTMENT_SCAM'
      subType = 'Fake Investment Scheme'
      confidence = 90
      redFlags.push('Promises guaranteed returns (illegal)')
      redFlags.push('Operates via WhatsApp groups')
    }
    
    // Add urgency red flags
    if (entities.urgency_phrases.length > 0) {
      redFlags.push(`Creates false urgency: "${entities.urgency_phrases[0]}"`)
    }
    
    // Add personal info request red flags
    if (entities.personal_info_requests.length > 0) {
      redFlags.push(`Requests sensitive information: ${entities.personal_info_requests.join(', ')}`)
    }
    
    return {
      category,
      subType,
      redFlags,
      confidence
    }
  }
  
  /**
   * Calculate risk score optimized for consumer safety
   * (Lower threshold for HIGH risk to protect families)
   */
  async calculateConsumerRisk(input, entities, classification) {
    let score = 0
    
    // Base score from classification
    score += classification.confidence * 0.6
    
    // Entity-based scoring
    if (entities.phone_numbers.length > 0) score += 10
    if (entities.urls.length > 0) score += 15
    if (entities.upi_ids.length > 0) score += 15
    if (entities.impersonated_org) score += 20
    if (entities.urgency_phrases.length > 0) score += 10
    if (entities.personal_info_requests.length > 0) score += 20
    if (entities.money_amounts.length > 0) score += 10
    
    // Category-specific adjustments
    if (classification.category === 'LOTTERY_SCAM') score += 10
    if (classification.subType.includes('EXTREME')) score = 99
    
    return Math.min(100, Math.round(score))
  }
  
  /**
   * Generate plain-language, empathetic explanations
   */
  async generateExplanations(input, entities, classification, lang) {
    const templates = {
      FINANCIAL_FRAUD: {
        en: `This message is pretending to be from ${entities.impersonated_org || 'your bank'}. Real banks never ask you to update KYC or verify your account through WhatsApp or SMS links. This is a trick to steal your login details and OTP.`,
        hi: `यह मैसेज ${entities.impersonated_org || 'आपके बैंक'} का नाटक कर रहा है। असली बैंक कभी WhatsApp या SMS link से KYC update या account verify करने को नहीं कहते। यह आपका login और OTP चुराने की चाल है।`
      },
      JOB_SCAM: {
        en: `This is a fake job offer. No real employer asks you to pay a registration fee before hiring. The promise of earning ${entities.money_amounts[0]?.value || 'large amounts'} with no experience is designed to seem too good to pass up — because it's fake.`,
        hi: `यह एक नकली job offer है। कोई भी असली employer नौकरी से पहले registration fee नहीं लेता। ${entities.money_amounts[0]?.value || 'बड़ी रकम'} कमाने का वादा इसलिए आकर्षक लगता है क्योंकि यह झूठ है।`
      },
      LOTTERY_SCAM: {
        en: `You cannot win a lottery you never entered. ${entities.impersonated_org || 'Legitimate organizations'} never contact winners by SMS and never ask for a processing fee. This is a scam to steal your money.`,
        hi: `जिस lottery में आपने हिस्सा नहीं लिया, उसमें आप जीत नहीं सकते। ${entities.impersonated_org || 'असली संस्थाएं'} कभी SMS से winners को contact नहीं करती और prize के लिए fee नहीं माँगती। यह आपके पैसे चुराने का धोखा है।`
      },
      IMPERSONATION: {
        en: `This message is impersonating ${entities.impersonated_org}. The real organization never sends messages like this. The link or phone number is fake and designed to steal your information or money.`,
        hi: `यह मैसेज ${entities.impersonated_org} का नाटक कर रहा है। असली संस्था ऐसे मैसेज नहीं भेजती। Link या phone number नकली है और आपकी जानकारी या पैसे चुराने के लिए बनाया गया है।`
      },
      INVESTMENT_SCAM: {
        en: `No legitimate investment guarantees returns — that's illegal under SEBI law. Real SEBI-registered advisors never operate on WhatsApp groups. This is designed to collect your money and disappear.`,
        hi: `कोई भी असली निवेश returns की guarantee नहीं देता — यह SEBI के कानून के खिलाफ है। असली SEBI-registered advisor WhatsApp group पर काम नहीं करते। यह आपके पैसे लेकर गायब हो जाने का जाल है।`
      }
    }
    
    const template = templates[classification.category] || {
      en: 'This message shows signs of being a scam. Be very careful before taking any action.',
      hi: 'यह मैसेज scam होने के संकेत दिखाता है। कोई भी action लेने से पहले बहुत सावधान रहें।'
    }
    
    return {
      en: template.en,
      hi: template.hi
    }
  }
  
  /**
   * Detect distress signals in user input
   */
  detectDistress(input) {
    const distressKeywords = [
      'already clicked', 'already paid', 'gave my otp', 'i am scared',
      'what do i do', 'already transferred', 'entered my password',
      'पहले ही क्लिक', 'डर लग रहा', 'क्या करूं'
    ]
    
    const lower = input.toLowerCase()
    return distressKeywords.some(keyword => lower.includes(keyword))
  }
  
  /**
   * Generate actionable steps for users
   */
  async generateActions(classification, riskScore, distressed, context) {
    const actions = {
      immediate: '',
      immediate_hi: '',
      distressedSteps: null,
      educational: null
    }
    
    // Immediate action
    if (riskScore >= 80) {
      actions.immediate = 'Do not click any links or call any numbers. Block the sender immediately. Report to cybercrime.gov.in or call 1930.'
      actions.immediate_hi = 'कोई भी link मत click करें या number पर call मत करें। Sender को तुरंत block करें। cybercrime.gov.in पर report करें या 1930 पर call करें।'
    } else if (riskScore >= 50) {
      actions.immediate = 'Be very careful. Do not share any personal information. Verify directly with the organization through their official website or helpline.'
      actions.immediate_hi = 'बहुत सावधान रहें। कोई भी personal information share मत करें। Organization की official website या helpline से सीधे verify करें।'
    } else {
      actions.immediate = 'This looks suspicious. Stay alert and do not share sensitive information.'
      actions.immediate_hi = 'यह संदिग्ध लगता है। सतर्क रहें और sensitive information share मत करें।'
    }
    
    // Distressed user steps
    if (distressed) {
      actions.distressedSteps = [
        'Call your bank immediately and ask for a transaction freeze',
        'Change your passwords now from a different device',
        'Do not share any more OTPs or information with anyone',
        'File a report at cybercrime.gov.in as soon as possible',
        'Call National Cyber Crime Helpline: 1930 (24/7, free)'
      ]
    }
    
    // Educational content
    actions.educational = {
      title: 'How to Stay Safe',
      tips: [
        'Banks never ask for OTP, password, or CVV',
        'Verify messages directly with the organization',
        'Be suspicious of urgent or threatening messages',
        'Never pay fees to claim prizes or get jobs',
        'Check website URLs carefully for spelling mistakes'
      ]
    }
    
    return actions
  }
  
  /**
   * Get risk level from score (consumer-optimized thresholds)
   */
  getRiskLevel(score) {
    if (score >= 80) return 'HIGH'
    if (score >= 50) return 'MEDIUM'
    if (score >= 20) return 'LOW'
    return 'SAFE'
  }
}

module.exports = ConsumerAgent

// Made with Bob
