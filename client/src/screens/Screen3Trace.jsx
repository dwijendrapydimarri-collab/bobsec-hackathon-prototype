import { useEffect, useState } from 'react'
import { useAnalysis } from '../context/AnalysisContext'

const AGENT_ICONS = {
  'ScamAgent': '🤖',
  'ExplainerAgent': '💬',
  'PolicyCheck': '🔒',
}

function getAgentIcon(agentName) {
  for (const [key, icon] of Object.entries(AGENT_ICONS)) {
    if (agentName.includes(key)) return icon
  }
  if (agentName.includes('check_url')) return '🔗'
  if (agentName.includes('check_phone')) return '📞'
  if (agentName.includes('check_upi')) return '💳'
  if (agentName.includes('Tool')) return '🔧'
  return '⚙️'
}

function TraceCard({ step, index, visible }) {
  const isPolicy = step.agent.includes('PolicyCheck')
  const passed = step.policy_passed

  return (
    <div className={`transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className={`p-4 rounded-xl border ${isPolicy ? 'bg-emerald-950 border-emerald-700' : 'bg-slate-900 border-slate-700'}`}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-sm font-bold text-slate-300 border border-slate-600">
            {step.step}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-base">{getAgentIcon(step.agent)}</span>
              <span className="font-semibold text-white text-sm">{step.agent}</span>
              <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">{step.model}</span>
            </div>
            <p className="text-slate-400 text-xs mb-2">{step.action}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs px-2 py-1 rounded-md font-medium ${passed ? 'bg-emerald-900 text-emerald-300' : 'bg-red-900 text-red-300'}`}>
                {passed ? '✓ PASS' : '✗ FAIL'}
              </span>
              <span className="text-xs text-slate-300">{step.result}</span>
              <span className="text-xs text-slate-600 ml-auto">{step.time_ms}ms</span>
            </div>
            {isPolicy && step.checks && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {Object.entries(step.checks).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-1.5 text-xs">
                    <span className={val ? 'text-emerald-400' : 'text-red-400'}>{val ? '✓' : '✗'}</span>
                    <span className="text-slate-400 capitalize">{key.replace(/_/g, ' ')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {index < 99 && <div className="w-px h-4 bg-slate-700 mx-auto" />}
    </div>
  )
}

export default function Screen3Trace({ onBack, onEvidence, onLabs }) {
  const { analysis, lang } = useAnalysis()
  const hi = lang === 'hi'
  const [visibleCount, setVisibleCount] = useState(0)
  const [showRawJSON, setShowRawJSON] = useState(false)

  useEffect(() => {
    if (!analysis?.trace) return
    const timers = analysis.trace.map((_, i) =>
      setTimeout(() => setVisibleCount(i + 1), i * 300)
    )
    return () => timers.forEach(clearTimeout)
  }, [analysis])

  if (!analysis) return null

  const totalMs = analysis.trace?.reduce((acc, t) => acc + t.time_ms, 0) || 0

  return (
    <div className="min-h-screen px-4 py-8 max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-slate-400 hover:text-white text-sm transition-colors">← {hi ? 'वापस' : 'Back'}</button>
          <span className="text-slate-600">|</span>
          <span className="text-slate-300 text-sm font-medium">🤖 IBM Bob — Orchestration Trace</span>
        </div>
        {onLabs && (
          <button
            onClick={onLabs}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
          >
            <span>🧪</span>
            <span>{hi ? 'Labs' : 'Labs'}</span>
          </button>
        )}
      </div>

      {/* Summary */}
      <div className="p-4 bg-slate-900 border border-slate-700 rounded-xl mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-slate-300 text-sm">
            IBM Bob {hi ? 'ने आपका input' : 'received your input at'} <span className="text-white font-mono text-xs">{analysis.timestamp_ist}</span>
          </p>
          <span className="px-2 py-1 bg-blue-900 border border-blue-700 text-blue-300 text-xs rounded-md font-semibold flex items-center gap-1">
            <span>⚡</span>
            <span>Powered by IBM Bob</span>
          </span>
        </div>
        <p className="text-slate-400 text-xs mt-1">
          {hi ? 'कुल विश्लेषण समय' : 'Total analysis time'}: <span className="text-white">{(totalMs / 1000).toFixed(1)}s</span>
          {' · '}{analysis.trace?.length || 0} {hi ? 'steps' : 'steps'} executed
        </p>
      </div>

      {/* Animated Pipeline Visualization */}
      <div className="mb-6 p-5 bg-gradient-to-r from-blue-950 to-slate-900 border border-blue-800 rounded-xl">
        <p className="text-blue-300 text-xs font-semibold mb-4">
          {hi ? '🔄 Bob Orchestration Pipeline' : '🔄 Bob Orchestration Pipeline'}
        </p>
        <div className="flex items-center justify-between gap-2 relative">
          {/* Pipeline stages */}
          {['Input', 'ScamAgent', 'Tools', 'Explainer', 'Policy', 'Output'].map((stage, i) => (
            <div key={i} className="flex flex-col items-center flex-1 relative">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all duration-500 ${
                i < visibleCount ? 'bg-blue-600 scale-110' : 'bg-slate-800'
              } ${i === visibleCount - 1 ? 'animate-pulse' : ''}`}>
                {i === 0 ? '📥' : i === 1 ? '🤖' : i === 2 ? '🔧' : i === 3 ? '💬' : i === 4 ? '🔒' : '📤'}
              </div>
              <span className={`text-xs mt-1 transition-colors ${i < visibleCount ? 'text-blue-300' : 'text-slate-600'}`}>
                {stage}
              </span>
              {i < 5 && (
                <div className="absolute top-5 left-1/2 w-full h-0.5 bg-slate-700">
                  <div
                    className={`h-full bg-blue-500 transition-all duration-500 ${i < visibleCount - 1 ? 'w-full' : 'w-0'}`}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
        <p className="text-blue-400 text-xs mt-4 text-center italic">
          {hi ? '✨ हर step IBM Bob द्वारा orchestrate किया गया' : '✨ Every step orchestrated by IBM Bob'}
        </p>
      </div>

      {/* Trace cards */}
      <div className="space-y-0 mb-8">
        {analysis.trace?.map((step, i) => (
          <TraceCard key={i} step={step} index={i} visible={i < visibleCount} />
        ))}
      </div>

      {/* IBM Bob explanation */}
      <div className="p-4 bg-blue-950 border border-blue-800 rounded-xl mb-6">
        <p className="text-blue-300 text-xs font-medium mb-1">About IBM Bob Orchestration</p>
        <p className="text-blue-200 text-xs leading-relaxed">
          IBM Bob routes each task to the right agent automatically — ScamAgent for classification, tool agents for real-time intelligence lookups, ExplainerAgent for plain-language output, and PolicyCheck as the final governance gate. No step is skipped. Every action is logged.
        </p>
      </div>

      {/* Raw JSON toggle */}
      <div className="mb-6">
        <button
          onClick={() => setShowRawJSON(!showRawJSON)}
          className="text-slate-500 hover:text-slate-300 text-xs underline transition-colors"
        >
          {showRawJSON ? (hi ? '🔽 Raw JSON छुपाएं' : '🔽 Hide raw JSON') : (hi ? '🔼 Raw JSON दिखाएं' : '🔼 Show raw JSON')}
        </button>
        
        {showRawJSON && (
          <div className="mt-3 p-4 bg-slate-950 border border-slate-700 rounded-xl overflow-auto max-h-96">
            <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap break-words">
              {JSON.stringify(analysis, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* CTA buttons */}
      <div className="space-y-3">
        <button
          onClick={onEvidence}
          className="w-full py-4 bg-blue-700 hover:bg-blue-600 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          📦 {hi ? 'Evidence Package बनाएं' : 'Build Evidence Package'}
        </button>
        
        {onLabs && (
          <button
            onClick={onLabs}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
          >
            <span>🧪</span>
            <span>{hi ? 'Bob Labs देखें — Suggested Rules' : 'View Bob Labs — Suggested Rules'}</span>
          </button>
        )}
      </div>
    </div>
  )
}

// Made with Bob
