// Request validation schemas using simple validation functions
// In production, consider using libraries like zod or yup

class ValidationError extends Error {
  constructor(message, errors = []) {
    super(message)
    this.name = 'ValidationError'
    this.errors = errors
  }
}

// Helper functions
function isString(value) {
  return typeof value === 'string'
}

function isEmail(value) {
  return isString(value) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function minLength(value, min) {
  return isString(value) && value.length >= min
}

function maxLength(value, max) {
  return isString(value) && value.length <= max
}

function isOneOf(value, options) {
  return options.includes(value)
}

// Analysis Request Schema
function validateAnalysisRequest(data) {
  const errors = []
  
  if (!data.input) {
    errors.push('input is required')
  } else if (!isString(data.input)) {
    errors.push('input must be a string')
  } else if (!minLength(data.input, 10)) {
    errors.push('input must be at least 10 characters')
  } else if (!maxLength(data.input, 10000)) {
    errors.push('input must not exceed 10,000 characters')
  }
  
  if (data.lang && !isOneOf(data.lang, ['en', 'hi'])) {
    errors.push('lang must be either "en" or "hi"')
  }
  
  if (data.mode && !isOneOf(data.mode, ['pre_incident', 'post_incident'])) {
    errors.push('mode must be either "pre_incident" or "post_incident"')
  }
  
  if (data.victim_narrative && !isString(data.victim_narrative)) {
    errors.push('victim_narrative must be a string')
  }
  
  if (errors.length > 0) {
    throw new ValidationError('Validation failed', errors)
  }
  
  return true
}

// Register Request Schema
function validateRegisterRequest(data) {
  const errors = []
  
  if (!data.email) {
    errors.push('email is required')
  } else if (!isEmail(data.email)) {
    errors.push('email must be a valid email address')
  }
  
  if (!data.password) {
    errors.push('password is required')
  } else if (!minLength(data.password, 8)) {
    errors.push('password must be at least 8 characters')
  } else if (!maxLength(data.password, 128)) {
    errors.push('password must not exceed 128 characters')
  }
  
  if (!data.name) {
    errors.push('name is required')
  } else if (!minLength(data.name, 2)) {
    errors.push('name must be at least 2 characters')
  } else if (!maxLength(data.name, 100)) {
    errors.push('name must not exceed 100 characters')
  }
  
  if (errors.length > 0) {
    throw new ValidationError('Validation failed', errors)
  }
  
  return true
}

// Login Request Schema
function validateLoginRequest(data) {
  const errors = []
  
  if (!data.email) {
    errors.push('email is required')
  } else if (!isEmail(data.email)) {
    errors.push('email must be a valid email address')
  }
  
  if (!data.password) {
    errors.push('password is required')
  }
  
  if (errors.length > 0) {
    throw new ValidationError('Validation failed', errors)
  }
  
  return true
}

// Feedback Request Schema
function validateFeedbackRequest(data) {
  const errors = []
  
  if (!data.message) {
    errors.push('message is required')
  } else if (!isString(data.message)) {
    errors.push('message must be a string')
  }
  
  if (!data.verdict) {
    errors.push('verdict is required')
  } else if (!isString(data.verdict)) {
    errors.push('verdict must be a string')
  }
  
  if (data.feedbackType && !isOneOf(data.feedbackType, ['incorrect_verdict', 'false_positive', 'false_negative', 'other'])) {
    errors.push('feedbackType must be one of: incorrect_verdict, false_positive, false_negative, other')
  }
  
  if (errors.length > 0) {
    throw new ValidationError('Validation failed', errors)
  }
  
  return true
}

// Suggestion Status Update Schema
function validateSuggestionStatusUpdate(data) {
  const errors = []
  
  if (!data.status) {
    errors.push('status is required')
  } else if (!isOneOf(data.status, ['approved', 'rejected', 'pending_review'])) {
    errors.push('status must be one of: approved, rejected, pending_review')
  }
  
  if (data.comment && !isString(data.comment)) {
    errors.push('comment must be a string')
  }
  
  if (errors.length > 0) {
    throw new ValidationError('Validation failed', errors)
  }
  
  return true
}

// Validation middleware factory
function validate(schema) {
  return (req, res, next) => {
    try {
      schema(req.body)
      next()
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json({
          error: 'validation_error',
          message: error.message,
          errors: error.errors
        })
      }
      next(error)
    }
  }
}

module.exports = {
  ValidationError,
  validateAnalysisRequest,
  validateRegisterRequest,
  validateLoginRequest,
  validateFeedbackRequest,
  validateSuggestionStatusUpdate,
  validate
}

// Made with Bob
