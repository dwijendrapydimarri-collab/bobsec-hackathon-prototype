const fs = require('fs').promises
const path = require('path')
const Organization = require('../models/Organization')

class OrganizationRepository {
  constructor(dataDir = path.join(__dirname, '../data')) {
    this.dataDir = dataDir
    this.filePath = path.join(dataDir, 'organizations.json')
    this._ensureDataDir()
  }

  async _ensureDataDir() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true })
      // Initialize file if it doesn't exist
      try {
        await fs.access(this.filePath)
      } catch {
        await fs.writeFile(this.filePath, JSON.stringify([]))
      }
    } catch (err) {
      console.error('Failed to ensure data directory:', err)
    }
  }

  async _readAll() {
    try {
      const data = await fs.readFile(this.filePath, 'utf8')
      const orgs = JSON.parse(data)
      return orgs.map(org => new Organization(org))
    } catch (err) {
      console.error('Failed to read organizations:', err)
      return []
    }
  }

  async _writeAll(organizations) {
    try {
      const data = JSON.stringify(organizations.map(org => org.toJSON()), null, 2)
      await fs.writeFile(this.filePath, data, 'utf8')
    } catch (err) {
      console.error('Failed to write organizations:', err)
      throw err
    }
  }

  // Create a new organization
  async create(orgData) {
    const validation = Organization.validate(orgData)
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`)
    }

    const organizations = await this._readAll()

    // Check for duplicate slug
    const existingSlug = organizations.find(org => org.slug === orgData.slug)
    if (existingSlug) {
      throw new Error('Organization slug already exists')
    }

    const newOrg = new Organization(orgData)
    organizations.push(newOrg)
    await this._writeAll(organizations)

    return newOrg
  }

  // Find organization by ID
  async findById(id) {
    const organizations = await this._readAll()
    return organizations.find(org => org.id === id) || null
  }

  // Find organization by slug
  async findBySlug(slug) {
    const organizations = await this._readAll()
    return organizations.find(org => org.slug === slug) || null
  }

  // Find organization by owner ID
  async findByOwnerId(ownerId) {
    const organizations = await this._readAll()
    return organizations.find(org => org.ownerId === ownerId) || null
  }

  // Find all organizations (with pagination)
  async findAll(options = {}) {
    const { limit = 50, offset = 0 } = options
    const organizations = await this._readAll()
    
    return {
      organizations: organizations.slice(offset, offset + limit),
      total: organizations.length,
      limit,
      offset
    }
  }

  // Update organization
  async update(id, updates) {
    const organizations = await this._readAll()
    const index = organizations.findIndex(org => org.id === id)

    if (index === -1) {
      throw new Error('Organization not found')
    }

    const org = organizations[index]

    // Update allowed fields
    if (updates.name) org.name = updates.name
    if (updates.slug) {
      // Check for duplicate slug
      const existingSlug = organizations.find(o => o.slug === updates.slug && o.id !== id)
      if (existingSlug) {
        throw new Error('Organization slug already exists')
      }
      org.slug = updates.slug
    }
    if (updates.settings) {
      org.updateSettings(updates.settings)
    }

    org.updatedAt = new Date().toISOString()
    organizations[index] = org

    await this._writeAll(organizations)
    return org
  }

  // Delete organization
  async delete(id) {
    const organizations = await this._readAll()
    const filtered = organizations.filter(org => org.id !== id)

    if (filtered.length === organizations.length) {
      throw new Error('Organization not found')
    }

    await this._writeAll(filtered)
    return true
  }

  // Get organization member count (requires UserRepository)
  async getMemberCount(organizationId) {
    // This will be implemented when we integrate with UserRepository
    // For now, return 0
    return 0
  }

  // Get organization stats
  async getStats(organizationId) {
    // This will be integrated with AnalysisRepository
    return {
      totalAnalyses: 0,
      highRiskCount: 0,
      safeCount: 0,
      memberCount: 0
    }
  }
}

module.exports = OrganizationRepository

// Made with Bob
