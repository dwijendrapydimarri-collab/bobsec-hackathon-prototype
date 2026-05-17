# Phase 10.4: ScamNet - Shared Scam Intelligence Layer

**Status**: ✅ COMPLETE  
**Date**: 2026-05-16  
**Implementation Time**: ~1.5 hours

---

## Overview

Phase 10.4 introduces ScamNet, a cross-sector threat intelligence sharing system that enables different sectors (banks, telcos, wallets, government, consumers) to contribute and benefit from collective scam intelligence while respecting privacy, compliance, and data residency requirements.

---

## The Problem

**Before ScamNet:**
- Each sector fights scams in isolation
- Same scammer targets multiple sectors without detection
- No shared learning or pattern detection
- Delayed response to emerging threats

**After ScamNet:**
- Collective intelligence across sectors
- Real-time threat sharing
- Pattern detection at ecosystem scale
- Faster response to emerging threats

---

## What Was Built

### 1. ScamNetService (`server/services/ScamNetService.js` - 450 lines)

**Core intelligence sharing service**

**Key Features:**
- ✅ Privacy-preserving intelligence exchange (hashing, anonymization)
- ✅ Cross-sector sharing with governance rules
- ✅ Region-aware data residency compliance
- ✅ Reputation scoring for entities
- ✅ Confidence calculation (reports + sectors + recency)
- ✅ Real-time contribution and query
- ✅ Statistics and monitoring

**Intelligence Types:**
- Phone numbers (SHA-256 hashed)
- URLs (normalized for matching)
- UPI IDs (SHA-256 hashed)
- Patterns (cross-sector scam patterns)

**Reputation Data:**
```javascript
{
  value: "a3f5e8c9d2b1...",  // Hashed
  verdict: "FLAGGED",
  report_count: 15,
  sectors: Set(['BANK', 'WALLET', 'CONSUMER']),
  regions: Set(['IN', 'APAC']),
  first_seen: Date('2026-05-01'),
  last_seen: Date('2026-05-16'),
  confidence: 85  // Calculated
}
```

---

### 2. ScamNet API Routes (`server/routes/scamnet.js` - 155 lines)

**RESTful API for intelligence sharing**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/scamnet/contribute` | Contribute intelligence |
| POST | `/api/scamnet/query` | Query intelligence |
| GET | `/api/scamnet/stats` | Get statistics |
| GET | `/api/scamnet/top-indicators/:type` | Get top indicators |

---

## How It Works

### Intelligence Contribution

**Flow:**
```
1. Org detects scam (risk_score >= 50)
2. Check opt-in (enableScamIntel)
3. Anonymize (hash phones/UPIs, normalize URLs)
4. Store with metadata (sector, region, timestamp)
5. Update reputation scores
6. Return contribution ID
```

**Example:**
```javascript
POST /api/scamnet/contribute
{
  "risk_score": 94,
  "risk_level": "HIGH",
  "category": "FINANCIAL_FRAUD",
  "entities": {
    "phone_numbers": ["+91-9876500000"],
    "urls": ["hdfc-kyc-update.tk"],
    "upi_ids": []
  },
  "confidence": 94
}

Response:
{
  "success": true,
  "contribution_id": "scamnet_1684234567_abc123",
  "indicators_stored": 2,
  "reputation_updated": 0
}
```

---

### Intelligence Query

**Flow:**
```
1. Org queries entities
2. Check opt-in (enableScamIntel)
3. Hash/normalize entities
4. Lookup in ScamNet
5. Check sharing rules (sector, region)
6. Return matching intelligence
```

**Example:**
```javascript
POST /api/scamnet/query
{
  "entities": {
    "phone_numbers": ["+91-9876500000"],
    "urls": ["hdfc-kyc-update.tk"]
  }
}

Response:
{
  "success": true,
  "results": {
    "phone_numbers": [
      {
        "value": "+91-9876500000",
        "verdict": "FLAGGED",
        "report_count": 15,
        "sectors": ["BANK", "WALLET", "CONSUMER"],
        "confidence": 85
      }
    ],
    "urls": [
      {
        "value": "hdfc-kyc-update.tk",
        "verdict": "MALICIOUS",
        "report_count": 8,
        "sectors": ["BANK", "CONSUMER"],
        "confidence": 78
      }
    ]
  }
}
```

---

## Privacy & Security

### 1. Anonymization

**Phone Numbers & UPI IDs:**
- SHA-256 hashed before storage
- Original values never stored
- Matching via hash comparison

```javascript
hashEntity('+91-9876500000')
// → "a3f5e8c9d2b1..."
```

**URLs:**
- Normalized (lowercase, remove protocol, remove trailing slash)
- Stored as-is (URLs are public information)

```javascript
normalizeUrl('https://HDFC-kyc-update.tk/')
// → "hdfc-kyc-update.tk"
```

---

### 2. Cross-Sector Sharing Rules

**Allowed Sharing Paths:**
```
CONSUMER → BANK, TELCO, WALLET, GOV
BANK → WALLET, GOV
TELCO → GOV
WALLET → GOV
NGO → GOV
GOV ← All sectors (central hub)
```

**Implementation:**
```javascript
canShare(intel, context) {
  // Same sector: Always allowed
  if (intel.sectors.has(context.sector)) return true
  
  // Check cross-sector rules
  if (context.canShareWithSector) {
    return Array.from(intel.sectors)
      .some(sector => context.canShareWithSector(sector))
  }
  
  return false
}
```

---

### 3. Cross-Region Sharing Rules

**Rules:**
- Same region: Always allowed
- REGION_LOCAL: No cross-region sharing
- India: Mandatory data localization
- GDPR: Only share with adequate protection
- GLOBAL_ALLOWED: Cross-region permitted

---

## Confidence Scoring

**Formula:**
```javascript
confidence = min(
  reportScore + sectorScore + recencyScore,
  100
)

