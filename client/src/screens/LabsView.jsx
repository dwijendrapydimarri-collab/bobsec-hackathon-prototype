import { useState, useEffect } from 'react'
import { useAnalysis } from '../context/AnalysisContext'

export default function LabsView({ onBack }) {
  const { lang } = useAnalysis()
  const hi = lang === 'hi'
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 })

  useEffect(() => {
    fetchSuggestions()
  }, [])

  async function fetchSuggestions() {
    try {
      const res = await fetch('/api/feedback/suggestions')
      const data = await res.json()
      
      if (data.success) {
        setSuggestions(data.suggestions)
        setStats({
          total: data.total,
          pending: data.pending,
          approved: data.approved,
          rejected: data.rejected
        })
      }
    } catch (error) {
      console.error('Failed to fetch suggestions:', error)
    } finally {
      setLoading(false)
    }
  }

  function getStatusColor(status) {
    switch (status) {
      case 'pending_review': return 'bg-amber-900 border-amber-700 text-amber-200'
      case 'approved': return 'bg-emerald-900 border-emerald-700 text-emerald-200'
      case 'rejected': return 'bg-red-900 border-red-700 text-red-200'
      default: return 'bg-slate-800 border-slate-600 text-slate-300'
    }
  }

  function getPriorityColor(priority) {
    switch (priority) {
      case 'HIGH': return 'text-red-400'
      case 'MEDIUM': return 'text-amber-400'
      case 'LOW': return 'text-blue-400'
      default: return 'text-slate-400'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-400">{hi ? 'Suggestions लोड हो रहे हैं...' : 'Loading suggestions...'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen px-4 py-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-slate-400 hover:text-white transition-colors text-sm">
          ← {hi ? 'वापस' : 'Back'}
        </button>
        <span className="text-slate-600">|</span>
        <span className="text-slate-300 text-sm font-medium">🧪 {hi ? 'Labs — Rule Suggestions' : 'Labs — Rule Suggestions'}</span>
      </div>

      {/* Beta badge */}
      <div className="mb-6 p-4 bg-blue-950 border border-blue-800 rounded-xl">
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">🧪</span>
          <div>
            <p className="text-blue-300 font-semibold text-sm mb-1">
              {hi ? 'यह एक experimental feature है' : 'This is an experimental feature'}
            </p>
            <p className="text-blue-200 text-xs leading-relaxed">
              {hi
                ? 'जब users "Think this verdict is wrong?" feedback देते हैं, तो Bob नए scam patterns identify करता है और rules suggest करता है। ये rules अभी तक active नहीं हैं — ये review के लिए हैं।'
                : 'When users submit "Think this verdict is wrong?" feedback, Bob identifies new scam patterns and suggests rules. These rules are NOT yet active — they are pending review.'}
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="p-4 bg-slate-900 border border-slate-700 rounded-xl text-center">
          <p className="text-2xl font-bold text-white">{stats.total}</p>
          <p className="text-xs text-slate-400 mt-1">{hi ? 'कुल' : 'Total'}</p>
        </div>
        <div className="p-4 bg-amber-950 border border-amber-800 rounded-xl text-center">
          <p className="text-2xl font-bold text-amber-300">{stats.pending}</p>
          <p className="text-xs text-amber-400 mt-1">{hi ? 'Pending' : 'Pending'}</p>
        </div>
        <div className="p-4 bg-emerald-950 border border-emerald-800 rounded-xl text-center">
          <p className="text-2xl font-bold text-emerald-300">{stats.approved}</p>
          <p className="text-xs text-emerald-400 mt-1">{hi ? 'Approved' : 'Approved'}</p>
        </div>
        <div className="p-4 bg-red-950 border border-red-800 rounded-xl text-center">
          <p className="text-2xl font-bold text-red-300">{stats.rejected}</p>
          <p className="text-xs text-red-400 mt-1">{hi ? 'Rejected' : 'Rejected'}</p>
        </div>
      </div>

      {/* Suggestions list */}
      {suggestions.length === 0 ? (
        <div className="p-8 bg-slate-900 border border-slate-700 rounded-xl text-center">
          <span className="text-4xl mb-3 block">📭</span>
          <p className="text-slate-300 text-sm">
            {hi ? 'अभी तक कोई rule suggestions नहीं हैं' : 'No rule suggestions yet'}
          </p>
          <p className="text-slate-500 text-xs mt-2">
            {hi
              ? 'जब users feedback देंगे, तो Bob नए rules suggest करेगा'
              : 'When users submit feedback, Bob will suggest new rules here'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {suggestions.map((suggestion, index) => (
            <div key={index} className="p-5 bg-slate-900 border border-slate-700 rounded-xl">
              {/* Header */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-sm font-mono ${getPriorityColor(suggestion.priority)}`}>
                      {suggestion.priority}
                    </span>
                    <span className="text-slate-600">·</span>
                    <span className="text-white font-semibold text-sm">{suggestion.label}</span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono">{suggestion.id}</p>
                </div>
                <span className={`px-3 py-1 rounded-lg border text-xs font-medium ${getStatusColor(suggestion.metadata.status)}`}>
                  {suggestion.metadata.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>

              {/* Conditions */}
              <div className="mb-4 p-3 bg-slate-950 border border-slate-800 rounded-lg">
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-2 font-medium">Conditions</p>
                <div className="space-y-1 text-xs">
                  {suggestion.conditions.containsAny && (
                    <p className="text-slate-300">
                      <span className="text-slate-500">Contains any:</span> {suggestion.conditions.containsAny.join(', ')}
                    </p>
                  )}
                  {suggestion.conditions.containsAnyOrg && (
                    <p className="text-slate-300">
                      <span className="text-slate-500">Orgs:</span> {suggestion.conditions.containsAnyOrg.join(', ')}
                    </p>
                  )}
                  {suggestion.conditions.hasEntityTypes && (
                    <p className="text-slate-300">
                      <span className="text-slate-500">Entities:</span> {suggestion.conditions.hasEntityTypes.join(', ')}
                    </p>
                  )}
                </div>
              </div>

              {/* Explanation */}
              <div className="mb-4 p-3 bg-slate-950 border border-slate-800 rounded-lg">
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-2 font-medium">Explanation</p>
                <p className="text-slate-300 text-xs leading-relaxed mb-2">{suggestion.explanation?.en}</p>
                <p className="text-slate-400 text-xs leading-relaxed">{suggestion.explanation?.hi}</p>
              </div>

              {/* Metadata */}
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span>📅 {new Date(suggestion.metadata.created_at).toLocaleDateString()}</span>
                {suggestion.metadata.user_comment && (
                  <span className="flex-1 truncate">💬 {suggestion.metadata.user_comment}</span>
                )}
                <span>🎯 {suggestion.defaultCategory}</span>
              </div>

              {/* Source message preview */}
              {suggestion.metadata.source_message && (
                <div className="mt-3 p-2 bg-slate-950 border border-slate-800 rounded text-xs text-slate-400 font-mono truncate">
                  {suggestion.metadata.source_message}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Footer note */}
      <div className="mt-6 p-4 bg-slate-900 border border-slate-700 rounded-xl">
        <p className="text-slate-400 text-xs leading-relaxed">
          {hi
            ? '💡 ये suggestions Bob द्वारा user feedback से automatically generate किए गए हैं। Production में use करने से पहले इन्हें manually review और test करना ज़रूरी है।'
            : '💡 These suggestions are automatically generated by Bob from user feedback. They must be manually reviewed and tested before being used in production.'}
        </p>
      </div>
    </div>
  )
}

// Made with Bob
