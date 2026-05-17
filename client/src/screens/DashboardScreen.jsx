import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useOrganization } from '../context/OrganizationContext'

export default function DashboardScreen({ onStartAnalysis, onViewAccount, onViewOrgSettings, onViewHistory }) {
  const { user, token, logout } = useAuth()
  const { organization } = useOrganization()
  const [recentAnalyses, setRecentAnalyses] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRecentAnalyses()
    fetchStats()
  }, [])

  async function fetchRecentAnalyses() {
    try {
      const res = await fetch('/api/cases/recent', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (res.ok) {
        const data = await res.json()
        setRecentAnalyses(data.analyses || [])
      }
    } catch (err) {
      console.error('Failed to fetch recent analyses:', err)
    } finally {
      setLoading(false)
    }
  }

  async function fetchStats() {
    try {
      const res = await fetch('/api/cases/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    }
  }

  const RISK_COLORS = {
    HIGH: 'bg-red-900 border-red-700 text-red-200',
    MEDIUM: 'bg-amber-900 border-amber-700 text-amber-200',
    LOW: 'bg-blue-900 border-blue-700 text-blue-200',
    SAFE: 'bg-emerald-900 border-emerald-700 text-emerald-200',
    UNKNOWN: 'bg-slate-800 border-slate-600 text-slate-300'
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-3xl">🛡</span>
              <span className="text-2xl font-bold text-white">BobSec</span>
            </div>
            <p className="text-slate-400 text-sm">Welcome back, {user?.name}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onViewAccount}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 rounded-lg text-sm transition-colors"
            >
              👤 Account
            </button>
            <button
              onClick={logout}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 rounded-lg text-sm transition-colors"
            >
              🚪 Logout
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl">
              <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Total Analyses</p>
              <p className="text-white text-3xl font-bold">{stats.totalAnalyses}</p>
            </div>
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl">
              <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">High Risk Detected</p>
              <p className="text-red-400 text-3xl font-bold">{stats.highRiskCount}</p>
            </div>
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl">
              <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Safe Messages</p>
              <p className="text-emerald-400 text-3xl font-bold">{stats.safeCount}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <button
            onClick={onStartAnalysis}
            className="py-5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors text-lg flex items-center justify-center gap-2"
          >
            <span className="text-2xl">🔍</span>
            <span>Analyse New Message</span>
          </button>
          <button
            onClick={onViewHistory}
            className="py-5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-semibold rounded-xl transition-colors text-lg flex items-center justify-center gap-2"
          >
            <span className="text-2xl">📚</span>
            <span>View History</span>
          </button>
        </div>

        {/* Recent Analyses */}
        <div>
          <h2 className="text-white text-xl font-bold mb-4">Recent Analyses</h2>
          
          {loading ? (
            <div className="text-center py-12">
              <p className="text-slate-400">Loading...</p>
            </div>
          ) : recentAnalyses.length === 0 ? (
            <div className="p-8 bg-slate-900 border border-slate-800 rounded-xl text-center">
              <p className="text-slate-400 text-sm">No analyses yet. Start by analysing a suspicious message above.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentAnalyses.map((analysis, i) => (
                <div key={i} className="p-4 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded-md text-xs font-medium border ${RISK_COLORS[analysis.risk_level]}`}>
                          {analysis.risk_level}
                        </span>
                        <span className="text-slate-500 text-xs">{analysis.category?.replace(/_/g, ' ')}</span>
                      </div>
                      <p className="text-slate-300 text-sm mb-1 truncate">{analysis.explanation_en}</p>
                      <p className="text-slate-600 text-xs">{new Date(analysis.timestamp).toLocaleString()}</p>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="text-2xl font-bold text-white">{analysis.risk_score}</div>
                      <p className="text-slate-500 text-xs text-center">/ 100</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 p-4 bg-slate-900 border border-slate-800 rounded-xl text-center">
          <p className="text-slate-500 text-xs">
            🔒 All your analyses are stored securely and only accessible to you.
          </p>
        </div>
      </div>
    </div>
  )
}

// Made with Bob
