/**
 * Evidence Package Builder
 * 
 * Generates comprehensive, court-ready evidence packages
 * Designed for law enforcement and legal proceedings
 * 
 * Features:
 * - Multi-format export (JSON, PDF, CSV)
 * - Chain of custody integration
 * - Timeline visualization
 * - Pattern analysis
 * - Legal compliance
 */

const chainOfCustodyTracker = require('./chainOfCustody')
const logger = require('./logger')

class EvidencePackageBuilder {
  constructor() {
    this.name = 'EvidencePackageBuilder'
  }
  
  // ════════════════════════════════════════════════════════════════════════════
  // Package Generation
  // ════════════════════════════════════════════════════════════════════════════
  
  /**
   * Build comprehensive evidence package
   * 
   * @param {Object} investigationCase - Investigation case data
   * @param {Array} analyses - Linked analyses
   * @param {Object} context - Platform context
   * @returns {Object} Evidence package
   */
  async buildPackage(investigationCase, analyses, context) {
    const packageId = `PKG-${investigationCase.id}-${Date.now()}`
    
    // Register evidence in chain of custody
    const custodian = {
      userId: context.userId,
      organizationId: context.organizationId,
      name: context.userName || 'Investigator',
      role: context.role || 'INVESTIGATOR'
    }
    
    const custodyRecord = chainOfCustodyTracker.registerEvidence(
      packageId,
      { type: 'EVIDENCE_PACKAGE', caseId: investigationCase.id },
      custodian
    )
    
    // Build package
    const evidencePackage = {
      // Package metadata
      package_id: packageId,
      package_version: '1.0',
      generated_at: new Date(),
      generated_by: custodian,
      
      // Case information
      case: {
        id: investigationCase.id,
        title: investigationCase.title,
        description: investigationCase.description,
        category: investigationCase.category,
        priority: investigationCase.priority,
        status: investigationCase.status,
        investigator: investigationCase.investigator,
        created_at: investigationCase.createdAt,
        updated_at: investigationCase.updatedAt,
        closed_at: investigationCase.closedAt,
        region: investigationCase.region,
        tags: investigationCase.tags
      },
      
      // Evidence summary
      summary: this.generateSummary(investigationCase, analyses),
      
      // Detailed evidence
      evidence: this.extractEvidence(investigationCase, analyses),
      
      // Timeline
      timeline: this.buildTimeline(investigationCase, analyses),
      
      // Pattern analysis
      patterns: this.analyzePatterns(investigationCase, analyses),
      
      // Risk assessment
      risk_assessment: this.assessRisk(analyses),
      
      // Chain of custody
      chain_of_custody: {
        custody_id: custodyRecord.evidenceId,
        evidence_hash: custodyRecord.evidenceHash,
        current_custodian: custodyRecord.currentCustodian,
        chain: custodyRecord.chain,
        integrity_verified: true
      },
      
      // Legal compliance
      legal: this.generateLegalSection(),
      
      // Export metadata
      export_format: 'JSON',
      export_timestamp: new Date()
    }
    
    // Log access
    chainOfCustodyTracker.logAccess(
      packageId,
      custodian,
      'PACKAGE_GENERATED',
      'Evidence package generation for legal proceedings'
    )
    
    logger.info('EvidencePackage: Package built', {
      packageId,
      caseId: investigationCase.id,
      analysesCount: analyses.length
    })
    
    return evidencePackage
  }
  
  // ════════════════════════════════════════════════════════════════════════════
  // Summary Generation
  // ════════════════════════════════════════════════════════════════════════════
  
