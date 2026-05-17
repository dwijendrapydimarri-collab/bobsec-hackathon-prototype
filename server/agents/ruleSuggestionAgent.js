// RuleSuggestionAgent - Proposes new scam rules based on user feedback
// This is the feedback learning loop that makes BobSec self-improving

const axios = require('axios')
const fs = require('fs').promises
const path = require('path')

// Path to store suggested rules
const SUGGESTIONS_FILE = path.join(__dirname, '../rules/ruleSuggestions.json')

// Load existing suggestions
async function loadSuggestions() {
  try {
    const data = await fs.readFile(SUGGESTIONS_FILE, 'utf8')
    return JSON.parse(data)
  } catch (error) {
    // File doesn't exist yet, return empty array
    return []
  }
}

// Save suggestions
async function saveSuggestions(suggestions) {
  await fs.writeFile(SUGGESTIONS_FILE, JSON.stringify(suggestions, null, 2), 'utf8')
}

// Generate rule suggestion using IBM Bob
async function generateRuleSuggestion(feedbackData) {
  const { message, verdict, matchedRules, userComment, entities } = feedbackData

  const RULE_SUGGESTION_PROMPT = `You are BobSec RuleSuggestionAgent. Analyze user feedback to propose a new scam detection rule.

CONTEXT:
Message: ${message}
Current Verdict: ${verdict.risk_level} (${verdict.category})
Matched Rules: ${matchedRules.map(r => r.label).join(', ') || 'None'}
User Feedback: ${userComment || 'User disagreed with verdict'}
Entities Found: ${JSON.stringify(entities)}

TASK:
Based on this feedback, determine if a NEW rule is needed to better detect this scam pattern.

Return ONLY valid JSON in this exact format:
{
  "should_create_rule": true | false,
  "reason": "<why a new rule is/isn't needed>",
  "suggested_rule": {
    "id": "<snake_case_id>",
    "label": "<Human readable label>",
    "priority": "HIGH" | "MEDIUM" | "LOW",
    "conditions": {
      "containsAny": ["<keyword1>", "<keyword2>"],
      "containsAnyOrg": ["<org1>", "<org2>"],
      "containsAnyThreat": ["<threat1>"],
      "containsAnyFee": ["<fee phrase>"],
      "hasEntityTypes": ["url", "phone", "upi"]
    },
    "defaultCategory": "FINANCIAL_FRAUD" | "PHISHING" | "JOB_SCAM" | "LOTTERY_SCAM" | "IMPERSONATION" | "INVESTMENT_SCAM",
    "defaultSeverity": "HIGH" | "MEDIUM" | "LOW",
    "explanation": {
      "en": "<Why this pattern is a scam>",
      "hi": "<Hindi explanation>"
    }
  }
}

RULES:
- Only suggest a rule if the current rules clearly missed this pattern
- The rule must be generalizable (not specific to this one message)
- Conditions should capture the core scam pattern
- If existing rules already cover this, set should_create_rule to false
- Keep conditions simple and focused`

  try {
    const response = await axios.post(
      `${process.env.WATSONX_URL}/ml/v1/text/chat?version=2024-05-31`,
      {
        model_id: 'ibm/granite-13b-chat-v2',
        messages: [
          { role: 'system', content: RULE_SUGGESTION_PROMPT },
          { role: 'user', content: `Analyze this feedback and suggest a rule if needed.` }
        ],
        parameters: { 
          max_new_tokens: 800, 
          temperature: 0.2,
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
    console.error('RuleSuggestionAgent error:', error.message)
    
    // Fallback: simple heuristic-based suggestion
    return {
      should_create_rule: false,
      reason: 'Unable to analyze feedback - Bob service unavailable',
      suggested_rule: null,
      fallback: true
    }
  }
}

// Main function to process feedback and suggest rules
async function processFeedback(feedbackData) {
  const startTime = Date.now()

  // Generate suggestion using Bob
  const suggestion = await generateRuleSuggestion(feedbackData)

  // If Bob suggests a rule, save it
  if (suggestion.should_create_rule && suggestion.suggested_rule) {
    const suggestions = await loadSuggestions()
    
    // Add metadata
    const enrichedSuggestion = {
      ...suggestion.suggested_rule,
      metadata: {
        created_at: new Date().toISOString(),
        source_message: feedbackData.message.substring(0, 200), // First 200 chars
        user_comment: feedbackData.userComment,
        original_verdict: feedbackData.verdict,
        matched_rules: feedbackData.matchedRules.map(r => r.id),
        status: 'pending_review',
        votes: { approve: 0, reject: 0 }
      }
    }

    // Check if similar rule already exists
    const isDuplicate = suggestions.some(s => 
      s.id === enrichedSuggestion.id || 
      s.label === enrichedSuggestion.label
    )

    if (!isDuplicate) {
      suggestions.push(enrichedSuggestion)
      await saveSuggestions(suggestions)
    }

    return {
      rule_suggested: true,
      suggestion: enrichedSuggestion,
      reason: suggestion.reason,
      processing_time_ms: Date.now() - startTime
    }
  }

  return {
    rule_suggested: false,
    reason: suggestion.reason,
    processing_time_ms: Date.now() - startTime
  }
}

// Get all pending suggestions
async function getPendingSuggestions() {
  const suggestions = await loadSuggestions()
  return suggestions.filter(s => s.metadata.status === 'pending_review')
}

// Get all suggestions (for Labs view)
async function getAllSuggestions() {
  return await loadSuggestions()
}

// Update suggestion status
async function updateSuggestionStatus(ruleId, status, comment = null) {
  const suggestions = await loadSuggestions()
  const index = suggestions.findIndex(s => s.id === ruleId)
  
  if (index !== -1) {
    suggestions[index].metadata.status = status
    suggestions[index].metadata.reviewed_at = new Date().toISOString()
    if (comment) {
      suggestions[index].metadata.review_comment = comment
    }
    await saveSuggestions(suggestions)
    return true
  }
  
  return false
}

module.exports = { 
  processFeedback, 
  getPendingSuggestions, 
  getAllSuggestions,
  updateSuggestionStatus
}

// Made with Bob
