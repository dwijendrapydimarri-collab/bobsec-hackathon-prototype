# BobSec API Contract v2.0

**Status**: Stable  
**Last Updated**: 2026-05-16  
**Breaking Changes**: None since v1.0

---

## Base URL

```
http://localhost:3001/api
```

---

## Authentication

Currently no authentication required (demo/hackathon version).  
Production deployment should add API key authentication.

---

## Endpoints

### 1. Health Check

**GET** `/api/health`

Returns server status and feature flags.

**Response** (200 OK):
```json
{
  "status": "ok",
  "timestamp": "2026-05-16T12:00:00.000Z",
  "mock_mode": false,
  "version": "2.0.0",
  "features": {
    "bob_orchestration": true,
    "rule_dsl": true,
    "feedback_learning": true,
    "post_incident_mode": true,
    "governance_layer": true,
    "multi_agent_system": true
  },
  "agents": {
    "prompt_firewall": "active",
    "scam_agent": "active",
    "intel_agent": "active",
    "explainer_agent": "active",
    "policy_check_agent": "active",
    "rule_suggestion_agent": "active"
  },
  "governance": {
    "human_in_loop": true,
    "no_auto_submission": true,
    "no_data_retention": true,
    "confidence_threshold": 55,
    "pii_redaction": true
  }
}
```

---

### 2. Analyse Message

**POST** `/api/analyse`

Analyzes a suspicious message or victim narrative through the Bob orchestration pipeline.

**Request Body**:
```json
{
  "input": "string (required, min 10 chars)",
  "lang": "en | hi (optional, default: en)",
  "mode": "prevention | post_incident (optional, default: prevention)",
  "victim_narrative": "string (optional, for post_incident mode)"
}
```

**Response** (200 OK):
```json
{
  "analysis_id": "BSC-2026-123456",
  "timestamp_ist": "16/05/2026 at 12:00:00 IST",
  
  "risk_score": 94,
  "risk_level": "HIGH | MEDIUM | LOW | SAFE | UNKNOWN",
  "category": "FINANCIAL_FRAUD | PHISHING | JOB_SCAM | LOTTERY_SCAM | IMPERSONATION | INVESTMENT_SCAM | UNKNOWN",
  "sub_type": "KYC Phishing",
  "confidence": 94,
  
  "explanation_en": "This message is pretending to be HDFC Bank...",
  "explanation_hi": "यह मैसेज HDFC Bank का नाटक कर रहा है...",
  "user_action": "Do not click any link. Block this number immediately.",
  "user_action_hi": "कोई भी link मत click करें।",
  "parent_mode_en": "Simplified explanation for elderly users",
  "parent_mode_hi": "बुजुर्गों के लिए सरल explanation",
  
  "red_flags": [
    "Urgency threat about account suspension",
    "Unofficial .tk domain",
    "OTP request via WhatsApp"
  ],
  
  "entities": {
    "phone_numbers": [
      {
        "value": "+91-9876500000",
        "verdict": "FLAGGED | CLEAN | UNKNOWN",
        "report_count": 1243,
        "scam_type": "KYC_SCAM",
        "reputation_score": 15
      }
    ],
    "urls": [
      {
        "value": "hdfc-kyc-update.tk",
        "verdict": "MALICIOUS | CLEAN | UNKNOWN",
        "domain_age_days": 3,
        "feed_hits": 2,
        "reason": "Lookalike phishing domain",
        "reputation_score": 10
      }
    ],
    "upi_ids": [
      {
        "value": "refund@paytm123",
        "verdict": "FLAGGED | CLEAN | UNKNOWN",
        "report_count": 340,
        "registered_name": null,
        "reputation_score": 20
      }
    ],
    "amounts": ["₹25,000"],
    "dates": ["yesterday at 6pm"],
    "impersonated_org": "HDFC Bank",
    "urgency_phrases": ["account will be SUSPENDED"]
  },
  
  "matched_rules": [
    {
      "rule_id": "RULE_FINANCIAL_001",
      "name": "KYC Update Phishing",
      "priority": 9,
      "confidence": 95
    }
  ],
  
  "distressed": false,
  "mode": "prevention | post_incident",
  
  "trace": [
    {
      "step": 1,
      "agent": "PromptFirewall",
      "model": "Security Layer",
      "action": "PII redaction + jailbreak detection",
      "result": "No PII · Clean · PASS",
      "time_ms": 50,
      "policy_passed": true
    },
    {
      "step": 2,
      "agent": "ScamAgent",
      "model": "IBM Granite via watsonx.ai",
      "action": "Extract entities → Match rules → Classify with Bob",
      "result": "FINANCIAL_FRAUD · Score 94 · 3 rules matched · PASS",
      "time_ms": 1100,
      "policy_passed": true
    }
    // ... more trace steps
  ],
  
  "policy_decision": {
    "policy_passed": true,
    "checks": {
      "confidence_sufficient": true,
      "no_auto_submission": true,
      "no_data_retention": true,
      "human_in_loop": true,
      "processing_time_acceptable": true,
      "pii_handled": true
    },
    "modifications": [],
    "processing_time_ms": 50
  },
  
  "downgraded": false,
  "downgrade_reason": null,
  
  "total_processing_time_ms": 2500,
  
  "security_report": {
    "pii_redacted": false,
    "pii_types_found": [],
    "jailbreak_detected": false,
    "injection_detected": false
  }
}
```

