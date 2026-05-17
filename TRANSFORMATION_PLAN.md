# 🔄 BobSec Transformation Plan — From Demo to Bob-Native System

**Date:** May 16, 2026  
**Engineer:** IBM Bob (AI Coding Agent)  
**Goal:** Transform BobSec into a truly Bob-native, multi-agent system ready for pilot with banks/telcos/cyber cells

---

## 📋 Current State Analysis

### Backend Architecture (Current)
- **Express Server** - Simple REST API
- **Single Route** - `/api/analyse` with inline ScamAgent
- **Tool Agents** - Three mock lookup functions (URL, phone, UPI)
- **Mock Mode** - Hardcoded fallback responses
- **Bob Usage** - ONE watsonx.ai call for classification only

### Frontend Architecture (Current)
- **5-Screen Flow** - Input → Analysis → Trace → Evidence → Report
- **React Context** - Global state management
- **7 Demo Samples** - Hardcoded responses
- **Strategic Features** - Family Mode, Parent Mode, Brand Verification, Session Stats

### What's Excellent ✅
1. **Strong UX** - 16 professional improvements, toast notifications, error handling
2. **Bilingual** - Natural EN/HI translations with persistence
3. **Strategic Depth** - Family Mode, economic impact, WhatsApp concept
4. **Demo Safety** - VITE_DEMO_MODE flag, fallback handling
5. **Documentation** - Comprehensive README, summaries, improvement docs

### Critical Gaps ❌
1. **Not Bob-Native** - Could be built with any LLM, no true orchestration
2. **No Rule DSL** - Scam patterns embedded in prompts, not declarative
3. **Cosmetic Feedback** - Counter increments but doesn't improve system
4. **No Post-Incident Mode** - Only handles "check before acting"
5. **No Test Harness** - Can't verify consistency across samples
6. **Informal API** - No schema validation, inconsistent responses
7. **No Security Layer** - Raw input to LLM, no PII redaction
8. **Fake Agents** - Tool agents are just lookups, not reasoning agents

---

## 🎯 Transformation Goals

### Primary Objective
**Make BobSec visibly showcase IBM Bob as the core engine, not just "an app with an LLM"**

### Success Criteria
1. ✅ Multi-agent system with clear Bob orchestration
2. ✅ Declarative rule DSL that Bob can reason over
3. ✅ Feedback loop that actually generates new rules
4. ✅ Post-incident mode for victims who've already been scammed
5. ✅ Test harness proving system reliability
6. ✅ Stable JSON API contract
7. ✅ PromptFirewall security layer
8. ✅ Documentation showing Bob-native architecture

---

## 🏗 Implementation Phases

### **PHASE 1: Bob-Native Multi-Agent System**

#### 1.1 Create Scam Rule DSL
**File:** `server/rules/scamRules.js`

```javascript
export const scamRules = [
  {
    id: "fake_kyc_bank",
    label: "Fake bank KYC update",
    conditions: {
      containsAny: ["KYC", "update", "verification", "blocked", "suspended"],
      containsAnyOrg: ["HDFC", "SBI", "ICICI", "Axis", "Bank of Baroda"],
      channelIn: ["sms", "whatsapp"],
      hasEntityTypes: ["url", "phone"]
    },
    defaultCategory: "FINANCIAL_FRAUD",
    defaultSeverity: "HIGH",
    explanation: "Banks never ask for KYC updates via SMS/WhatsApp links"
  },
  {
    id: "digital_arrest",
    label: "Digital arrest / fake police",
    conditions: {
      containsAny: ["digital arrest", "cyber police", "CBI", "ED", "thana"],
      containsAnyThreat: ["warrant", "arrest", "case", "FIR", "bail"]
    },
    defaultCategory: "IMPERSONATION",
    defaultSeverity: "HIGH",
    explanation: "Digital arrest does not exist in Indian law"
  },
  // ... more rules
]
```

**Purpose:** Declarative, extensible scam patterns that Bob can interpret and reason over

#### 1.2 Implement True Agents
**Files to Create:**
- `server/agents/scamAgent.js` - Entity extraction + rule matching + Bob classification
- `server/agents/intelAgent.js` - Orchestrates URL/phone/UPI checks with reputation scoring
- `server/agents/explainerAgent.js` - Generates EN/HI explanations using Bob
- `server/agents/reportDraftAgent.js` - Creates NCRP reports for pre/post incident
- `server/agents/policyCheckAgent.js` - Enforces governance rules
- `server/agents/ruleSuggestionAgent.js` - Proposes new rules from feedback
- `server/agents/promptFirewall.js` - PII redaction + jailbreak detection

#### 1.3 Build Orchestration Pipeline
**File:** `server/orchestrator/bobOrchestrator.js`

```javascript
async function orchestrate(input, mode, lang) {
  // 1. PromptFirewall - sanitize input
  const sanitized = await promptFirewall.check(input)
  
  // 2. ScamAgent - extract entities, match rules, classify
  const scamResult = await scamAgent.analyze(sanitized, rules)
  
  // 3. IntelAgent - enrich entities with threat intel
  const enriched = await intelAgent.enrich(scamResult.entities)
  
  // 4. ExplainerAgent - generate explanations
  const explanations = await explainerAgent.explain(scamResult, enriched, lang)
  
  // 5. ReportDraftAgent - create report draft
  const report = await reportDraftAgent.draft(scamResult, mode)
  
  // 6. PolicyCheckAgent - validate governance
  const policy = await policyCheckAgent.validate(scamResult, report)
  
  return { scamResult, enriched, explanations, report, policy, trace }
}
```

---

### **PHASE 2: Feedback-Driven Learning**

