# Phase 10.5: Investigation Tooling & Evidence Packs

**Status**: ✅ COMPLETE  
**Completion Date**: 2026-05-16

---

## Overview

Phase 10.5 transforms BobSec into a comprehensive investigation platform for law enforcement and fraud investigators. This phase adds professional-grade evidence management, chain of custody tracking, and court-ready evidence package generation.

### Key Capabilities

1. **Investigation Case Management** - Create and manage multi-analysis investigation cases
2. **Chain of Custody** - Cryptographic tracking of evidence handling
3. **Evidence Packages** - Court-ready, comprehensive evidence bundles
4. **Pattern Analysis** - Automated detection of scam patterns across cases
5. **Legal Compliance** - Built-in compliance with Indian legal standards

---

## Architecture

### Components Created

```
server/
├── routes/
│   └── investigations.js          (475 lines) - Investigation API endpoints
├── services/
│   └── InvestigationService.js    (454 lines) - Case management logic
└── utils/
    ├── chainOfCustody.js          (450 lines) - Custody tracking
    └── evidencePackageBuilder.js  (520 lines) - Evidence generation
```

**Total**: ~1,900 lines of production code

---

## 1. Investigation Case Management

### InvestigationService

**Purpose**: Manage investigation cases that link multiple analyses together

**Key Methods**:
- `createCase(caseData, context)` - Create new investigation case
- `linkAnalysis(caseId, analysisId, analysis, context)` - Link analysis to case
- `updateCaseStatus(caseId, status, context)` - Update case status
- `getCase(caseId, context)` - Retrieve case details
- `listCases(filter, context)` - List cases with filtering
- `generateEvidencePackage(caseId, context)` - Generate evidence package

**Case Structure**:
```javascript
{
  id: 'CASE-1001',
  title: 'KYC Phishing Campaign Investigation',
  description: 'Multi-victim phishing targeting HDFC customers',
  category: 'FINANCIAL_FRAUD',
  priority: 'HIGH',
  status: 'OPEN',
  
  investigator: {
    userId: 'user_123',
    organizationId: 'org_456',
    name: 'Inspector Sharma'
  },
  
  analyses: [
    { analysisId: 'BSC-2026-123456', linkedAt: '2026-05-16T10:00:00Z', riskScore: 94 },
    { analysisId: 'BSC-2026-123457', linkedAt: '2026-05-16T11:30:00Z', riskScore: 96 }
  ],
  
  evidence: {
    phone_numbers: Set(['9876500000', '9876500001']),
    urls: Set(['hdfc-kyc-update.tk']),
    upi_ids: Set([]),
    patterns: []
  },
  
  createdAt: '2026-05-16T09:00:00Z',
  updatedAt: '2026-05-16T12:00:00Z',
  closedAt: null,
  
  region: 'IN',
  tags: ['phishing', 'banking', 'urgent']
}
```

**Authorization**:
- Only GOV sector can create cases
- Only case owner can modify case
- GOV sector can view all cases

---

## 2. Chain of Custody Tracking

### ChainOfCustodyTracker

**Purpose**: Maintain cryptographic chain of custody for evidence integrity

**Key Features**:
- **Digital Signatures**: HMAC-SHA256 signatures for all custody actions
- **Tamper Detection**: SHA-256 hashing of evidence with integrity verification
- **Access Logging**: Complete audit trail of evidence access
- **Custody Transfer**: Tracked transfers between custodians

**Key Methods**:
- `registerEvidence(evidenceId, evidence, custodian)` - Register new evidence
- `transferCustody(evidenceId, from, to, reason)` - Transfer custody
- `logAccess(evidenceId, accessor, action, purpose)` - Log evidence access
- `verifyIntegrity(evidenceId, currentEvidence)` - Verify evidence integrity
- `getCustodyChain(evidenceId)` - Get custody chain
- `generateCustodyCertificate(evidenceId)` - Generate custody certificate