**Error Responses**:

400 Bad Request:
```json
{
  "error": "input_too_short",
  "message": "Please paste the full message — at least 10 characters."
}
```

500 Internal Server Error:
```json
{
  "error": "analysis_failed",
  "message": "An error occurred during analysis. Please try again."
}
```

---

### 3. Submit Feedback

**POST** `/api/feedback`

Submit user feedback when verdict is incorrect. Bob analyzes feedback and suggests new rules.

**Request Body**:
```json
{
  "analysis_id": "BSC-2026-123456",
  "verdict": "HIGH | MEDIUM | LOW | SAFE | UNKNOWN",
  "category": "FINANCIAL_FRAUD | ...",
  "user_feedback": "This is actually a legitimate bank message",
  "entities": { /* same structure as analyse response */ },
  "red_flags": ["flag1", "flag2"]
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Feedback recorded. Thank you!",
  "rule_suggested": true,
  "suggestion": {
    "rule_id": "RULE_CRYPTO_001",
    "name": "Crypto Investment Scam Pattern",
    "explanation": "Detects fake crypto investment schemes"
  }
}
```

---

### 4. Get Rule Suggestions

**GET** `/api/feedback/suggestions`

Get all rule suggestions generated from user feedback.

**Response** (200 OK):
```json
{
  "suggestions": [
    {
      "rule_id": "RULE_CRYPTO_001",
      "name": "Crypto Investment Scam Pattern",
      "category": "INVESTMENT_SCAM",
      "priority": 8,
      "conditions": {
        "keywords": ["crypto", "bitcoin", "guaranteed returns"],
        "patterns": ["\\d+%\\s+monthly\\s+returns"],
        "entity_types": ["phone", "url"],
        "urgency_indicators": ["limited time", "act now"]
      },
      "explanation": "Detects fake crypto investment schemes promising guaranteed returns",
      "confidence_threshold": 85,
      "metadata": {
        "source": "user_feedback",
        "created_at": "2026-05-16T12:00:00.000Z",
        "feedback_count": 3,
        "status": "pending | approved | rejected",
        "votes": {
          "approve": 0,
          "reject": 0
        }
      }
    }
  ],
  "stats": {
    "total": 5,
    "pending": 3,
    "approved": 1,
    "rejected": 1
  }
}
```

---

### 5. Update Rule Suggestion Status

**PATCH** `/api/feedback/suggestions/:ruleId`

Approve or reject a rule suggestion.

**Request Body**:
```json
{
  "status": "approved | rejected"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Rule status updated to approved",
  "rule_id": "RULE_CRYPTO_001"
}
```

