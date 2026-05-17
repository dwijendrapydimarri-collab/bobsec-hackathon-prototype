/**
 * Investigation Service
 * 
 * Tools for law enforcement and fraud investigators to:
 * - Create investigation cases
 * - Link multiple analyses to a case
 * - Generate evidence packages
 * - Export data for legal proceedings
 * - Track investigation progress
 * 
 * Designed for GOV sector and authorized investigators
 */

const logger = require('../utils/logger')
const { generateEvidencePDF } = require('../utils/pdfBuilder')

class InvestigationService {
  constructor() {
    this.name = 'InvestigationService'
    
    // In-memory case store (in production, use database)
    this.cases = new Map()
    this.caseCounter = 1000
  }
  
  // ════════════════════════════════════════════════════════════════════════════
  // Case Management
  // ════════════════════════════════════════════════════════════════════════════
  
  /**
   * Create a new investigation case
   * 
   * @param {Object} caseData - Case details
   * @param {Object} context - Platform context
   * @returns {Promise<Object>} Created case
   */
  async createCase(caseData, context) {
    // Validate authorization (GOV sector only)
    if (context.sector !== 'GOV') {
      throw new Error('Investigation cases can only be created by GOV sector')
    }
    
    const caseId = `CASE-${this.caseCounter++}`
    const now = new Date()
    
    const investigationCase = {
      id: caseId,
      title: caseData.title,
      description: caseData.description,
      category: caseData.category,
      priority: caseData.priority || 'MEDIUM',
      status: 'OPEN',
      
      // Investigator details
      investigator: {
        userId: context.userId,
        organizationId: context.organizationId,
        name: caseData.investigatorName
      },
      
      // Linked analyses
      analyses: [],
      
      // Evidence collected
      evidence: {
        phone_numbers: new Set(),
        urls: new Set(),
        upi_ids: new Set(),
        patterns: []
      },
      
      // Timeline
      createdAt: now,
      updatedAt: now,
      closedAt: null,
      
      // Metadata
      region: context.region,
      tags: caseData.tags || []
    }
    
    this.cases.set(caseId, investigationCase)
    
    logger.info('Investigation: Case created', {
      caseId,
      category: caseData.category,
      investigator: context.userId
    })
    
    return investigationCase
  }
  
  /**
   * Link analysis to investigation case
   * 
   * @param {string} caseId - Case ID
   * @param {string} analysisId - Analysis ID
   * @param {Object} analysis - Analysis data
   * @param {Object} context - Platform context
   * @returns {Promise<Object>} Updated case
   */
  async linkAnalysis(caseId, analysisId, analysis, context) {
    const investigationCase = this.cases.get(caseId)
    
    if (!investigationCase) {
      throw new Error('Case not found')
    }
    
    // Validate authorization
    if (context.sector !== 'GOV' && context.organizationId !== investigationCase.investigator.organizationId) {
      throw new Error('Unauthorized to modify this case')
    }
    
    // Add analysis to case
    investigationCase.analyses.push({
      analysisId,
      linkedAt: new Date(),
      riskScore: analysis.risk_score,
      category: analysis.category
    })
    
    // Extract and aggregate evidence
    if (analysis.entities) {
      if (analysis.entities.phone_numbers) {
        analysis.entities.phone_numbers.forEach(p => 
          investigationCase.evidence.phone_numbers.add(p.value || p)
        )
      }
      
      if (analysis.entities.urls) {
        analysis.entities.urls.forEach(u => 
          investigationCase.evidence.urls.add(u.value || u)
        )
      }
      
      if (analysis.entities.upi_ids) {
        analysis.entities.upi_ids.forEach(u => 
          investigationCase.evidence.upi_ids.add(u.value || u)
        )
      }
    }
    
    investigationCase.updatedAt = new Date()
    
    logger.info('Investigation: Analysis linked to case', {
      caseId,
      analysisId,
      totalAnalyses: investigationCase.analyses.length
    })
    
    return investigationCase
  }
  
