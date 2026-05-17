// Tenant model for multi-tenancy support

class Tenant {
  constructor(data) {
    this.id = data.id
    this.name = data.name
    this.type = data.type || 'demo' // family | bank | telco | ngo | demo
    this.createdAt = data.createdAt || new Date().toISOString()
    this.updatedAt = data.updatedAt || new Date().toISOString()
  }

  // Validation
  static validate(data) {
    const errors = []
    
    if (!data.name || data.name.trim().length < 2) {
      errors.push('Tenant name must be at least 2 characters')
    }
    
    if (!['family', 'bank', 'telco', 'ngo', 'demo'].includes(data.type)) {
      errors.push('Invalid tenant type')
    }
    
    return { valid: errors.length === 0, errors }
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    }
  }
}

module.exports = Tenant

// Made with Bob
