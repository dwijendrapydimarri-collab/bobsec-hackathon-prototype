const logger = require('../utils/logger')

// Middleware to require organization admin role
function requireOrgAdmin(req, res, next) {
  if (!req.user) {
    logger.warn('requireOrgAdmin: No user in request')
    return res.status(401).json({ error: 'Authentication required' })
  }

  // System admins can access any organization
  if (req.user.role === 'ADMIN') {
    return next()
  }

  // Check if user is organization admin
  if (req.user.orgRole !== 'ORG_ADMIN') {
    logger.warn('requireOrgAdmin: User is not org admin', {
      userId: req.user.id,
      orgRole: req.user.orgRole
    })
    return res.status(403).json({ 
      error: 'Organization admin access required',
      message: 'You must be an organization administrator to perform this action'
    })
  }

  next()
}

// Middleware to require organization membership
function requireOrgMember(req, res, next) {
  if (!req.user) {
    logger.warn('requireOrgMember: No user in request')
    return res.status(401).json({ error: 'Authentication required' })
  }

  if (!req.user.organizationId) {
    logger.warn('requireOrgMember: User has no organization', {
      userId: req.user.id
    })
    return res.status(403).json({ 
      error: 'Organization membership required',
      message: 'You must be a member of an organization to perform this action'
    })
  }

  next()
}

// Middleware to validate organization access
// Checks if user belongs to the organization specified in the request
function validateOrgAccess(req, res, next) {
  if (!req.user) {
    logger.warn('validateOrgAccess: No user in request')
    return res.status(401).json({ error: 'Authentication required' })
  }

  // System admins can access any organization
  if (req.user.role === 'ADMIN') {
    return next()
  }

  // Get organization ID from params or body
  const requestedOrgId = req.params.organizationId || req.body.organizationId

  if (!requestedOrgId) {
    // No specific org requested, use user's org
    return next()
  }

  // Check if user belongs to the requested organization
  if (req.user.organizationId !== requestedOrgId) {
    logger.warn('validateOrgAccess: User does not belong to requested organization', {
      userId: req.user.id,
      userOrgId: req.user.organizationId,
      requestedOrgId
    })
    return res.status(403).json({ 
      error: 'Access denied',
      message: 'You do not have access to this organization'
    })
  }

  next()
}

// Middleware to attach organization context to request
async function attachOrgContext(req, res, next) {
  if (!req.user || !req.user.organizationId) {
    return next()
  }

  try {
    const OrganizationRepository = require('../repositories/OrganizationRepository')
    const orgRepo = new OrganizationRepository()
    
    const organization = await orgRepo.findById(req.user.organizationId)
    
    if (organization) {
      req.organization = organization
      logger.debug('Attached organization context', {
        userId: req.user.id,
        organizationId: organization.id,
        organizationName: organization.name
      })
    } else {
      logger.warn('Organization not found for user', {
        userId: req.user.id,
        organizationId: req.user.organizationId
      })
    }
  } catch (err) {
    logger.error('Failed to attach organization context', {
      error: err.message,
      userId: req.user.id
    })
  }

  next()
}

module.exports = {
  requireOrgAdmin,
  requireOrgMember,
  validateOrgAccess,
  attachOrgContext
}

// Made with Bob
