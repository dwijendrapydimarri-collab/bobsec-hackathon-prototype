import { useState } from 'react'
import { useAnalysis } from '../context/AnalysisContext'
import { buildNCRPReport } from '../utils/reportBuilder'
import { generateReportPDF } from '../utils/pdfBuilder'

export default function Screen5Report({ onBack }) {
  const { analysis, lang, showToast } = useAnalysis()
  const hi = lang === 'hi'
  const [copied, setCopied] = useState(false)

  if (!analysis) return null

  const reportText = buildNCRPReport(analysis)

  async function handleCopy() {
    await navigator.clipboard.writeText(reportText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
    showToast(
      hi ? 'रिपोर्ट कॉपी हो गई। इसे cybercrime.gov.in पर पेस्ट करें।' : 'Report copied. Paste it on cybercrime.gov.in.',
      'success',
      4000
    )
  }

  function handleDownloadPDF() {
    generateReportPDF(analysis, reportText)
    showToast(
      hi ? 'Police report PDF तैयार है।' : 'Police report PDF ready.',
      'success'
    )
  }

  return (
    <div className="min-h-screen px-4 py-8 max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-slate-400 hover:text-white text-sm transition-colors">← {hi ? 'वापस' : 'Back'}</button>
        <span className="text-slate-600">|</span>
        <span className="text-slate-300 text-sm font-medium">📄 {hi ? 'Police Report — आपकी समीक्षा के लिए' : 'Police Report — Ready for Your Review'}</span>
      </div>

      {/* Ready badge */}
      <div className="flex items-center gap-2 mb-5 p-3 bg-emerald-950 border border-emerald-800 rounded-xl">
        <span className="text-emerald-400 text-lg">✓</span>
        <div>
          <p className="text-emerald-300 text-sm font-medium">{hi ? 'Report तैयार है' : 'Report Ready'}</p>
          <p className="text-emerald-500 text-xs">{hi ? 'Copy करें, review करें, फिर cybercrime.gov.in पर submit करें।' : 'Copy, review, then submit on cybercrime.gov.in'}</p>
        </div>
      </div>

      {/* Report content — editable textarea */}
      <div className="mb-5">
        <label className="block text-slate-400 text-xs uppercase tracking-wide mb-2 font-medium">
          {hi ? 'NCRP Complaint — आप इसे edit कर सकते हैं' : 'NCRP Complaint — You can edit this before copying'}
        </label>
        <textarea
          defaultValue={reportText}
          className="w-full h-80 bg-slate-950 border border-slate-700 rounded-xl p-4 text-slate-300 text-xs font-mono leading-relaxed resize-none focus:outline-none focus:border-blue-600 transition-colors"
        />
      </div>

      {/* Disclaimer */}
      <div className="mb-4 p-3 bg-amber-950 border border-amber-800 rounded-lg">
        <p className="text-amber-200 text-xs leading-relaxed">
          {hi
            ? '⚠️ यह ड्राफ्ट आपकी शिकायत साफ़ तरह से लिखने में मदद के लिए है। पुलिस या cyber cell आपसे और जानकारी माँग सकते हैं।'
            : '⚠️ This draft is to help you explain your case clearly. The police or cyber cell may still ask for more details.'}
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={handleCopy}
          className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 rounded-xl text-sm font-medium transition-colors"
        >
          {copied ? '✓ Copied!' : `📋 ${hi ? 'Report Copy करें' : 'Copy Report'}`}
        </button>
        <button
          onClick={handleDownloadPDF}
          className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 rounded-xl text-sm font-medium transition-colors"
        >
          ⬇ {hi ? 'PDF Download करें' : 'Download PDF'}
        </button>
      </div>

      {/* Submission instructions */}
      <div className="p-5 bg-slate-900 border border-slate-700 rounded-2xl mb-5">
        <p className="text-slate-300 text-sm font-semibold mb-4">
          {hi ? 'यह Report कैसे Submit करें' : 'How to Submit This Report'}
        </p>
        <ol className="space-y-3">
          {[
            ['cybercrime.gov.in', hi ? 'पर जाएं' : 'Go to cybercrime.gov.in'],
            ['"Report Cyber Crime"', hi ? 'पर click करें' : 'Click "Report Cyber Crime"'],
            [hi ? 'सही category' : 'Your incident type', hi ? 'select करें' : 'Select the matching incident type'],
            [hi ? 'Description में' : 'In the description field', hi ? 'यह report paste करें' : 'Paste this report'],
            [hi ? 'Evidence PDF' : 'Evidence Package PDF', hi ? 'attachment के रूप में upload करें' : 'Upload as an attachment']
          ].map(([bold, rest], i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-900 border border-blue-700 text-blue-300 text-xs font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <span className="text-slate-300">
                <span className="text-white font-medium">{bold}</span>{' '}{rest}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {/* Helpline */}
      <div className="p-5 bg-red-950 border border-red-800 rounded-2xl text-center">
        <p className="text-red-300 text-sm font-bold mb-1">🆘 {hi ? 'राष्ट्रीय साइबर अपराध हेल्पलाइन' : 'National Cyber Crime Helpline'}</p>
        <p className="text-white text-3xl font-bold tracking-widest">1930</p>
        <p className="text-red-400 text-xs mt-1">{hi ? '24/7, निःशुल्क' : '24/7, free — call right now if you need help'}</p>
      </div>

      {/* Disclaimer */}
      <p className="text-center text-slate-600 text-xs mt-5 leading-relaxed">
        {hi
          ? 'BobSec यह report आपकी तरफ से submit नहीं करता। Submission पूरी तरह आपकी ज़िम्मेदारी है।'
          : 'BobSec does not submit this report on your behalf. Submission is entirely your decision and responsibility.'}
      </p>
    </div>
  )
}

// Made with Bob
