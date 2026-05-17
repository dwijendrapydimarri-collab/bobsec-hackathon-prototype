import { useState, useEffect } from 'react'
import { useHistory } from '../hooks/useHistory'
import { useAnalysis } from '../context/AnalysisContext'

const RISK_COLORS = {
  HIGH: 'bg-red-900 border-red-700 text-red-200',
  MEDIUM: 'bg-amber-900 border-amber-700 text-amber-200',
  LOW: 'bg-blue-900 border-blue-700 text-blue-200',
  SAFE: 'bg-emerald-900 border-emerald-700 text-emerald-200',
  UNKNOWN: 'bg-slate-800 border-slate-600 text-slate-300'
}

const RISK_ICONS = {
  HIGH: '⚠️',
  MEDIUM: '⚡',
  LOW: 'ℹ️',
  SAFE: '✓',
  UNKNOWN: '❓'
}

const CATEGORY_LABELS = {
  FINANCIAL_FRAUD: 'Financial Fraud',
  PHISHING: 'Phishing',
  JOB_SCAM: 'Job Scam',
  LOTTERY_SCAM: 'Lottery Scam',
  IMPERSONATION: 'Impersonation',
  INVESTMENT_SCAM: 'Investment Scam',
  UNKNOWN: 'Unknown'
}

