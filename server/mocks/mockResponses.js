// Mock responses for demo mode
// These are used when MOCK_MODE=true or when watsonx.ai is unavailable

function generateAnalysisId() {
  const now = new Date()
  const year = now.getFullYear()
  const secSinceMidnight = Math.floor(
    (now - new Date(year, now.getMonth(), now.getDate())) / 1000
  )
  return `BSC-${year}-${String(secSinceMidnight).padStart(6, '0')}`
}

function getLiveTimestamp() {
  const now = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} at ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())} IST`
}

// Detect which sample the input matches
function detectMockKey(inputText) {
  const text = inputText.toLowerCase()
  
  if (text.includes('hdfc-kyc-update.tk') || (text.includes('hdfc') && text.includes('kyc') && text.includes('suspended'))) {
    return 'SAMPLE_1'
  }
  if (text.includes('8800000001') || (text.includes('work from home') && text.includes('registration fee'))) {
    return 'SAMPLE_2'
  }
  if (text.includes('refund@paytm123') || (text.includes('kbc') && text.includes('25,00,000'))) {
    return 'SAMPLE_3'
  }
  if (text.includes('amazon-refund-claim.in') || (text.includes('amazon') && text.includes('customs') && text.includes('299'))) {
    return 'SAMPLE_4'
  }
  if (text.includes('digital arrest') || text.includes('trai cyber cell')) {
    return 'SAMPLE_5'
  }
  if ((text.includes('sebi') && text.includes('guaranteed')) || (text.includes('40%') && text.includes('whatsapp'))) {
    return 'SAMPLE_6'
  }
  
  return null
}

// Get mock response for a sample key
function getMockResponse(key) {
  const id = generateAnalysisId()
  const ts = getLiveTimestamp()
  
  const responses = {
    SAMPLE_1: {
      analysis_id: id,
      timestamp_ist: ts,
      risk_score: 94,
      risk_level: 'HIGH',
      category: 'FINANCIAL_FRAUD',
      sub_type: 'KYC Phishing',
      confidence: 94,
      explanation_en: 'This message is pretending to be HDFC Bank. Real banks never ask you to update KYC through a WhatsApp link. The website linked here is a fake page designed to steal your login details and OTP.',
      explanation_hi: 'यह मैसेज HDFC Bank का नाटक कर रहा है। असली बैंक कभी WhatsApp लिंक से KYC अपडेट करने को नहीं कहते। यह लिंक एक नकली वेबसाइट है जो आपका लॉगिन और OTP चुराने के लिए बनाई गई है।',
      user_action: 'Do not click any link. Block this number immediately. Call HDFC\'s official number 1800-258-3838 to check your actual account status.',
      user_action_hi: 'कोई भी link मत click करें। इस नंबर को तुरंत block करें। HDFC के 1800-258-3838 पर call करें।',
      parent_mode_en: 'This is like a stranger pretending to be from your bank. Do not trust it. Call your bank directly using the number on your ATM card.',
      parent_mode_hi: 'यह ऐसे है जैसे कोई अजनबी आपके बैंक का बनकर आया हो। इस पर भरोसा मत करें। अपने ATM card पर लिखे नंबर से बैंक को call करें।',
      red_flags: [
        'Urgency threat about account suspension',
        'Unofficial .tk domain (not a real bank domain)',
        'OTP/credential request delivered via WhatsApp',
        'Phone number flagged by 1,243 community scam reports'
      ],
      entities: {
        phone_numbers: [{ value: '+91-9876500000', verdict: 'FLAGGED', report_count: 1243, scam_type: 'KYC_SCAM', reputation_score: 0, threat_level: 'HIGH' }],
        urls: [{ value: 'hdfc-kyc-update.tk', verdict: 'MALICIOUS', domain_age_days: 3, feed_hits: 2, reason: 'Lookalike phishing domain for HDFC Bank', reputation_score: 10, threat_level: 'HIGH' }],
        upi_ids: [],
        amounts: [],
        dates: [],
        impersonated_org: 'HDFC Bank',
        urgency_phrases: ['account will be SUSPENDED', 'Ignore at your own risk']
      },
      matched_rules: [
        { id: 'fake_kyc_bank', label: 'Fake bank KYC update', score: 85, priority: 'HIGH' }
      ],
      distressed: false,
      mode: 'pre_incident',
      trace: [
        { step: 1, agent: 'PromptFirewall', model: 'Security Layer', action: 'PII redaction + jailbreak detection', result: 'No PII · Clean · PASS', time_ms: 45, policy_passed: true },
        { step: 2, agent: 'ScamAgent', model: 'IBM Granite via watsonx.ai', action: 'Extract entities → Match rules → Classify with Bob', result: 'FINANCIAL_FRAUD · Score 94 · 1 rules matched · PASS', time_ms: 1100, policy_passed: true },
        { step: 3, agent: 'IntelAgent', model: 'Threat Intelligence APIs', action: 'Enrich entities with reputation scoring', result: 'Threat score: 0/100 · 2 high-threat entities · PASS', time_ms: 710, policy_passed: true },
        { step: 4, agent: 'ExplainerAgent', model: 'IBM Granite · Multilingual', action: 'Generate EN + HI explanations with parent mode', result: 'Explanations generated · 4 red flags · PASS', time_ms: 500, policy_passed: true },
        { step: 5, agent: 'PolicyCheckAgent', model: 'Governance Layer', action: 'Validate confidence, data privacy, human-in-loop rules', result: '✓ All governance checks passed', time_ms: 50, policy_passed: true, checks: { confidence_sufficient: true, no_auto_submission: true, no_data_retained: true, human_in_loop: true } }
      ],
      total_processing_time_ms: 2405
    },
    
    SAMPLE_2: {
      analysis_id: id,
      timestamp_ist: ts,
      risk_score: 88,
      risk_level: 'HIGH',
      category: 'JOB_SCAM',
      sub_type: 'Advance Fee Fraud',
      confidence: 91,
      explanation_en: 'This is a classic advance fee job scam. No legitimate employer asks you to pay a registration fee before hiring. The salary promise of ₹5000/day with no experience is designed to seem too good to pass up — because it is fake.',
      explanation_hi: 'यह एक पुराना job scam है जहाँ पहले पैसे माँगे जाते हैं। कोई भी असली नियोक्ता नौकरी से पहले registration fee नहीं लेता। ₹5000/दिन बिना अनुभव के — यह इसलिए आकर्षक लगता है क्योंकि यह पूरी तरह झूठ है।',
      user_action: 'Do not pay ₹499 or any amount. Block this number immediately. Legitimate jobs are listed on Naukri, LinkedIn, or official company websites.',
      user_action_hi: '₹499 या कोई भी रकम मत भेजें। इस नंबर को तुरंत block करें। असली नौकरियाँ Naukri, LinkedIn पर मिलती हैं।',
      parent_mode_en: 'Real jobs never ask for money first. This is a trap. Tell your children to never pay for job applications.',
      parent_mode_hi: 'असली नौकरी पहले पैसे नहीं माँगती। यह जाल है। अपने बच्चों को बताएं कि job के लिए कभी पैसे न दें।',
      red_flags: [
        'Upfront registration fee demanded (₹499) before any job offer',
        'Unrealistic salary promise — ₹5000/day with no experience required',
        'WhatsApp-only contact with no company name, website, or address',
        'Phone number flagged 892 times for job scam activity'
      ],
      entities: {
        phone_numbers: [{ value: '+91-8800000001', verdict: 'FLAGGED', report_count: 892, scam_type: 'JOB_SCAM', reputation_score: 5, threat_level: 'HIGH' }],
        urls: [],
        upi_ids: [],
        amounts: ['₹499', '₹5000'],
        dates: [],
        impersonated_org: '',
        urgency_phrases: ['Limited slots!', 'Apply now']
      },
      matched_rules: [
        { id: 'job_advance_fee', label: 'Job scam with advance fee', score: 90, priority: 'HIGH' }
      ],
      distressed: false,
      mode: 'pre_incident',
      trace: [
        { step: 1, agent: 'PromptFirewall', model: 'Security Layer', action: 'PII redaction + jailbreak detection', result: 'No PII · Clean · PASS', time_ms: 42, policy_passed: true },
        { step: 2, agent: 'ScamAgent', model: 'IBM Granite via watsonx.ai', action: 'Extract entities → Match rules → Classify with Bob', result: 'JOB_SCAM · Score 88 · 1 rules matched · PASS', time_ms: 980, policy_passed: true },
        { step: 3, agent: 'IntelAgent', model: 'Threat Intelligence APIs', action: 'Enrich entities with reputation scoring', result: 'Threat score: 5/100 · 1 high-threat entities · PASS', time_ms: 310, policy_passed: true },
        { step: 4, agent: 'ExplainerAgent', model: 'IBM Granite · Multilingual', action: 'Generate EN + HI explanations with parent mode', result: 'Explanations generated · 4 red flags · PASS', time_ms: 490, policy_passed: true },
        { step: 5, agent: 'PolicyCheckAgent', model: 'Governance Layer', action: 'Validate confidence, data privacy, human-in-loop rules', result: '✓ All governance checks passed', time_ms: 50, policy_passed: true, checks: { confidence_sufficient: true, no_auto_submission: true, no_data_retained: true, human_in_loop: true } }
      ],
      total_processing_time_ms: 1872
    }
  }
  
  return responses[key] || null
}

module.exports = { detectMockKey, getMockResponse }

// Made with Bob