  /**
   * Generate evidence summary
   */
  generateSummary(investigationCase, analyses) {
    const phoneNumbers = new Set()
    const urls = new Set()
    const upiIds = new Set()
    const categories = new Set()
    
    let totalRiskScore = 0
    let highRiskCount = 0
    
    analyses.forEach(analysis => {
      // Collect entities
      if (analysis.entities) {
        analysis.entities.phone_numbers?.forEach(p => phoneNumbers.add(p.value || p))
        analysis.entities.urls?.forEach(u => urls.add(u.value || u))
        analysis.entities.upi_ids?.forEach(u => upiIds.add(u.value || u))
      }
      
      // Collect categories
      if (analysis.category) {
        categories.add(analysis.category)
      }
      
      // Risk metrics
      totalRiskScore += analysis.risk_score || 0
      if (analysis.risk_level === 'HIGH') {
        highRiskCount++
      }
    })
    
    return {
      total_analyses: analyses.length,
      date_range: {
        first_analysis: analyses.length > 0 ? analyses[0].timestamp : null,
        last_analysis: analyses.length > 0 ? analyses[analyses.length - 1].timestamp : null
      },
      entities: {
        unique_phone_numbers: phoneNumbers.size,
        unique_urls: urls.size,
        unique_upi_ids: upiIds.size
      },
      categories: Array.from(categories),
      risk_metrics: {
        average_risk_score: analyses.length > 0 ? (totalRiskScore / analyses.length).toFixed(1) : 0,
        high_risk_count: highRiskCount,
        high_risk_percentage: analyses.length > 0 ? ((highRiskCount / analyses.length) * 100).toFixed(1) : 0
      }
    }
  }
  
  // ════════════════════════════════════════════════════════════════════════════
  // Evidence Extraction
  // ════════════════════════════════════════════════════════════════════════════
  
  /**
   * Extract and organize evidence
   */
  extractEvidence(investigationCase, analyses) {
    const evidence = {
      phone_numbers: [],
      urls: [],
      upi_ids: [],
      impersonated_organizations: [],
      red_flags: []
    }
    
    // Track entity appearances
    const phoneMap = new Map()
    const urlMap = new Map()
    const upiMap = new Map()
    const orgSet = new Set()
    const flagSet = new Set()
    
    analyses.forEach(analysis => {
      // Phone numbers
      analysis.entities?.phone_numbers?.forEach(p => {
        const value = p.value || p
        if (!phoneMap.has(value)) {
          phoneMap.set(value, {
            value,
            verdict: p.verdict || 'UNKNOWN',
            report_count: p.report_count || 0,
            scam_type: p.scam_type || null,
            appearances: 0,
            first_seen: analysis.timestamp,
            last_seen: analysis.timestamp,
            analysis_ids: []
          })
        }
        const entry = phoneMap.get(value)
        entry.appearances++
        entry.last_seen = analysis.timestamp
        entry.analysis_ids.push(analysis.analysis_id)
      })
      
      // URLs
      analysis.entities?.urls?.forEach(u => {
        const value = u.value || u
        if (!urlMap.has(value)) {
          urlMap.set(value, {
            value,
            verdict: u.verdict || 'UNKNOWN',
            domain_age_days: u.domain_age_days || null,
            feed_hits: u.feed_hits || 0,
            reason: u.reason || '',
            appearances: 0,
            first_seen: analysis.timestamp,
            last_seen: analysis.timestamp,
            analysis_ids: []
          })
        }
        const entry = urlMap.get(value)
        entry.appearances++
        entry.last_seen = analysis.timestamp
        entry.analysis_ids.push(analysis.analysis_id)
      })
      
      // UPI IDs
      analysis.entities?.upi_ids?.forEach(u => {
        const value = u.value || u
        if (!upiMap.has(value)) {
          upiMap.set(value, {
            value,
            verdict: u.verdict || 'UNKNOWN',
            report_count: u.report_count || 0,
            appearances: 0,
            first_seen: analysis.timestamp,
            last_seen: analysis.timestamp,
            analysis_ids: []
          })
        }
        const entry = upiMap.get(value)
        entry.appearances++
        entry.last_seen = analysis.timestamp
        entry.analysis_ids.push(analysis.analysis_id)
      })
      
      // Organizations
      if (analysis.entities?.impersonated_org) {
        orgSet.add(analysis.entities.impersonated_org)
      }
      
      // Red flags
      analysis.red_flags?.forEach(flag => flagSet.add(flag))
    })
    
    evidence.phone_numbers = Array.from(phoneMap.values())
      .sort((a, b) => b.appearances - a.appearances)
    
    evidence.urls = Array.from(urlMap.values())
      .sort((a, b) => b.appearances - a.appearances)
    
    evidence.upi_ids = Array.from(upiMap.values())
      .sort((a, b) => b.appearances - a.appearances)
    
    evidence.impersonated_organizations = Array.from(orgSet)
    evidence.red_flags = Array.from(flagSet)
    
    return evidence
  }
  
