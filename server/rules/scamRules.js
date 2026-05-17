// BobSec Scam Rule DSL
// Declarative rule system that IBM Bob can interpret and reason over
// Each rule defines conditions, category, and explanation for a scam pattern

export const scamRules = [
  {
    id: 'fake_kyc_bank',
    label: 'Fake bank KYC update',
    priority: 'HIGH',
    conditions: {
      containsAny: ['KYC', 'kyc', 'update', 'verification', 'verify', 'blocked', 'suspended', 'freeze'],
      containsAnyOrg: ['HDFC', 'SBI', 'ICICI', 'Axis', 'Bank of Baroda', 'PNB', 'Canara', 'Union Bank'],
      channelIn: ['sms', 'whatsapp', 'email'],
      hasEntityTypes: ['url', 'phone']
    },
    defaultCategory: 'FINANCIAL_FRAUD',
    defaultSeverity: 'HIGH',
    explanation: {
      en: 'Banks never ask for KYC updates via SMS/WhatsApp links. This is a phishing attempt.',
      hi: 'बैंक कभी SMS/WhatsApp link से KYC update नहीं माँगते। यह phishing है।'
    }
  },
  {
    id: 'digital_arrest_scam',
    label: 'Digital arrest / fake police threat',
    priority: 'CRITICAL',
    conditions: {
      containsAny: ['digital arrest', 'cyber police', 'cyber cell', 'CBI', 'ED', 'thana', 'police station'],
      containsAnyThreat: ['warrant', 'arrest', 'case', 'FIR', 'bail', 'custody', 'investigation']
    },
    defaultCategory: 'IMPERSONATION',
    defaultSeverity: 'HIGH',
    explanation: {
      en: 'Digital arrest does not exist in Indian law. This is extortion by impersonating law enforcement.',
      hi: 'भारतीय कानून में "digital arrest" जैसी कोई चीज़ नहीं है। यह police बनकर धमकी है।'
    }
  },
  {
    id: 'job_advance_fee',
    label: 'Job scam with advance fee',
    priority: 'HIGH',
    conditions: {
      containsAny: ['work from home', 'earn', 'salary', 'job', 'hiring', 'vacancy'],
      containsAnyFee: ['registration fee', 'processing fee', 'security deposit', 'pay', 'transfer'],
      hasEntityTypes: ['phone', 'upi']
    },
    defaultCategory: 'JOB_SCAM',
    defaultSeverity: 'HIGH',
    explanation: {
      en: 'Legitimate employers never ask for upfront fees. This is an advance fee fraud.',
      hi: 'असली नियोक्ता पहले पैसे नहीं माँगते। यह advance fee fraud है।'
    }
  },
  {
    id: 'lottery_prize_scam',
    label: 'Lottery / prize fraud',
    priority: 'HIGH',
    conditions: {
      containsAny: ['won', 'winner', 'lottery', 'prize', 'lucky draw', 'KBC', 'Kaun Banega Crorepati'],
      containsAnyFee: ['processing fee', 'claim', 'tax', 'transfer fee'],
      hasEntityTypes: ['upi', 'phone']
    },
    defaultCategory: 'LOTTERY_SCAM',
    defaultSeverity: 'HIGH',
    explanation: {
      en: 'You cannot win a lottery you never entered. Legitimate prizes never require fees.',
      hi: 'जिस lottery में आपने हिस्सा नहीं लिया उसमें जीत नहीं सकते। असली prize के लिए fee नहीं लगती।'
    }
  },
  {
    id: 'fake_delivery_customs',
    label: 'Fake delivery / customs clearance',
    priority: 'HIGH',
    conditions: {
      containsAny: ['parcel', 'delivery', 'courier', 'customs', 'clearance', 'held', 'AWB'],
      containsAnyOrg: ['Amazon', 'Flipkart', 'FedEx', 'DHL', 'India Post'],
      hasEntityTypes: ['url', 'phone']
    },
    defaultCategory: 'IMPERSONATION',
    defaultSeverity: 'HIGH',
    explanation: {
      en: 'Legitimate couriers never ask for payment via external links. Check your actual order on the official app.',
      hi: 'असली courier कभी बाहरी link से payment नहीं माँगते। अपना order official app पर check करें।'
    }
  },
  {
    id: 'investment_guaranteed_returns',
    label: 'Investment scam with guaranteed returns',
    priority: 'HIGH',
    conditions: {
      containsAny: ['guaranteed', 'returns', 'profit', 'investment', 'stock tips', 'trading', 'crypto'],
      containsAnyOrg: ['SEBI', 'NSE', 'BSE'],
      channelIn: ['whatsapp', 'telegram']
    },
    defaultCategory: 'INVESTMENT_SCAM',
    defaultSeverity: 'HIGH',
    explanation: {
      en: 'Guaranteed investment returns are illegal under SEBI regulations. Real advisors never operate on WhatsApp.',
      hi: 'Guaranteed returns देना SEBI के कानून के विरुद्ध है। असली advisor WhatsApp पर काम नहीं करते।'
    }
  },
  {
    id: 'otp_request_urgency',
    label: 'Urgent OTP request',
    priority: 'HIGH',
    conditions: {
      containsAny: ['OTP', 'one time password', 'verification code', 'share', 'send'],
      containsAnyUrgency: ['urgent', 'immediately', 'expire', 'within', 'hurry', 'limited time']
    },
    defaultCategory: 'PHISHING',
    defaultSeverity: 'HIGH',
    explanation: {
      en: 'Never share OTP with anyone. Banks and legitimate services never ask for OTP via call/SMS.',
      hi: 'कभी किसी को OTP मत बताएं। बैंक और असली services कभी call/SMS से OTP नहीं माँगते।'
    }
  },
  {
    id: 'impersonation_govt_agency',
    label: 'Government agency impersonation',
    priority: 'CRITICAL',
    conditions: {
      containsAnyOrg: ['TRAI', 'Income Tax', 'GST', 'Aadhaar', 'UIDAI', 'Passport Office', 'RTO'],
      containsAnyThreat: ['penalty', 'fine', 'legal action', 'suspended', 'blocked', 'cancelled']
    },
    defaultCategory: 'IMPERSONATION',
    defaultSeverity: 'HIGH',
    explanation: {
      en: 'Government agencies never demand immediate payment via phone/SMS. They send official letters.',
      hi: 'सरकारी agencies कभी phone/SMS से तुरंत payment नहीं माँगते। वे official letter भेजते हैं।'
    }
  },
  {
    id: 'suspicious_url_pattern',
    label: 'Suspicious URL pattern',
    priority: 'MEDIUM',
    conditions: {
      hasEntityTypes: ['url'],
      urlPatterns: ['.tk', '.ml', '.ga', '.cf', '.gq', 'bit.ly', 'tinyurl']
    },
    defaultCategory: 'PHISHING',
    defaultSeverity: 'MEDIUM',
    explanation: {
      en: 'This URL uses a domain commonly associated with scams. Verify before clicking.',
      hi: 'यह URL एक ऐसे domain का उपयोग करता है जो अक्सर scams में इस्तेमाल होता है। Click करने से पहले verify करें।'
    }
  },
  {
    id: 'refund_scam',
    label: 'Fake refund / cashback offer',
    priority: 'HIGH',
    conditions: {
      containsAny: ['refund', 'cashback', 'reward', 'credit', 'reversed'],
      containsAnyAction: ['click', 'verify', 'confirm', 'claim', 'update'],
      hasEntityTypes: ['url', 'phone']
    },
    defaultCategory: 'PHISHING',
    defaultSeverity: 'MEDIUM',
    explanation: {
      en: 'Legitimate refunds are processed automatically. Never click links claiming to offer refunds.',
      hi: 'असली refund automatically process होते हैं। Refund देने वाले links पर कभी click न करें।'
    }
  }
]

