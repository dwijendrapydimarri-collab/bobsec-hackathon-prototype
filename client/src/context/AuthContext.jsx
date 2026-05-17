import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

// API base URL from environment variable
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [tenantId, setTenantId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Check for existing auth on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('bobsec_token')
    const storedUser = localStorage.getItem('bobsec_user')
    const storedTenantId = localStorage.getItem('bobsec_tenant_id')

    if (storedToken && storedUser) {
      setToken(storedToken)
      setUser(JSON.parse(storedUser))
      setTenantId(storedTenantId || 'demo')
      
      // Verify token is still valid
      verifyToken(storedToken)
    } else {
      setLoading(false)
    }
  }, [])

  async function verifyToken(token) {
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
        setTenantId(data.currentTenantId)
      } else {
        // Token invalid, clear auth
        logout()
      }
    } catch (err) {
      console.error('Token verification failed:', err)
      logout()
    } finally {
      setLoading(false)
    }
  }

  async function register(email, password, name) {
    setError(null)
    setLoading(true)

    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Registration failed')
      }

      // Store auth data
      localStorage.setItem('bobsec_token', data.token)
      localStorage.setItem('bobsec_user', JSON.stringify(data.user))
      localStorage.setItem('bobsec_tenant_id', data.tenantId)

      setToken(data.token)
      setUser(data.user)
      setTenantId(data.tenantId)
      setLoading(false)

      return { success: true }
    } catch (err) {
      setError(err.message)
      setLoading(false)
      return { success: false, error: err.message }
    }
  }

  async function login(email, password) {
    setError(null)
    setLoading(true)

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Login failed')
      }

      // Store auth data
      localStorage.setItem('bobsec_token', data.token)
      localStorage.setItem('bobsec_user', JSON.stringify(data.user))
      localStorage.setItem('bobsec_tenant_id', data.tenantId)

      setToken(data.token)
      setUser(data.user)
      setTenantId(data.tenantId)
      setLoading(false)

      return { success: true }
    } catch (err) {
      setError(err.message)
      setLoading(false)
      return { success: false, error: err.message }
    }
  }

  async function logout() {
    // Call logout endpoint (optional, for logging purposes)
    if (token) {
      try {
        await fetch(`${API_BASE}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      } catch (err) {
        console.error('Logout request failed:', err)
      }
    }

    // Clear local state and storage
    localStorage.removeItem('bobsec_token')
    localStorage.removeItem('bobsec_user')
    localStorage.removeItem('bobsec_tenant_id')

    setToken(null)
    setUser(null)
    setTenantId(null)
    setError(null)
  }

  function clearError() {
    setError(null)
  }

  const value = {
    user,
    token,
    tenantId,
    loading,
    error,
    isAuthenticated: !!user,
    register,
    login,
    logout,
    clearError
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

// Made with Bob
