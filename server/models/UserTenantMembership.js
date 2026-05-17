// UserTenantMembership model - links users to tenants with org admin flag

class UserTenantMembership {
  constructor(data) {
    this.userId = data.userId
    this.tenantId = data.tenantId
    this.isOrgAdmin = data.isOrgAdmin || false
    this.createdAt = data.createdAt || new Date().toISOString()
  }

  // Validation
  static validate(data) {
    const errors = []
    
    if (!data.userId) {
      errors.push('userId is required')
    }
    
    if (!data.tenantId) {
      errors.push('tenantId is required')
    }
    
    if (typeof data.isOrgAdmin !== 'boolean') {
      errors.push('isOrgAdmin must be a boolean')
    }
    
    return { valid: errors.length === 0, errors }
  }

  toJSON() {
    return {
      userId: this.userId,
      tenantId: this.tenantId,
      isOrgAdmin: this.isOrgAdmin,
      createdAt: this.createdAt
    }
  }
}

module.exports = UserTenantMembership

// Made with Bob