// Rule evaluator - checks if a message matches a rule's conditions
export function evaluateRule(rule, message, entities) {
  const messageLower = message.toLowerCase()
  const matches = []
  let score = 0

  // Check containsAny
  if (rule.conditions.containsAny) {
    const found = rule.conditions.containsAny.filter(term => 
      messageLower.includes(term.toLowerCase())
    )
    if (found.length > 0) {
      matches.push({ type: 'containsAny', matched: found })
      score += found.length * 10
    }
  }

  // Check containsAnyOrg
  if (rule.conditions.containsAnyOrg) {
    const found = rule.conditions.containsAnyOrg.filter(org => 
      messageLower.includes(org.toLowerCase())
    )
    if (found.length > 0) {
      matches.push({ type: 'containsAnyOrg', matched: found })
      score += found.length * 15
    }
  }

  // Check containsAnyThreat
  if (rule.conditions.containsAnyThreat) {
    const found = rule.conditions.containsAnyThreat.filter(threat => 
      messageLower.includes(threat.toLowerCase())
    )
    if (found.length > 0) {
      matches.push({ type: 'containsAnyThreat', matched: found })
      score += found.length * 20
    }
  }

  // Check containsAnyFee
  if (rule.conditions.containsAnyFee) {
    const found = rule.conditions.containsAnyFee.filter(fee => 
      messageLower.includes(fee.toLowerCase())
    )
    if (found.length > 0) {
      matches.push({ type: 'containsAnyFee', matched: found })
      score += found.length * 15
    }
  }

  // Check containsAnyUrgency
  if (rule.conditions.containsAnyUrgency) {
    const found = rule.conditions.containsAnyUrgency.filter(urgency => 
      messageLower.includes(urgency.toLowerCase())
    )
    if (found.length > 0) {
      matches.push({ type: 'containsAnyUrgency', matched: found })
      score += found.length * 10
    }
  }

  // Check hasEntityTypes
  if (rule.conditions.hasEntityTypes && entities) {
    const found = rule.conditions.hasEntityTypes.filter(type => {
      if (type === 'url') return entities.urls && entities.urls.length > 0
      if (type === 'phone') return entities.phones && entities.phones.length > 0
      if (type === 'upi') return entities.upi && entities.upi.length > 0
      return false
    })
    if (found.length > 0) {
      matches.push({ type: 'hasEntityTypes', matched: found })
      score += found.length * 15
    }
  }

  // Check urlPatterns
  if (rule.conditions.urlPatterns && entities && entities.urls) {
    const found = entities.urls.filter(url => 
      rule.conditions.urlPatterns.some(pattern => url.includes(pattern))
    )
    if (found.length > 0) {
      matches.push({ type: 'urlPatterns', matched: found })
      score += found.length * 25
    }
  }

  // Check channelIn
  if (rule.conditions.channelIn) {
    // This would be checked against metadata, for now we assume it matches
    score += 5
  }

  // Rule matches if it has at least 2 condition types matched and score > 20
  const isMatch = matches.length >= 2 && score >= 20

  return {
    matched: isMatch,
    score,
    matches,
    rule: {
      id: rule.id,
      label: rule.label,
      priority: rule.priority,
      category: rule.defaultCategory,
      severity: rule.defaultSeverity
    }
  }
}

// Evaluate all rules against a message
export function evaluateAllRules(message, entities) {
  const results = scamRules.map(rule => evaluateRule(rule, message, entities))
  const matched = results.filter(r => r.matched).sort((a, b) => b.score - a.score)
  
  return {
    matchedRules: matched,
    topMatch: matched[0] || null,
    totalMatched: matched.length
  }
}

// Made with Bob