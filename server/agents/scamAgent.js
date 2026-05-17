// ScamAgent - Entity extraction + Rule matching + Bob classification
// This is a true Bob agent that reasons over the declarative rule DSL

const axios = require('axios')
const { evaluateAllRules } = require('../rules/scamRules')

// Entity extraction patterns
const PATTERNS = {
  phone: /(?:\+91[-\s]?)?[6-9]\d{9}/g,
  url: /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})?)/g,
  upi: /[a-zA-Z0-9._-]+@[a-zA-Z]{3,}/g,
  amount: /₹\s*[\d,]+(?:\.\d{2})?/g,
  date: /\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}/g
}

// Extract entities from message
function extractEntities(message) {
  const entities = {
    phones: [],
    urls: [],
    upi: [],
    amounts: [],
    dates: [],
    orgs: []
  }

  // Extract phones
  const phoneMatches = message.match(PATTERNS.phone)
  if (phoneMatches) {
    entities.phones = [...new Set(phoneMatches)].map(p => 
      p.replace(/[-\s]/g, '').replace(/^\+91/, '')
    )
  }

  // Extract URLs
  const urlMatches = message.match(PATTERNS.url)
  if (urlMatches) {
    entities.urls = [...new Set(urlMatches)].map(u => 
      u.replace(/^https?:\/\//, '').replace(/^www\./, '')
    )
  }

  // Extract UPI IDs
  const upiMatches = message.match(PATTERNS.upi)
  if (upiMatches) {
    entities.upi = [...new Set(upiMatches)]
  }

  // Extract amounts
  const amountMatches = message.match(PATTERNS.amount)
  if (amountMatches) {
    entities.amounts = [...new Set(amountMatches)]
  }

  // Extract dates
  const dateMatches = message.match(PATTERNS.date)
  if (dateMatches) {
    entities.dates = [...new Set(dateMatches)]
  }

  // Extract organization mentions (simple keyword matching)
  const orgKeywords = [
    'HDFC', 'SBI', 'ICICI', 'Axis', 'Bank of Baroda', 'PNB', 'Canara',
    'Amazon', 'Flipkart', 'Paytm', 'PhonePe', 'Google Pay',
    'TRAI', 'CBI', 'ED', 'Income Tax', 'GST', 'Aadhaar',
    'KBC', 'SEBI', 'NSE', 'BSE'
  ]
  
  entities.orgs = orgKeywords.filter(org => 
    message.toLowerCase().includes(org.toLowerCase())
  )

  return entities
}

// Extract urgency phrases
function extractUrgencyPhrases(message) {
  const urgencyPatterns = [
    /account will be (suspended|blocked|frozen|closed)/i,
    /within \d+ (hours?|days?|minutes?)/i,
    /immediately|urgent|hurry|limited time|expire/i,
    /ignore at your own risk/i,
    /last (chance|warning)/i
  ]

  const phrases = []
  urgencyPatterns.forEach(pattern => {
    const match = message.match(pattern)
    if (match) phrases.push(match[0])
  })

  return phrases
}

// Call IBM Bob for classification refinement
async function callBobForClassification(message, entities, matchedRules) {
  const SCAM_AGENT_PROMPT = `You are BobSec ScamAgent. Analyze this message for scam indicators targeting Indian users.

CONTEXT:
- Extracted entities: ${JSON.stringify(entities, null, 2)}
- Matched rules: ${matchedRules.map(r => r.rule.label).join(', ') || 'None'}

MESSAGE:
${message}

Return ONLY valid JSON in this exact format:
{
  "risk_score": <0-100>,
  "risk_level": "HIGH" | "MEDIUM" | "LOW" | "SAFE" | "UNKNOWN",
  "category": "FINANCIAL_FRAUD" | "PHISHING" | "JOB_SCAM" | "LOTTERY_SCAM" | "IMPERSONATION" | "INVESTMENT_SCAM" | "UNKNOWN",
  "sub_type": "<specific variant>",
  "red_flags": ["<flag 1>", "<flag 2>", "<flag 3>"],
  "confidence": <0-100>
}

Rules:
- If confidence < 55, set risk_level to UNKNOWN
- risk_score 80-100=HIGH, 50-79=MEDIUM, 20-49=LOW, 0-19=SAFE
- Use matched rules to inform your classification
- Red flags must quote specific elements from THIS message`

  try {
    const response = await axios.post(
      `${process.env.WATSONX_URL}/ml/v1/text/chat?version=2024-05-31`,
      {
        model_id: 'ibm/granite-13b-chat-v2',
        messages: [
          { role: 'system', content: SCAM_AGENT_PROMPT },
          { role: 'user', content: message }
        ],
        parameters: { 
          max_new_tokens: 800, 
          temperature: 0.1,
          top_p: 0.95
        }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WATSONX_TOKEN}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    )

    const raw = response.data.results[0].generated_text
    const clean = raw.replace(/```json|```/g, '').trim()
    return JSON.parse(clean)
  } catch (error) {
    console.error('Bob classification error:', error.message)
    
    // Fallback to rule-based classification
    if (matchedRules.length > 0) {
      const topRule = matchedRules[0]
      return {
        risk_score: Math.min(topRule.score, 95),
        risk_level: topRule.rule.severity === 'CRITICAL' ? 'HIGH' : topRule.rule.severity,
        category: topRule.rule.category,
        sub_type: topRule.rule.label,
        red_flags: topRule.matches.map(m => `${m.type}: ${m.matched.join(', ')}`),
        confidence: 75,
        fallback: true
      }
    }

    // Ultimate fallback
    return {
      risk_score: 50,
      risk_level: 'UNKNOWN',
      category: 'UNKNOWN',
      sub_type: 'Unable to classify',
      red_flags: ['Analysis service temporarily unavailable'],
      confidence: 40,
      fallback: true
    }
  }
}

// Main ScamAgent function
async function analyzeMessage(message) {
  const startTime = Date.now()

  // Step 1: Extract entities
  const entities = extractEntities(message)
  const urgencyPhrases = extractUrgencyPhrases(message)

  // Step 2: Evaluate against rule DSL
  const ruleEvaluation = evaluateAllRules(message, entities)

  // Step 3: Call Bob for classification refinement
  const bobClassification = await callBobForClassification(
    message, 
    entities, 
    ruleEvaluation.matchedRules
  )

  // Step 4: Merge results
  const result = {
    // Classification from Bob
    risk_score: bobClassification.risk_score,
    risk_level: bobClassification.risk_level,
    category: bobClassification.category,
    sub_type: bobClassification.sub_type,
    red_flags: bobClassification.red_flags,
    confidence: bobClassification.confidence,

    // Entities extracted
    entities: {
      phone_numbers: entities.phones,
      urls: entities.urls,
      upi_ids: entities.upi,
      amounts: entities.amounts,
      dates: entities.dates,
      impersonated_org: entities.orgs[0] || '',
      urgency_phrases: urgencyPhrases
    },

    // Rule matching metadata
    matched_rules: ruleEvaluation.matchedRules.map(r => ({
      id: r.rule.id,
      label: r.rule.label,
      score: r.score,
      priority: r.rule.priority
    })),
    top_rule: ruleEvaluation.topMatch ? ruleEvaluation.topMatch.rule : null,

    // Metadata
    processing_time_ms: Date.now() - startTime,
    fallback_used: bobClassification.fallback || false
  }

  return result
}

module.exports = { analyzeMessage, extractEntities }

// Made with Bob
