# Phase 10.1: Core Infrastructure Architecture

**Status**: ✅ COMPLETE  
**Date**: 2026-05-16  
**Implementation Time**: ~2 hours

---

## Overview

Phase 10.1 transforms BobSec from a single SaaS product into a **shared anti-scam infrastructure platform** that multiple external systems (banks, telcos, wallets, government portals, family apps) can integrate with. This phase establishes the foundational multi-tenant, multi-sector, multi-region architecture.

---

## Architecture Evolution

### Before Phase 10.1
```
┌─────────────────────────────────────┐
│         BobSec SaaS                 │
│  (Single product, single tenant)    │
└─────────────────────────────────────┘
```

### After Phase 10.1
```
┌───────────────────────────────────────────────────────────────┐
│              BobSec Infrastructure Platform                    │
├───────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │ CONSUMER │  │   BANK   │  │  TELCO   │  │   GOV    │     │
│  │  Sector  │  │  Sector  │  │  Sector  │  │  Sector  │     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                    │
│  │  WALLET  │  │   NGO    │  │  Custom  │                    │
│  │  Sector  │  │  Sector  │  │  Sector  │                    │
│  └──────────┘  └──────────┘  └──────────┘                    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │         Multi-Region Data Residency Layer              │  │
│  │  IN (India) | APAC | EU | US | GLOBAL                  │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │         Tenant Isolation & Access Control               │  │
│  └─────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Platform Context

**File**: `server/models/PlatformContext.js` (350 lines)

**Purpose**: Central context object used by orchestrator and policies containing tenant, organization, sector, region, and pipeline metadata.

**Key Properties**:
```javascript
{
  // Core identifiers
  tenantId: "tenant_123",
  organizationId: "org_456",
  userId: "user_789",
  requestId: "req-1234567890-abc123",
  
  // Sector and region
  sector: "BANK",           // CONSUMER | BANK | TELCO | GOV | WALLET | NGO
  region: "IN",             // IN | APAC | EU | US | GLOBAL
  dataResidency: "REGION_LOCAL",  // REGION_LOCAL | GLOBAL_ALLOWED | RESTRICTED
  
  // Pipeline configuration
  pipelineVersion: "2.1.0",
  policyProfileId: "policy_bank_strict",
  
  // Channel and source
  channel: "api",           // web | api | sms | whatsapp | email
  sourceIp: "192.168.1.1",
  userAgent: "BankApp/1.0",
  
  // Feature flags
  features: {
    enableScamIntel: true,
    enableCrossSectorSharing: false,
    enableCrossRegionSharing: false,
    enableInvestigation: true
  }
}
```

**Key Methods**:
- `validate()`: Validate context completeness and correctness
- `canShareWithSector(targetSector)`: Check if cross-sector sharing is allowed
- `canShareWithRegion(targetRegion)`: Check if cross-region sharing is allowed
- `canShareWith(targetContext)`: Check if data can be shared with target context
- `getSectorConfig()`: Get sector-specific configuration
- `getRegionConfig()`: Get region-specific configuration
- `createAuditLog(action, details)`: Create audit log entry

---

### 2. Sectors

**6 Sector Types**:

| Sector | Description | Use Cases | Default Thresholds |
|--------|-------------|-----------|-------------------|
| **CONSUMER** | End-user facing apps | Family apps, personal safety | High: 80, Medium: 50, Low: 20 |
| **BANK** | Banking institutions | Transaction fraud, account takeover | High: 70, Medium: 40, Low: 15 |
| **TELCO** | Telecom operators | SMS spam, caller ID spoofing | High: 75, Medium: 45, Low: 20 |
| **GOV** | Government agencies | Citizen protection, investigation | High: 60, Medium: 35, Low: 10 |
| **WALLET** | Digital wallets | Payment fraud, UPI scams | High: 75, Medium: 45, Low: 20 |
| **NGO** | Non-profit organizations | Awareness, education, reporting | High: 80, Medium: 50, Low: 25 |

**Sector-Specific Features**:

```javascript
// CONSUMER sector
{
  enablePublicReporting: true,
  enableFamilyMode: true,
  requireHumanReview: false
}

// BANK sector
{
  enableTransactionAnalysis: true,
  requireHumanReview: true,
  enablePublicReporting: false
}

// TELCO sector
{
  enableRouteAnalysis: true,
  enableSenderReputation: true,
  requireHumanReview: false
}

