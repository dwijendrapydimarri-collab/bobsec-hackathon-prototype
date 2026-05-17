const KNOWN_UPI = {
  'refund@paytm123': { flagged: true, report_count: 340, registered_name: null, verdict: 'FLAGGED' },
  'pay@ybl': { flagged: false, report_count: 0, registered_name: null, verdict: 'UNKNOWN' }
}

async function check_upi(upiId) {
  const id = upiId.toLowerCase().trim()
  const result = KNOWN_UPI[id]
  if (result) return { upi_id: id, ...result }
  return { upi_id: id, flagged: false, report_count: 0, registered_name: null, verdict: 'UNKNOWN' }
}

module.exports = { check_upi }

// Made with Bob
