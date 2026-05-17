/**
 * Authentication Middleware (Demo Stub)
 * 
 * For demo purposes, this middleware allows all requests through
 * and attaches a fake authenticated user to the request object.
 * 
 * In production, this would validate JWT tokens and verify user identity.
 */

function authMiddleware(req, res, next) {
  // For demo, attach a fake authenticated user
  // Adjust fields if routes expect specific properties
  req.user = req.user || {
    id: 'demo-user-001',
    email: 'demo@bobsec.ai',
    role: 'ADMIN',
    organizationId: 'demo-org-001',
    tenantId: 'demo-tenant-001',
    name: 'Demo User'
  }

  // Also set auth object for compatibility with other middleware
  req.auth = req.auth || {
    userId: req.user.id,
    tenantId: req.user.tenantId,
    organizationId: req.user.organizationId,
    role: req.user.role
  }

  return next()
}

module.exports = authMiddleware

// Made with Bob