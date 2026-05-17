// Authentication and authorization middleware
const { verifyToken } = require('../utils/auth')
const { usersStore, getUserWithTenants } = require('../data/store')

// Extract token from Authorization header
function extractToken(req) {
  const authHeader = req.headers.authorization
  if (!authHeader) return null
  
  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null
  
  return parts[1]
}

// Middleware: Require authentication
async function requireAuth(req, res, next) {
  try {
    const token = extractToken(req)
    
    if (!token) {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'Authentication required'
      })
    }
    
    const payload = verifyToken(token)
    
    if (!payload) {
      return res.status(401).json({
        error: 'invalid_token',
        message: 'Invalid or expired token'
      })
    }
    
    // Verify user still exists
    const user = await usersStore.findById(payload.userId)
    if (!user) {
      return res.status(401).json({
        error: 'user_not_found',
        message: 'User no longer exists'
      })
    }
    
    // Attach auth context to request
    req.auth = {
      userId: payload.userId,
      tenantId: payload.tenantId,
      role: payload.role,
      email: payload.email,
      user: user
    }
    
    next()
  } catch (error) {
    return res.status(401).json({
      error: 'auth_failed',
      message: 'Authentication failed'
    })
  }
}

// Middleware: Optional authentication (attach auth if present, but don't require it)
async function optionalAuth(req, res, next) {
  try {
    const token = extractToken(req)
    
    if (!token) {
      // No token provided - continue without auth
      req.auth = null
      return next()
    }
    
    const payload = verifyToken(token)
    
    if (!payload) {
      // Invalid token - continue without auth
      req.auth = null
      return next()
    }
    
    // Verify user still exists
    const user = await usersStore.findById(payload.userId)
    if (!user) {
      req.auth = null
      return next()
    }
    
    // Attach auth context to request
    req.auth = {
      userId: payload.userId,
      tenantId: payload.tenantId,
      role: payload.role,
      email: payload.email,
      user: user
    }
    
    next()
  } catch (error) {
    // On error, continue without auth
    req.auth = null
    next()
  }
}

// Middleware: Require specific role(s)
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'Authentication required'
      })
    }
    
    if (!allowedRoles.includes(req.auth.role)) {
      return res.status(403).json({
        error: 'forbidden',
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}`
      })
    }
    
    next()
  }
}

// Middleware: Require REVIEWER or ADMIN role
const requireReviewer = requireRole('REVIEWER', 'ADMIN')

// Middleware: Require ADMIN role
const requireAdmin = requireRole('ADMIN')

// Demo mode compatibility: Allow anonymous access when DEMO_MODE=true
function demoModeCompatible(req, res, next) {
  const isDemoMode = process.env.DEMO_MODE === 'true'
  
  if (isDemoMode && !req.auth) {
    // In demo mode without auth, set demo context
    req.auth = {
      userId: null,
      tenantId: 'demo',
      role: 'USER',
      email: null,
      user: null,
      isDemo: true
    }
  }
  
  next()
}

module.exports = {
  requireAuth,
  optionalAuth,
  requireRole,
  requireReviewer,
  requireAdmin,
  demoModeCompatible,
  extractToken
}

// Made with Bob