// GOV sector
{
  enableInvestigation: true,
  enableCrossSectorAccess: true,
  requireHumanReview: true
}
```

---

### 3. Regions

**5 Region Types**:

| Region | Code | Description | Data Residency | Compliance |
|--------|------|-------------|----------------|------------|
| **India** | IN | India | Mandatory local | Data Localization Act |
| **APAC** | APAC | Asia-Pacific | Flexible | Varies by country |
| **EU** | EU | European Union | GDPR compliant | GDPR |
| **US** | US | United States | Flexible | CCPA, state laws |
| **GLOBAL** | GLOBAL | Global/Multi-region | Flexible | Multiple |

**Region-Specific Configuration**:

```javascript
{
  IN: {
    timezone: 'Asia/Kolkata',
    currency: 'INR',
    languages: ['en', 'hi'],
    emergencyNumber: '1930',
    reportingPortal: 'cybercrime.gov.in',
    dataLocalization: true
  },
  EU: {
    timezone: 'Europe/Brussels',
    currency: 'EUR',
    languages: ['en'],
    emergencyNumber: '112',
    reportingPortal: null,
    gdprCompliance: true
  }
}
```

---

### 4. Data Residency Policies

**3 Residency Types**:

| Type | Description | Cross-Region Sharing | Use Cases |
|------|-------------|---------------------|-----------|
| **REGION_LOCAL** | Data must stay in region | ❌ Not allowed | India (mandatory), sensitive data |
| **GLOBAL_ALLOWED** | Data can be shared globally | ✅ Allowed | Multi-national orgs, research |
| **RESTRICTED** | Highly restricted, no sharing | ❌ Not allowed | Government, classified data |

**Sharing Rules**:

```javascript
// Same region: Always allowed
sourceRegion === targetRegion → ✅

// REGION_LOCAL: No cross-region sharing
dataResidency === 'REGION_LOCAL' → ❌

// GLOBAL_ALLOWED: Cross-region allowed
dataResidency === 'GLOBAL_ALLOWED' → ✅

// RESTRICTED: No sharing at all
dataResidency === 'RESTRICTED' → ❌
```

---

### 5. Enhanced Organization Model

**File**: `server/models/Organization.js` (modified)

**New Properties**:
```javascript
{
  id: "org_123",
  name: "HDFC Bank",
  slug: "hdfc-bank",
  
  // NEW: Sector, region, data residency
  sector: "BANK",
  region: "IN",
  dataResidency: "REGION_LOCAL",
  
  settings: { /* existing settings */ },
  ownerId: "user_456",
  createdAt: "2026-05-16T10:00:00Z",
  updatedAt: "2026-05-16T10:00:00Z"
}
```

**Validation**:
- Sector must be one of: CONSUMER, BANK, TELCO, GOV, WALLET, NGO
- Region must be one of: IN, APAC, EU, US, GLOBAL
- Data residency must be one of: REGION_LOCAL, GLOBAL_ALLOWED, RESTRICTED

---

### 6. Platform Configuration

**File**: `server/config/platform.js` (175 lines)

**Purpose**: Multi-region and multi-tenant platform configuration.

**Configuration Structure**:
```javascript
{
  // Current instance
  regionId: "IN",
  instanceId: "instance-1234567890",
  
  // Data sharing
  dataSharing: {
    allowCrossRegionIntel: false,
    allowCrossSectorIntel: true,
    anonymizationLevel: "high",
    intelRetentionDays: 90
  },
  
  // Tenant isolation
  tenantIsolation: {
    enforceStrictIsolation: true,
    logCrossTenantAccess: true,
    blockCrossTenantAccess: true
  },
  
  // Regional compliance
  compliance: {
    gdprEnabled: false,
    dataLocalizationEnabled: true,
    auditLogRetentionDays: 365
  },
  
  // Performance limits
  limits: {
    maxConcurrentAnalysesPerTenant: 100,
    maxRequestsPerMinutePerTenant: 1000,
    maxStoragePerTenantMB: 10240
  }
}
```

**Environment Variables**:
```bash
# Region configuration
PLATFORM_REGION=IN
PLATFORM_INSTANCE_ID=instance-prod-in-1

# Data sharing
ALLOW_CROSS_REGION_INTEL=false
ALLOW_CROSS_SECTOR_INTEL=true
ANONYMIZATION_LEVEL=high
INTEL_RETENTION_DAYS=90

# Tenant isolation
ENFORCE_STRICT_ISOLATION=true
LOG_CROSS_TENANT_ACCESS=true
BLOCK_CROSS_TENANT_ACCESS=true

# Compliance
GDPR_ENABLED=false
DATA_LOCALIZATION_ENABLED=true
AUDIT_LOG_RETENTION_DAYS=365

