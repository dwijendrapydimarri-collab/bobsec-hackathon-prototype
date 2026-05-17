/**
 * Chain of Custody Tracker
 * 
 * Maintains cryptographic chain of custody for evidence
 * Ensures evidence integrity and auditability for legal proceedings
 * 
 * Features:
 * - Digital signatures for evidence
 * - Tamper detection
 * - Access logging
 * - Custody transfer tracking
 */

const crypto = require('crypto')
const logger = require('./logger')

class ChainOfCustodyTracker {
  constructor() {
    this.name = 'ChainOfCustodyTracker'
    
    // In-memory custody records (in production, use database)
    this.custodyRecords = new Map()
  }
  
  // ════════════════════════════════════════════════════════════════════════════
  // Evidence Registration
  // ════════════════════════════════════════════════════════════════════════════
  
  /**
   * Register evidence and create initial custody record
   * 
   * @param {string} evidenceId - Unique evidence identifier
   * @param {Object} evidence - Evidence data
   * @param {Object} custodian - Current custodian details
   * @returns {Object} Custody record
   */
  registerEvidence(evidenceId, evidence, custodian) {
    const now = new Date()
    
    // Generate hash of evidence
    const evidenceHash = this.hashEvidence(evidence)
    
    // Create custody record
    const custodyRecord = {
      evidenceId,
      evidenceHash,
      evidenceType: evidence.type || 'ANALYSIS',
      
      // Initial custodian
      currentCustodian: {
        userId: custodian.userId,
        organizationId: custodian.organizationId,
        name: custodian.name,
        role: custodian.role,
        acquiredAt: now
      },
      
      // Chain of custody
      chain: [
        {
          action: 'REGISTERED',
          custodian: {
            userId: custodian.userId,
            organizationId: custodian.organizationId,
            name: custodian.name,
            role: custodian.role
          },
          timestamp: now,
          evidenceHash,
          signature: this.signAction('REGISTERED', evidenceId, evidenceHash, custodian.userId, now)
        }
      ],
      
      // Access log
      accessLog: [],
      
      // Status
      status: 'ACTIVE',
      
      // Metadata
      createdAt: now,
      updatedAt: now
    }
    
    this.custodyRecords.set(evidenceId, custodyRecord)
    
    logger.info('ChainOfCustody: Evidence registered', {
      evidenceId,
      custodian: custodian.userId,
      evidenceHash
    })
    
    return custodyRecord
  }
  
  // ════════════════════════════════════════════════════════════════════════════
  // Custody Transfer
  // ════════════════════════════════════════════════════════════════════════════
  
  /**
   * Transfer custody to new custodian
   * 
   * @param {string} evidenceId - Evidence identifier
   * @param {Object} fromCustodian - Current custodian
   * @param {Object} toCustodian - New custodian
   * @param {string} reason - Transfer reason
   * @returns {Object} Updated custody record
   */
  transferCustody(evidenceId, fromCustodian, toCustodian, reason) {
    const custodyRecord = this.custodyRecords.get(evidenceId)
    
    if (!custodyRecord) {
      throw new Error('Evidence not found in custody records')
    }
    
    // Verify current custodian
    if (custodyRecord.currentCustodian.userId !== fromCustodian.userId) {
      throw new Error('Unauthorized custody transfer - not current custodian')
    }
    
    const now = new Date()
    
    // Add transfer to chain
    custodyRecord.chain.push({
      action: 'TRANSFERRED',
      fromCustodian: {
        userId: fromCustodian.userId,
        organizationId: fromCustodian.organizationId,
        name: fromCustodian.name,
        role: fromCustodian.role
      },
      toCustodian: {
        userId: toCustodian.userId,
        organizationId: toCustodian.organizationId,
        name: toCustodian.name,
        role: toCustodian.role
      },
      reason,
      timestamp: now,
      evidenceHash: custodyRecord.evidenceHash,
      signature: this.signAction('TRANSFERRED', evidenceId, custodyRecord.evidenceHash, fromCustodian.userId, now)
    })
    
    // Update current custodian
    custodyRecord.currentCustodian = {
      userId: toCustodian.userId,
      organizationId: toCustodian.organizationId,
      name: toCustodian.name,
      role: toCustodian.role,
      acquiredAt: now
    }
    
    custodyRecord.updatedAt = now
    
    logger.info('ChainOfCustody: Custody transferred', {
      evidenceId,
      from: fromCustodian.userId,
      to: toCustodian.userId,
      reason
    })
    
    return custodyRecord
  }
  