---

### 6. Dev: Run Simulation

**GET** `/dev/sim`

Runs all 7 demo samples through the pipeline and returns results table.

**Response** (200 OK):
```json
{
  "results": [
    {
      "id": "SAMPLE_1",
      "name": "Fake Bank KYC",
      "riskLevel": "HIGH",
      "riskScore": 94,
      "category": "FINANCIAL_FRAUD",
      "confidence": 94,
      "elapsedMs": 2500,
      "traceSteps": 5,
      "policyPassed": true,
      "error": false
    }
    // ... more results
  ],
  "summary": {
    "total": 7,
    "successful": 7,
    "highRisk": 6,
    "avgTimeMs": 2300,
    "avgConfidence": 92,
    "policyPassRate": 100,
    "totalTimeMs": 16100
  }
}
```

---

## Data Types

### Risk Levels
- `HIGH`: Score 80-100, immediate action required
- `MEDIUM`: Score 50-79, suspicious but not confirmed
- `LOW`: Score 20-49, minimal risk
- `SAFE`: Score 0-19, appears legitimate
- `UNKNOWN`: Confidence < 55%, cannot determine

### Categories
- `FINANCIAL_FRAUD`: Bank/payment fraud
- `PHISHING`: Credential theft attempts
- `JOB_SCAM`: Fake job offers with upfront fees
- `LOTTERY_SCAM`: Fake prize/lottery scams
- `IMPERSONATION`: Government/bank impersonation
- `INVESTMENT_SCAM`: Fake investment schemes
- `UNKNOWN`: Cannot categorize

### Verdicts (for entities)
- `FLAGGED`: Known malicious
- `MALICIOUS`: Confirmed threat
- `CLEAN`: Verified legitimate
- `SUSPICIOUS`: Potentially harmful
- `UNKNOWN`: No data available

---

## Rate Limits

Currently no rate limits (demo version).  
Production should implement:
- 100 requests/minute per IP
- 1000 requests/day per IP

---

## Versioning

API version is included in health check response.  
Breaking changes will increment major version (v2.0 → v3.0).

---

## Error Handling

All errors follow this structure:
```json
{
  "error": "error_code",
  "message": "Human-readable error message",
  "details": "Additional context (dev mode only)"
}
```

Common error codes:
- `input_too_short`: Input < 10 characters
- `analysis_failed`: Pipeline error
- `simulation_failed`: Dev sim error
- `invalid_request`: Malformed request body

---

## Governance Guarantees

1. **Human-in-Loop**: No automatic actions taken
2. **No Auto-Submission**: Reports never submitted without user confirmation
3. **No Data Retention**: Analysis data cleared after session
4. **PII Redaction**: Sensitive data redacted before processing
5. **Confidence Threshold**: Low-confidence results marked as UNKNOWN

---

## Testing

### cURL Examples

**Health Check**:
```bash
curl http://localhost:3001/api/health
```

**Analyse Message**:
```bash
curl -X POST http://localhost:3001/api/analyse \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Your HDFC account will be suspended...",
    "lang": "en",
    "mode": "prevention"
  }'
```

**Submit Feedback**:
```bash
curl -X POST http://localhost:3001/api/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "analysis_id": "BSC-2026-123456",
    "verdict": "HIGH",
    "user_feedback": "This is wrong",
    "entities": {},
    "red_flags": []
  }'
```

**Run Simulation**:
```bash
curl http://localhost:3001/dev/sim
```

---

## Changelog

### v2.0.0 (2026-05-16)
- Added Bob orchestration pipeline
- Added feedback learning system
- Added post-incident mode
- Added rule suggestion agent
- Enhanced health check with governance status
- Added `/dev/sim` endpoint

### v1.0.0 (Initial)
- Basic analysis endpoint
- Mock mode support
- Simple health check

---

**API Contract Status**: ✅ Stable  
**Last Reviewed**: 2026-05-16  
**Next Review**: Before production deployment