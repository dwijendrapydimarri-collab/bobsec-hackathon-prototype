import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'

const CACHE_KEY = 'bobsec_history_cache'
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export function useHistory() {
  const { token } = useAuth()
  const [history, setHistory] = useState([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  })
  const [filters, setFilters] = useState({
    riskLevel: null,
    category: null,
    startDate: null,
    endDate: null,
    search: null
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Load cached data on mount
  useEffect(() => {
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached)
        if (Date.now() - timestamp < CACHE_DURATION) {
          setHistory(data.analyses)
          setPagination(data.pagination)
        } else {
          localStorage.removeItem(CACHE_KEY)
        }
      } catch (err) {
        localStorage.removeItem(CACHE_KEY)
      }
    }
  }, [])

  const fetchHistory = useCallback(async (page = 1) => {
    if (!token) return

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString()
      })

      if (filters.riskLevel) params.append('riskLevel', filters.riskLevel)
      if (filters.category) params.append('category', filters.category)
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)
      if (filters.search) params.append('search', filters.search)

      const res = await fetch(`/api/history?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!res.ok) {
        throw new Error('Failed to fetch history')
      }

      const data = await res.json()
      setHistory(data.analyses)
      setPagination(data.pagination)

      // Cache the result
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data,
        timestamp: Date.now()
      }))
    } catch (err) {
      setError(err.message)
      console.error('Failed to fetch history:', err)
    } finally {
      setLoading(false)
    }
  }, [token, pagination.limit, filters])

  const fetchById = useCallback(async (id) => {
    if (!token) return null

    try {
      const res = await fetch(`/api/history/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!res.ok) {
        throw new Error('Failed to fetch analysis')
      }

      return await res.json()
    } catch (err) {
      console.error('Failed to fetch analysis:', err)
      return null
    }
  }, [token])

  const searchByEntity = useCallback(async (query) => {
    if (!token || !query || query.length < 3) return []

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/history/search/entity?q=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!res.ok) {
        throw new Error('Failed to search')
      }

      const data = await res.json()
      return data.results
    } catch (err) {
      setError(err.message)
      console.error('Failed to search:', err)
      return []
    } finally {
      setLoading(false)
    }
  }, [token])

  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
    // Clear cache when filters change
    localStorage.removeItem(CACHE_KEY)
  }, [])

  const clearFilters = useCallback(() => {
    setFilters({
      riskLevel: null,
      category: null,
      startDate: null,
      endDate: null,
      search: null
    })
    localStorage.removeItem(CACHE_KEY)
  }, [])

  const nextPage = useCallback(() => {
    if (pagination.hasNext) {
      fetchHistory(pagination.page + 1)
    }
  }, [pagination.hasNext, pagination.page, fetchHistory])

  const prevPage = useCallback(() => {
    if (pagination.hasPrev) {
      fetchHistory(pagination.page - 1)
    }
  }, [pagination.hasPrev, pagination.page, fetchHistory])

  const goToPage = useCallback((page) => {
    if (page >= 1 && page <= pagination.totalPages) {
      fetchHistory(page)
    }
  }, [pagination.totalPages, fetchHistory])

  const refresh = useCallback(() => {
    localStorage.removeItem(CACHE_KEY)
    fetchHistory(pagination.page)
  }, [pagination.page, fetchHistory])

  return {
    history,
    pagination,
    filters,
    loading,
    error,
    fetchHistory,
    fetchById,
    searchByEntity,
    updateFilters,
    clearFilters,
    nextPage,
    prevPage,
    goToPage,
    refresh
  }
}

// Made with Bob
