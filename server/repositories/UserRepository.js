const { usersStore, findUserByEmail, createUser } = require('../data/store')
const User = require('../models/User')

class UserRepository {
  // Find user by ID
  async findById(id) {
    const userData = await usersStore.findById(id)
    return userData ? new User(userData) : null
  }

  // Find user by email
  async findByEmail(email) {
    const userData = await findUserByEmail(email)
    return userData ? new User(userData) : null
  }

  // Find all users by organization ID
  async findByOrganizationId(organizationId) {
    const users = await usersStore.findAll(user => user.organizationId === organizationId)
    return users.map(userData => new User(userData))
  }

  // Find all users (with optional filters)
  async findAll(filters = {}) {
    let users = await usersStore.findAll()
    
    if (filters.role) {
      users = users.filter(user => user.role === filters.role)
    }
    
    if (filters.orgRole) {
      users = users.filter(user => user.orgRole === filters.orgRole)
    }
    
    return users.map(userData => new User(userData))
  }

  // Create new user
  async create(userData) {
    const validation = User.validate(userData)
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`)
    }

    const newUserData = await createUser(userData)
    return new User(newUserData)
  }

  // Update user
  async update(id, updates) {
    const updatedData = await usersStore.update(id, updates)
    return updatedData ? new User(updatedData) : null
  }

  // Delete user
  async delete(id) {
    return await usersStore.delete(id)
  }

  // Get user count by organization
  async countByOrganization(organizationId) {
    const users = await this.findByOrganizationId(organizationId)
    return users.length
  }
}

module.exports = UserRepository

// Made with Bob
