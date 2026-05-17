/**
 * Pipeline Versions Screen
 * 
 * Manage pipeline versions and canary deployments.
 */

import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

const STATUS_COLORS = {
  draft: 'bg-slate-700 text-slate-300',
  testing: 'bg-blue-700 text-blue-200',
  canary: 'bg-amber-700 text-amber-200',
  active: 'bg-emerald-700 text-emerald-200',
  deprecated: 'bg-red-700 text-red-200',
  archived: 'bg-slate-600 text-slate-400'
}

const STRATEGY_LABELS = {
  canary: 'Canary',
  blue_green: 'Blue-Green',
  rolling: 'Rolling',
  instant: 'Instant'
}

function VersionCard({ version, onStartCanary, onIncreaseRollout, onPauseRollout, onResumeRollout, onRollback, onSetDefault, onDelete }) {
  const [showDetails, setShowDetails] = useState(false)

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-white font-semibold text-lg">{version.name}</h3>
            <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[version.status]}`}>
              {version.status.toUpperCase()}
            </span>
            {version.isDefault && (
              <span className="px-2 py-1 rounded text-xs font-medium bg-blue-900 text-blue-200">
                DEFAULT
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-400">
            <span>v{version.version}</span>
            <span>·</span>
            <span>{STRATEGY_LABELS[version.strategy]}</span>
            {version.status === 'canary' && (
              <>
                <span>·</span>
                <span className="text-amber-400">{version.rolloutPercentage}% rollout</span>
              </>
            )}
          </div>
          {version.description && (
            <p className="text-slate-400 text-sm mt-2">{version.description}</p>
          )}
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-slate-400 hover:text-white text-sm"
        >
          {showDetails ? '▼' : '▶'}
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <div className="bg-slate-800 rounded-lg p-3">
          <p className="text-slate-500 text-xs mb-1">Requests</p>
          <p className="text-white font-semibold">{version.metrics.totalRequests.toLocaleString()}</p>
        </div>
        <div className="bg-slate-800 rounded-lg p-3">
          <p className="text-slate-500 text-xs mb-1">Error Rate</p>
          <p className="text-white font-semibold">
            {version.metrics.totalRequests > 0
              ? ((version.metrics.errorCount / version.metrics.totalRequests) * 100).toFixed(2)
              : 0}%
          </p>
        </div>
        <div className="bg-slate-800 rounded-lg p-3">
          <p className="text-slate-500 text-xs mb-1">Avg Latency</p>
          <p className="text-white font-semibold">{version.metrics.avgLatency.toFixed(0)}ms</p>
        </div>
        <div className="bg-slate-800 rounded-lg p-3">
          <p className="text-slate-500 text-xs mb-1">Avg Risk Score</p>
          <p className="text-white font-semibold">{version.metrics.avgRiskScore.toFixed(1)}</p>
        </div>
      </div>

      {/* Rollout Progress */}
      {version.status === 'canary' && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-slate-400 mb-2">
            <span>Rollout Progress</span>
            <span>{version.rolloutPercentage}%</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all duration-500"
              style={{ width: `${version.rolloutPercentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        {version.status === 'draft' && (
          <button
            onClick={() => onStartCanary(version.id)}
            className="px-3 py-2 bg-amber-700 hover:bg-amber-600 text-white rounded-lg text-sm transition-colors"
          >
            Start Canary
          </button>
        )}
        
        {version.status === 'canary' && (
          <>
            <button
              onClick={() => onIncreaseRollout(version.id)}
              className="px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-sm transition-colors"
            >
              Increase Rollout
            </button>
            <button
              onClick={() => onPauseRollout(version.id)}
              className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
            >
              Pause
            </button>
          </>
        )}

        {version.status === 'active' && !version.isDefault && (
          <button
            onClick={() => onSetDefault(version.id)}
            className="px-3 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-lg text-sm transition-colors"
          >
            Set as Default
          </button>
        )}

        {version.canRollback && version.previousVersionId && (
          <button
            onClick={() => onRollback(version.id)}
            className="px-3 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg text-sm transition-colors"
          >
            Rollback
          </button>
        )}

        {(version.status === 'draft' || version.status === 'archived') && (
          <button
            onClick={() => onDelete(version.id)}
            className="px-3 py-2 bg-red-900 hover:bg-red-800 text-red-200 rounded-lg text-sm transition-colors"
          >
            Delete
          </button>
        )}
      </div>

      {/* Details */}
      {showDetails && (
        <div className="mt-4 pt-4 border-t border-slate-700">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-500 mb-1">Created</p>
              <p className="text-slate-300">{new Date(version.createdAt).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-slate-500 mb-1">Updated</p>
              <p className="text-slate-300">{new Date(version.updatedAt).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-slate-500 mb-1">Rollout Step</p>
              <p className="text-slate-300">{version.rolloutStep}%</p>
            </div>
            <div>
              <p className="text-slate-500 mb-1">Rollout Interval</p>
              <p className="text-slate-300">{version.rolloutInterval}s</p>
            </div>
          </div>

          {version.config && (
            <div className="mt-4">
              <p className="text-slate-500 text-xs mb-2">Configuration</p>
              <pre className="bg-slate-950 border border-slate-800 rounded p-3 text-xs text-slate-300 overflow-x-auto">
                {JSON.stringify(version.config, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function CreateVersionModal({ onClose, onCreate }) {
  const [formData, setFormData] = useState({
    version: '',
    name: '',
    description: '',
    strategy: 'canary',
    rolloutStep: 10,
    rolloutInterval: 300,
    config: '{}'
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const config = JSON.parse(formData.config)
      await onCreate({
        ...formData,
        config,
        rolloutStep: parseInt(formData.rolloutStep),
        rolloutInterval: parseInt(formData.rolloutInterval)
      })
      onClose()
    } catch (error) {
      alert('Invalid configuration JSON')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-white text-xl font-bold mb-4">Create Pipeline Version</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-slate-300 text-sm mb-2">Version (semver)</label>
            <input
              type="text"
              value={formData.version}
              onChange={e => setFormData({ ...formData, version: e.target.value })}
              placeholder="1.0.0"
              pattern="^\d+\.\d+\.\d+$"
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
            />
          </div>

          <div>
            <label className="block text-slate-300 text-sm mb-2">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="Production Pipeline v1"
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
            />
          </div>

          <div>
            <label className="block text-slate-300 text-sm mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="What's new in this version?"
              rows={3}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 text-sm mb-2">Strategy</label>
              <select
                value={formData.strategy}
                onChange={e => setFormData({ ...formData, strategy: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
              >
                <option value="canary">Canary</option>
                <option value="blue_green">Blue-Green</option>
                <option value="rolling">Rolling</option>
                <option value="instant">Instant</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 text-sm mb-2">Rollout Step (%)</label>
              <input
                type="number"
                value={formData.rolloutStep}
                onChange={e => setFormData({ ...formData, rolloutStep: e.target.value })}
                min="1"
                max="50"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 text-sm mb-2">Rollout Interval (seconds)</label>
            <input
              type="number"
              value={formData.rolloutInterval}
              onChange={e => setFormData({ ...formData, rolloutInterval: e.target.value })}
              min="60"
              max="86400"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
            />
          </div>

          <div>
            <label className="block text-slate-300 text-sm mb-2">Configuration (JSON)</label>
            <textarea
              value={formData.config}
              onChange={e => setFormData({ ...formData, config: e.target.value })}
              placeholder='{"agents": {}, "plugins": [], "policies": {}}'
              rows={8}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white font-mono text-xs resize-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-blue-700 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              Create Version
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function PipelineVersionsScreen() {
  const { token } = useAuth()
  const [versions, setVersions] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    loadVersions()
    loadStats()
  }, [])

  async function loadVersions() {
    try {
      const res = await fetch('/api/pipeline-versions', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setVersions(data.data)
      }
    } catch (error) {
      console.error('Failed to load versions:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadStats() {
    try {
      const res = await fetch('/api/pipeline-versions/stats', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setStats(data.data)
      }
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  async function handleCreate(versionData) {
    try {
      const res = await fetch('/api/pipeline-versions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(versionData)
      })
      const data = await res.json()
      if (data.success) {
        await loadVersions()
        await loadStats()
      } else {
        alert(data.error)
      }
    } catch (error) {
      alert('Failed to create version')
    }
  }

  async function handleStartCanary(versionId) {
    if (!confirm('Start canary deployment for this version?')) return
    
    try {
      const res = await fetch(`/api/pipeline-versions/${versionId}/start-canary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ initialPercentage: 5 })
      })
      const data = await res.json()
      if (data.success) {
        await loadVersions()
      } else {
        alert(data.error)
      }
    } catch (error) {
      alert('Failed to start canary')
    }
  }

  async function handleIncreaseRollout(versionId) {
    try {
      const res = await fetch(`/api/pipeline-versions/${versionId}/increase-rollout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        await loadVersions()
        if (data.paused) {
          alert(`Rollout paused: ${data.reason}`)
        }
      } else {
        alert(data.error)
      }
    } catch (error) {
      alert('Failed to increase rollout')
    }
  }

  async function handlePauseRollout(versionId) {
    try {
      const res = await fetch(`/api/pipeline-versions/${versionId}/pause-rollout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        await loadVersions()
      }
    } catch (error) {
      alert('Failed to pause rollout')
    }
  }

  async function handleRollback(versionId) {
    if (!confirm('Rollback to previous version? This will stop the current version.')) return
    
    try {
      const res = await fetch(`/api/pipeline-versions/${versionId}/rollback`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        await loadVersions()
        alert('Rolled back successfully')
      } else {
        alert(data.error)
      }
    } catch (error) {
      alert('Failed to rollback')
    }
  }

  async function handleSetDefault(versionId) {
    try {
      const res = await fetch(`/api/pipeline-versions/${versionId}/set-default`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        await loadVersions()
      } else {
        alert(data.error)
      }
    } catch (error) {
      alert('Failed to set default')
    }
  }

  async function handleDelete(versionId) {
    if (!confirm('Delete this version? This cannot be undone.')) return
    
    try {
      const res = await fetch(`/api/pipeline-versions/${versionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        await loadVersions()
        await loadStats()
      } else {
        alert(data.error)
      }
    } catch (error) {
      alert('Failed to delete version')
    }
  }

  const filteredVersions = filter === 'all'
    ? versions
    : versions.filter(v => v.status === filter)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-400">Loading pipeline versions...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-white text-2xl font-bold mb-2">Pipeline Versions</h1>
            <p className="text-slate-400 text-sm">Manage analysis pipeline versions and canary deployments</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            + Create Version
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
              <p className="text-slate-500 text-sm mb-1">Total Versions</p>
              <p className="text-white text-2xl font-bold">{stats.total}</p>
            </div>
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
              <p className="text-slate-500 text-sm mb-1">Active</p>
              <p className="text-emerald-400 text-2xl font-bold">{stats.byStatus.active}</p>
            </div>
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
              <p className="text-slate-500 text-sm mb-1">Canary Rollouts</p>
              <p className="text-amber-400 text-2xl font-bold">{stats.byStatus.canary}</p>
            </div>
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
              <p className="text-slate-500 text-sm mb-1">Default Version</p>
              <p className="text-blue-400 text-lg font-bold">{stats.defaultVersion || 'None'}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {['all', 'active', 'canary', 'draft', 'deprecated'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                filter === f
                  ? 'bg-blue-700 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Versions List */}
        <div className="space-y-4">
          {filteredVersions.length === 0 ? (
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-8 text-center">
              <p className="text-slate-400">No pipeline versions found</p>
            </div>
          ) : (
            filteredVersions.map(version => (
              <VersionCard
                key={version.id}
                version={version}
                onStartCanary={handleStartCanary}
                onIncreaseRollout={handleIncreaseRollout}
                onPauseRollout={handlePauseRollout}
                onRollback={handleRollback}
                onSetDefault={handleSetDefault}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateVersionModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  )
}

// Made with Bob
