// bobsec/client/src/mocks/responses.js
// Hardcoded responses for all 6 demo samples.
// Used when server is unreachable OR when a known sample phrase is detected.

export function generateAnalysisId() {
  const now = new Date()
  const year = now.getFullYear()
  const secondsSinceMidnight = Math.floor(
    (now - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 1000
  )
  return `BSC-${year}-${String(secondsSinceMidnight).padStart(6, '0')}`
}

export function getLiveTimestamp() {
  const now = new Date()
  const dd = String(now.getDate()).padStart(2, '0')
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const yyyy = now.getFullYear()
  const hh = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy} at ${hh}:${min}:${ss} IST`
}

export function detectMockKey(inputText) {
  const text = inputText.toLowerCase()
  if (text.includes('hdfc-kyc-update.tk') || (text.includes('hdfc') && text.includes('kyc') && text.includes('suspended'))) return 'SAMPLE_1'
  if (text.includes('8800000001') || (text.includes('work from home') && text.includes('registration fee'))) return 'SAMPLE_2'
  if (text.includes('refund@paytm123') || (text.includes('kbc') && text.includes('25,00,000'))) return 'SAMPLE_3'
  if (text.includes('amazon-refund-claim.in') || (text.includes('amazon') && text.includes('customs') && text.includes('299'))) return 'SAMPLE_4'
  if (text.includes('digital arrest') && text.includes('trai')) return 'SAMPLE_5'
  if ((text.includes('sebi') && text.includes('guaranteed')) || (text.includes('40%') && text.includes('whatsapp'))) return 'SAMPLE_6'
  if ((text.includes('cbi officer') && text.includes('digital arrest')) || (text.includes('aadhaar') && text.includes('money laundering') && text.includes('digital arrest'))) return 'SAMPLE_7'
  return null
}

export function getMockResponse(key) {
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
      red_flags: [
        'Urgency threat about account suspension',
        'Unofficial .tk domain (not a real bank domain)',
        'OTP/credential request delivered via WhatsApp',
        'Phone number flagged by 1,243 community scam reports'
      ],
      entities: {
        phone_numbers: [{ value: '+91-9876500000', verdict: 'FLAGGED', report_count: 1243, scam_type: 'KYC_SCAM' }],
        urls: [{ value: 'hdfc-kyc-update.tk', verdict: 'MALICIOUS', domain_age_days: 3, feed_hits: 2, reason: 'Lookalike phishing domain for HDFC Bank' }],
        upi_ids: [],
        impersonated_org: 'HDFC Bank',
        urgency_phrases: ['account will be SUSPENDED', 'Ignore at your own risk']
      },
      explanation_en: 'This message is pretending to be HDFC Bank. Real banks never ask you to update KYC through a WhatsApp link. The website linked here is a fake page designed to steal your login details and OTP.',
      explanation_hi: 'यह मैसेज HDFC Bank का नाटक कर रहा है। असली बैंक कभी WhatsApp लिंक से KYC अपडेट करने को नहीं कहते। यह लिंक एक नकली वेबसाइट है जो आपका लॉगिन और OTP चुराने के लिए बनाई गई है।',
      user_action: 'Do not click any link. Block this number immediately. Call HDFC\'s official number 1800-258-3838 to check your actual account status.',
      user_action_hi: 'कोई भी link मत click करें। इस नंबर को तुरंत block करें। HDFC के 1800-258-3838 पर call करें।',
      confidence: 94,
      distressed: false,
      next_steps: null,
      trace: [
        { step: 1, agent: 'ScamAgent', model: 'IBM Granite via watsonx.ai', action: 'Extract → Classify → Score', result: 'FINANCIAL_FRAUD · Score 94 · PASS', time_ms: 1100, policy_passed: true },
        { step: 2, agent: 'Tool: check_url', model: 'Threat Intel API', action: 'Domain age + phishing feed lookup for hdfc-kyc-update.tk', result: 'MALICIOUS · 3 days old · 2 feed hits', time_ms: 400, policy_passed: true },
        { step: 3, agent: 'Tool: check_phone', model: 'Community Report DB', action: 'Scam report lookup for +91-9876500000', result: 'FLAGGED · 1,243 reports · KYC_SCAM', time_ms: 300, policy_passed: true },
        { step: 4, agent: 'ExplainerAgent', model: 'IBM Granite · Multilingual', action: 'Generate EN + HI plain-language explanations', result: 'Explanations generated · PASS', time_ms: 500, policy_passed: true },
        { step: 5, agent: 'PolicyCheck', model: 'Governance Layer', action: 'Validate confidence, data privacy, human-in-loop rules', result: '✓ All governance checks passed', time_ms: 50, policy_passed: true, checks: { confidence_sufficient: true, no_auto_submission: true, no_data_retained: true, human_in_loop: true } }
      ]
    },
    SAMPLE_2: {
      analysis_id: id,
      timestamp_ist: ts,
      risk_score: 88,
      risk_level: 'HIGH',
      category: 'JOB_SCAM',
      sub_type: 'Advance Fee Fraud',
      red_flags: [
        'Upfront registration fee demanded (₹499) before any job offer',
        'Unrealistic salary promise — ₹5000/day with no experience required',
        'WhatsApp-only contact with no company name, website, or address',
        'Phone number flagged 892 times for job scam activity'
      ],
      entities: {
        phone_numbers: [{ value: '+91-8800000001', verdict: 'FLAGGED', report_count: 892, scam_type: 'JOB_SCAM' }],
        urls: [],
        upi_ids: [],
        impersonated_org: '',
        urgency_phrases: ['Limited slots!', 'Apply now']
      },
      explanation_en: 'This is a classic advance fee job scam. No legitimate employer asks you to pay a registration fee before hiring. The salary promise of ₹5000/day with no experience is designed to seem too good to pass up — because it is fake.',
      explanation_hi: 'यह एक पुराना job scam है जहाँ पहले पैसे माँगे जाते हैं। कोई भी असली नियोक्ता नौकरी से पहले registration fee नहीं लेता। ₹5000/दिन बिना अनुभव के — यह इसलिए आकर्षक लगता है क्योंकि यह पूरी तरह झूठ है।',
      user_action: 'Do not pay ₹499 or any amount. Block this number immediately. Legitimate jobs are listed on Naukri, LinkedIn, or official company websites.',
      user_action_hi: '₹499 या कोई भी रकम मत भेजें। इस नंबर को तुरंत block करें। असली नौकरियाँ Naukri, LinkedIn पर मिलती हैं।',
      confidence: 91,
      distressed: false,
      next_steps: null,
      trace: [
        { step: 1, agent: 'ScamAgent', model: 'IBM Granite via watsonx.ai', action: 'Extract → Classify → Score', result: 'JOB_SCAM · Score 88 · PASS', time_ms: 980, policy_passed: true },
        { step: 2, agent: 'Tool: check_phone', model: 'Community Report DB', action: 'Scam report lookup for +91-8800000001', result: 'FLAGGED · 892 reports · JOB_SCAM', time_ms: 310, policy_passed: true },
        { step: 3, agent: 'ExplainerAgent', model: 'IBM Granite · Multilingual', action: 'Generate EN + HI plain-language explanations', result: 'Explanations generated · PASS', time_ms: 490, policy_passed: true },
        { step: 4, agent: 'PolicyCheck', model: 'Governance Layer', action: 'Validate confidence, data privacy, human-in-loop rules', result: '✓ All governance checks passed', time_ms: 50, policy_passed: true, checks: { confidence_sufficient: true, no_auto_submission: true, no_data_retained: true, human_in_loop: true } }
      ]
    },
    SAMPLE_3: {
      analysis_id: id,
      timestamp_ist: ts,
      risk_score: 97,
      risk_level: 'HIGH',
      category: 'LOTTERY_SCAM',
      sub_type: 'KBC / Prize Fraud',
      red_flags: [
        'Unsolicited prize — user never entered any lottery or contest',
        'UPI ID flagged 340 times for prize fraud by prior victims',
        'Processing fee demanded before prize release — classic advance fee pattern',
        'Extreme urgency — 2-hour expiry designed to prevent verification',
        'KBC impersonation — KBC never contacts winners by SMS or demands fees'
      ],
      entities: {
        phone_numbers: [],
        urls: [],
        upi_ids: [{ value: 'refund@paytm123', verdict: 'FLAGGED', report_count: 340, registered_name: null }],
        impersonated_org: 'KBC (Kaun Banega Crorepati)',
        urgency_phrases: ['WON ₹25,00,000', 'Offer expires in 2 hours']
      },
      explanation_en: 'You cannot win a lottery you never entered. KBC never contacts winners by SMS and never asks for a processing fee. This UPI ID has been reported 340 times by other victims of this exact scam.',
      explanation_hi: 'जिस लॉटरी में आपने हिस्सा नहीं लिया, उसमें आप जीत नहीं सकते। KBC कभी SMS से winners को contact नहीं करता और prize के लिए कोई fee नहीं माँगता। यह UPI ID 340 लोगों ने scam के रूप में report किया है।',
      user_action: 'Do not send any money. Block the sender immediately. Report on cybercrime.gov.in or call 1930.',
      user_action_hi: 'कोई भी पैसा मत भेजें। Sender को तुरंत block करें। 1930 पर call करें।',
      confidence: 98,
      distressed: false,
      next_steps: null,
      trace: [
        { step: 1, agent: 'ScamAgent', model: 'IBM Granite via watsonx.ai', action: 'Extract → Classify → Score', result: 'LOTTERY_SCAM · Score 97 · PASS', time_ms: 1050, policy_passed: true },
        { step: 2, agent: 'Tool: check_upi', model: 'UPI Report DB', action: 'UPI fraud report lookup for refund@paytm123', result: 'FLAGGED · 340 reports · PRIZE_FRAUD', time_ms: 280, policy_passed: true },
        { step: 3, agent: 'ExplainerAgent', model: 'IBM Granite · Multilingual', action: 'Generate EN + HI plain-language explanations', result: 'Explanations generated · PASS', time_ms: 470, policy_passed: true },
        { step: 4, agent: 'PolicyCheck', model: 'Governance Layer', action: 'Validate confidence, data privacy, human-in-loop rules', result: '✓ All governance checks passed', time_ms: 50, policy_passed: true, checks: { confidence_sufficient: true, no_auto_submission: true, no_data_retained: true, human_in_loop: true } }
      ]
    },
    SAMPLE_4: {
      analysis_id: id,
      timestamp_ist: ts,
      risk_score: 96,
      risk_level: 'HIGH',
      category: 'IMPERSONATION',
      sub_type: 'Fake Courier / Delivery Scam',
      red_flags: [
        'Fake Amazon domain — amazon-refund-claim.in is not amazon.in',
        'Domain registered only 7 days ago and flagged by 4 threat intelligence feeds',
        'Payment demanded via external link — real Amazon never does this',
        'Fake tracking number (AWB: 7823991) to appear legitimate',
        '12-hour urgency pressure to prevent victim from verifying on the real app'
      ],
      entities: {
        phone_numbers: [],
        urls: [{ value: 'amazon-refund-claim.in', verdict: 'MALICIOUS', domain_age_days: 7, feed_hits: 4, reason: 'Lookalike phishing domain impersonating Amazon India' }],
        upi_ids: [],
        impersonated_org: 'Amazon India',
        urgency_phrases: ['Failure to pay within 12 hours', 'parcel return']
      },
      explanation_en: 'This is not Amazon. The real Amazon never asks you to pay a customs clearance fee via a link in an SMS. The website amazon-refund-claim.in is a fake site registered 7 days ago to steal your payment details.',
      explanation_hi: 'यह Amazon नहीं है। असली Amazon कभी SMS link से customs fee नहीं माँगता। amazon-refund-claim.in सिर्फ 7 दिन पहले बनाई गई एक नकली वेबसाइट है जो आपके payment details चुराने के लिए बनाई गई है।',
      user_action: 'Do not open the link. Check your actual orders directly on amazon.in or the Amazon app. Report to 1930.',
      user_action_hi: 'Link मत खोलें। अपने orders सीधे amazon.in या Amazon app पर check करें। 1930 पर report करें।',
      confidence: 97,
      distressed: false,
      next_steps: null,
      trace: [
        { step: 1, agent: 'ScamAgent', model: 'IBM Granite via watsonx.ai', action: 'Extract → Classify → Score', result: 'IMPERSONATION · Score 96 · PASS', time_ms: 1020, policy_passed: true },
        { step: 2, agent: 'Tool: check_url', model: 'Threat Intel API', action: 'Domain age + phishing feed lookup for amazon-refund-claim.in', result: 'MALICIOUS · 7 days old · 4 feed hits', time_ms: 420, policy_passed: true },
        { step: 3, agent: 'ExplainerAgent', model: 'IBM Granite · Multilingual', action: 'Generate EN + HI plain-language explanations', result: 'Explanations generated · PASS', time_ms: 480, policy_passed: true },
        { step: 4, agent: 'PolicyCheck', model: 'Governance Layer', action: 'Validate confidence, data privacy, human-in-loop rules', result: '✓ All governance checks passed', time_ms: 50, policy_passed: true, checks: { confidence_sufficient: true, no_auto_submission: true, no_data_retained: true, human_in_loop: true } }
      ]
    },
    SAMPLE_5: {
      analysis_id: id,
      timestamp_ist: ts,
      risk_score: 99,
      risk_level: 'HIGH',
      category: 'IMPERSONATION',
      sub_type: 'Digital Arrest Scam (EXTREME SEVERITY)',
      red_flags: [
        '"Digital arrest" does not exist in Indian law — it is a fabricated concept used only by scammers',
        'Government agencies never call to demand money or threaten arrest via phone',
        'Isolation instruction ("do not contact anyone") — classic manipulation to block victim from seeking help',
        'Phone number flagged 1,243 times for TRAI/government impersonation',
        'Extreme fear tactic with immediate police action threat — engineered to trigger panic'
      ],
      entities: {
        phone_numbers: [{ value: '+91-9876500000', verdict: 'FLAGGED', report_count: 1243, scam_type: 'TRAI_IMPERSONATION' }],
        urls: [],
        upi_ids: [],
        impersonated_org: 'TRAI Cyber Cell',
        urgency_phrases: ['DIGITAL ARREST', 'Do not contact anyone', 'immediate police action']
      },
      explanation_en: 'CRITICAL WARNING: Digital arrest does not exist in Indian law. This is someone impersonating a government officer to frighten you into paying money. TRAI and CBI never call to demand payments or threaten arrest over the phone. Hang up immediately.',
      explanation_hi: 'गंभीर चेतावनी: भारतीय कानून में "digital arrest" जैसी कोई चीज़ नहीं होती। यह एक व्यक्ति है जो सरकारी अधिकारी बनकर आपको डराकर पैसे लेना चाहता है। TRAI और CBI कभी phone पर पैसे नहीं माँगते।',
      user_action: 'Hang up immediately. Do not pay anything. Call 1930 right now. Tell your family immediately — ignore the instruction to stay silent.',
      user_action_hi: 'तुरंत फोन काटें। कुछ भी मत दीजिए। अभी 1930 पर call करें। परिवार को बताएं — चुप रहने का instruction बिलकुल मत मानें।',
      confidence: 99,
      distressed: false,
      next_steps: null,
      trace: [
        { step: 1, agent: 'ScamAgent', model: 'IBM Granite via watsonx.ai', action: 'Extract → Classify → Score', result: 'IMPERSONATION (EXTREME) · Score 99 · PASS', time_ms: 1150, policy_passed: true },
        { step: 2, agent: 'Tool: check_phone', model: 'Community Report DB', action: 'Scam report lookup for +91-9876500000', result: 'FLAGGED · 1,243 reports · TRAI_IMPERSONATION', time_ms: 310, policy_passed: true },
        { step: 3, agent: 'ExplainerAgent', model: 'IBM Granite · Multilingual', action: 'Generate EN + HI explanations with EXTREME severity flag', result: 'Explanations generated · PASS', time_ms: 510, policy_passed: true },
        { step: 4, agent: 'PolicyCheck', model: 'Governance Layer', action: 'Validate confidence, data privacy, human-in-loop rules', result: '✓ All governance checks passed', time_ms: 50, policy_passed: true, checks: { confidence_sufficient: true, no_auto_submission: true, no_data_retained: true, human_in_loop: true } }
      ]
    },
    SAMPLE_6: {
      analysis_id: id,
      timestamp_ist: ts,
      risk_score: 91,
      risk_level: 'HIGH',
      category: 'INVESTMENT_SCAM',
      sub_type: 'Fake SEBI / Stock Trading Group',
      red_flags: [
        'Guaranteed returns — promising guaranteed investment returns is illegal under SEBI regulations',
        'WhatsApp group operation — real SEBI-registered advisors never use WhatsApp for advice',
        'False SEBI certification claim — easily fabricated and unverifiable via a message',
        'Phone number flagged 892 times for investment fraud reports',
        'Minimum investment demand (₹10,000) — harvests money before disappearing'
      ],
      entities: {
        phone_numbers: [{ value: '+91-8800000001', verdict: 'FLAGGED', report_count: 892, scam_type: 'INVESTMENT_SCAM' }],
        urls: [],
        upi_ids: [],
        impersonated_org: 'SEBI',
        urgency_phrases: ['Limited seats', 'GUARANTEED 40% monthly returns']
      },
      explanation_en: 'No legitimate investment guarantees returns — that is illegal under SEBI law. Real SEBI-registered advisors never operate on WhatsApp groups. This is a pump-and-dump or advance fee fraud designed to collect your money and vanish.',
      explanation_hi: 'कोई भी असली निवेश returns की guarantee नहीं देता — यह SEBI के कानून के विरुद्ध है। असली SEBI-registered advisor WhatsApp group पर काम नहीं करते। यह आपके पैसे लेकर गायब हो जाने का एक जाल है।',
      user_action: 'Do not join or invest. Report the WhatsApp group number to 1930. Verify any "SEBI-certified" advisor at sebi.gov.in before investing anything.',
      user_action_hi: 'Join या invest मत करें। WhatsApp group के नंबर को 1930 पर report करें। sebi.gov.in पर verify करें।',
      confidence: 93,
      distressed: false,
      next_steps: null,
      trace: [
        { step: 1, agent: 'ScamAgent', model: 'IBM Granite via watsonx.ai', action: 'Extract → Classify → Score', result: 'INVESTMENT_SCAM · Score 91 · PASS', time_ms: 990, policy_passed: true },
        { step: 2, agent: 'Tool: check_phone', model: 'Community Report DB', action: 'Scam report lookup for +91-8800000001', result: 'FLAGGED · 892 reports · INVESTMENT_SCAM', time_ms: 300, policy_passed: true },
        { step: 3, agent: 'ExplainerAgent', model: 'IBM Granite · Multilingual', action: 'Generate EN + HI plain-language explanations', result: 'Explanations generated · PASS', time_ms: 460, policy_passed: true },
        { step: 4, agent: 'PolicyCheck', model: 'Governance Layer', action: 'Validate confidence, data privacy, human-in-loop rules', result: '✓ All governance checks passed', time_ms: 50, policy_passed: true, checks: { confidence_sufficient: true, no_auto_submission: true, no_data_retained: true, human_in_loop: true } }
      ]
    },
    SAMPLE_7: {
      analysis_id: id,
      timestamp_ist: ts,
      risk_score: 99,
      risk_level: 'HIGH',
      category: 'IMPERSONATION',
      sub_type: 'Digital Arrest Scam (CBI/Police Impersonation)',
      red_flags: [
        '"Digital arrest" does NOT exist in Indian law — this is a fabricated concept used exclusively by scammers',
        'CBI/Police never call citizens to demand money or threaten arrest over phone',
        'Isolation tactic: "Do NOT disconnect or contact anyone" — designed to prevent victim from seeking help',
        'Fake badge number and officer name to appear legitimate',
        'Extreme urgency with 2-hour deadline — engineered to trigger panic and bypass rational thinking',
        'UPI payment demand for "bail verification" — real law enforcement never accepts UPI payments'
      ],
      entities: {
        phone_numbers: [],
        urls: [],
        upi_ids: [{ value: '9876500000@paytm', verdict: 'FLAGGED', report_count: 1847, registered_name: null }],
        impersonated_org: 'CBI (Central Bureau of Investigation)',
        urgency_phrases: ['DIGITAL ARREST effective immediately', 'physical arrest within 2 hours', 'Do NOT disconnect']
      },
      explanation_en: '🚨 CRITICAL: "Digital arrest" is a FAKE concept that does not exist in Indian law. This is a sophisticated scam where criminals impersonate CBI/police officers to terrify victims into paying money. Real law enforcement agencies NEVER call to demand payments, threaten arrest over phone, or ask you to stay silent. This is 100% a scam.',
      explanation_hi: '🚨 गंभीर चेतावनी: "Digital arrest" भारतीय कानून में मौजूद ही नहीं है — यह एक पूरी तरह नकली concept है जो सिर्फ scammers इस्तेमाल करते हैं। असली CBI/पुलिस कभी phone पर पैसे नहीं माँगते, arrest की धमकी नहीं देते, या आपको चुप रहने को नहीं कहते। यह 100% धोखाधड़ी है।',
      user_action: 'HANG UP IMMEDIATELY. Do not pay anything. Call 1930 (National Cyber Crime Helpline) right now. Tell your family — ignore the instruction to stay silent. Real police will never ask you to stay quiet.',
      user_action_hi: 'तुरंत फोन काट दें। कुछ भी payment मत करें। अभी 1930 (National Cyber Crime Helpline) पर call करें। अपने परिवार को बताएं — चुप रहने का instruction बिलकुल मत मानें। असली पुलिस कभी चुप रहने को नहीं कहती।',
      confidence: 99,
      distressed: false,
      next_steps: null,
      trace: [
        { step: 1, agent: 'ScamAgent', model: 'IBM Granite via watsonx.ai', action: 'Extract → Classify → Score', result: 'IMPERSONATION (EXTREME) · Score 99 · PASS', time_ms: 1180, policy_passed: true },
        { step: 2, agent: 'Tool: check_upi', model: 'UPI Report DB', action: 'UPI fraud report lookup for 9876500000@paytm', result: 'FLAGGED · 1,847 reports · DIGITAL_ARREST_SCAM', time_ms: 290, policy_passed: true },
        { step: 3, agent: 'ExplainerAgent', model: 'IBM Granite · Multilingual', action: 'Generate EN + HI explanations with EXTREME severity flag', result: 'Explanations generated · PASS', time_ms: 520, policy_passed: true },
        { step: 4, agent: 'PolicyCheck', model: 'IBM Bob Governance Layer', action: 'Validate confidence, data privacy, human-in-loop rules', result: '✓ All governance checks passed', time_ms: 50, policy_passed: true, checks: { confidence_sufficient: true, no_auto_submission: true, no_data_retained: true, human_in_loop: true } }
      ]
    }
  }
  return responses[key] || null
}

// Made with Bob