reportScore = min(report_count * 10, 50)
sectorScore = min(sectors.size * 15, 30)
recencyScore = 
  last_seen < 7 days ? 20 :
  last_seen < 30 days ? 10 : 0
```

**Examples:**
- 5 reports, 2 sectors, 3 days old → 50 + 30 + 20 = **100**
- 3 reports, 1 sector, 10 days old → 30 + 15 + 10 = **55**
- 1 report, 1 sector, 40 days old → 10 + 15 + 0 = **25**

---

## Use Cases

### Use Case 1: Bank Detects Phishing, Protects Wallets

**Scenario:**
1. HDFC Bank detects phishing URL: `hdfc-kyc-update.tk`
2. Bank contributes to ScamNet
3. Paytm Wallet queries ScamNet before processing payment
4. ScamNet returns: "MALICIOUS, 8 reports, confidence 78%"
5. Paytm blocks transaction, saves customer

**Code:**
```javascript
// Bank contributes
await scamNetService.contribute({
  risk_score: 94,
  entities: { urls: ['hdfc-kyc-update.tk'] },
  ...
}, bankContext)

// Wallet queries
const intel = await scamNetService.query({
  entities: { urls: ['hdfc-kyc-update.tk'] }
}, walletContext)

if (intel.results.urls[0]?.verdict === 'MALICIOUS') {
  blockTransaction()
}
```

---

### Use Case 2: Consumer Reports Scam, Protects Banks

**Scenario:**
1. Consumer reports scam phone: `+91-9876500000`
2. Consumer app contributes to ScamNet
3. Bank's SMS gateway queries ScamNet
4. ScamNet returns: "FLAGGED, 15 reports, confidence 85%"
5. Bank blocks SMS from that number

---

### Use Case 3: Cross-Sector Pattern Detection

**Scenario:**
1. Multiple sectors report same UPI ID
2. ScamNet aggregates: 3 sectors, 20 reports
3. Confidence score: 95%
4. All sectors benefit from collective intelligence

---

## Statistics & Monitoring

### Get Statistics

```javascript
GET /api/scamnet/stats

Response:
{
  "success": true,
  "stats": {
    "total_contributions": 1543,
    "total_queries": 8921,
    "cross_sector_shares": 342,
    "blocked_shares": 12,
    "indicators": {
      "phone_numbers": 892,
      "urls": 1234,
      "upi_ids": 456,
      "patterns": 89
    },
    "health": "operational"
  }
}
```

---

### Get Top Indicators

```javascript
GET /api/scamnet/top-indicators/phone_numbers?limit=5

Response:
{
  "success": true,
  "type": "phone_numbers",
  "indicators": [
    {
      "value": "a3f5e8c9...",
      "report_count": 1243,
      "sectors": ["BANK", "WALLET", "CONSUMER"],
      "confidence": 100
    },
    ...
  ]
}
```

---

## Governance & Compliance

### 1. Opt-In Required

Organizations must explicitly opt into ScamNet:

```javascript
// Organization settings
{
  features: {
    enableScamIntel: true  // Required for contribution/query
  }
}
```

---

### 2. Audit Logging

All contributions and queries are logged:

```javascript
{
  timestamp: "2026-05-16T10:30:00Z",
  action: "CONTRIBUTE",
  sector: "BANK",
  region: "IN",
  indicators_count: 3,
  contribution_id: "scamnet_..."
}
```

---

### 3. Data Retention

- Indicators: 90 days (configurable)
- Audit logs: 365 days
- Statistics: Indefinite (aggregated)

---

### 4. Privacy Compliance

- ✅ GDPR: Hashed data, no PII
- ✅ Data Localization: Region-aware sharing
- ✅ Consent: Opt-in required
- ✅ Right to Erasure: Indicators can be removed

---

## Integration Example

```javascript
// After analysis, contribute to ScamNet
const analysisResult = await bobOrchestrator.execute(input, context)

if (analysisResult.risk_score >= 50 && context.features?.enableScamIntel) {
  await scamNetService.contribute(analysisResult, context)
}

// Before analysis, query ScamNet
const intel = await scamNetService.query(
  extractedEntities,
  context
)

// Boost risk score if entity is known to ScamNet
if (intel.results.phone_numbers.length > 0) {
  riskScore += 15
}
```

---

## Future Enhancements

### Phase 10.5+

- **Pattern Detection**: ML-based pattern recognition across sectors
- **Real-time Alerts**: Push notifications for emerging threats
- **Threat Feeds**: Export ScamNet data to SIEM systems
- **API Rate Limiting**: Per-sector query limits
- **Advanced Analytics**: Trend analysis, heat maps, forecasting

---

## Summary

Phase 10.4 establishes ScamNet as the shared intelligence backbone:

✅ **2 Core Files Created** (605 lines total):
- ScamNetService (450 lines) - Core intelligence engine
- ScamNet API routes (155 lines) - RESTful endpoints

✅ **4 API Endpoints** (contribute, query, stats, top-indicators)
✅ **Privacy-Preserving** (SHA-256 hashing, anonymization)
✅ **Cross-Sector Sharing** (with governance rules)
✅ **Region-Aware** (data residency compliance)
✅ **Reputation Scoring** (reports + sectors + recency)
✅ **Confidence Calculation** (0-100 scale)
✅ **Audit Logging** (all contributions and queries)
✅ **Opt-In Model** (organizations must enable)

**Total Implementation**: ~605 lines of production code + comprehensive documentation

---

**Next Phase**: Phase 10.5 - Investigation Tooling & Evidence Packs