**Custody Record Structure**:
```javascript
{
  evidenceId: 'PKG-CASE-1001-1715865600000',
  evidenceHash: 'a3f5b8c9d2e1f4a7b6c5d8e9f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0',
  evidenceType: 'EVIDENCE_PACKAGE',
  
  currentCustodian: {
    userId: 'user_123',
    organizationId: 'org_456',
    name: 'Inspector Sharma',
    role: 'INVESTIGATOR',
    acquiredAt: '2026-05-16T12:00:00Z'
  },
  
  chain: [
    {
      action: 'REGISTERED',
      custodian: { userId: 'user_123', name: 'Inspector Sharma' },
      timestamp: '2026-05-16T12:00:00Z',
      evidenceHash: 'a3f5b8c9...',
      signature: 'e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9'
    },
    {
      action: 'TRANSFERRED',
      fromCustodian: { userId: 'user_123', name: 'Inspector Sharma' },
      toCustodian: { userId: 'user_789', name: 'Senior Inspector Patel' },
      reason: 'Case escalation to senior investigator',
      timestamp: '2026-05-16T14:00:00Z',
      evidenceHash: 'a3f5b8c9...',
      signature: 'f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1'
    }
  ],
  
  accessLog: [
    {
      accessor: { userId: 'user_456', name: 'Forensic Analyst' },
      action: 'VIEWED',
      purpose: 'Forensic analysis',
      timestamp: '2026-05-16T13:00:00Z',
      ipAddress: '192.168.1.100'
    }
  ],
  
  status: 'ACTIVE',
  createdAt: '2026-05-16T12:00:00Z',
  updatedAt: '2026-05-16T14:00:00Z'
}
```

**Cryptographic Security**:
- Evidence hash: `SHA-256(JSON.stringify(evidence, sorted_keys))`
- Action signature: `HMAC-SHA256(action|evidenceId|hash|userId|timestamp, secret)`
- Integrity verification: Compare current hash with original hash
- Chain verification: Verify all signatures in custody chain

---

## 3. Evidence Package Generation

### EvidencePackageBuilder

**Purpose**: Generate comprehensive, court-ready evidence packages

**Key Features**:
- **Multi-Analysis Aggregation**: Combine evidence from multiple analyses
- **Pattern Detection**: Identify temporal, entity reuse, and category patterns
- **Risk Assessment**: Overall risk scoring and threat level determination
- **Timeline Visualization**: Chronological event timeline
- **Legal Compliance**: Built-in legal notices and compliance information

**Key Methods**:
- `buildPackage(case, analyses, context)` - Build complete evidence package
- `generateSummary(case, analyses)` - Generate evidence summary
- `extractEvidence(case, analyses)` - Extract and organize evidence
- `buildTimeline(case, analyses)` - Build investigation timeline
- `analyzePatterns(case, analyses)` - Detect patterns across analyses
- `assessRisk(analyses)` - Assess overall risk level

