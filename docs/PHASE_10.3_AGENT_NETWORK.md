# Phase 10.3: Agent Network - Multi-Role Specialized Agents

**Status**: ✅ COMPLETE  
**Date**: 2026-05-16  
**Implementation Time**: ~1.5 hours

---

## Overview

Phase 10.3 introduces a network of specialized agents, each optimized for different sectors and use cases. Instead of a single generic scam detection agent, BobSec now routes analysis to sector-specific agents that understand the unique threats, compliance requirements, and user needs of each sector.

---

## Architecture

### Before Phase 10.3
```
┌─────────────────────────────────────┐
│      Single Generic ScamAgent       │
│  (One-size-fits-all approach)       │
└─────────────────────────────────────┘
```

### After Phase 10.3
```
┌───────────────────────────────────────────────────────────┐
│                    AgentRouter                             │
│         (Routes to sector-specific agents)                 │
└───────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ ConsumerAgent│  │ BankSideAgent│  │ TelcoAgent   │
│              │  │              │  │  (Phase 10.4)│
│ Family-safe  │  │ Fraud-focused│  │              │
│ Empathetic   │  │ Compliance   │  │              │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

## What Was Built

### 1. ConsumerAgent (`server/agents/ConsumerAgent.js` - 430 lines)

**Specialized for consumer-facing applications**

**Optimizations:**
- Family safety features
- Plain-language explanations (English + Hindi)
- Emotional support for distressed users
- Educational content
- Low false-positive tolerance (protects families)

**Key Features:**
- ✅ Consumer-friendly entity labels ("Phone number", "Website link", "Payment ID")
- ✅ Distress detection ("already clicked", "i am scared", "what do i do")
- ✅ Empathetic explanations in plain language
- ✅ Immediate action steps + educational tips
- ✅ Lower threshold for HIGH risk (80+ vs 70+ for banks)
- ✅ Family-friendly content filtering

**Risk Thresholds:**
- HIGH: 80+ (lower to protect families)
- MEDIUM: 50-79
- LOW: 20-49
- SAFE: 0-19

**Example Output:**
```javascript
{
  agent: 'ConsumerAgent',
  sector: 'CONSUMER',
  risk_score: 94,
  risk_level: 'HIGH',
  category: 'FINANCIAL_FRAUD',
  explanation_en: 'This message is pretending to be HDFC Bank...',
  explanation_hi: 'यह मैसेज HDFC Bank का नाटक कर रहा है...',
  user_action: 'Do not click any links. Block immediately.',
  distressed: false,
  family_friendly: true,
  educational_content: {
    title: 'How to Stay Safe',
    tips: [...]
  }
}
```

---

### 2. BankSideAgent (`server/agents/BankSideAgent.js` - 400 lines)

**Specialized for banking sector**

**Optimizations:**
- Transaction fraud detection
- Account takeover prevention
- Phishing detection
- Regulatory compliance (RBI, IT Act, Consumer Protection Act)
- High precision (low false positives to avoid blocking legitimate messages)

**Key Features:**
- ✅ Financial entity extraction (account numbers, card numbers, transaction IDs)
- ✅ Account takeover risk assessment (LOW/MEDIUM/HIGH/CRITICAL)
- ✅ Regulatory compliance checking (RBI guidelines, IT Act, Consumer Protection Act)
- ✅ Technical analysis for fraud teams
- ✅ Recommended security controls
- ✅ Official bank domain verification
- ✅ Requires human review for scores >= 70

**Risk Thresholds:**
- HIGH: 70+ (lower threshold, higher precision)
- MEDIUM: 40-69
- LOW: 15-39
- SAFE: 0-14

**Example Output:**
```javascript
{
  agent: 'BankSideAgent',
  sector: 'BANK',
  risk_score: 92,
  risk_level: 'HIGH',
  category: 'ACCOUNT_TAKEOVER',
  account_takeover_risk: 'CRITICAL',
  compliance_flags: [
    {
      regulation: 'RBI Guidelines',
      violation: 'Requests customer credentials',
      severity: 'CRITICAL',
      reference: 'RBI/2021-22/125'
    }
  ],
  technical_analysis: {
    threat_vector: 'ACCOUNT_TAKEOVER',
    attack_method: 'Credential Theft Attempt',
    target_assets: ['Two-factor authentication', 'Account credentials'],
    recommended_controls: [...]
  },
  recommended_action: {
    action: 'BLOCK',
    notify_customer: true,
    escalate_to_fraud_team: true,
    file_regulatory_report: true
  },
  requires_human_review: true
}
```

---

### 3. AgentRouter (`server/agents/AgentRouter.js` - 110 lines)

**Routes analysis to appropriate sector-specific agent**

**Routing Logic:**
1. Check platform context for sector
2. Select agent for that sector
3. Fallback to ConsumerAgent if no match
4. Execute analysis
5. Add routing metadata for transparency

**Features:**
- ✅ Sector-based routing (CONSUMER, BANK, TELCO, GOV, WALLET, NGO)
- ✅ Fallback to default agent
- ✅ Routing transparency (explains why agent was selected)
- ✅ Alternative agent suggestions
- ✅ Agent capability discovery

**Usage:**
```javascript
const AgentRouter = require('./agents/AgentRouter')
const router = new AgentRouter()

