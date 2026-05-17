// Analysis Repository - Persistence layer for analysis results
const fs = require('fs').promises
const path = require('path')
const crypto = require('crypto')

const DATA_DIR = path.join(__dirname, '../data/db')
const ANALYSES_FILE = path.join(DATA_DIR, 'analyses.json')

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true })
  } catch (error) {
    // Directory already exists
  }
}

// Initialize analyses file if it doesn't exist
async function initializeFile() {
  await ensureDataDir()
  try {
    await fs.access(ANALYSES_FILE)
  } catch {
    await fs.writeFile(ANALYSES_FILE, JSON.stringify([], null, 2))
  }
}

class AnalysisRepository {
  constructor() {
    this.filePath = ANALYSES_FILE
    initializeFile()
  }

  async read() {
    try {
      const data = await fs.readFile(this.filePath, 'utf-8')
      return JSON.parse(data)
    } catch (error) {
      return []
    }
  }

  async write(data) {
    await fs.writeFile(this.filePath, JSON.stringify(data, null, 2))
  }

  // Save analysis result
  async saveAnalysis(analysis) {
    const analyses = await this.read()
    
    const record = {
      id: analysis.analysis_id || crypto.randomUUID(),
      userId: analysis.userId || null,
      tenantId: analysis.tenantId || 'demo',
      orgId: analysis.orgId || null,
      timestamp: analysis.timestamp_ist || new Date().toISOString(),
      riskLevel: analysis.risk_level,
      riskScore: analysis.risk_score,
      category: analysis.category,
      confidence: analysis.confidence,
      mode: analysis.mode || 'pre_incident',
      // Store full analysis for retrieval
      fullAnalysis: analysis,
      createdAt: new Date().toISOString()
    }
    
    analyses.push(record)
    await this.write(analyses)
    
    return record
  }

  // Get analysis by ID
  async getById(id) {
    const analyses = await this.read()
    const record = analyses.find(a => a.id === id)
    return record ? record.fullAnalysis : null
  }

  // List recent analyses by user
  async listRecentByUser(userId, tenantId, limit = 20) {
    const analyses = await this.read()
    
    const filtered = analyses
      .filter(a => a.userId === userId && a.tenantId === tenantId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit)
    
    return filtered
  }

  // List recent analyses by tenant (for org dashboards)
  async listRecentByTenant(tenantId, limit = 50) {
    const analyses = await this.read()
    
    const filtered = analyses
      .filter(a => a.tenantId === tenantId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit)
    
    return filtered
  }

  // Get paginated history with filters and search
  async getHistory(userId, organizationId, options = {}) {
    const {
      page = 1,
      limit = 20,
      riskLevel = null,
      category = null,
      startDate = null,
      endDate = null,
      search = null
    } = options

    const analyses = await this.read()
    
    // Filter by user and organization
    let filtered = analyses.filter(a =>
      a.userId === userId &&
      (a.orgId === organizationId || a.tenantId === organizationId)
    )

    // Apply risk level filter
    if (riskLevel) {
      filtered = filtered.filter(a => a.riskLevel === riskLevel)
    }

    // Apply category filter
    if (category) {
      filtered = filtered.filter(a => a.category === category)
    }

    // Apply date range filter
    if (startDate) {
      filtered = filtered.filter(a => new Date(a.createdAt) >= new Date(startDate))
    }
    if (endDate) {
      filtered = filtered.filter(a => new Date(a.createdAt) <= new Date(endDate))
    }

    // Apply search (search in entities: phone, URL, UPI)
    if (search && search.trim()) {
      const searchLower = search.toLowerCase().trim()
      filtered = filtered.filter(a => {
        const analysis = a.fullAnalysis
        if (!analysis || !analysis.entities) return false

        // Search in phone numbers
        const phones = analysis.entities.phone_numbers || []
        if (phones.some(p => p.value && p.value.toLowerCase().includes(searchLower))) return true

        // Search in URLs
        const urls = analysis.entities.urls || []
        if (urls.some(u => u.value && u.value.toLowerCase().includes(searchLower))) return true

        // Search in UPI IDs
        const upis = analysis.entities.upi_ids || []
        if (upis.some(u => u.value && u.value.toLowerCase().includes(searchLower))) return true

        // Search in impersonated org
        if (analysis.entities.impersonated_org &&
            analysis.entities.impersonated_org.toLowerCase().includes(searchLower)) return true

        return false
      })
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    // Calculate pagination
    const total = filtered.length
    const totalPages = Math.ceil(total / limit)
    const offset = (page - 1) * limit
    const paginatedResults = filtered.slice(offset, offset + limit)

    return {
      analyses: paginatedResults,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    }
  }

  // Get statistics for user
  async getUserStats(userId, tenantId) {
    const analyses = await this.read()
    const userAnalyses = analyses.filter(a => a.userId === userId && a.tenantId === tenantId)
    
    return {
      total: userAnalyses.length,
      highRisk: userAnalyses.filter(a => a.riskLevel === 'HIGH').length,
      mediumRisk: userAnalyses.filter(a => a.riskLevel === 'MEDIUM').length,
      lowRisk: userAnalyses.filter(a => a.riskLevel === 'LOW').length,
      safe: userAnalyses.filter(a => a.riskLevel === 'SAFE').length,
      avgConfidence: userAnalyses.length > 0
        ? Math.round(userAnalyses.reduce((sum, a) => sum + a.confidence, 0) / userAnalyses.length)
        : 0
    }
  }

  // Get last analysis for session restore
  async getLastAnalysis(userId, tenantId) {
    const analyses = await this.read()
    
    const userAnalyses = analyses
      .filter(a => a.userId === userId && a.tenantId === tenantId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    
    return userAnalyses.length > 0 ? userAnalyses[0] : null
  }

  // Search analyses by entity (phone, URL, UPI)
  async searchByEntity(userId, organizationId, entityValue) {
    const analyses = await this.read()
    const searchLower = entityValue.toLowerCase().trim()
    
    const filtered = analyses.filter(a => {
      if (a.userId !== userId) return false
      if (a.orgId !== organizationId && a.tenantId !== organizationId) return false

      const analysis = a.fullAnalysis
      if (!analysis || !analysis.entities) return false

      // Check phone numbers
      const phones = analysis.entities.phone_numbers || []
      if (phones.some(p => p.value && p.value.toLowerCase().includes(searchLower))) return true

      // Check URLs
      const urls = analysis.entities.urls || []
      if (urls.some(u => u.value && u.value.toLowerCase().includes(searchLower))) return true

      // Check UPI IDs
      const upis = analysis.entities.upi_ids || []
      if (upis.some(u => u.value && u.value.toLowerCase().includes(searchLower))) return true

      return false
    })

    return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }
}

module.exports = new AnalysisRepository()

// Made with Bob