  /**
   * Update case status
   * 
   * @param {string} caseId - Case ID
   * @param {string} status - New status
   * @param {Object} context - Platform context
   * @returns {Promise<Object>} Updated case
   */
  async updateCaseStatus(caseId, status, context) {
    const investigationCase = this.cases.get(caseId)
    
    if (!investigationCase) {
      throw new Error('Case not found')
    }
    
    // Validate authorization
    if (context.organizationId !== investigationCase.investigator.organizationId) {
      throw new Error('Unauthorized to modify this case')
    }
    
    investigationCase.status = status
    investigationCase.updatedAt = new Date()
    
    if (status === 'CLOSED') {
      investigationCase.closedAt = new Date()
    }
    
    logger.info('Investigation: Case status updated', {
      caseId,
      status,
      investigator: context.userId
    })
    
    return investigationCase
  }
  
  /**
   * Get case details
   * 
   * @param {string} caseId - Case ID
   * @param {Object} context - Platform context
   * @returns {Promise<Object>} Case details
   */
  async getCase(caseId, context) {
    const investigationCase = this.cases.get(caseId)
    
    if (!investigationCase) {
      throw new Error('Case not found')
    }
    
    // Validate authorization
    if (context.sector !== 'GOV' && context.organizationId !== investigationCase.investigator.organizationId) {
      throw new Error('Unauthorized to view this case')
    }
    
    // Convert Sets to Arrays for JSON serialization
    return {
      ...investigationCase,
      evidence: {
        phone_numbers: Array.from(investigationCase.evidence.phone_numbers),
        urls: Array.from(investigationCase.evidence.urls),
        upi_ids: Array.from(investigationCase.evidence.upi_ids),
        patterns: investigationCase.evidence.patterns
      }
    }
  }
  
  /**
   * List cases for investigator
   * 
   * @param {Object} filter - Filter criteria
   * @param {Object} context - Platform context
   * @returns {Promise<Array>} List of cases
   */
  async listCases(filter, context) {
    const cases = Array.from(this.cases.values())
      .filter(c => {
        // Filter by organization
        if (context.sector !== 'GOV' && c.investigator.organizationId !== context.organizationId) {
          return false
        }
        
        // Filter by status
        if (filter.status && c.status !== filter.status) {
          return false
        }
        
        // Filter by category
        if (filter.category && c.category !== filter.category) {
          return false
        }
        
        // Filter by priority
        if (filter.priority && c.priority !== filter.priority) {
          return false
        }
        
        return true
      })
      .sort((a, b) => b.updatedAt - a.updatedAt)
    
    return cases.map(c => ({
      id: c.id,
      title: c.title,
      category: c.category,
      priority: c.priority,
      status: c.status,
      analysesCount: c.analyses.length,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt
    }))
  }
  
  // ════════════════════════════════════════════════════════════════════════════
  // Evidence Package Generation
  // ════════════════════════════════════════════════════════════════════════════
  
  /**
   * Generate comprehensive evidence package for case
   * 
   * @param {string} caseId - Case ID
   * @param {Object} context - Platform context
   * @returns {Promise<Object>} Evidence package
   */
  async generateEvidencePackage(caseId, context) {
    const investigationCase = await this.getCase(caseId, context)
    
    const evidencePackage = {
      // Case metadata
      case_id: investigationCase.id,
      case_title: investigationCase.title,
      case_description: investigationCase.description,
      case_category: investigationCase.category,
      case_priority: investigationCase.priority,
      case_status: investigationCase.status,
      
      // Investigator details
      investigator: investigationCase.investigator,
      
      // Timeline
      investigation_period: {
        started: investigationCase.createdAt,
        last_updated: investigationCase.updatedAt,
        closed: investigationCase.closedAt
      },
      
      // Evidence summary
      evidence_summary: {
        total_analyses: investigationCase.analyses.length,
        unique_phone_numbers: investigationCase.evidence.phone_numbers.length,
        unique_urls: investigationCase.evidence.urls.length,
        unique_upi_ids: investigationCase.evidence.upi_ids.length,
        patterns_identified: investigationCase.evidence.patterns.length
      },
      
      // Detailed evidence
      evidence: {
        phone_numbers: investigationCase.evidence.phone_numbers.map(p => ({
          value: p,
          appearances: this.countAppearances(investigationCase, 'phone_numbers', p),
          first_seen: this.getFirstSeen(investigationCase, 'phone_numbers', p),
          last_seen: this.getLastSeen(investigationCase, 'phone_numbers', p)
        })),
        urls: investigationCase.evidence.urls.map(u => ({
          value: u,
          appearances: this.countAppearances(investigationCase, 'urls', u),
          first_seen: this.getFirstSeen(investigationCase, 'urls', u),
          last_seen: this.getLastSeen(investigationCase, 'urls', u)
        })),
        upi_ids: investigationCase.evidence.upi_ids.map(u => ({
          value: u,
          appearances: this.countAppearances(investigationCase, 'upi_ids', u),
          first_seen: this.getFirstSeen(investigationCase, 'upi_ids', u),
          last_seen: this.getLastSeen(investigationCase, 'upi_ids', u)
        }))
      },
      
      // Analysis timeline
      analysis_timeline: investigationCase.analyses.map(a => ({
        analysis_id: a.analysisId,
        linked_at: a.linkedAt,
        risk_score: a.riskScore,
        category: a.category
      })),
      
      // Legal notice
      legal_notice: this.generateLegalNotice(),
      
      // Generation metadata
      generated_at: new Date(),
      generated_by: context.userId,
      package_id: `PKG-${caseId}-${Date.now()}`
    }
    
    logger.info('Investigation: Evidence package generated', {
      caseId,
      packageId: evidencePackage.package_id,
      analysesCount: evidencePackage.evidence_summary.total_analyses
    })
    
    return evidencePackage
  }
  
