// Organization model for multi-tenant support
// Each organization has its own settings, branding, and members

const { SECTORS, REGIONS, DATA_RESIDENCY } = require('./PlatformContext')

class Organization {
  constructor(data) {
    this.id = data.id || `org_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    this.name = data.name
    this.slug = data.slug || this._generateSlug(data.name)
    
    // Sector, region, and data residency (Phase 10.1)
    this.sector = data.sector || SECTORS.CONSUMER
    this.region = data.region || REGIONS.IN
    this.dataResidency = data.dataResidency || DATA_RESIDENCY.REGION_LOCAL
    
    this.settings = data.settings || {
      branding: {
        logoUrl: null,
        primaryColor: '#3B82F6', // Default blue
        accentColor: '#10B981'   // Default green
      },
      features: {
        familyMode: true,
        parentMode: true,
        brandVerification: true,
        postIncidentMode: true,
        maxAnalysesPerMonth: 1000
      },
      limits: {
        maxMembers: 50,
        maxAnalysesPerDay: 100,
        retentionDays: 90
      }
    }
    this.ownerId = data.ownerId // User ID of organization owner
    this.createdAt = data.createdAt || new Date().toISOString()
    this.updatedAt = data.updatedAt || new Date().toISOString()
  }

  _generateSlug(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50)
  }

  // Validate organization data
  static validate(data) {
    const errors = []

    if (!data.name || data.name.trim().length < 2) {
      errors.push('Organization name must be at least 2 characters')
    }

    if (data.name && data.name.length > 100) {
      errors.push('Organization name must be less than 100 characters')
    }

    if (data.slug && !/^[a-z0-9-]+$/.test(data.slug)) {
      errors.push('Organization slug must contain only lowercase letters, numbers, and hyphens')
    }

    if (!data.ownerId) {
      errors.push('Organization must have an owner')
    }

    // Validate sector (Phase 10.1)
    if (data.sector && !Object.values(SECTORS).includes(data.sector)) {
      errors.push(`Invalid sector: ${data.sector}. Must be one of: ${Object.values(SECTORS).join(', ')}`)
    }

    // Validate region (Phase 10.1)
    if (data.region && !Object.values(REGIONS).includes(data.region)) {
      errors.push(`Invalid region: ${data.region}. Must be one of: ${Object.values(REGIONS).join(', ')}`)
    }

    // Validate data residency (Phase 10.1)
    if (data.dataResidency && !Object.values(DATA_RESIDENCY).includes(data.dataResidency)) {
      errors.push(`Invalid data residency: ${data.dataResidency}. Must be one of: ${Object.values(DATA_RESIDENCY).join(', ')}`)
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  // Convert to JSON for API responses
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      slug: this.slug,
      sector: this.sector,
      region: this.region,
      dataResidency: this.dataResidency,
      settings: this.settings,
      ownerId: this.ownerId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    }
  }

  // Update organization settings
  updateSettings(newSettings) {
    this.settings = {
      ...this.settings,
      ...newSettings,
      branding: {
        ...this.settings.branding,
        ...(newSettings.branding || {})
      },
      features: {
        ...this.settings.features,
        ...(newSettings.features || {})
      },
      limits: {
        ...this.settings.limits,
        ...(newSettings.limits || {})
      }
    }
    this.updatedAt = new Date().toISOString()
  }
}

module.exports = Organization

// Made with Bob
