import { useState } from 'react'
import { useAnalysis } from '../context/AnalysisContext'
import { generateEvidencePDF } from '../utils/pdfBuilder'
import { buildNCRPReport } from '../utils/reportBuilder'
import { generateReportPDF } from '../utils/pdfBuilder'

const RISK_CONFIG = {
  HIGH:    { bg: 'bg-red-950',    border: 'border-red-700',    badge: 'bg-red-600',    icon: '⚠',  label: 'HIGH RISK' },
  MEDIUM:  { bg: 'bg-amber-950',  border: 'border-amber-700',  badge: 'bg-amber-600',  icon: '⚡',  label: 'MEDIUM RISK' },
  LOW:     { bg: 'bg-blue-950',   border: 'border-blue-700',   badge: 'bg-blue-600',   icon: 'ℹ',  label: 'LOW RISK' },
  SAFE:    { bg: 'bg-emerald-950',border: 'border-emerald-700',badge: 'bg-emerald-600',icon: '✓',  label: 'SAFE' },
  UNKNOWN: { bg: 'bg-slate-900',  border: 'border-slate-600',  badge: 'bg-slate-600',  icon: '❓', label: 'UNKNOWN' }
}

const CATEGORY_LABELS = {
  FINANCIAL_FRAUD: 'Financial Fraud',
  PHISHING: 'Phishing / Credential Theft',
  JOB_SCAM: 'Job Scam',
  LOTTERY_SCAM: 'Lottery / Prize Scam',
  IMPERSONATION: 'Impersonation',
  INVESTMENT_SCAM: 'Investment Scam',
  UNKNOWN: 'Unknown'
}

