/**
 * Tenant Isolation Middleware
 * 
 * Enforces strict tenant and organization isolation to prevent
 * cross-tenant data access.
 */
const logger = require('../utils/logger')
const { PLATFORM_CONFIG } = require('../config/platform')
/**
 * Enforce tenant isolation
 * 
 * Ensures all database queries are scoped to the authenticated user's
 * tenant and organization.
 */
function enforceTenantIsolation(req, res, next) {
  // Skip for public endpoints
  if (req.path.startsWith('/api/v1/public') || req.path === '/api/health') {
    return next()
  }
  // Require authentication
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    })
  }
  // Require tenant and organization
  if (!req.user.tenantId || !req.user.organizationId) {
    logger.error('User missing tenant or organization', {
      userId: req.user.id,
      tenantId: req.user.tenantId,
      organizationId: req.user.organizationId
    })
    return res.status(403).json({
      success: false,
      error: 'User must belong to a tenant and organization'
    })
  }
  // Add tenant context to request
  req.tenantContext = {
    tenantId: req.user.tenantId,
    organizationId: req.user.organizationId,
    userId: req.user.id,
    sector: req.user.organization?.sector,
    region: req.user.organization?.region,
    dataResidency: req.user.organization?.dataResidency
  }
  // Log tenant context
  logger.debug('Tenant context established', {
    requestId: req.id,
    tenantId: req.tenantContext.tenantId,
    organizationId: req.tenantContext.organizationId,
    sector: req.tenantContext.sector,
    region: req.tenantContext.region
  })
  next()
}
/**
 * Validate tenant access
 * 
 * Validates that the requested resource belongs to the user's tenant/org.
 */
function validateTenantAccess(resourceTenantId, resourceOrgId, req) {
  const { tenantId, organizationId } = req.tenantContext
  // Check tenant match
  if (resourceTenantId && resourceTenantId !== tenantId) {
    logger.warn('Cross-tenant access attempt blocked', {
      requestId: req.id,
      userId: req.user.id,
      userTenantId: tenantId,
      resourceTenantId,
      path: req.path
    })
    if (PLATFORM_CONFIG.tenantIsolation.blockCrossTenantAccess) {
      throw new Error('Access denied: Resource belongs to different tenant')
    }
  }
  // Check organization match
  if (resourceOrgId && resourceOrgId !== organizationId) {
    logger.warn('Cross-organization access attempt blocked', {
      requestId: req.id,
      userId: req.user.id,
      userOrganizationId: organizationId,
      resourceOrganizationId: resourceOrgId,
      path: req.path
    })
    if (PLATFORM_CONFIG.tenantIsolation.blockCrossTenantAccess) {
      throw new Error('Access denied: Resource belongs to different organization')
    }
  }
  return true
}
/**
 * Create tenant-scoped query filter
 * 
 * Returns a filter object that should be applied to all database queries
 * to ensure tenant isolation.
 */
function getTenantFilter(req) {
  if (!req.tenantContext) {
    throw new Error('Tenant context not established')
  }
  return {
    tenantId: req.tenantContext.tenantId,
    organizationId: req.tenantContext.organizationId
  }
}
/**
 * Audit cross-tenant access
 * 
 * Logs any cross-tenant or cross-organization access attempts.
 */
function auditCrossTenantAccess(req, action, details = {}) {
  if (!PLATFORM_CONFIG.tenantIsolation.logCrossTenantAccess) {
    return
  }
  logger.warn('Cross-tenant access audit', {
    timestamp: new Date().toISOString(),
    requestId: req.id,
    userId: req.user?.id,
    tenantId: req.tenantContext?.tenantId,
    organizationId: req.tenantContext?.organizationId,
    action,
    details,
    sourceIp: req.ip,
    userAgent: req.headers['user-agent'],
    path: req.path,
    method: req.method
  })
}
/**
 * Middleware to add tenant filter to query params
 */
function addTenantFilterToQuery(req, res, next) {
  if (!req.tenantContext) {
    return next()
  }
  // Add tenant filter to query params
  req.query = {
    ...req.query,
    _tenantId: req.tenantContext.tenantId,
    _organizationId: req.tenantContext.organizationId
  }
  next()
}
/**
 * Validate resource ownership
 * 
 * Middleware factory to validate that a resource belongs to the user's tenant/org.
 */
function validateResourceOwnership(getResourceFn) {
  return async (req, res, next) => {
    try {
      const resource = await getResourceFn(req)
      if (!resource) {
        return res.status(404).json({
          success: false,
          error: 'Resource not found'
        })
      }
      // Validate tenant access
      validateTenantAccess(resource.tenantId, resource.organizationId, req)
      // Attach resource to request
      req.resource = resource
      next()
    } catch (error) {
      logger.error('Resource ownership validation failed', {
        error: error.message,
        requestId: req.id,
        userId: req.user?.id
      })
      res.status(403).json({
        success: false,
        error: error.message
      })
    }
  }
}
/**
 * Check if user can access cross-tenant resource
 * 
 * Some operations (like admin, investigation) may need cross-tenant access.
 */
function canAccessCrossTenant(req) {
  // Check if user has admin role
  if (req.user.role === 'admin' || req.user.role === 'super_admin') {
    return true
  }
  // Check if user has investigation permission
  if (req.user.permissions?.includes('investigation:cross_tenant')) {
    return true
  }
  return false
}
module.exports = {
  enforceTenantIsolation,
  validateTenantAccess,
  getTenantFilter,
  auditCrossTenantAccess,
  addTenantFilterToQuery,
  validateResourceOwnership,
  canAccessCrossTenant
}
// Made with Bob