**Evidence Package Structure**:
```javascript
{
  // Package metadata
  package_id: 'PKG-CASE-1001-1715865600000',
  package_version: '1.0',
  generated_at: '2026-05-16T12:00:00Z',
  generated_by: { userId: 'user_123', name: 'Inspector Sharma' },
  
  // Case information
  case: {
    id: 'CASE-1001',
    title: 'KYC Phishing Campaign Investigation',
    category: 'FINANCIAL_FRAUD',
    priority: 'HIGH',
    status: 'OPEN'
  },
  
  // Evidence summary
  summary: {
    total_analyses: 15,
    date_range: {
      first_analysis: '2026-05-10T08:00:00Z',
      last_analysis: '2026-05-16T11:30:00Z'
    },
    entities: {
      unique_phone_numbers: 3,
      unique_urls: 2,
      unique_upi_ids: 0
    },
    categories: ['FINANCIAL_FRAUD', 'PHISHING'],
    risk_metrics: {
      average_risk_score: 92.3,
      high_risk_count: 14,
      high_risk_percentage: 93.3
    }
  },
  
  // Detailed evidence
  evidence: {
    phone_numbers: [
      {
        value: '+91-9876500000',
        verdict: 'FLAGGED',
        report_count: 1243,
        scam_type: 'KYC_SCAM',
        appearances: 12,
        first_seen: '2026-05-10T08:00:00Z',
        last_seen: '2026-05-16T11:30:00Z',
        analysis_ids: ['BSC-2026-123456', 'BSC-2026-123457', ...]
      }
    ],
    urls: [
      {
        value: 'hdfc-kyc-update.tk',
        verdict: 'MALICIOUS',
        domain_age_days: 3,
        feed_hits: 2,
        reason: 'Lookalike phishing domain',
        appearances: 15,
        first_seen: '2026-05-10T08:00:00Z',
        last_seen: '2026-05-16T11:30:00Z',
        analysis_ids: ['BSC-2026-123456', 'BSC-2026-123457', ...]
      }
    ],
    upi_ids: [],
    impersonated_organizations: ['HDFC Bank'],
    red_flags: [
      'Urgency threat about account suspension',
      'Unofficial .tk domain',
      'OTP request via WhatsApp'
    ]
  },
  
  // Timeline
  timeline: [
    {
      timestamp: '2026-05-16T09:00:00Z',
      type: 'CASE_CREATED',
      description: 'Investigation case created: KYC Phishing Campaign Investigation',
      actor: 'Inspector Sharma'
    },
    {
      timestamp: '2026-05-16T10:00:00Z',
      type: 'ANALYSIS_LINKED',
      description: 'Analysis BSC-2026-123456 linked (Risk: 94/100, Category: FINANCIAL_FRAUD)',
      risk_level: 'HIGH',
      analysis_id: 'BSC-2026-123456'
    }
  ],
  
  // Pattern analysis
  patterns: [
    {
      type: 'TEMPORAL',
      description: 'Scam messages received with average interval of 8.5 hours',
      confidence: 'MEDIUM',
      data: { average_interval_hours: 8.5, total_messages: 15 }
    },
    {
      type: 'ENTITY_REUSE',
      description: '3 phone numbers and 2 URLs reused across multiple scam attempts',
      confidence: 'HIGH',
      data: {
        reused_phones: [
          { value: '+91-9876500000', count: 12 },
          { value: '+91-9876500001', count: 8 }
        ],
        reused_urls: [
          { value: 'hdfc-kyc-update.tk', count: 15 }
        ]
      }
    },
    {
      type: 'CATEGORY',
      description: '93% of scam attempts are FINANCIAL_FRAUD type',
      confidence: 'HIGH',
      data: { dominant_category: 'FINANCIAL_FRAUD', count: 14, percentage: 93 }
    }
  ],
  
  // Risk assessment
  risk_assessment: {
    overall_risk: 'HIGH',
    risk_score: 92.3,
    threat_level: 'CRITICAL',
    high_risk_percentage: 93.3,
    recommendation: 'Immediate action required. Recommend blocking all identified entities and filing FIR.'
  },
  
  // Chain of custody
  chain_of_custody: {
    custody_id: 'PKG-CASE-1001-1715865600000',
    evidence_hash: 'a3f5b8c9d2e1f4a7b6c5d8e9f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0',
    current_custodian: { userId: 'user_123', name: 'Inspector Sharma' },
    chain: [...],
    integrity_verified: true
  },
  
  // Legal compliance
  legal: {
    title: 'LEGAL NOTICE AND COMPLIANCE',
    jurisdiction: 'India',
    applicable_laws: [
      'Information Technology Act, 2000',
      'Indian Penal Code, 1860 (Sections 419, 420, 463-468)',
      'Payment and Settlement Systems Act, 2007'
    ],
    evidence_standards: {
      collection_method: 'AI-powered analysis with human oversight',
      chain_of_custody: 'Cryptographically signed and timestamped',
      integrity_verification: 'SHA-256 hash verification',
      admissibility: 'Subject to court discretion under Section 65B of Indian Evidence Act'
    },
    disclaimers: [
      'This evidence package is generated by BobSec AI-powered investigation tools',
      'All evidence has been collected in accordance with applicable data protection laws',
      'AI analysis should be independently verified before use in legal proceedings'
    ]
  }
}
```

