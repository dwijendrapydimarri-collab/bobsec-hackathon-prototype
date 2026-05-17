// Tool functions for checking URLs, phone numbers, and UPI IDs
// These use mock data for demo but can be replaced with real threat intelligence APIs

const MOCK_URL_DATABASE = {
  'hdfc-kyc-update.tk': {
    flagged: true,
    reason: 'Lookalike phishing domain for HDFC Bank',
    domain_age_days: 3,
    feed_hits: 2,
    verdict: 'MALICIOUS'
  },
  'amazon-refund-claim.in': {
    flagged: true,
    reason: 'Lookalike domain impersonating Amazon India',
    domain_age_days: 7,
    feed_hits: 4,
    verdict: 'MALICIOUS'
  },
  'hdfc.com': {
    flagged: false,
    reason: 'Legitimate HDFC Bank domain',
    domain_age_days: 9490,
    feed_hits: 0,
    verdict: 'CLEAN'
  },
  'amazon.in': {
    flagged: false,
    reason: 'Legitimate Amazon India domain',
    domain_age_days: 8200,
    feed_hits: 0,
    verdict: 'CLEAN'
  }
};

const MOCK_PHONE_DATABASE = {
  '+91-9876500000': {
    flagged: true,
    report_count: 1243,
    scam_type: 'KYC_SCAM',
    verdict: 'FLAGGED'
  },
  '9876500000': {
    flagged: true,
    report_count: 1243,
    scam_type: 'KYC_SCAM',
    verdict: 'FLAGGED'
  },
  '+91-8800000001': {
    flagged: true,
    report_count: 892,
    scam_type: 'JOB_SCAM',
    verdict: 'FLAGGED'
  },
  '8800000001': {
    flagged: true,
    report_count: 892,
    scam_type: 'JOB_SCAM',
    verdict: 'FLAGGED'
  }
};

const MOCK_UPI_DATABASE = {
  'refund@paytm123': {
    flagged: true,
    report_count: 340,
    registered_name: null,
    verdict: 'FLAGGED'
  },
  'pay@ybl': {
    flagged: false,
    report_count: 0,
    registered_name: null,
    verdict: 'UNKNOWN'
  }
};

export async function checkUrl(url) {
  const startTime = Date.now();
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 200));
  
  // Extract domain from URL
  let domain = url;
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `http://${url}`);
    domain = urlObj.hostname;
  } catch (e) {
    // If parsing fails, use as-is
  }
  
  const result = MOCK_URL_DATABASE[domain] || {
    flagged: false,
    reason: 'No threat intelligence data available',
    domain_age_days: null,
    feed_hits: 0,
    verdict: 'CLEAN'
  };
  
  return {
    url: domain,
    ...result,
    time_ms: Date.now() - startTime,
    trace: {
      step: 2,
      agent: 'Tool: check_url',
      model: 'Threat Intel API',
      action: `Domain age + phishing feed lookup for ${domain}`,
      result: `${result.verdict} · ${result.domain_age_days || 'unknown'} days old · ${result.feed_hits} feed hits`,
      time_ms: Date.now() - startTime,
      policy_passed: true
    }
  };
}

export async function checkPhone(phone) {
  const startTime = Date.now();
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 250 + Math.random() * 150));
  
  // Normalize phone number
  const normalizedPhone = phone.replace(/\s+/g, '').replace(/^(\+91)?/, '+91-');
  const lookupKey = normalizedPhone.replace('+91-', '');
  
  const result = MOCK_PHONE_DATABASE[normalizedPhone] || 
                 MOCK_PHONE_DATABASE[lookupKey] || {
    flagged: false,
    report_count: 0,
    scam_type: null,
    verdict: 'UNKNOWN'
  };
  
  return {
    phone: normalizedPhone,
    ...result,
    time_ms: Date.now() - startTime,
    trace: {
      step: 3,
      agent: 'Tool: check_phone',
      model: 'Community Report DB',
      action: `Scam report lookup for ${normalizedPhone}`,
      result: `${result.verdict} · ${result.report_count} reports${result.scam_type ? ' · ' + result.scam_type : ''}`,
      time_ms: Date.now() - startTime,
      policy_passed: true
    }
  };
}

export async function checkUpi(upiId) {
  const startTime = Date.now();
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 150));
  
  const result = MOCK_UPI_DATABASE[upiId] || {
    flagged: false,
    report_count: 0,
    registered_name: null,
    verdict: 'UNKNOWN'
  };
  
  return {
    upi_id: upiId,
    ...result,
    time_ms: Date.now() - startTime,
    trace: {
      step: 2,
      agent: 'Tool: check_upi',
      model: 'UPI Report DB',
      action: `UPI fraud report lookup for ${upiId}`,
      result: `${result.verdict} · ${result.report_count} reports${result.registered_name ? ' · ' + result.registered_name : ''}`,
      time_ms: Date.now() - startTime,
      policy_passed: true
    }
  };
}

// Made with Bob
