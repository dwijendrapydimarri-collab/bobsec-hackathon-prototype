// ExplainerAgent - Generates EN/HI explanations using IBM Bob
// Creates simplified "parent mode" versions for non-technical users

const axios = require('axios')

// Generate explanations using IBM Bob
async function generateExplanations(scamAnalysis, enrichedEntities, matchedRules) {
  const EXPLAINER_PROMPT = `You are BobSec ExplainerAgent. Generate clear, empathetic explanations for why this message is suspicious.

CONTEXT:
- Risk Level: ${scamAnalysis.risk_level}
- Category: ${scamAnalysis.category}
- Matched Rules: ${matchedRules.map(r => r.label).join(', ') || 'None'}
- Red Flags: ${scamAnalysis.red_flags.join('; ')}
- Impersonated Org: ${enrichedEntities.impersonated_org || 'None'}

Return ONLY valid JSON:
{
  "explanation_en": "<2-3 sentences in plain English. WHY is this suspicious? What is the scammer trying to do? No jargon.>",
  "explanation_hi": "<Same meaning in natural conversational Hindi. Not word-for-word translation.>",
  "user_action": "<One clear English sentence: what should the user do RIGHT NOW?>",
  "user_action_hi": "<Same action in natural Hindi>",
  "parent_mode_en": "<Ultra-simple explanation for elderly/non-tech users. Use analogies. Max 2 sentences.>",
  "parent_mode_hi": "<Same in simple Hindi with respectful tone>"
}

Rules:
- Write for frightened, non-technical Indian users
- Hindi must be natural conversational Hindi, not English translated word-by-word
- Parent mode should use simple analogies (e.g., "like a stranger asking for your house keys")
- Be empathetic but direct
- Focus on WHAT TO DO, not technical details`

  try {
    const response = await axios.post(
      `${process.env.WATSONX_URL}/ml/v1/text/chat?version=2024-05-31`,
      {
        model_id: 'ibm/granite-13b-chat-v2',
        messages: [
          { role: 'system', content: EXPLAINER_PROMPT },
          { role: 'user', content: `Generate explanations for: ${scamAnalysis.category} - ${scamAnalysis.sub_type}` }
        ],
        parameters: { 
          max_new_tokens: 600, 
          temperature: 0.3,
          top_p: 0.9
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
    console.error('ExplainerAgent error:', error.message)
    
    // Fallback to rule-based explanations
    if (matchedRules.length > 0) {
      const topRule = matchedRules[0]
      return {
        explanation_en: topRule.explanation?.en || 'This message shows signs of a scam. The sender is trying to trick you into sharing personal information or money.',
        explanation_hi: topRule.explanation?.hi || 'यह मैसेज scam के संकेत दिखाता है। भेजने वाला आपकी जानकारी या पैसे लेने की कोशिश कर रहा है।',
        user_action: 'Do not respond. Block the sender immediately and report to 1930.',
        user_action_hi: 'जवाब मत दें। Sender को तुरंत block करें और 1930 पर report करें।',
        parent_mode_en: 'This is like a stranger pretending to be from your bank. Do not trust it. Call your bank directly.',
        parent_mode_hi: 'यह ऐसे है जैसे कोई अजनबी आपके बैंक का बनकर आया हो। इस पर भरोसा मत करें। अपने बैंक को सीधे call करें।',
        fallback: true
      }
    }

    // Ultimate fallback
    return {
      explanation_en: 'This message contains suspicious elements. We recommend verifying through official channels before taking any action.',
      explanation_hi: 'इस मैसेज में संदिग्ध तत्व हैं। कोई भी कार्रवाई करने से पहले official channels से verify करें।',
      user_action: 'Verify through official channels. Do not click links or share information.',
      user_action_hi: 'Official channels से verify करें। Links पर click न करें, जानकारी share न करें।',
      parent_mode_en: 'When in doubt, do not trust it. Call the official number directly.',
      parent_mode_hi: 'शक हो तो भरोसा मत करें। Official number पर सीधे call करें।',
      fallback: true
    }
  }
}

// Generate context-aware red flags
function generateRedFlags(scamAnalysis, enrichedEntities, matchedRules) {
  const flags = []

  // Add rule-based flags
  if (matchedRules.length > 0) {
    matchedRules.forEach(rule => {
      if (rule.matches) {
        rule.matches.forEach(match => {
          if (match.type === 'containsAnyThreat') {
            flags.push(`Threat language detected: "${match.matched.join('", "')}"`)
          } else if (match.type === 'containsAnyFee') {
            flags.push(`Upfront payment demanded: ${match.matched.join(', ')}`)
          } else if (match.type === 'containsAnyOrg') {
            flags.push(`Impersonating: ${match.matched.join(', ')}`)
          }
        })
      }
    })
  }

  // Add entity-based flags
  const highThreatPhones = enrichedEntities.phone_numbers?.filter(p => p.threat_level === 'HIGH') || []
  if (highThreatPhones.length > 0) {
    highThreatPhones.forEach(phone => {
      flags.push(`Phone number ${phone.value} flagged by ${phone.report_count} community reports`)
    })
  }

  const maliciousUrls = enrichedEntities.urls?.filter(u => u.verdict === 'MALICIOUS') || []
  if (maliciousUrls.length > 0) {
    maliciousUrls.forEach(url => {
      flags.push(`Malicious domain: ${url.value} (${url.domain_age_days} days old, ${url.feed_hits} threat feeds)`)
    })
  }

  const flaggedUpi = enrichedEntities.upi_ids?.filter(u => u.verdict === 'FLAGGED') || []
  if (flaggedUpi.length > 0) {
    flaggedUpi.forEach(upi => {
      flags.push(`UPI ID ${upi.value} reported ${upi.report_count} times for fraud`)
    })
  }

  // Add urgency flags
  if (enrichedEntities.urgency_phrases?.length > 0) {
    flags.push(`Urgency pressure: "${enrichedEntities.urgency_phrases[0]}"`)
  }

  // Use Bob's red flags if we don't have enough
  if (flags.length < 3 && scamAnalysis.red_flags) {
    flags.push(...scamAnalysis.red_flags.slice(0, 5 - flags.length))
  }

  return flags.slice(0, 5) // Max 5 flags
}

// Main ExplainerAgent function
async function explainThreat(scamAnalysis, enrichedEntities, matchedRules) {
  const startTime = Date.now()

  // Generate explanations using Bob
  const explanations = await generateExplanations(scamAnalysis, enrichedEntities, matchedRules)

  // Generate context-aware red flags
  const redFlags = generateRedFlags(scamAnalysis, enrichedEntities, matchedRules)

  return {
    explanation_en: explanations.explanation_en,
    explanation_hi: explanations.explanation_hi,
    user_action: explanations.user_action,
    user_action_hi: explanations.user_action_hi,
    parent_mode_en: explanations.parent_mode_en,
    parent_mode_hi: explanations.parent_mode_hi,
    red_flags: redFlags,
    processing_time_ms: Date.now() - startTime,
    fallback_used: explanations.fallback || false
  }
}

module.exports = { explainThreat, generateRedFlags }

// Made with Bob