# Limits
MAX_CONCURRENT_ANALYSES=100
MAX_REQUESTS_PER_MINUTE=1000
MAX_STORAGE_PER_TENANT_MB=10240
```

---

### 7. Tenant Isolation Middleware

**File**: `server/middleware/tenantIsolation.js` (230 lines)

**Purpose**: Enforce strict tenant and organization isolation to prevent cross-tenant data access.

**Key Functions**:

1. **enforceTenantIsolation**: Main middleware that establishes tenant context
2. **validateTenantAccess**: Validates resource belongs to user's tenant/org
3. **getTenantFilter**: Returns filter object for database queries
4. **auditCrossTenantAccess**: Logs cross-tenant access attempts
5. **validateResourceOwnership**: Middleware factory for resource validation
6. **canAccessCrossTenant**: Check if user has cross-tenant permissions

**Usage Example**:
```javascript
// Apply to all routes
app.use(enforceTenantIsolation)

// Validate specific resource
router.get('/api/analysis/:id', 
  validateResourceOwnership(async (req) => {
    return await analysisRepository.findById(req.params.id)
  }),
  async (req, res) => {
    // req.resource is validated and attached
    res.json({ success: true, data: req.resource })
  }
)

// Get tenant-scoped filter
const filter = getTenantFilter(req)
const analyses = await analysisRepository.find({
  ...filter,  // { tenantId, organizationId }
  status: 'completed'
})
```

---

## Cross-Sector Sharing Rules

### Allowed Sharing Paths

```
CONSUMER ──────────────────────────────────────┐
    │                                           │
    ├──> BANK                                   │
    ├──> TELCO                                  │
    ├──> WALLET                                 │
    └──> GOV                                    │
                                                 │
BANK ──────────────────────────────────────────┤
    │                                           │
    ├──> WALLET                                 │
    └──> GOV                                    │
                                                 │
TELCO ─────────────────────────────────────────┤
    │                                           │
    └──> GOV                                    │
                                                 │
WALLET ────────────────────────────────────────┤
    │                                           │
    └──> GOV                                    │
                                                 │
NGO ───────────────────────────────────────────┤
    │                                           │
    └──> GOV                                    │
                                                 │
GOV ◄──────────────────────────────────────────┘
  (Can receive from all sectors)
```

### Sharing Logic

```javascript
// Same sector: Always allowed
sourceSector === targetSector → ✅

// GOV can receive from all sectors
targetSector === 'GOV' → ✅

// CONSUMER can share with BANK, TELCO, WALLET
sourceSector === 'CONSUMER' && 
  ['BANK', 'TELCO', 'WALLET'].includes(targetSector) → ✅

// BANK can share with WALLET
sourceSector === 'BANK' && targetSector === 'WALLET' → ✅

// Default: No cross-sector sharing
→ ❌
```

---

## Cross-Region Sharing Rules

### Allowed Sharing Paths

```
┌────────┐     ┌────────┐     ┌────────┐
│   IN   │────▶│  APAC  │────▶│ GLOBAL │
└────────┘     └────────┘     └────────┘
     │              │              │
     │              │              │
     ▼              ▼              ▼
┌────────┐     ┌────────┐     ┌────────┐
│   EU   │◄────│   US   │◄────│ GLOBAL │
└────────┘     └────────┘     └────────┘

Legend:
──▶ Allowed if dataResidency = GLOBAL_ALLOWED
◄── Bidirectional
```

### Sharing Logic

```javascript
// Same region: Always allowed
sourceRegion === targetRegion → ✅

// REGION_LOCAL: No cross-region sharing
dataResidency === 'REGION_LOCAL' → ❌

// India data localization: No cross-border
sourceRegion === 'IN' && dataLocalizationEnabled → ❌

// GDPR: Only share with adequate protection
sourceRegion === 'EU' && gdprEnabled → 
  targetRegion === 'EU' || targetRegion === 'US' → ✅

// GLOBAL_ALLOWED: Cross-region allowed
dataResidency === 'GLOBAL_ALLOWED' → ✅
```

---

## Tenant Isolation Guarantees

### 1. Query-Level Isolation

**All database queries MUST include tenant filter**:

```javascript
// ❌ WRONG: No tenant filter
const analyses = await db.find({ status: 'completed' })

// ✅ CORRECT: Tenant filter applied
const filter = getTenantFilter(req)
const analyses = await db.find({
  ...filter,  // { tenantId, organizationId }
  status: 'completed'
})
```

### 2. Repository-Level Isolation

**All repository methods enforce tenant isolation**:

```javascript
class AnalysisRepository {
  async find(query, tenantContext) {
    // Automatically add tenant filter
    const filter = {
      tenantId: tenantContext.tenantId,
      organizationId: tenantContext.organizationId,
      ...query
    }
    
    return await this.db.find(filter)
  }
}
```

### 3. Middleware-Level Isolation

**Middleware validates every request**:

```javascript
// Establish tenant context
app.use(enforceTenantIsolation)

