/**
 * API Keys Management Screen
 * 
 * Allows users to create, view, and manage API keys for programmatic access.
 */

import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n/i18nContext'
import Toast from '../components/Toast'

export default function ScreenApiKeys() {
  const { token } = useAuth()
  const { t } = useI18n()
  const [keys, setKeys] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newKey, setNewKey] = useState(null)
  const [toast, setToast] = useState(null)
  const [stats, setStats] = useState(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    permissions: ['analyse'],
    rateLimit: 100,
    environment: 'live',
    expiresAt: ''
  })

  useEffect(() => {
    loadKeys()
    loadStats()
  }, [])

  async function loadKeys() {
    try {
      const res = await fetch('/api/keys', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setKeys(data.keys || [])
    } catch (error) {
      showToast('Failed to load API keys', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function loadStats() {
    try {
      const res = await fetch('/api/keys/stats/usage', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setStats(data.stats)
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  async function createKey() {
    setCreating(true)
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Failed to create API key')
      }

      const data = await res.json()
      setNewKey(data)
      setShowCreateModal(false)
      loadKeys()
      loadStats()
      showToast('API key created successfully', 'success')
      
      // Reset form
      setFormData({
        name: '',
        permissions: ['analyse'],
        rateLimit: 100,
        environment: 'live',
        expiresAt: ''
      })
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setCreating(false)
    }
  }

  async function toggleKey(id, isActive) {
    try {
      const res = await fetch(`/api/keys/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: !isActive })
      })

      if (!res.ok) throw new Error('Failed to update key')

      loadKeys()
      showToast(isActive ? 'API key deactivated' : 'API key activated', 'success')
    } catch (error) {
      showToast(error.message, 'error')
    }
  }

  async function deleteKey(id) {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      return
    }

    try {
      const res = await fetch(`/api/keys/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!res.ok) throw new Error('Failed to delete key')

      loadKeys()
      loadStats()
      showToast('API key deleted', 'success')
    } catch (error) {
      showToast(error.message, 'error')
    }
  }

  function showToast(message, type = 'info') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
    showToast('Copied to clipboard', 'success')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-400">Loading API keys...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">API Keys</h1>
            <p className="text-slate-400 text-sm">
              Manage API keys for programmatic access to BobSec
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            + Create API Key
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <p className="text-slate-500 text-xs mb-1">Total Keys</p>
              <p className="text-white text-2xl font-bold">{stats.totalKeys}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <p className="text-slate-500 text-xs mb-1">Active Keys</p>
              <p className="text-emerald-400 text-2xl font-bold">{stats.activeKeys}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <p className="text-slate-500 text-xs mb-1">Total Usage</p>
              <p className="text-blue-400 text-2xl font-bold">{stats.totalUsage.toLocaleString()}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <p className="text-slate-500 text-xs mb-1">Last Used</p>
              <p className="text-slate-300 text-sm">{stats.lastUsed ? new Date(stats.lastUsed).toLocaleDateString() : 'Never'}</p>
            </div>
          </div>
        )}

        {/* New key display */}
        {newKey && (
          <div className="mb-8 p-6 bg-blue-950 border border-blue-800 rounded-xl">
            <div className="flex items-start gap-3 mb-4">
              <span className="text-2xl">🔑</span>
              <div className="flex-1">
                <h3 className="text-blue-300 font-semibold mb-1">API Key Created Successfully</h3>
                <p className="text-blue-400 text-sm">
                  Save this key securely. It will not be shown again.
                </p>
              </div>
              <button
                onClick={() => setNewKey(null)}
                className="text-blue-400 hover:text-blue-300"
              >
                ✕
              </button>
            </div>
            <div className="bg-slate-950 border border-blue-900 rounded-lg p-4 font-mono text-sm">
              <div className="flex items-center justify-between gap-4">
                <code className="text-blue-300 break-all">{newKey.key}</code>
                <button
                  onClick={() => copyToClipboard(newKey.key)}
                  className="px-3 py-1 bg-blue-900 hover:bg-blue-800 text-blue-200 rounded text-xs flex-shrink-0"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Keys list */}
        {keys.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-6xl mb-4 block">🔑</span>
            <p className="text-slate-400 mb-4">No API keys yet</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm"
            >
              Create Your First API Key
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {keys.map(key => (
              <div
                key={key.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-white font-semibold">{key.name}</h3>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        key.isActive 
                          ? 'bg-emerald-900 text-emerald-300' 
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {key.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded text-xs">
                        {key.keyPrefix}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>Created {new Date(key.createdAt).toLocaleDateString()}</span>
                      {key.lastUsedAt && (
                        <span>Last used {new Date(key.lastUsedAt).toLocaleDateString()}</span>
                      )}
                      <span>{key.usageCount.toLocaleString()} requests</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleKey(key.id, key.isActive)}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
                    >
                      {key.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => deleteKey(key.id)}
                      className="px-3 py-1 bg-red-900 hover:bg-red-800 text-red-300 rounded text-xs"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-800">
                  <div>
                    <p className="text-slate-500 text-xs mb-1">Permissions</p>
                    <div className="flex flex-wrap gap-1">
                      {key.permissions.map(p => (
                        <span key={p} className="px-2 py-0.5 bg-blue-900 text-blue-300 rounded text-xs">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs mb-1">Rate Limit</p>
                    <p className="text-slate-300 text-sm">{key.rateLimit} req/min</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs mb-1">Expires</p>
                    <p className="text-slate-300 text-sm">
                      {key.expiresAt ? new Date(key.expiresAt).toLocaleDateString() : 'Never'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full">
              <h3 className="text-white font-bold text-lg mb-4">Create API Key</h3>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-slate-300 text-sm mb-2">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Production API Key"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 text-sm mb-2">Permissions</label>
                  <div className="space-y-2">
                    {['analyse', 'history', 'webhooks'].map(perm => (
                      <label key={perm} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.permissions.includes(perm)}
                          onChange={e => {
                            if (e.target.checked) {
                              setFormData({ ...formData, permissions: [...formData.permissions, perm] })
                            } else {
                              setFormData({ ...formData, permissions: formData.permissions.filter(p => p !== perm) })
                            }
                          }}
                          className="accent-blue-500"
                        />
                        <span className="text-slate-300 text-sm capitalize">{perm}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 text-sm mb-2">Rate Limit (req/min)</label>
                  <input
                    type="number"
                    value={formData.rateLimit}
                    onChange={e => setFormData({ ...formData, rateLimit: parseInt(e.target.value) })}
                    min="1"
                    max="10000"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 text-sm mb-2">Environment</label>
                  <select
                    value={formData.environment}
                    onChange={e => setFormData({ ...formData, environment: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm"
                  >
                    <option value="live">Live</option>
                    <option value="test">Test</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 text-sm mb-2">Expiration (optional)</label>
                  <input
                    type="date"
                    value={formData.expiresAt}
                    onChange={e => setFormData({ ...formData, expiresAt: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={createKey}
                  disabled={creating || !formData.name || formData.permissions.length === 0}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium"
                >
                  {creating ? 'Creating...' : 'Create Key'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    </div>
  )
}

// Made with Bob