---

## 4. API Endpoints

### Investigation Routes (`/api/investigations`)

All endpoints require authentication and GOV sector or INVESTIGATOR role.

#### Case Management

**POST /api/investigations/cases**
- Create new investigation case
- Body: `{ title, description, category, priority, investigatorName, tags }`
- Returns: Created case object

**GET /api/investigations/cases**
- List investigation cases
- Query params: `status`, `category`, `priority`
- Returns: Array of case summaries

**GET /api/investigations/cases/:caseId**
- Get case details
- Returns: Full case object with evidence

**PATCH /api/investigations/cases/:caseId/status**
- Update case status
- Body: `{ status }` (OPEN, IN_PROGRESS, UNDER_REVIEW, CLOSED, ARCHIVED)
- Returns: Updated case object

**POST /api/investigations/cases/:caseId/link**
- Link analysis to case
- Body: `{ analysisId, analysis }`
- Returns: Updated case with linked analysis

#### Evidence Generation

**GET /api/investigations/cases/:caseId/evidence**
- Generate evidence package
- Returns: Complete evidence package object

**GET /api/investigations/cases/:caseId/export/json**
- Export evidence as JSON file
- Returns: JSON file download

**GET /api/investigations/cases/:caseId/export/pdf**
- Export evidence as PDF file
- Returns: PDF file download

#### Statistics

**GET /api/investigations/stats**
- Get investigation statistics
- Returns: `{ total_cases, open_cases, closed_cases, total_analyses, avg_analyses_per_case }`

---

## 5. Usage Examples

### Creating Investigation Case

```javascript
// POST /api/investigations/cases
const response = await fetch('/api/investigations/cases', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'KYC Phishing Campaign Investigation',
    description: 'Multi-victim phishing targeting HDFC customers',
    category: 'FINANCIAL_FRAUD',
    priority: 'HIGH',
    investigatorName: 'Inspector Sharma',
    tags: ['phishing', 'banking', 'urgent']
  })
})

const { case: investigationCase } = await response.json()
console.log('Case created:', investigationCase.id)
```

### Linking Analysis to Case

```javascript
// POST /api/investigations/cases/CASE-1001/link
const response = await fetch('/api/investigations/cases/CASE-1001/link', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    analysisId: 'BSC-2026-123456',
    analysis: {
      risk_score: 94,
      risk_level: 'HIGH',
      category: 'FINANCIAL_FRAUD',
      entities: {
        phone_numbers: [{ value: '+91-9876500000', verdict: 'FLAGGED' }],
        urls: [{ value: 'hdfc-kyc-update.tk', verdict: 'MALICIOUS' }]
      }
    }
  })
})

const { case: updatedCase } = await response.json()
console.log('Analysis linked. Total analyses:', updatedCase.analyses.length)
```

### Generating Evidence Package

```javascript
// GET /api/investigations/cases/CASE-1001/evidence
const response = await fetch('/api/investigations/cases/CASE-1001/evidence', {
  headers: {
    'Authorization': 'Bearer <token>'
  }
})

const { evidence } = await response.json()
console.log('Evidence package generated:', evidence.package_id)
console.log('Total analyses:', evidence.summary.total_analyses)
console.log('Risk assessment:', evidence.risk_assessment.threat_level)
```

### Exporting Evidence

```javascript
// Download JSON
window.location.href = '/api/investigations/cases/CASE-1001/export/json'

// Download PDF
window.location.href = '/api/investigations/cases/CASE-1001/export/pdf'
```

---

## 6. Security & Authorization

### Access Control

**GOV Sector**:
- Can create investigation cases
- Can view all cases
- Can link any analysis to cases
- Can generate evidence packages

**INVESTIGATOR Role**:
- Can create investigation cases
- Can only view own organization's cases
- Can only link own organization's analyses
- Can generate evidence packages for own cases

**Other Sectors/Roles**:
- Cannot access investigation tools
- 403 Forbidden error returned

### Chain of Custody Security