#### 2.1 Wire Feedback to RuleSuggestionAgent
**New Route:** `POST /api/feedback`

```javascript
router.post('/feedback', async (req, res) => {
  const { analysisId, message, verdict, matchedRules, feedbackText } = req.body
  
  // Call RuleSuggestionAgent with Bob
  const suggestedRule = await ruleSuggestionAgent.suggest({
    message: redact(message),
    verdict,
    matchedRules,
    feedbackText
  })
  
  if (suggestedRule) {
    // Append to ruleSuggestions.json
    await appendRuleSuggestion(suggestedRule)
  }
  
  res.json({ success: true, suggestedRule })
})
```

#### 2.2 Create Labs View
**New Component:** `client/src/screens/LabsView.jsx`
- Shows suggested rules in a table
- Clearly marked as "not yet active"
- Demonstrates self-improving system

---

### **PHASE 3: Post-Incident Mode**

#### 3.1 Add Mode Toggle
**Update:** `client/src/screens/Screen1Input.jsx`
- Radio buttons: "Check suspicious message" vs "I've already been scammed"
- When post-incident selected:
  - Input: "What happened?" (free text)
  - Optional: Amount lost, date/time, channel

#### 3.2 Timeline Reconstruction
**Update:** `server/agents/scamAgent.js`
- Extract timeline events from narrative
- Build incident storyboard: Message → Click → OTP → Debit

#### 3.3 FIR-Style Reports
**Update:** `server/agents/reportDraftAgent.js`
- Mode parameter: `pre_incident` | `post_incident`
- Pre: Prevention-focused complaint
- Post: Timeline-based FIR narrative

---

### **PHASE 4: Test & API Stability**

#### 4.1 Test Harness
**New File:** `server/tools/runDemoSim.js`

```javascript
const samples = require('../mocks/demoSamples')
const { orchestrate } = require('../orchestrator/bobOrchestrator')

async function runSimulation() {
  console.log('Running BobSec Demo Simulation...\n')
  
  for (const sample of samples) {
    const start = Date.now()
    const result = await orchestrate(sample.text, 'pre_incident', 'en')
    const elapsed = Date.now() - start
    
    console.log(`${sample.id}: ${result.riskLevel} | ${result.category} | ${result.confidence}% | ${elapsed}ms`)
  }
}
```

#### 4.2 Stable API Contract
**New File:** `server/schemas/analysisResponse.js`

```javascript
export const AnalysisResponseSchema = {
  analysisId: String,
  tenantId: String,
  mode: 'pre_incident' | 'post_incident',
  riskScore: Number,
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'SAFE' | 'UNKNOWN',
  category: String,
  confidence: Number,
  entities: { phones: [], urls: [], upi: [], orgs: [] },
  rulesMatched: [],
  verdict: { en: String, hi: String },
  actions: { en: String, hi: String },
  explainForParents: { en: String, hi: String },
  policy: { decision: String, checks: {} },
  trace: []
}
```

#### 4.3 Health Check
**New Route:** `GET /health/analysis`
- Runs mini analysis on benign test message
- Returns system health status
- Frontend shows banner if unhealthy

---

### **PHASE 5: Documentation**

#### 5.1 Update README.md
- Add "Bob-Native Architecture" section
- Explain DSL, agents, orchestration
- Show how to run test harness
- Document API contract

#### 5.2 Update FINAL_SUMMARY.md
- Map to IBM's "discover → decide → act → govern" model
- Explain each agent's role
- Show feedback loop and rule evolution

#### 5.3 Update NOVELTY.md
- Add DSL as novelty feature
- Add RuleSuggestionAgent
- Add post-incident mode
- Add test harness

#### 5.4 Create Demo Script
**New Section in FINAL_SUMMARY.md:**

```markdown
## 60-Second Demo Script

1. **Show Digital Arrest sample** (memorable, high-impact)
2. **Highlight Bob orchestration** on Trace screen
3. **Show matched rules** from DSL
4. **Show PolicyCheck** governance layer
5. **Submit feedback** → show suggested rule in Labs
6. **Switch to post-incident mode** → show timeline reconstruction
7. **Generate police report** → show NCRP compliance
```

---

## 📊 Success Metrics

### Technical
- ✅ 6+ distinct Bob agents with clear responsibilities
- ✅ Declarative DSL with 10+ scam rules
- ✅ Feedback loop generating actual rule suggestions
- ✅ Test harness passing all 7 samples
- ✅ Stable API with schema validation
- ✅ PromptFirewall blocking jailbreak attempts

### Product
- ✅ Post-incident mode handling victim scenarios
- ✅ Labs view showing system evolution
- ✅ Health check endpoint for monitoring
- ✅ Multi-tenant readiness (tenantId in responses)

### Demo
- ✅ 60-second script showcasing Bob orchestration
- ✅ Visible DSL rule matching in trace
- ✅ Live feedback → rule suggestion flow
- ✅ Clear differentiation from "generic LLM app"

---

## 🚀 Next Steps

I will now begin implementation, working in this order:

1. **Create DSL** (`server/rules/scamRules.js`)
2. **Refactor agents** (scamAgent, intelAgent, etc.)
3. **Build orchestrator** (`server/orchestrator/bobOrchestrator.js`)
4. **Add feedback route** (`POST /api/feedback`)
5. **Implement post-incident mode** (frontend + backend)
6. **Create test harness** (`server/tools/runDemoSim.js`)
7. **Update documentation** (README, FINAL_SUMMARY, NOVELTY)

Each phase will be completed with working, tested code before moving to the next.

---

**Status:** Ready to begin Phase 1 - Creating the Scam Rule DSL
