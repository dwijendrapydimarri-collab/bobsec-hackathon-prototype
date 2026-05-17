import { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'

const OrganizationContext = createContext(null)

export function OrganizationProvider({ children }) {
  const { token, isAuthenticated } = useAuth()
  const [organization, setOrganization] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Fetch user's organization on mount or when auth changes
  useEffect(() => {
    if (isAuthenticated && token) {
      fetchOrganization()
    } else {
      setOrganization(null)
    }
  }, [isAuthenticated, token])

  async function fetchOrganization() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/organizations/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (res.ok) {
        const data = await res.json()
        setOrganization(data)
      } else if (res.status === 404 || res.status === 403) {
        // User doesn't have an organization yet
        setOrganization(null)
      } else {
        throw new Error('Failed to fetch organization')
      }
    } catch (err) {
      console.error('Failed to fetch organization:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function createOrganization(name, slug) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/organizations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, slug })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create organization')
      }

      const data = await res.json()
      setOrganization(data)
      return data
    } catch (err) {
      console.error('Failed to create organization:', err)
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  async function updateOrganization(updates) {
    if (!organization) return

    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/organizations/${organization.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update organization')
      }

      const data = await res.json()
      setOrganization(data)
      return data
    } catch (err) {
      console.error('Failed to update organization:', err)
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  async function fetchMembers() {
    if (!organization) return []

    try {
      const res = await fetch(`/api/organizations/${organization.id}/members`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!res.ok) {
        throw new Error('Failed to fetch members')
      }

      const data = await res.json()
      return data.members || []
    } catch (err) {
      console.error('Failed to fetch members:', err)
      setError(err.message)
      return []
    }
  }

  async function inviteMember(email) {
    if (!organization) return

    try {
      const res = await fetch(`/api/organizations/${organization.id}/members`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to invite member')
      }

      const data = await res.json()
      return data
    } catch (err) {
      console.error('Failed to invite member:', err)
      setError(err.message)
      throw err
    }
  }

  async function removeMember(userId) {
    if (!organization) return

    try {
      const res = await fetch(`/api/organizations/${organization.id}/members/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to remove member')
      }

      return true
    } catch (err) {
      console.error('Failed to remove member:', err)
      setError(err.message)
      throw err
    }
  }

  function clearError() {
    setError(null)
  }

  return (
    <OrganizationContext.Provider value={{
      organization,
      loading,
      error,
      createOrganization,
      updateOrganization,
      fetchMembers,
      inviteMember,
      removeMember,
      refreshOrganization: fetchOrganization,
      clearError
    }}>
      {children}
    </OrganizationContext.Provider>
  )
}

export function useOrganization() {
  const context = useContext(OrganizationContext)
  if (!context) {
    throw new Error('useOrganization must be used within OrganizationProvider')
  }
  return context
}

// Made with Bob