**Evidence Integrity**:
- SHA-256 hashing ensures tamper detection
- Any modification to evidence invalidates hash
- Integrity verification available at any time

**Action Signatures**:
- HMAC-SHA256 signatures for all custody actions
- Signatures include: action, evidenceId, hash, userId, timestamp
- Secret key stored securely in environment variables

**Access Logging**:
- All evidence access logged with timestamp
- IP address and user agent captured
- Complete audit trail for legal proceedings

---

## 7. Legal Compliance

### Indian Legal Framework

**Applicable Laws**:
- Information Technology Act, 2000
- Indian Penal Code, 1860 (Sections 419, 420, 463-468)
- Payment and Settlement Systems Act, 2007
- Indian Evidence Act, 1872 (Section 65B for electronic evidence)

**Evidence Standards**:
- Chain of custody maintained throughout
- Cryptographic signatures for integrity
- Timestamps for all actions
- Access logs for audit trail

**Admissibility**:
- Evidence packages designed to meet Section 65B requirements
- Certificate of custody included
- Integrity verification available
- Human oversight and verification required

---

## 8. Performance Metrics

### Implementation Stats

- **Total Code**: ~1,900 lines
- **API Endpoints**: 10 endpoints
- **Services**: 2 services (Investigation, EvidencePackageBuilder)
- **Utilities**: 1 utility (ChainOfCustody)
- **Documentation**: 750+ lines

### Capabilities

- **Case Management**: Unlimited cases per organization
- **Analysis Linking**: Unlimited analyses per case
- **Evidence Aggregation**: Automatic entity deduplication
- **Pattern Detection**: 3 pattern types (temporal, entity reuse, category)
- **Export Formats**: JSON, PDF
- **Chain of Custody**: Cryptographic integrity verification

---

## 9. Future Enhancements

### Planned Features

1. **Advanced Pattern Detection**
   - Machine learning-based pattern recognition
   - Cross-case pattern analysis
   - Predictive scam detection

2. **Collaborative Investigation**
   - Multi-investigator cases
   - Real-time collaboration
   - Case sharing between agencies

3. **Enhanced Export Formats**
   - CSV export for spreadsheet analysis
   - XML export for legal systems
   - Blockchain-based evidence anchoring

4. **Integration with Legal Systems**
   - Direct filing to NCRP portal
   - Integration with court case management systems
   - Automated FIR generation

5. **Advanced Analytics**
   - Network analysis of scam operations
   - Geographic clustering
   - Temporal trend analysis

---

## 10. Testing & Validation

### Test Scenarios

1. **Case Creation**
   - ✅ GOV sector can create cases
   - ✅ Non-GOV sector blocked from creating cases
   - ✅ Required fields validated

2. **Analysis Linking**
   - ✅ Analyses linked successfully
   - ✅ Evidence aggregated correctly
   - ✅ Duplicate entities deduplicated

3. **Chain of Custody**
   - ✅ Evidence registered with hash
   - ✅ Custody transfers tracked
   - ✅ Access logged
   - ✅ Integrity verification works
   - ✅ Tamper detection works

4. **Evidence Package**
   - ✅ Summary generated correctly
   - ✅ Evidence extracted and organized
   - ✅ Timeline built chronologically
   - ✅ Patterns detected
   - ✅ Risk assessment accurate

5. **Export**
   - ✅ JSON export works
   - ✅ PDF export works
   - ✅ File downloads correctly

---

## Conclusion

Phase 10.5 successfully transforms BobSec into a professional investigation platform suitable for law enforcement use. The combination of case management, chain of custody tracking, and comprehensive evidence package generation provides investigators with the tools needed for effective fraud investigation and legal proceedings.

**Key Achievements**:
- ✅ Professional-grade case management
- ✅ Cryptographic chain of custody
- ✅ Court-ready evidence packages
- ✅ Pattern detection across cases
- ✅ Legal compliance built-in
- ✅ Secure access control
- ✅ Complete audit trail

**Next Phase**: Phase 10.6 - Governance, Policies, and Ecosystem Controls

---

**Made with Bob** 🛡️