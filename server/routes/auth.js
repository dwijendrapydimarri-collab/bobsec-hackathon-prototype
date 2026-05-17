// Authentication routes - register, login, logout
const express = require('express')
const router = express.Router()
const User = require('../models/User')
const { PasswordHash, generateToken } = require('../utils/auth')
const { createUser, findUserByEmail, createMembership, getUserWithTenants } = require('../data/store')
const { requireAuth } = require('../middleware/auth')
const { strictRateLimit } = require('../middleware/rateLimiter')
const { validate, validateRegisterRequest, validateLoginRequest } = require('../schemas/validation')
const logger = require('../utils/logger')
const metrics = require('../utils/metrics')

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ⚠️  DEMO MODE WARNING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Rate limiting has been DISABLED for demo stability.
// DO NOT ship this to production without restoring:
//   - strictRateLimit middleware on /register and /login routes
//   - Appropriate rate limits (e.g., 5 req/15min for register, 10 req/15min for login)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// POST /api/auth/register
// Rate limiting disabled for demo mode
router.post('/register', validate(validateRegisterRequest), async (req, res) => {
  try {
    const { email, password, name } = req.body

    // Check if user already exists
    const existing = await findUserByEmail(email)
    if (existing) {
      return res.status(409).json({
        error: 'email_exists',
        message: 'Email already registered'
      })
    }

    // Hash password
    const passwordHash = await PasswordHash.hash(password)

    // Create user
    const userData = {
      email: email.toLowerCase().trim(),
      passwordHash,
      name: name.trim(),
      role: 'USER'
    }

    const validation = User.validate(userData)
    if (!validation.valid) {
      return res.status(400).json({
        error: 'validation_error',
        message: validation.errors.join(', ')
      })
    }

    const user = await createUser(userData)

    // Create membership to demo tenant
    const tenantId = 'demo'
    await createMembership(user.id, tenantId, false)

    // Generate token
    const token = generateToken(user, tenantId)

    // Log and record metrics
    logger.info('User registered', {
      requestId: req.id,
      userId: user.id,
      email: user.email,
      tenantId
    })
    metrics.recordRegistration()

    // Return user and token
    res.status(201).json({
      user: new User(user).toJSON(),
      token,
      tenantId
    })
  } catch (error) {
    logger.error('Registration failed', {
      requestId: req.id,
      error: error.message,
      stack: error.stack
    })
    res.status(500).json({
      error: 'registration_failed',
      message: error.message
    })
  }
})

// POST /api/auth/login
// Rate limiting disabled for demo mode
router.post('/login', validate(validateLoginRequest), async (req, res) => {
  try {
    const { email, password } = req.body

    // Find user
    const user = await findUserByEmail(email)
    if (!user) {
      logger.warn('Login failed - user not found', {
        requestId: req.id,
        email,
        ip: req.ip
      })
      metrics.recordLogin(false)
      return res.status(401).json({
        error: 'invalid_credentials',
        message: 'Invalid email or password'
      })
    }

    // Verify password
    const isValid = await PasswordHash.verify(password, user.passwordHash)
    if (!isValid) {
      logger.warn('Login failed - invalid password', {
        requestId: req.id,
        userId: user.id,
        email,
        ip: req.ip
      })
      metrics.recordLogin(false)
      return res.status(401).json({
        error: 'invalid_credentials',
        message: 'Invalid email or password'
      })
    }

    // Get user with tenants
    const userWithTenants = await getUserWithTenants(user.id)
    
    // Use first tenant or demo tenant
    const tenantId = userWithTenants.tenants.length > 0 
      ? userWithTenants.tenants[0].id 
      : 'demo'

    // Generate token
    const token = generateToken(user, tenantId)

    // Log and record metrics
    logger.info('User logged in', {
      requestId: req.id,
      userId: user.id,
      email: user.email,
      tenantId
    })
    metrics.recordLogin(true)

    // Return user and token
    res.json({
      user: new User(user).toJSON(),
      token,
      tenantId,
      tenants: userWithTenants.tenants
    })
  } catch (error) {
    logger.error('Login error', {
      requestId: req.id,
      error: error.message,
      stack: error.stack
    })
    res.status(500).json({
      error: 'login_failed',
      message: 'Login failed'
    })
  }
})

// POST /api/auth/logout
router.post('/logout', requireAuth, (req, res) => {
  // In a stateless JWT system, logout is handled client-side by removing the token
  // For server-side token invalidation, you would add the token to a blacklist here
  logger.info('User logged out', {
    requestId: req.id,
    userId: req.auth.userId,
    tenantId: req.auth.tenantId
  })
  
  res.json({
    message: 'Logged out successfully'
  })
})

// GET /api/auth/me - Get current user info
router.get('/me', requireAuth, async (req, res) => {
  try {
    const userWithTenants = await getUserWithTenants(req.auth.userId)
    
    if (!userWithTenants) {
      return res.status(404).json({
        error: 'user_not_found',
        message: 'User not found'
      })
    }

    res.json({
      user: new User(userWithTenants).toJSON(),
      tenants: userWithTenants.tenants,
      currentTenantId: req.auth.tenantId
    })
  } catch (error) {
    logger.error('Get user info failed', {
      requestId: req.id,
      userId: req.auth.userId,
      error: error.message
    })
    res.status(500).json({
      error: 'fetch_failed',
      message: 'Failed to fetch user info'
    })
  }
})

module.exports = router

// Made with Bob