const result = await router.route(input, context)

// Result includes routing metadata
console.log(result.routing)
// {
//   selected_agent: 'BankSideAgent',
//   sector: 'BANK',
//   routing_reason: 'Routed to BANK agent based on organization sector',
//   alternative_agents: [...]
// }
```

---

## Agent Comparison

| Feature | ConsumerAgent | BankSideAgent |
|---------|---------------|---------------|
| **Target Users** | Families, individuals | Banks, financial institutions |
| **Risk Threshold (HIGH)** | 80+ | 70+ |
| **False Positive Tolerance** | Low (protect families) | Very Low (avoid blocking legit messages) |
| **Explanations** | Plain language, empathetic | Technical, compliance-focused |
| **Distress Detection** | ✅ Yes | ❌ No |
| **Educational Content** | ✅ Yes | ❌ No |
| **Compliance Checking** | ❌ No | ✅ Yes (RBI, IT Act, Consumer Protection) |
| **Account Takeover Risk** | ❌ No | ✅ Yes (LOW/MEDIUM/HIGH/CRITICAL) |
| **Human Review Required** | ❌ No | ✅ Yes (score >= 70) |
| **Regulatory Reporting** | ❌ No | ✅ Yes (score >= 90) |

---

## Sector-Specific Optimizations

### ConsumerAgent Optimizations

**1. Lower Risk Threshold**
- HIGH risk at 80+ (vs 70+ for banks)
- Protects families by being more cautious

**2. Distress Detection**
```javascript
detectDistress(input) {
  const keywords = [
    'already clicked', 'already paid', 'gave my otp',
    'i am scared', 'what do i do', 'already transferred'
  ]
  return keywords.some(k => input.toLowerCase().includes(k))
}
```

**3. Educational Content**
```javascript
{
  title: 'How to Stay Safe',
  tips: [
    'Banks never ask for OTP, password, or CVV',
    'Verify messages directly with the organization',
    'Be suspicious of urgent or threatening messages',
    'Never pay fees to claim prizes or get jobs',
    'Check website URLs carefully for spelling mistakes'
  ]
}
```

**4. Empathetic Explanations**
- Plain language (no jargon)
- Natural Hindi translations
- Emotional support for distressed users

---

### BankSideAgent Optimizations

**1. Account Takeover Risk Assessment**
```javascript
assessAccountTakeoverRisk(input, entities) {
  if (entities.credential_requests.length >= 3) return 'CRITICAL'
  if (entities.credential_requests.length >= 2) return 'HIGH'
  if (entities.credential_requests.length >= 1) return 'MEDIUM'
  return 'LOW'
}
```

**2. Regulatory Compliance Checking**
```javascript
{
  regulation: 'RBI Guidelines',
  violation: 'Requests customer credentials',
  severity: 'CRITICAL',
  reference: 'RBI/2021-22/125'
}
```

**3. Official Domain Verification**
```javascript
isOfficialBankDomain(url, bankName) {
  const officialDomains = {
    'HDFC': ['hdfcbank.com', 'hdfcbank.co.in'],
    'ICICI': ['icicibank.com', 'icicibank.co.in'],
    'SBI': ['onlinesbi.com', 'sbi.co.in']
  }
  return officialDomains[bankName]?.some(d => url.includes(d))
}
```

**4. Recommended Security Controls**
```javascript
{
  action: 'BLOCK',
  reason: 'Critical fraud risk detected',
  notify_customer: true,
  escalate_to_fraud_team: true,
  file_regulatory_report: true
}
```

---

## Integration with Orchestrator

The AgentRouter integrates seamlessly with the existing Bob orchestrator:

```javascript
// server/orchestrator/bobOrchestrator.js

