const KNOWN_URLS = {
  'hdfc-kyc-update.tk': { flagged: true, reason: 'Lookalike phishing domain for HDFC Bank', domain_age_days: 3, feed_hits: 2, verdict: 'MALICIOUS' },
  'amazon-refund-claim.in': { flagged: true, reason: 'Lookalike domain impersonating Amazon India', domain_age_days: 7, feed_hits: 4, verdict: 'MALICIOUS' },
  'hdfc.com': { flagged: false, reason: 'Official HDFC Bank domain', domain_age_days: 9490, feed_hits: 0, verdict: 'CLEAN' },
  'amazon.in': { flagged: false, reason: 'Official Amazon India domain', domain_age_days: 8200, feed_hits: 0, verdict: 'CLEAN' },
  'cybercrime.gov.in': { flagged: false, reason: 'Official Indian Cybercrime portal', domain_age_days: 3650, feed_hits: 0, verdict: 'CLEAN' }
}

async function check_url(url) {
  const domain = url.replace(/https?:\/\//, '').split('/')[0].toLowerCase().trim()
  const result = KNOWN_URLS[domain]
  if (result) return { url: domain, ...result }
  return { url: domain, flagged: false, reason: 'No threat data found for this domain', domain_age_days: null, feed_hits: 0, verdict: 'CLEAN' }
}

module.exports = { check_url }

// Made with Bob