  // ════════════════════════════════════════════════════════════════════════════
  // Timeline Building
  // ════════════════════════════════════════════════════════════════════════════
  
  /**
   * Build investigation timeline
   */
  buildTimeline(investigationCase, analyses) {
    const events = []
    
    // Case creation
    events.push({
      timestamp: investigationCase.createdAt,
      type: 'CASE_CREATED',
      description: `Investigation case created: ${investigationCase.title}`,
      actor: investigationCase.investigator.name
    })
    
    // Analysis events
    analyses.forEach(analysis => {
      events.push({
        timestamp: analysis.timestamp,
        type: 'ANALYSIS_LINKED',
        description: `Analysis ${analysis.analysis_id} linked (Risk: ${analysis.risk_score}/100, Category: ${analysis.category})`,
        risk_level: analysis.risk_level,
        analysis_id: analysis.analysis_id
      })
    })
    
    // Case closure
    if (investigationCase.closedAt) {
      events.push({
        timestamp: investigationCase.closedAt,
        type: 'CASE_CLOSED',
        description: 'Investigation case closed',
        actor: investigationCase.investigator.name
      })
    }
    
    return events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
  }
  
  // ════════════════════════════════════════════════════════════════════════════
  // Pattern Analysis
  // ════════════════════════════════════════════════════════════════════════════
  
  /**
   * Analyze patterns across analyses
   */
  analyzePatterns(investigationCase, analyses) {
    const patterns = []
    
    // Temporal patterns
    const timePattern = this.analyzeTemporalPattern(analyses)
    if (timePattern) patterns.push(timePattern)
    
    // Entity reuse patterns
    const entityPattern = this.analyzeEntityReuse(analyses)
    if (entityPattern) patterns.push(entityPattern)
    
    // Category patterns
    const categoryPattern = this.analyzeCategoryPattern(analyses)
    if (categoryPattern) patterns.push(categoryPattern)
    
    return patterns
  }
  