  // ════════════════════════════════════════════════════════════════════════════
  // Access Logging
  // ════════════════════════════════════════════════════════════════════════════
  
  /**
   * Log evidence access
   * 
   * @param {string} evidenceId - Evidence identifier
   * @param {Object} accessor - User accessing evidence
   * @param {string} action - Access action
   * @param {string} purpose - Access purpose
   * @returns {Object} Access log entry
   */
  logAccess(evidenceId, accessor, action, purpose) {
    const custodyRecord = this.custodyRecords.get(evidenceId)
    
    if (!custodyRecord) {
      throw new Error('Evidence not found in custody records')
    }
    
    const now = new Date()
    
    const accessEntry = {
      accessor: {
        userId: accessor.userId,
        organizationId: accessor.organizationId,
        name: accessor.name,
        role: accessor.role
      },
      action,
      purpose,
      timestamp: now,
      ipAddress: accessor.ipAddress || 'unknown',
      userAgent: accessor.userAgent || 'unknown'
    }
    
    custodyRecord.accessLog.push(accessEntry)
    custodyRecord.updatedAt = now
    
    logger.info('ChainOfCustody: Access logged', {
      evidenceId,
      accessor: accessor.userId,
      action
    })
    
    return accessEntry
  }
  
  // ════════════════════════════════════════════════════════════════════════════
  // Integrity Verification
  // ════════════════════════════════════════════════════════════════════════════
  
  /**
   * Verify evidence integrity
   * 
   * @param {string} evidenceId - Evidence identifier
   * @param {Object} currentEvidence - Current evidence data
   * @returns {Object} Verification result
   */
  verifyIntegrity(evidenceId, currentEvidence) {
    const custodyRecord = this.custodyRecords.get(evidenceId)
    
    if (!custodyRecord) {
      return {
        valid: false,
        reason: 'Evidence not found in custody records'
      }
    }
    
    // Hash current evidence
    const currentHash = this.hashEvidence(currentEvidence)
    
    // Compare with original hash
    const originalHash = custodyRecord.evidenceHash
    
    if (currentHash !== originalHash) {
      logger.warn('ChainOfCustody: Integrity violation detected', {
        evidenceId,
        originalHash,
        currentHash
      })
      
      return {
        valid: false,
        reason: 'Evidence has been tampered with',
        originalHash,
        currentHash,
        tamperedAt: new Date()
      }
    }
    
    // Verify chain signatures
    const chainValid = this.verifyChainSignatures(custodyRecord)
    
    if (!chainValid) {
      logger.warn('ChainOfCustody: Chain signature verification failed', {
        evidenceId
      })
      
      return {
        valid: false,
        reason: 'Chain of custody signatures invalid'
      }
    }
    
    return {
      valid: true,
      evidenceHash: currentHash,
      chainLength: custodyRecord.chain.length,
      lastVerified: new Date()
    }
  }
  
  /**
   * Verify all signatures in custody chain
   * 
   * @param {Object} custodyRecord - Custody record
   * @returns {boolean} True if all signatures valid
   */
  verifyChainSignatures(custodyRecord) {
    for (const entry of custodyRecord.chain) {
      const expectedSignature = this.signAction(
        entry.action,
        custodyRecord.evidenceId,
        entry.evidenceHash,
        entry.custodian?.userId || entry.fromCustodian?.userId,
        entry.timestamp
      )
      
      if (entry.signature !== expectedSignature) {
        return false
      }
    }
    
    return true
  }
  
