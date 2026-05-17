import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

const SCOPE_LABELS = {
  analysis: 'Analysis',
  webhook: 'Webhook',
  consent: 'Consent',
  data_retention: 'Data Retention'
}

const SCOPE_COLORS = {
  analysis: 'bg-blue-900 border-blue-700 text-blue-200',
  webhook: 'bg-purple-900 border-purple-700 text-purple-200',
  consent: 'bg-green-900 border-green-700 text-green-200',
  data_retention: 'bg-amber-900 border-amber-700 text-amber-200'
}

function PolicyCard({ policy, onToggle, onEdit, onDelete, onTest, onDuplicate }) {
  const [showActions, setShowActions] = useState(false)

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-white font-semibold text-sm truncate">{policy.name}</h3>
            {policy.testMode && (
              <span className="px-2 py-0.5 bg-amber-900 border border-amber-700 text-amber-300 text-xs rounded-md flex-shrink-0">
                TEST
              </span>
            )}
          </div>
          {policy.description && (
            <p className="text-slate-400 text-xs line-clamp-2">{policy.description}</p>
          )}
        </div>
        <button
          onClick={() => onToggle(policy.id)}
          className={`flex-shrink-0 w-12 h-6 rounded-full transition-colors ${
            policy.enabled ? 'bg-emerald-600' : 'bg-slate-700'
          }`}
        >
          <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
            policy.enabled ? 'translate-x-6' : 'translate-x-0.5'
          }`} />
        </button>
      </div>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className={`px-2 py-1 rounded-md border text-xs ${SCOPE_COLORS[policy.scope] || SCOPE_COLORS.analysis}`}>
          {SCOPE_LABELS[policy.scope] || policy.scope}
        </span>
        <span className="px-2 py-1 bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-md">
          Priority: {policy.priority}
        </span>
        <span className="px-2 py-1 bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-md">
          {policy.conditions.length} conditions
        </span>
        <span className="px-2 py-1 bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-md">
          {policy.actions.length} actions
        </span>
      </div>

      {policy.stats && (
        <div className="flex items-center gap-4 mb-3 text-xs">
          <span className="text-slate-400">
            Executions: <span className="text-white">{policy.stats.totalExecutions}</span>
          </span>
          <span className="text-slate-400">
            Success: <span className="text-emerald-400">{policy.stats.successCount}</span>
          </span>
          <span className="text-slate-400">
            Failed: <span className="text-red-400">{policy.stats.failureCount}</span>
          </span>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={() => onTest(policy)}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 text-xs rounded-lg transition-colors"
        >
          🧪 Test
        </button>
        <button
          onClick={() => onEdit(policy)}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 text-xs rounded-lg transition-colors"
        >
          ✏️ Edit
        </button>
        <button
          onClick={() => onDuplicate(policy)}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 text-xs rounded-lg transition-colors"
        >
          📋 Duplicate
        </button>
        <button
          onClick={() => setShowActions(!showActions)}
          className="ml-auto px-3 py-1.5 bg-red-900 hover:bg-red-800 border border-red-700 text-red-300 text-xs rounded-lg transition-colors"
        >
          🗑 Delete
        </button>
      </div>

      {showActions && (
        <div className="mt-3 p-3 bg-red-950 border border-red-800 rounded-lg">
          <p className="text-red-300 text-xs mb-2">Are you sure you want to delete this policy?</p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                onDelete(policy.id)
                setShowActions(false)
              }}
              className="px-3 py-1.5 bg-red-700 hover:bg-red-600 text-white text-xs rounded-lg transition-colors"
            >
              Yes, Delete
            </button>
            <button
              onClick={() => setShowActions(false)}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function PolicyTestModal({ policy, onClose }) {
  const { token } = useAuth()
  const [context, setContext] = useState(JSON.stringify({
    analysis: {
      riskScore: 85,
      riskLevel: 'HIGH',
      category: 'FINANCIAL_FRAUD',
      confidence: 92
    },
    event: 'analysis.completed'
  }, null, 2))
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleTest() {
    setLoading(true)
    try {
      const res = await fetch(`/api/policies/${policy.id}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ context: JSON.parse(context) })
      })
      const data = await res.json()
      setResult(data.result)
    } catch (error) {
      setResult({ error: error.message })
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-bold text-lg">Test Policy: {policy.name}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">×</button>
        </div>

        <div className="mb-4">
          <label className="block text-slate-300 text-sm mb-2">Test Context (JSON)</label>
          <textarea
            value={context}
            onChange={e => setContext(e.target.value)}
            className="w-full h-48 bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-300 text-xs font-mono resize-none focus:outline-none focus:border-blue-600"
          />
        </div>

        <button
          onClick={handleTest}
          disabled={loading}
          className="w-full py-3 bg-blue-700 hover:bg-blue-600 disabled:bg-slate-700 text-white rounded-lg font-semibold transition-colors mb-4"
        >
          {loading ? 'Testing...' : '🧪 Run Test'}
        </button>

        {result && (
          <div className="p-4 bg-slate-950 border border-slate-700 rounded-lg">
            <p className="text-slate-400 text-xs mb-2">Test Result:</p>
            <pre className="text-slate-300 text-xs overflow-x-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}

export default function PoliciesScreen() {
  const { token } = useAuth()
  const [policies, setPolicies] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [testingPolicy, setTestingPolicy] = useState(null)

  useEffect(() => {
    loadPolicies()
  }, [filter])

  async function loadPolicies() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter !== 'all') params.append('scope', filter)
      
      const res = await fetch(`/api/policies?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setPolicies(data.policies || [])
    } catch (error) {
      console.error('Failed to load policies:', error)
    }
    setLoading(false)
  }

  async function handleToggle(id) {
    try {
      const res = await fetch(`/api/policies/${id}/toggle`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setPolicies(prev => prev.map(p => p.id === id ? data.policy : p))
    } catch (error) {
      console.error('Failed to toggle policy:', error)
    }
  }

  async function handleDelete(id) {
    try {
      await fetch(`/api/policies/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      setPolicies(prev => prev.filter(p => p.id !== id))
    } catch (error) {
      console.error('Failed to delete policy:', error)
    }
  }

  async function handleDuplicate(policy) {
    try {
      const res = await fetch(`/api/policies/${policy.id}/duplicate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: `${policy.name} (Copy)` })
      })
      const data = await res.json()
      setPolicies(prev => [data.policy, ...prev])
    } catch (error) {
      console.error('Failed to duplicate policy:', error)
    }
  }

  const filteredPolicies = policies

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      {testingPolicy && (
        <PolicyTestModal
          policy={testingPolicy}
          onClose={() => setTestingPolicy(null)}
        />
      )}

      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Policy Management</h1>
            <p className="text-slate-400 text-sm">Define automated rules for analysis workflows</p>
          </div>
          <button className="px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors">
            + New Policy
          </button>
        </div>

        <div className="flex items-center gap-2 mb-6 overflow-x-auto">
          {['all', 'analysis', 'webhook', 'consent', 'data_retention'].map(scope => (
            <button
              key={scope}
              onClick={() => setFilter(scope)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-shrink-0 ${
                filter === scope
                  ? 'bg-blue-700 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {scope === 'all' ? 'All Policies' : SCOPE_LABELS[scope]}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-slate-400 text-sm mt-3">Loading policies...</p>
          </div>
        ) : filteredPolicies.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-5xl mb-3 block">📋</span>
            <p className="text-slate-400 text-sm">No policies found. Create your first policy to get started.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredPolicies.map(policy => (
              <PolicyCard
                key={policy.id}
                policy={policy}
                onToggle={handleToggle}
                onEdit={() => {}}
                onDelete={handleDelete}
                onTest={setTestingPolicy}
                onDuplicate={handleDuplicate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Made with Bob