function HistoryCard({ analysis, onClick, onExport }) {
  const date = new Date(analysis.timestamp)
  const formattedDate = date.toLocaleDateString('en-IN', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
  })
  const formattedTime = date.toLocaleTimeString('en-IN', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })

  return (
    <div 
      onClick={onClick}
      className="p-4 bg-slate-900 border border-slate-700 rounded-xl hover:border-slate-500 transition-all cursor-pointer group"
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-1 rounded-md text-xs font-bold border ${RISK_COLORS[analysis.risk_level]}`}>
              {RISK_ICONS[analysis.risk_level]} {analysis.risk_level}
            </span>
            <span className="text-slate-400 text-xs">
              {analysis.risk_score}/100
            </span>
          </div>
          <p className="text-slate-300 text-sm font-medium truncate">
            {CATEGORY_LABELS[analysis.category] || analysis.category}
          </p>
          {analysis.sub_type && (
            <p className="text-slate-500 text-xs mt-0.5">{analysis.sub_type}</p>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-slate-400 text-xs">{formattedDate}</p>
          <p className="text-slate-500 text-xs">{formattedTime}</p>
        </div>
      </div>

      {/* Entities preview */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {analysis.entities?.phone_numbers?.slice(0, 2).map((p, i) => (
          <span key={i} className="px-2 py-0.5 bg-slate-800 text-slate-400 text-xs rounded font-mono">
            📞 {p.value}
          </span>
        ))}
        {analysis.entities?.urls?.slice(0, 2).map((u, i) => (
          <span key={i} className="px-2 py-0.5 bg-slate-800 text-slate-400 text-xs rounded font-mono truncate max-w-32">
            🔗 {u.value}
          </span>
        ))}
        {analysis.entities?.upi_ids?.slice(0, 1).map((u, i) => (
          <span key={i} className="px-2 py-0.5 bg-slate-800 text-slate-400 text-xs rounded font-mono">
            💳 {u.value}
          </span>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-800">
        <span className="text-slate-600 text-xs font-mono">
          ID: {analysis.analysis_id}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onExport(analysis)
          }}
          className="text-blue-400 hover:text-blue-300 text-xs transition-colors"
        >
          Export →
        </button>
      </div>
    </div>
  )
}

function FilterBar({ filters, onFilterChange, onClearFilters, onSearch }) {
  const [searchQuery, setSearchQuery] = useState('')

  function handleSearch(e) {
    e.preventDefault()
    onSearch(searchQuery)
  }

  return (
    <div className="space-y-3 mb-6">
      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by phone, URL, or UPI ID..."
          className="flex-1 px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
        />
        <button
          type="submit"
          disabled={searchQuery.length < 3}
          className="px-4 py-2 bg-blue-700 hover:bg-blue-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
        >
          🔍 Search
        </button>
      </form>

      {/* Filter controls */}
      <div className="flex flex-wrap gap-2">
        <select
          value={filters.riskLevel || ''}
          onChange={(e) => onFilterChange({ riskLevel: e.target.value || null })}
          className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-300 text-sm focus:outline-none focus:border-blue-500 transition-colors"
        >
          <option value="">All Risk Levels</option>
          <option value="HIGH">High Risk</option>
          <option value="MEDIUM">Medium Risk</option>
          <option value="LOW">Low Risk</option>
          <option value="SAFE">Safe</option>
          <option value="UNKNOWN">Unknown</option>
        </select>

        <select
          value={filters.category || ''}
          onChange={(e) => onFilterChange({ category: e.target.value || null })}
          className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-300 text-sm focus:outline-none focus:border-blue-500 transition-colors"
        >
          <option value="">All Categories</option>
          <option value="FINANCIAL_FRAUD">Financial Fraud</option>
          <option value="PHISHING">Phishing</option>
          <option value="JOB_SCAM">Job Scam</option>
          <option value="LOTTERY_SCAM">Lottery Scam</option>
          <option value="IMPERSONATION">Impersonation</option>
          <option value="INVESTMENT_SCAM">Investment Scam</option>
        </select>

        <input
          type="date"
          value={filters.startDate || ''}
          onChange={(e) => onFilterChange({ startDate: e.target.value || null })}
          className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-300 text-sm focus:outline-none focus:border-blue-500 transition-colors"
        />

        <input
          type="date"
          value={filters.endDate || ''}
          onChange={(e) => onFilterChange({ endDate: e.target.value || null })}
          className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-300 text-sm focus:outline-none focus:border-blue-500 transition-colors"
        />

        {(filters.riskLevel || filters.category || filters.startDate || filters.endDate || filters.search) && (
          <button
            onClick={onClearFilters}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 rounded-lg text-sm transition-colors"
          >
            ✕ Clear Filters
          </button>
        )}
      </div>
    </div>
  )
}

function Pagination({ pagination, onPageChange }) {
  const { page, totalPages, hasNext, hasPrev } = pagination

  return (
    <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-800">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={!hasPrev}
        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:cursor-not-allowed border border-slate-700 text-slate-300 rounded-lg text-sm transition-colors"
      >
        ← Previous
      </button>

      <div className="flex items-center gap-2">
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let pageNum
          if (totalPages <= 5) {
            pageNum = i + 1
          } else if (page <= 3) {
            pageNum = i + 1
          } else if (page >= totalPages - 2) {
            pageNum = totalPages - 4 + i
          } else {
            pageNum = page - 2 + i
          }

          return (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                page === pageNum
                  ? 'bg-blue-700 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              {pageNum}
            </button>
          )
        })}
      </div>

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={!hasNext}
        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:cursor-not-allowed border border-slate-700 text-slate-300 rounded-lg text-sm transition-colors"
      >
        Next →
      </button>
    </div>
  )
}

export default function HistoryScreen({ onBack, onViewAnalysis }) {
  const { lang } = useAnalysis()
  const {
    history,
    pagination,
    filters,
    loading,
    error,
    fetchHistory,
    updateFilters,
    clearFilters,
    goToPage
  } = useHistory()

  const [selectedAnalysis, setSelectedAnalysis] = useState(null)

  const hi = lang === 'hi'

  // Fetch history on mount
  useEffect(() => {
    fetchHistory(1)
  }, [])

  // Refetch when filters change
  useEffect(() => {
    if (filters.riskLevel || filters.category || filters.startDate || filters.endDate || filters.search) {
      fetchHistory(1)
    }
  }, [filters])

  function handleSearch(query) {
    updateFilters({ search: query })
  }

  function handleExport(analysis) {
    const dataStr = JSON.stringify(analysis, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `bobsec_${analysis.analysis_id}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  function handleExportAll() {
    const dataStr = JSON.stringify(history, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `bobsec_history_${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen px-4 py-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-slate-400 hover:text-white text-sm transition-colors">
            ← {hi ? 'वापस' : 'Back'}
          </button>
          <span className="text-slate-600">|</span>
          <span className="text-slate-300 text-sm font-medium">
            📚 {hi ? 'Analysis History' : 'Analysis History'}
          </span>
        </div>
        {history.length > 0 && (
          <button
            onClick={handleExportAll}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 rounded-lg text-xs transition-colors"
          >
            ⬇ Export All
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="p-3 bg-slate-900 border border-slate-700 rounded-xl">
          <p className="text-slate-500 text-xs mb-1">Total Analyses</p>
          <p className="text-white text-2xl font-bold">{pagination.total}</p>
        </div>
        <div className="p-3 bg-slate-900 border border-slate-700 rounded-xl">
          <p className="text-slate-500 text-xs mb-1">Current Page</p>
          <p className="text-white text-2xl font-bold">{pagination.page} / {pagination.totalPages}</p>
        </div>
        <div className="p-3 bg-slate-900 border border-slate-700 rounded-xl">
          <p className="text-slate-500 text-xs mb-1">Showing</p>
          <p className="text-white text-2xl font-bold">{history.length}</p>
        </div>
      </div>

      {/* Filters */}
      <FilterBar
        filters={filters}
        onFilterChange={updateFilters}
        onClearFilters={clearFilters}
        onSearch={handleSearch}
      />

      {/* Loading state */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin mb-3"></div>
          <p className="text-slate-400 text-sm">{hi ? 'Loading...' : 'Loading...'}</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-950 border border-red-800 rounded-xl text-center">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && history.length === 0 && (
        <div className="text-center py-12">
          <span className="text-6xl mb-4 block">📭</span>
          <p className="text-slate-400 text-sm mb-2">
            {hi ? 'कोई analysis नहीं मिला' : 'No analyses found'}
          </p>
          <p className="text-slate-600 text-xs">
            {hi ? 'अपना पहला analysis शुरू करें' : 'Start your first analysis to see it here'}
          </p>
        </div>
      )}

      {/* History list */}
      {!loading && !error && history.length > 0 && (
        <>
          <div className="grid gap-3 mb-6">
            {history.map((analysis) => (
              <HistoryCard
                key={analysis.id}
                analysis={analysis}
                onClick={() => onViewAnalysis(analysis)}
                onExport={handleExport}
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <Pagination pagination={pagination} onPageChange={goToPage} />
          )}
        </>
      )}
    </div>
  )
}

// Made with Bob
