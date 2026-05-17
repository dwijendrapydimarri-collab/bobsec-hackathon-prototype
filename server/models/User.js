// User model for authentication and authorization

class User {
  constructor(data) {
    this.id = data.id
    this.email = data.email
    this.passwordHash = data.passwordHash
    this.name = data.name
    this.role = data.role || 'USER' // USER | REVIEWER | ADMIN
    this.organizationId = data.organizationId || null // Link to organization
    this.orgRole = data.orgRole || 'MEMBER' // ORG_ADMIN | MEMBER
    this.createdAt = data.createdAt || new Date().toISOString()
    this.updatedAt = data.updatedAt || new Date().toISOString()
  }

  // Validation
  static validate(data) {
    const errors = []
    
    if (!data.email || !data.email.includes('@')) {
      errors.push('Valid email is required')
    }
    
    if (!data.name || data.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters')
    }
    
    if (!['USER', 'REVIEWER', 'ADMIN'].includes(data.role)) {
      errors.push('Invalid role')
    }

    if (data.orgRole && !['ORG_ADMIN', 'MEMBER'].includes(data.orgRole)) {
      errors.push('Invalid organization role')
    }
    
    return { valid: errors.length === 0, errors }
  }

  // Check if user is organization admin
  isOrgAdmin() {
    return this.orgRole === 'ORG_ADMIN'
  }

  // Check if user is system admin
  isSystemAdmin() {
    return this.role === 'ADMIN'
  }

  // Serialize for API response (exclude sensitive fields)
  toJSON() {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      role: this.role,
      organizationId: this.organizationId,
      orgRole: this.orgRole,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    }
  }
}

module.exports = User

// Made with Bob