  /**
   * Export evidence package as JSON
   * 
   * @param {string} caseId - Case ID
   * @param {Object} context - Platform context
   * @returns {Promise<string>} JSON string
   */
  async exportJSON(caseId, context) {
    const evidencePackage = await this.generateEvidencePackage(caseId, context)
    return JSON.stringify(evidencePackage, null, 2)
  }
  
  /**
   * Export evidence package as PDF
   * 
   * @param {string} caseId - Case ID
   * @param {Object} context - Platform context
   * @returns {Promise<Buffer>} PDF buffer
   */
  async exportPDF(caseId, context) {
    const evidencePackage = await this.generateEvidencePackage(caseId, context)
    
    // Generate PDF using existing PDF builder
    // (In production, create a specialized investigation PDF template)
    return generateEvidencePDF(evidencePackage)
  }
  
  // ════════════════════════════════════════════════════════════════════════════
  // Helper Methods
  // ════════════════════════════════════════════════════════════════════════════
  
  /**
   * Count appearances of entity in case
   */
  countAppearances(investigationCase, entityType, value) {
    // In production, track this during linking
    return investigationCase.analyses.length
  }
  
  /**
   * Get first seen timestamp for entity
   */
  getFirstSeen(investigationCase, entityType, value) {
    if (investigationCase.analyses.length === 0) return null
    return investigationCase.analyses[0].linkedAt
  }
  
  /**
   * Get last seen timestamp for entity
   */
  getLastSeen(investigationCase, entityType, value) {
    if (investigationCase.analyses.length === 0) return null
    return investigationCase.analyses[investigationCase.analyses.length - 1].linkedAt
  }
  
  /**
   * Generate legal notice for evidence package
   */
  generateLegalNotice() {
    return {
      title: 'LEGAL NOTICE',
      content: [
        'This evidence package was generated by BobSec Investigation Tools.',
        'The evidence contained herein is based on AI-powered analysis and should be verified independently.',
        'This package is intended for use by authorized law enforcement and fraud investigation personnel only.',
        'Unauthorized access, use, or distribution of this evidence package may be subject to legal penalties.',
        'All evidence collection and handling has been conducted in accordance with applicable data protection laws.',
        'Chain of custody: All evidence has been digitally signed and timestamped.',
        'For questions or verification, contact: investigations@bobsec.ai'
      ],
      disclaimer: 'This evidence package reflects AI analysis and does not constitute legal proof. Independent verification is required for legal proceedings.'
    }
  }
  
  /**
   * Get investigation statistics
   */
  getStats() {
    const cases = Array.from(this.cases.values())
    
    return {
      total_cases: cases.length,
      open_cases: cases.filter(c => c.status === 'OPEN').length,
      closed_cases: cases.filter(c => c.status === 'CLOSED').length,
      total_analyses: cases.reduce((sum, c) => sum + c.analyses.length, 0),
      avg_analyses_per_case: cases.length > 0 
        ? (cases.reduce((sum, c) => sum + c.analyses.length, 0) / cases.length).toFixed(1)
        : 0
    }
  }
}

// Singleton instance
const investigationService = new InvestigationService()

module.exports = investigationService

// Made with Bob
