// IntelAgent - Orchestrates threat intelligence lookups with reputation scoring
// Enriches entities with real-time threat data

const { check_url } = require('./urlAgent')
const { check_phone } = require('./phoneAgent')
const { check_upi } = require('./upiAgent')

// Reputation scoring based on threat intel results
function calculateReputationScore(entity, verdict, reportCount = 0, feedHits = 0) {
  let score = 100 // Start with perfect score

  if (verdict === 'MALICIOUS' || verdict === 'FLAGGED') {
    score = 0
  } else if (verdict === 'SUSPICIOUS') {
    score = 30
  } else if (verdict === 'UNKNOWN') {
    score = 50
  } else if (verdict === 'CLEAN') {
    score = 100
  }

  // Adjust based on report count
  if (reportCount > 1000) score = Math.min(score, 5)
  else if (reportCount > 500) score = Math.min(score, 15)
  else if (reportCount > 100) score = Math.min(score, 30)
  else if (reportCount > 10) score = Math.min(score, 50)

  // Adjust based on feed hits
  if (feedHits > 5) score = Math.min(score, 10)
  else if (feedHits > 2) score = Math.min(score, 25)
  else if (feedHits > 0) score = Math.min(score, 40)

  return score
}

// Enrich phone numbers with threat intel
async function enrichPhones(phones) {
  if (!phones || phones.length === 0) return []

  const enriched = await Promise.all(
    phones.map(async (phone) => {
      const intel = await check_phone(phone)
      const reputation = calculateReputationScore(
        phone,
        intel.verdict,
        intel.report_count
      )

      return {
        value: intel.phone,
        verdict: intel.verdict,
        report_count: intel.report_count || 0,
        scam_type: intel.scam_type || null,
        reputation_score: reputation,
        threat_level: reputation < 30 ? 'HIGH' : reputation < 60 ? 'MEDIUM' : 'LOW'
      }
    })
  )

  return enriched
}

// Enrich URLs with threat intel
async function enrichUrls(urls) {
  if (!urls || urls.length === 0) return []

  const enriched = await Promise.all(
    urls.map(async (url) => {
      const intel = await check_url(url)
      const reputation = calculateReputationScore(
        url,
        intel.verdict,
        0,
        intel.feed_hits
      )

      return {
        value: intel.url,
        verdict: intel.verdict,
        domain_age_days: intel.domain_age_days,
        feed_hits: intel.feed_hits || 0,
        reason: intel.reason || '',
        reputation_score: reputation,
        threat_level: reputation < 30 ? 'HIGH' : reputation < 60 ? 'MEDIUM' : 'LOW'
      }
    })
  )

  return enriched
}

// Enrich UPI IDs with threat intel
async function enrichUpi(upiIds) {
  if (!upiIds || upiIds.length === 0) return []

  const enriched = await Promise.all(
    upiIds.map(async (upi) => {
      const intel = await check_upi(upi)
      const reputation = calculateReputationScore(
        upi,
        intel.verdict,
        intel.report_count
      )

      return {
        value: intel.upi_id,
        verdict: intel.verdict,
        report_count: intel.report_count || 0,
        registered_name: intel.registered_name || null,
        reputation_score: reputation,
        threat_level: reputation < 30 ? 'HIGH' : reputation < 60 ? 'MEDIUM' : 'LOW'
      }
    })
  )

  return enriched
}

// Main IntelAgent function - orchestrates all threat intel lookups
async function enrichEntities(entities) {
  const startTime = Date.now()

  // Run all enrichments in parallel
  const [phones, urls, upis] = await Promise.all([
    enrichPhones(entities.phone_numbers),
    enrichUrls(entities.urls),
    enrichUpi(entities.upi_ids)
  ])

  // Calculate overall threat score
  const allScores = [
    ...phones.map(p => p.reputation_score),
    ...urls.map(u => u.reputation_score),
    ...upis.map(u => u.reputation_score)
  ]

  const overallThreatScore = allScores.length > 0
    ? Math.min(...allScores)
    : 100

  return {
    enriched_entities: {
      phone_numbers: phones,
      urls: urls,
      upi_ids: upis,
      amounts: entities.amounts || [],
      dates: entities.dates || [],
      impersonated_org: entities.impersonated_org || '',
      urgency_phrases: entities.urgency_phrases || []
    },
    threat_intel_summary: {
      overall_threat_score: overallThreatScore,
      high_threat_entities: [
        ...phones.filter(p => p.threat_level === 'HIGH').map(p => ({ type: 'phone', value: p.value })),
        ...urls.filter(u => u.threat_level === 'HIGH').map(u => ({ type: 'url', value: u.value })),
        ...upis.filter(u => u.threat_level === 'HIGH').map(u => ({ type: 'upi', value: u.value }))
      ],
      total_reports: phones.reduce((sum, p) => sum + p.report_count, 0) + upis.reduce((sum, u) => sum + u.report_count, 0),
      total_feed_hits: urls.reduce((sum, u) => sum + u.feed_hits, 0)
    },
    processing_time_ms: Date.now() - startTime
  }
}

module.exports = { enrichEntities, calculateReputationScore }

// Made with Bob
