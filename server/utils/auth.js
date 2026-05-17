// Authentication utilities - JWT token generation and verification
const crypto = require('crypto')

// JWT secret from environment or generate a random one for demo
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex')
const TOKEN_EXPIRY = '7d' // 7 days

// Simple JWT implementation (in production, use jsonwebtoken library)
class JWT {
  static encode(payload, expiresIn = TOKEN_EXPIRY) {
    const header = { alg: 'HS256', typ: 'JWT' }
    const now = Math.floor(Date.now() / 1000)
    const exp = now + this.parseExpiry(expiresIn)
    
    const fullPayload = {
      ...payload,
      iat: now,
      exp
    }
    
    const encodedHeader = this.base64UrlEncode(JSON.stringify(header))
    const encodedPayload = this.base64UrlEncode(JSON.stringify(fullPayload))
    const signature = this.sign(`${encodedHeader}.${encodedPayload}`)
    
    return `${encodedHeader}.${encodedPayload}.${signature}`
  }

  static decode(token) {
    try {
      const parts = token.split('.')
      if (parts.length !== 3) {
        throw new Error('Invalid token format')
      }

      const [encodedHeader, encodedPayload, signature] = parts
      
      // Verify signature
      const expectedSignature = this.sign(`${encodedHeader}.${encodedPayload}`)
      if (signature !== expectedSignature) {
        throw new Error('Invalid signature')
      }

      const payload = JSON.parse(this.base64UrlDecode(encodedPayload))
      
      // Check expiry
      const now = Math.floor(Date.now() / 1000)
      if (payload.exp && payload.exp < now) {
        throw new Error('Token expired')
      }

      return payload
    } catch (error) {
      throw new Error(`Token verification failed: ${error.message}`)
    }
  }

  static sign(data) {
    return crypto
      .createHmac('sha256', JWT_SECRET)
      .update(data)
      .digest('base64url')
  }

  static base64UrlEncode(str) {
    return Buffer.from(str).toString('base64url')
  }

  static base64UrlDecode(str) {
    return Buffer.from(str, 'base64url').toString('utf-8')
  }

  static parseExpiry(expiresIn) {
    // Simple parser for '7d', '24h', '60m' format
    const match = expiresIn.match(/^(\d+)([dhm])$/)
    if (!match) return 7 * 24 * 60 * 60 // default 7 days
    
    const value = parseInt(match[1])
    const unit = match[2]
    
    switch (unit) {
      case 'd': return value * 24 * 60 * 60
      case 'h': return value * 60 * 60
      case 'm': return value * 60
      default: return 7 * 24 * 60 * 60
    }
  }
}

// Password hashing utilities
class PasswordHash {
  static async hash(password) {
    // Use crypto.scrypt for password hashing
    return new Promise((resolve, reject) => {
      const salt = crypto.randomBytes(16).toString('hex')
      crypto.scrypt(password, salt, 64, (err, derivedKey) => {
        if (err) reject(err)
        resolve(`${salt}:${derivedKey.toString('hex')}`)
      })
    })
  }

  static async verify(password, hash) {
    return new Promise((resolve, reject) => {
      const [salt, key] = hash.split(':')
      crypto.scrypt(password, salt, 64, (err, derivedKey) => {
        if (err) reject(err)
        resolve(key === derivedKey.toString('hex'))
      })
    })
  }
}

// Generate auth token for user
function generateToken(user, tenantId) {
  return JWT.encode({
    userId: user.id,
    tenantId: tenantId,
    role: user.role,
    email: user.email
  })
}

// Verify and decode token
function verifyToken(token) {
  try {
    return JWT.decode(token)
  } catch (error) {
    return null
  }
}

module.exports = {
  JWT,
  PasswordHash,
  generateToken,
  verifyToken,
  JWT_SECRET
}

// Made with Bob
