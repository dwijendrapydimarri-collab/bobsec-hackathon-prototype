const KNOWN_PHONES = {
  '9876500000': { flagged: true, report_count: 1243, scam_type: 'KYC_SCAM', verdict: 'FLAGGED' },
  '8800000001': { flagged: true, report_count: 892, scam_type: 'JOB_SCAM', verdict: 'FLAGGED' }
}

async function check_phone(phone) {
  const digits = phone.replace(/[^0-9]/g, '').slice(-10)
  const result = KNOWN_PHONES[digits]
  if (result) return { phone: '+91-' + digits, ...result }
  return { phone: '+91-' + digits, flagged: false, report_count: 0, scam_type: null, verdict: 'UNKNOWN' }
}

module.exports = { check_phone }

// Made with Bob