// Validate resource ownership
router.get('/api/resource/:id',
  validateResourceOwnership(getResourceFn),
  handler
)
```

### 4. Audit-Level Isolation

**All cross-tenant access attempts are logged**:

```javascript
{
  timestamp: "2026-05-16T10:30:00Z",
  requestId: "req-123",
  userId: "user-456",
  userTenantId: "tenant-A",
  resourceTenantId: "tenant-B",
  action: "READ",
  blocked: true,
  path: "/api/analysis/789"
}
```

---

## Integration Points

### 1. Orchestrator Integration

```javascript
const { PlatformContext } = require('../models/PlatformContext')

// Create context from request
const context = PlatformContext.fromRequest(req)

// Validate context
const validation = context.validate()
if (!validation.valid) {
  throw new Error(validation.errors.join(', '))
}

// Use context in orchestrator
const result = await orchestrator.execute(input, context)
```

### 2. Repository Integration

```javascript
// Pass tenant context to repository
const analyses = await analysisRepository.find(
  { status: 'completed' },
  req.tenantContext
)
```

### 3. Policy Integration

```javascript
// Use context in policy evaluation
const decision = await policyEngine.evaluate(
  input,
  context.getSectorConfig(),
  context.getRegionConfig()
)
```

---

## Testing

### Unit Tests

```javascript
// Test platform context
test('platform context validation', () => {
  const context = new PlatformContext({
    tenantId: 'tenant-123',
    organizationId: 'org-456',
    sector: 'BANK',
    region: 'IN'
  })
  
  const validation = context.validate()
  expect(validation.valid).toBe(true)
})

// Test cross-sector sharing
test('cross-sector sharing rules', () => {
  const context = new PlatformContext({
    sector: 'CONSUMER',
    features: { enableCrossSectorSharing: true }
  })
  
  expect(context.canShareWithSector('BANK')).toBe(true)
  expect(context.canShareWithSector('GOV')).toBe(true)
  expect(context.canShareWithSector('TELCO')).toBe(true)
})

// Test tenant isolation
test('tenant isolation enforcement', () => {
  const req = {
    user: { tenantId: 'tenant-A', organizationId: 'org-1' },
    tenantContext: { tenantId: 'tenant-A', organizationId: 'org-1' }
  }
  
  // Should allow same tenant
  expect(() => validateTenantAccess('tenant-A', 'org-1', req)).not.toThrow()
  
  // Should block different tenant
  expect(() => validateTenantAccess('tenant-B', 'org-2', req)).toThrow()
})
```

---

## Migration Guide

### Existing Organizations

```javascript
// Update existing organizations with sector/region
const organizations = await organizationRepository.findAll()

for (const org of organizations) {
  await organizationRepository.update(org.id, {
    sector: 'CONSUMER',  // Default sector
    region: 'IN',        // Default region
    dataResidency: 'REGION_LOCAL'  // Default residency
  })
}
```

### Existing Analyses

```javascript
// Add sector/region metadata to existing analyses
const analyses = await analysisRepository.findAll()

for (const analysis of analyses) {
  const org = await organizationRepository.findById(analysis.organizationId)
  
  await analysisRepository.update(analysis.id, {
    sector: org.sector,
    region: org.region
  })
}
```

---

## Summary

Phase 10.1 establishes the foundational infrastructure for BobSec as a shared anti-scam platform:

✅ **3 Core Files Created** (755 lines total):
- PlatformContext model (350 lines)
- Platform configuration (175 lines)
- Tenant isolation middleware (230 lines)

✅ **1 File Enhanced**:
- Organization model (added sector, region, data residency)

✅ **6 Sector Types** (CONSUMER, BANK, TELCO, GOV, WALLET, NGO)
✅ **5 Region Types** (IN, APAC, EU, US, GLOBAL)
✅ **3 Data Residency Policies** (REGION_LOCAL, GLOBAL_ALLOWED, RESTRICTED)
✅ **Cross-Sector Sharing Rules** with GOV as central hub
✅ **Cross-Region Sharing Rules** with compliance enforcement
✅ **Strict Tenant Isolation** at query, repository, and middleware levels
✅ **Audit Logging** for all cross-tenant access attempts

**Total Implementation**: ~755 lines of production code + comprehensive documentation

---

**Next Phase**: Phase 10.2 - Ecosystem Integration (Public APIs, Webhooks, SDK)