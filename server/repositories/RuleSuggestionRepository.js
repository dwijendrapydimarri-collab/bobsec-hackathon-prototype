// Rule Suggestion Repository - Wraps existing JSON file with repository interface
const fs = require('fs').promises
const path = require('path')

const SUGGESTIONS_FILE = path.join(__dirname, '../data/ruleSuggestions.json')

// Ensure data directory exists
async function ensureDataDir() {
  const dir = path.dirname(SUGGESTIONS_FILE)
  try {
    await fs.mkdir(dir, { recursive: true })
  } catch (error) {
    // Directory already exists
  }
}

// Initialize suggestions file if it doesn't exist
async function initializeFile() {
  await ensureDataDir()
  try {
    await fs.access(SUGGESTIONS_FILE)
  } catch {
    await fs.writeFile(SUGGESTIONS_FILE, JSON.stringify([], null, 2))
  }
}

class RuleSuggestionRepository {
  constructor() {
    this.filePath = SUGGESTIONS_FILE
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

  // Save new suggestion
  async saveSuggestion(suggestion) {
    const suggestions = await this.read()
    
    // Add tenant scoping if not present
    if (!suggestion.tenantId) {
      suggestion.tenantId = 'demo'
    }
    
    suggestions.push(suggestion)
    await this.write(suggestions)
    
    return suggestion
  }

  // Update suggestion status
  async updateStatus(id, status, reviewedBy = null) {
    const suggestions = await this.read()
    const index = suggestions.findIndex(s => s.rule.id === id)
    
    if (index === -1) {
      throw new Error(`Suggestion with id ${id} not found`)
    }
    
    suggestions[index].metadata.status = status
    suggestions[index].metadata.reviewed_at = new Date().toISOString()
    
    if (reviewedBy) {
      suggestions[index].metadata.reviewed_by = reviewedBy
    }
    
    await this.write(suggestions)
    
    return suggestions[index]
  }

  // List all suggestions (optionally filtered by tenant)
  async listAllByTenant(tenantId = null) {
    const suggestions = await this.read()
    
    if (!tenantId) {
      return suggestions
    }
    
    return suggestions.filter(s => s.tenantId === tenantId || s.tenantId === 'demo')
  }

  // Get suggestions by status
  async listByStatus(status, tenantId = null) {
    const suggestions = await this.read()
    
    let filtered = suggestions.filter(s => s.metadata.status === status)
    
    if (tenantId) {
      filtered = filtered.filter(s => s.tenantId === tenantId || s.tenantId === 'demo')
    }
    
    return filtered
  }

  // Get suggestion by rule ID
  async getById(id) {
    const suggestions = await this.read()
    return suggestions.find(s => s.rule.id === id)
  }

  // Get statistics
  async getStats(tenantId = null) {
    const suggestions = await this.listAllByTenant(tenantId)
    
    return {
      total: suggestions.length,
      pending: suggestions.filter(s => s.metadata.status === 'pending_review').length,
      approved: suggestions.filter(s => s.metadata.status === 'approved').length,
      rejected: suggestions.filter(s => s.metadata.status === 'rejected').length,
      avgConfidence: suggestions.length > 0
        ? Math.round(suggestions.reduce((sum, s) => sum + s.metadata.confidence, 0) / suggestions.length)
        : 0
    }
  }
}

module.exports = new RuleSuggestionRepository()

// Made with Bob