const AgentRouter = require('../agents/AgentRouter')
const agentRouter = new AgentRouter()

async function execute(input, context) {
  // Route to appropriate agent
  const result = await agentRouter.route(input, context)
  
  // Continue with tool agents, policy checks, etc.
  // ...
  
  return result
}
```

---

## Future Agents (Phase 10.4+)

### TelcoSideAgent
- Spam SMS filtering
- Caller ID reputation
- Route analysis
- Sender verification

### InvestigatorAgent (GOV)
- Cross-sector intelligence access
- Investigation support
- Evidence collection
- Pattern analysis

### WalletAgent
- UPI fraud detection
- Payment request verification
- Merchant verification
- Transaction analysis

### PolicyAdvisorAgent (NGO)
- Public awareness content
- Educational materials
- Policy recommendations
- Trend analysis

---

## Testing

### Unit Tests

```javascript
// Test ConsumerAgent
const ConsumerAgent = require('./agents/ConsumerAgent')
const agent = new ConsumerAgent()

test('consumer agent detects distress', async () => {
  const input = 'I already clicked the link and gave my OTP. What do I do?'
  const result = await agent.analyse(input, { sector: 'CONSUMER' })
  
  expect(result.distressed).toBe(true)
  expect(result.next_steps).toBeDefined()
})

// Test BankSideAgent
const BankSideAgent = require('./agents/BankSideAgent')
const bankAgent = new BankSideAgent()

test('bank agent assesses account takeover risk', async () => {
  const input = 'Enter your OTP, password, and CVV to verify'
  const result = await bankAgent.analyse(input, { sector: 'BANK' })
  
  expect(result.account_takeover_risk).toBe('CRITICAL')
  expect(result.requires_human_review).toBe(true)
})

// Test AgentRouter
const AgentRouter = require('./agents/AgentRouter')
const router = new AgentRouter()

test('router selects correct agent', async () => {
  const context = { sector: 'BANK' }
  const result = await router.route('Test message', context)
  
  expect(result.routing.selected_agent).toBe('BankSideAgent')
  expect(result.routing.sector).toBe('BANK')
})
```

---

## Summary

Phase 10.3 establishes a multi-agent network for sector-specific scam detection:

✅ **3 Core Files Created** (940 lines total):
- ConsumerAgent (430 lines) - Family-safe, empathetic, educational
- BankSideAgent (400 lines) - Fraud-focused, compliance-driven, high-precision
- AgentRouter (110 lines) - Intelligent routing with transparency

✅ **2 Specialized Agents** (CONSUMER, BANK)
✅ **Sector-Specific Optimizations** (risk thresholds, entity extraction, explanations)
✅ **Intelligent Routing** (context-based, with fallback and transparency)
✅ **Compliance Integration** (RBI, IT Act, Consumer Protection Act)
✅ **Account Takeover Risk Assessment** (LOW/MEDIUM/HIGH/CRITICAL)
✅ **Distress Detection** (emotional support for victims)
✅ **Educational Content** (consumer safety tips)

**Total Implementation**: ~940 lines of production code + comprehensive documentation

---

**Next Phase**: Phase 10.4 - Shared Scam Intelligence Layer (ScamNet)