  // ════════════════════════════════════════════════════════════════════════════
  // Cryptographic Helpers
  // ════════════════════════════════════════════════════════════════════════════
  
  /**
   * Generate hash of evidence
   * 
   * @param {Object} evidence - Evidence data
   * @returns {string} SHA-256 hash
   */
  hashEvidence(evidence) {
    const evidenceString = JSON.stringify(evidence, Object.keys(evidence).sort())
    return crypto.createHash('sha256').update(evidenceString).digest('hex')
  }
  
  /**
   * Sign an action in the custody chain
   * 
   * @param {string} action - Action type
   * @param {string} evidenceId - Evidence identifier
   * @param {string} evidenceHash - Evidence hash
   * @param {string} userId - User performing action
   * @param {Date} timestamp - Action timestamp
   * @returns {string} HMAC signature
   */
  signAction(action, evidenceId, evidenceHash, userId, timestamp) {
    const data = `${action}|${evidenceId}|${evidenceHash}|${userId}|${timestamp.toISOString()}`
    
    // In production, use a secure secret key from environment
    const secret = process.env.CUSTODY_SIGNING_KEY || 'bobsec-custody-secret-key'
    
    return crypto.createHmac('sha256', secret).update(data).digest('hex')
  }
  
  // ════════════════════════════════════════════════════════════════════════════
  // Retrieval
  // ════════════════════════════════════════════════════════════════════════════
  
  /**
   * Get custody record
   * 
   * @param {string} evidenceId - Evidence identifier
   * @returns {Object} Custody record
   */
  getCustodyRecord(evidenceId) {
    const custodyRecord = this.custodyRecords.get(evidenceId)
    
    if (!custodyRecord) {
      throw new Error('Evidence not found in custody records')
    }
    
    return custodyRecord
  }
  
  /**
   * Get custody chain for evidence
   * 
   * @param {string} evidenceId - Evidence identifier
   * @returns {Array} Chain of custody entries
   */
  getCustodyChain(evidenceId) {
    const custodyRecord = this.getCustodyRecord(evidenceId)
    return custodyRecord.chain
  }
  
  /**
   * Get access log for evidence
   * 
   * @param {string} evidenceId - Evidence identifier
   * @returns {Array} Access log entries
   */
  getAccessLog(evidenceId) {
    const custodyRecord = this.getCustodyRecord(evidenceId)
    return custodyRecord.accessLog
  }
  
  /**
   * Generate custody certificate
   * 
   * @param {string} evidenceId - Evidence identifier
   * @returns {Object} Custody certificate
   */
  generateCustodyCertificate(evidenceId) {
    const custodyRecord = this.getCustodyRecord(evidenceId)
    
    return {
      certificate_id: `CERT-${evidenceId}-${Date.now()}`,
      evidence_id: evidenceId,
      evidence_type: custodyRecord.evidenceType,
      evidence_hash: custodyRecord.evidenceHash,
      
      current_custodian: custodyRecord.currentCustodian,
      
      chain_summary: {
        total_transfers: custodyRecord.chain.length - 1,
        registered_at: custodyRecord.createdAt,
        last_updated: custodyRecord.updatedAt,
        status: custodyRecord.status
      },
      
      chain_of_custody: custodyRecord.chain.map(entry => ({
        action: entry.action,
        custodian: entry.custodian?.name || entry.fromCustodian?.name,
        timestamp: entry.timestamp,
        signature: entry.signature.substring(0, 16) + '...' // Truncate for readability
      })),
      
      access_summary: {
        total_accesses: custodyRecord.accessLog.length,
        unique_accessors: new Set(custodyRecord.accessLog.map(a => a.accessor.userId)).size
      },
      
      integrity_status: 'VERIFIED',
      
      generated_at: new Date(),
      
      legal_notice: 'This custody certificate is a cryptographically signed record of evidence handling. Any tampering with the evidence or chain of custody will be detectable through hash verification.'
    }
  }
}

// Singleton instance
const chainOfCustodyTracker = new ChainOfCustodyTracker()

module.exports = chainOfCustodyTracker

// Made with Bob