function EntityPill({ label, value, verdict, detail }) {
  const colours = {
    FLAGGED: 'bg-red-900 border-red-700 text-red-200',
    MALICIOUS: 'bg-red-900 border-red-700 text-red-200',
    CLEAN: 'bg-emerald-900 border-emerald-700 text-emerald-200',
    UNKNOWN: 'bg-slate-800 border-slate-600 text-slate-300'
  }
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${colours[verdict] || colours.UNKNOWN}`}>
      <span className="font-medium">{label}</span>
      <span className="font-mono truncate max-w-40">{value}</span>
      {detail && <span className="opacity-75">· {detail}</span>}
    </div>
  )
}

export default function HistoryDetailScreen({ analysis, onBack }) {
  const { lang } = useAnalysis()
  const [activeTab, setActiveTab] = useState('overview') // 'overview' | 'trace' | 'export'
  const [copied, setCopied] = useState(false)

  const hi = lang === 'hi'
  const cfg = RISK_CONFIG[analysis.risk_level] || RISK_CONFIG.UNKNOWN

  const date = new Date(analysis.timestamp)
  const formattedDate = date.toLocaleDateString('en-IN', { 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  async function handleCopyJSON() {
    await navigator.clipboard.writeText(JSON.stringify(analysis, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDownloadEvidence() {
    generateEvidencePDF(analysis)
  }

  function handleDownloadReport() {
    const reportText = buildNCRPReport(analysis)
    generateReportPDF(analysis, reportText)
  }

  return (
    <div className="min-h-screen px-4 py-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-slate-400 hover:text-white text-sm transition-colors">
          ← {hi ? 'वापस' : 'Back to History'}
        </button>
        <span className="text-slate-600">|</span>
        <span className="text-slate-300 text-sm font-medium">Analysis Details</span>
      </div>

      {/* Risk verdict card */}
      <div className={`p-5 rounded-2xl border ${cfg.bg} ${cfg.border} mb-6`}>
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{cfg.icon}</span>
              <span className="font-bold text-white text-lg">{cfg.label}</span>
            </div>
            <p className="text-slate-300 text-sm">
              {CATEGORY_LABELS[analysis.category] || analysis.category}
              {analysis.sub_type && ` · ${analysis.sub_type}`}
            </p>
          </div>
          <div className={`${cfg.badge} text-white font-bold text-lg px-3 py-1 rounded-lg flex-shrink-0`}>
            {analysis.risk_score}/100
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-800">
          <div>
            <p className="text-slate-500 text-xs mb-1">Analysis ID</p>
            <p className="text-white text-sm font-mono">{analysis.analysis_id}</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs mb-1">Confidence</p>
            <p className="text-white text-sm font-bold">{analysis.confidence}%</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs mb-1">Timestamp</p>
            <p className="text-white text-sm">{formattedDate}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-800">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'overview'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('trace')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'trace'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          Agent Trace
        </button>
        <button
          onClick={() => setActiveTab('export')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'export'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          Export
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Explanation */}
          <div className="p-4 bg-slate-900 rounded-xl border border-slate-800">
            <p className="text-xs text-slate-400 mb-2 font-medium uppercase tracking-wide">
              Why this is suspicious
            </p>
            <p className="text-slate-200 text-sm leading-relaxed mb-3">{analysis.explanation_en}</p>
            <p className="text-slate-300 text-sm leading-relaxed">{analysis.explanation_hi}</p>
          </div>

          {/* Red flags */}
          {analysis.red_flags?.length > 0 && (
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wide mb-3 font-medium">
                Red Flags Detected ({analysis.red_flags.length})
              </p>
              <div className="space-y-2">
                {analysis.red_flags.map((flag, i) => (
                  <div key={i} className="flex gap-3 p-3 bg-red-950 border border-red-900 rounded-lg">
                    <span className="text-red-400 flex-shrink-0">🚩</span>
                    <span className="text-red-200 text-sm">{flag}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Entities */}
          {(analysis.entities?.phone_numbers?.length > 0 || 
            analysis.entities?.urls?.length > 0 || 
            analysis.entities?.upi_ids?.length > 0 || 
            analysis.entities?.impersonated_org) && (
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wide mb-3 font-medium">
                Extracted Entities
              </p>
              <div className="flex flex-wrap gap-2">
                {analysis.entities.phone_numbers?.map((p, i) => (
                  <EntityPill 
                    key={`p${i}`} 
                    label="📞" 
                    value={p.value} 
                    verdict={p.verdict} 
                    detail={p.report_count ? `${p.report_count} reports` : null} 
                  />
                ))}
                {analysis.entities.urls?.map((u, i) => (
                  <EntityPill 
                    key={`u${i}`} 
                    label="🔗" 
                    value={u.value} 
                    verdict={u.verdict} 
                    detail={u.feed_hits ? `${u.feed_hits} feeds` : null} 
                  />
                ))}
                {analysis.entities.upi_ids?.map((u, i) => (
                  <EntityPill 
                    key={`upi${i}`} 
                    label="💳" 
                    value={u.value} 
                    verdict={u.verdict} 
                    detail={u.report_count ? `${u.report_count} reports` : null} 
                  />
                ))}
                {analysis.entities.impersonated_org && (
                  <EntityPill 
                    label="🏛" 
                    value={analysis.entities.impersonated_org} 
                    verdict="FLAGGED" 
                    detail="impersonated" 
                  />
                )}
              </div>
            </div>
          )}

          {/* User action */}
          <div className="p-4 bg-slate-900 border border-slate-700 rounded-xl">
            <p className="text-slate-400 text-xs uppercase tracking-wide mb-2 font-medium">
              Recommended Action
            </p>
            <p className="text-white text-sm font-medium mb-2">{analysis.user_action}</p>
            <p className="text-slate-400 text-sm">{analysis.user_action_hi}</p>
          </div>
        </div>
      )}

      {/* Trace Tab */}
      {activeTab === 'trace' && (
        <div className="space-y-3">
          {analysis.trace?.map((step, i) => (
            <div key={i}>
              <div className="p-4 rounded-xl border bg-slate-900 border-slate-700">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-sm font-bold text-slate-300 border border-slate-600">
                    {step.step}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold text-white text-sm">{step.agent}</span>
                      <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">{step.model}</span>
                    </div>
                    <p className="text-slate-400 text-xs mb-2">{step.action}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-1 rounded-md font-medium ${
                        step.policy_passed 
                          ? 'bg-emerald-900 text-emerald-300' 
                          : 'bg-red-900 text-red-300'
                      }`}>
                        {step.policy_passed ? '✓ PASS' : '✗ FAIL'}
                      </span>
                      <span className="text-xs text-slate-300">{step.result}</span>
                      <span className="text-xs text-slate-600 ml-auto">{step.time_ms}ms</span>
                    </div>
                  </div>
                </div>
              </div>
              {i < analysis.trace.length - 1 && (
                <div className="w-px h-4 bg-slate-700 mx-auto" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Export Tab */}
      {activeTab === 'export' && (
        <div className="space-y-4">
          <div className="p-5 bg-slate-900 border border-slate-700 rounded-xl">
            <h3 className="text-white font-semibold mb-2">Evidence Package</h3>
            <p className="text-slate-400 text-sm mb-4">
              Download a formatted PDF evidence certificate for law enforcement submission.
            </p>
            <button
              onClick={handleDownloadEvidence}
              className="w-full py-3 bg-blue-700 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              ⬇ Download Evidence PDF
            </button>
          </div>

          <div className="p-5 bg-slate-900 border border-slate-700 rounded-xl">
            <h3 className="text-white font-semibold mb-2">Police Report</h3>
            <p className="text-slate-400 text-sm mb-4">
              Download a pre-filled NCRP-format police complaint ready for submission.
            </p>
            <button
              onClick={handleDownloadReport}
              className="w-full py-3 bg-blue-700 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              ⬇ Download Police Report PDF
            </button>
          </div>

          <div className="p-5 bg-slate-900 border border-slate-700 rounded-xl">
            <h3 className="text-white font-semibold mb-2">Raw JSON Data</h3>
            <p className="text-slate-400 text-sm mb-4">
              Copy or download the complete analysis data in JSON format.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleCopyJSON}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 rounded-lg text-sm font-medium transition-colors"
              >
                {copied ? '✓ Copied!' : '📋 Copy JSON'}
              </button>
              <button
                onClick={() => {
                  const dataStr = JSON.stringify(analysis, null, 2)
                  const dataBlob = new Blob([dataStr], { type: 'application/json' })
                  const url = URL.createObjectURL(dataBlob)
                  const link = document.createElement('a')
                  link.href = url
                  link.download = `bobsec_${analysis.analysis_id}.json`
                  link.click()
                  URL.revokeObjectURL(url)
                }}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 rounded-lg text-sm font-medium transition-colors"
              >
                ⬇ Download JSON
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Made with Bob