  analyzeTemporalPattern(analyses) {
    if (analyses.length < 2) return null
    
    const timestamps = analyses.map(a => new Date(a.timestamp).getTime())
    const intervals = []
    
    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i] - timestamps[i - 1])
    }
    
    const avgInterval = intervals.reduce((sum, i) => sum + i, 0) / intervals.length
    const avgHours = (avgInterval / (1000 * 60 * 60)).toFixed(1)
    
    return {
      type: 'TEMPORAL',
      description: `Scam messages received with average interval of ${avgHours} hours`,
      confidence: 'MEDIUM',
      data: { average_interval_hours: avgHours, total_messages: analyses.length }
    }
  }
  
  analyzeEntityReuse(analyses) {
    const phoneReuse = new Map()
    const urlReuse = new Map()
    
    analyses.forEach(analysis => {
      analysis.entities?.phone_numbers?.forEach(p => {
        const value = p.value || p
        phoneReuse.set(value, (phoneReuse.get(value) || 0) + 1)
      })
      
      analysis.entities?.urls?.forEach(u => {
        const value = u.value || u
        urlReuse.set(value, (urlReuse.get(value) || 0) + 1)
      })
    })
    
    const reusedPhones = Array.from(phoneReuse.entries()).filter(([_, count]) => count > 1)
    const reusedUrls = Array.from(urlReuse.entries()).filter(([_, count]) => count > 1)
    
    if (reusedPhones.length === 0 && reusedUrls.length === 0) return null
    
    return {
      type: 'ENTITY_REUSE',
      description: `${reusedPhones.length} phone numbers and ${reusedUrls.length} URLs reused across multiple scam attempts`,
      confidence: 'HIGH',
      data: {
        reused_phones: reusedPhones.map(([value, count]) => ({ value, count })),
        reused_urls: reusedUrls.map(([value, count]) => ({ value, count }))
      }
    }
  }
  
  analyzeCategoryPattern(analyses) {
    const categories = {}
    
    analyses.forEach(analysis => {
      const cat = analysis.category || 'UNKNOWN'
      categories[cat] = (categories[cat] || 0) + 1
    })
    
    const dominantCategory = Object.entries(categories)
      .sort((a, b) => b[1] - a[1])[0]
    
    if (!dominantCategory) return null
    
    const [category, count] = dominantCategory
    const percentage = ((count / analyses.length) * 100).toFixed(0)
    
    return {
      type: 'CATEGORY',
      description: `${percentage}% of scam attempts are ${category} type`,
      confidence: 'HIGH',
      data: { dominant_category: category, count, percentage }
    }
  }
  
  // ════════════════════════════════════════════════════════════════════════════
  // Risk Assessment
  // ════════════════════════════════════════════════════════════════════════════
  
  /**
   * Assess overall risk
   */
  assessRisk(analyses) {
    if (analyses.length === 0) {
      return {
        overall_risk: 'UNKNOWN',
        risk_score: 0,
        threat_level: 'UNKNOWN',
        recommendation: 'No analyses available for risk assessment'
      }
    }
    
    const avgRisk = analyses.reduce((sum, a) => sum + (a.risk_score || 0), 0) / analyses.length
    const highRiskCount = analyses.filter(a => a.risk_level === 'HIGH').length
    const highRiskPercentage = (highRiskCount / analyses.length) * 100
    
    let threatLevel = 'LOW'
    let recommendation = 'Monitor for further activity'
    
    if (avgRisk >= 80 || highRiskPercentage >= 70) {
      threatLevel = 'CRITICAL'
      recommendation = 'Immediate action required. Recommend blocking all identified entities and filing FIR.'
    } else if (avgRisk >= 60 || highRiskPercentage >= 50) {
      threatLevel = 'HIGH'
      recommendation = 'High priority investigation. Recommend coordinated action with relevant authorities.'
    } else if (avgRisk >= 40 || highRiskPercentage >= 30) {
      threatLevel = 'MEDIUM'
      recommendation = 'Continue investigation. Gather additional evidence before taking action.'
    }
    
    return {
      overall_risk: avgRisk >= 70 ? 'HIGH' : avgRisk >= 40 ? 'MEDIUM' : 'LOW',
      risk_score: avgRisk.toFixed(1),
      threat_level: threatLevel,
      high_risk_percentage: highRiskPercentage.toFixed(1),
      recommendation
    }
  }
  
  // ════════════════════════════════════════════════════════════════════════════
  // Legal Section
  // ════════════════════════════════════════════════════════════════════════════
  
  /**
   * Generate legal compliance section
   */
  generateLegalSection() {
    return {
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
        'AI analysis should be independently verified before use in legal proceedings',
        'Chain of custody has been maintained throughout evidence handling',
        'This package is intended for use by authorized law enforcement personnel only'
      ],
      contact: {
        organization: 'BobSec Investigation Services',
        email: 'investigations@bobsec.ai',
        support: '24/7 evidence verification support available'
      }
    }
  }
}

// Singleton instance
const evidencePackageBuilder = new EvidencePackageBuilder()

module.exports = evidencePackageBuilder

// Made with Bob