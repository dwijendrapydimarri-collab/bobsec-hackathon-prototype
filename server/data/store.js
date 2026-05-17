// Simple file-based data store for users, tenants, and memberships
const fs = require('fs').promises
const path = require('path')
const crypto = require('crypto')

const DATA_DIR = path.join(__dirname, 'db')
const USERS_FILE = path.join(DATA_DIR, 'users.json')
const TENANTS_FILE = path.join(DATA_DIR, 'tenants.json')
const MEMBERSHIPS_FILE = path.join(DATA_DIR, 'memberships.json')

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true })
  } catch (error) {
    // Directory already exists
  }
}

// Initialize default data files if they don't exist
async function initializeStore() {
  await ensureDataDir()
  
  // Initialize users file
  try {
    await fs.access(USERS_FILE)
  } catch {
    await fs.writeFile(USERS_FILE, JSON.stringify([], null, 2))
  }
  
  // Initialize tenants file with demo tenant
  try {
    await fs.access(TENANTS_FILE)
  } catch {
    const demoTenant = {
      id: 'demo',
      name: 'Demo Tenant',
      type: 'demo',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    await fs.writeFile(TENANTS_FILE, JSON.stringify([demoTenant], null, 2))
  }
  
  // Initialize memberships file
  try {
    await fs.access(MEMBERSHIPS_FILE)
  } catch {
    await fs.writeFile(MEMBERSHIPS_FILE, JSON.stringify([], null, 2))
  }
}

// Generic CRUD operations
class Store {
  constructor(filePath) {
    this.filePath = filePath
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

  async findById(id) {
    const items = await this.read()
    return items.find(item => item.id === id)
  }

  async findOne(predicate) {
    const items = await this.read()
    return items.find(predicate)
  }

  async findAll(predicate) {
    const items = await this.read()
    return predicate ? items.filter(predicate) : items
  }

  async create(item) {
    const items = await this.read()
    const newItem = {
      ...item,
      id: item.id || crypto.randomUUID(),
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: item.updatedAt || new Date().toISOString()
    }
    items.push(newItem)
    await this.write(items)
    return newItem
  }

  async update(id, updates) {
    const items = await this.read()
    const index = items.findIndex(item => item.id === id)
    if (index === -1) return null
    
    items[index] = {
      ...items[index],
      ...updates,
      updatedAt: new Date().toISOString()
    }
    await this.write(items)
    return items[index]
  }

  async delete(id) {
    const items = await this.read()
    const filtered = items.filter(item => item.id !== id)
    if (filtered.length === items.length) return false
    await this.write(filtered)
    return true
  }
}

// Specialized stores
const usersStore = new Store(USERS_FILE)
const tenantsStore = new Store(TENANTS_FILE)
const membershipsStore = new Store(MEMBERSHIPS_FILE)

// User-specific operations
async function findUserByEmail(email) {
  return usersStore.findOne(user => user.email.toLowerCase() === email.toLowerCase())
}

async function createUser(userData) {
  // Check if email already exists
  const existing = await findUserByEmail(userData.email)
  if (existing) {
    throw new Error('Email already registered')
  }
  return usersStore.create(userData)
}

// Membership-specific operations
async function findMembershipsByUserId(userId) {
  return membershipsStore.findAll(m => m.userId === userId)
}

async function findMembershipsByTenantId(tenantId) {
  return membershipsStore.findAll(m => m.tenantId === tenantId)
}

async function createMembership(userId, tenantId, isOrgAdmin = false) {
  const membership = {
    userId,
    tenantId,
    isOrgAdmin,
    createdAt: new Date().toISOString()
  }
  return membershipsStore.create(membership)
}

async function getUserWithTenants(userId) {
  const user = await usersStore.findById(userId)
  if (!user) return null
  
  const memberships = await findMembershipsByUserId(userId)
  const tenantIds = memberships.map(m => m.tenantId)
  
  const tenants = []
  for (const tenantId of tenantIds) {
    const tenant = await tenantsStore.findById(tenantId)
    if (tenant) {
      const membership = memberships.find(m => m.tenantId === tenantId)
      tenants.push({
        ...tenant,
        isOrgAdmin: membership.isOrgAdmin
      })
    }
  }
  
  return {
    ...user,
    tenants
  }
}

module.exports = {
  initializeStore,
  usersStore,
  tenantsStore,
  membershipsStore,
  findUserByEmail,
  createUser,
  findMembershipsByUserId,
  findMembershipsByTenantId,
  createMembership,
  getUserWithTenants
}

// Made with Bob
