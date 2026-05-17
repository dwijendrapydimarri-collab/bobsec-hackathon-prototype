import { useState } from 'react'
import { useAnalysis } from '../context/AnalysisContext'

const RISK_CONFIG = {
  HIGH:    { bg: 'bg-red-950',    border: 'border-red-700',    badge: 'bg-red-600',    icon: '⚠',  labelEn: 'High risk scam',    labelHi: 'बहुत ज़्यादा जोखिम' },
  MEDIUM:  { bg: 'bg-amber-950',  border: 'border-amber-700',  badge: 'bg-amber-600',  icon: '⚡',  labelEn: 'Suspicious',      labelHi: 'संदिग्ध' },
  LOW:     { bg: 'bg-blue-950',   border: 'border-blue-700',   badge: 'bg-blue-600',   icon: 'ℹ',  labelEn: 'Low risk',      labelHi: 'कम जोखिम' },
  SAFE:    { bg: 'bg-emerald-950',border: 'border-emerald-700',badge: 'bg-emerald-600',icon: '✓',  labelEn: 'Looks safe based on what I can check',       labelHi: 'जितना मैं चेक कर सकता हूँ उतना सुरक्षित लगता है' },
  UNKNOWN: { bg: 'bg-slate-900',  border: 'border-slate-600',  badge: 'bg-slate-600',  icon: '❓', labelEn: 'Uncertain',    labelHi: 'अनिश्चित' }
}

const CATEGORY_LABELS_HI = {
  FINANCIAL_FRAUD: 'वित्तीय धोखाधड़ी',
  PHISHING: 'फ़िशिंग',
  JOB_SCAM: 'Job Scam',
  LOTTERY_SCAM: 'Lottery Scam',
  IMPERSONATION: 'सरकारी / बैंक नाटक',
  INVESTMENT_SCAM: 'निवेश घोटाला',
  UNKNOWN: 'अज्ञात'
}

function EntityPill({ label, value, verdict, detail }) {
  const colours = {
    FLAGGED: 'bg-red-900 border-red-700 text-red-200',
    MALICIOUS: 'bg-red-900 border-red-700 text-red-200',
    CLEAN: 'bg-emerald-900 border-emerald-700 text-emerald-200',
    UNKNOWN: 'bg-slate-800 border-slate-600 text-slate-300',
    SUSPICIOUS: 'bg-amber-900 border-amber-700 text-amber-200'
  }
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${colours[verdict] || colours.UNKNOWN}`}>
      <span className="font-medium">{label}</span>
      <span className="font-mono truncate max-w-32">{value}</span>
      <span className="opacity-75 flex-shrink-0">· {verdict}{detail ? ` (${detail})` : ''}</span>
    </div>
  )
}

function EmergencyModal({ onClose, hi }) {
  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="bg-red-950 border-2 border-red-700 rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
        <h3 className="text-red-300 font-bold text-lg mb-4 flex items-center gap-2">
          <span className="text-2xl">🆘</span>
          {hi ? 'तुरंत मदद लें' : 'Get Urgent Help'}
        </h3>
        
        <div className="space-y-4 text-sm">
          <div className="p-4 bg-red-900 border border-red-800 rounded-lg">
            <p className="text-red-200 font-bold mb-2">
              {hi ? '📞 अभी call करें:' : '📞 Call right now:'}
            </p>
            <p className="text-white text-2xl font-bold">1930</p>
            <p className="text-red-300 text-xs mt-1">
              {hi ? 'National Cyber Crime Helpline (24/7, निःशुल्क)' : 'National Cyber Crime Helpline (24/7, free)'}
            </p>
          </div>

          <div className="text-red-200">
            <p className="font-semibold mb-2">{hi ? 'तुरंत करें:' : 'Do immediately:'}</p>
            <ol className="space-y-2 text-xs">
              <li>1. {hi ? 'अपने बैंक के असली toll-free नंबर पर कॉल करके transaction रोकने की रिक्वेस्ट करें।' : 'Call your bank\'s official toll-free number and ask for transaction freeze.'}</li>
              <li>2. {hi ? 'Scammer को अपने नंबर से दोबारा call/मैसेज न करें।' : 'Do not talk to the scammer again from your own number.'}</li>
              <li>3. {hi ? 'सभी मैसेज, screenshots और transaction ID सुरक्षित रखें।' : 'Save all messages, screenshots, and transaction IDs.'}</li>
              <li>4. {hi ? 'cybercrime.gov.in पर complaint दर्ज करें।' : 'File a complaint at cybercrime.gov.in.'}</li>
            </ol>
          </div>

          <div className="pt-3 border-t border-red-800">
            <p className="text-red-300 text-xs">
              {hi 
                ? '⏱ समय बहुत महत्वपूर्ण है। जितनी जल्दी report करेंगे, उतनी ज़्यादा मदद मिल सकती है।'
                : '⏱ Time is critical. The faster you report, the more help is possible.'}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-5 py-3 bg-red-700 hover:bg-red-600 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          {hi ? 'समझ गया' : 'Got it'}
        </button>
      </div>
    </div>
  )
}

export default function Screen2Analysis({ onBack, onTrace, onEvidence }) {
  const { analysis, lang, showToast, isFallbackMode, loading, recordFeedback, familyMode, sessionStats, updateSessionStats } = useAnalysis()
  const hi = lang === 'hi'
  const [showEmergency, setShowEmergency] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedbackText, setFeedbackText] = useState('')
  const [showLearnMore, setShowLearnMore] = useState(false)
  const [showParentMode, setShowParentMode] = useState(false)

  // Brand verification helper
  function checkBrandVerification(urls) {
    if (!urls || urls.length === 0) return null
    const officialDomains = ['hdfc.com', 'sbi.co.in', 'icicibank.com', 'axisbank.com', 'amazon.in', 'flipkart.com', 'paytm.com']
    const suspiciousTLDs = ['.tk', '.ml', '.ga', '.cf', '.gq']
    
    for (const urlObj of urls) {
      const domain = urlObj.value.toLowerCase()
      // Check if matches official
      if (officialDomains.some(official => domain.includes(official))) {
        return { type: 'OFFICIAL', domain: domain, message: hi ? 'आधिकारिक domain pattern से मेल खाता है' : 'Matches official domain pattern' }
      }
      // Check suspicious TLD
      if (suspiciousTLDs.some(tld => domain.endsWith(tld))) {
        return { type: 'SUSPICIOUS', domain: domain, message: hi ? 'संदिग्ध domain extension (.tk, .ml, etc.)' : 'Suspicious domain extension (.tk, .ml, etc.)' }
      }
    }
    return null
  }

  // Update session stats on mount
  useState(() => {
    if (analysis) {
      updateSessionStats(analysis.risk_level)
    }
  })

  // Skeleton loading state
  if (loading || !analysis) {
    return (
      <div className="min-h-screen px-4 py-8 max-w-xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onBack} className="text-slate-400 hover:text-white transition-colors text-sm">← {hi ? 'वापस' : 'Back'}</button>
          <span className="text-slate-600">|</span>
          <span className="text-slate-300 text-sm font-medium">🛡 {hi ? 'BobSec विश्लेषण' : 'BobSec Analysis'}</span>
        </div>
        
        {/* Skeleton verdict card */}
        <div className="p-5 rounded-2xl border bg-slate-900 border-slate-700 mb-6 animate-pulse">
          <div className="h-6 bg-slate-800 rounded w-3/4 mb-3"></div>
          <div className="h-4 bg-slate-800 rounded w-1/2 mb-4"></div>
          <div className="h-2 bg-slate-800 rounded w-full"></div>
        </div>

        {/* Skeleton explanation */}
        <div className="mb-6 space-y-4">
          <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 animate-pulse">
            <div className="h-3 bg-slate-800 rounded w-full mb-2"></div>
            <div className="h-3 bg-slate-800 rounded w-5/6"></div>
          </div>
        </div>

        <p className="text-center text-slate-500 text-sm">
          {hi ? 'विश्लेषण हो रहा है...' : 'Analysing...'}
        </p>
      </div>
    )
  }

  const cfg = RISK_CONFIG[analysis.risk_level] || RISK_CONFIG.UNKNOWN
  const isHighRisk = analysis.risk_level === 'HIGH' || analysis.risk_level === 'MEDIUM'

  // Show toast on mount
  useState(() => {
    const riskMsg = hi
      ? `जाँच पूरी हुई। ${cfg.labelHi} scam लग रहा है।`
      : `Analysis complete. ${cfg.labelEn} detected.`
    showToast(riskMsg, isHighRisk ? 'warning' : 'success', 4000)
  })

  async function handleFeedbackSubmit() {
    if (!feedbackText.trim()) return

    try {
      // Call feedback API
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysis_id: analysis.analysis_id,
          verdict: analysis.risk_level,
          category: analysis.category,
          user_feedback: feedbackText.trim(),
          entities: analysis.entities,
          red_flags: analysis.red_flags
        })
      })

      const data = await response.json()

      // Increment learning counter
      recordFeedback()
      
      // Close feedback form
      setShowFeedback(false)
      setFeedbackText('')

      // Show success message with rule suggestion info
      if (data.rule_suggested) {
        showToast(
          hi
            ? `✓ Feedback दर्ज हो गया। Bob ने एक नया rule suggest किया है। धन्यवाद!`
            : `✓ Feedback recorded. Bob suggested a new rule. Thank you!`,
          'success',
          5000
        )
      } else {
        showToast(
          hi ? '✓ Feedback दर्ज हो गया। BobSec सीख रहा है। धन्यवाद!' : '✓ Feedback recorded. BobSec is learning. Thank you!',
          'success'
        )
      }
    } catch (err) {
      console.error('Feedback submission error:', err)
      showToast(
        hi ? '⚠ Feedback भेजने में समस्या हुई। कृपया बाद में try करें।' : '⚠ Could not submit feedback. Please try again later.',
        'error'
      )
    }
  }

  function getSimplifiedExplanation() {
    const category = analysis.category.replace(/_/g, ' ').toLowerCase()
    if (hi) {
      return `यह मैसेज ${category} जैसा लग रहा है। इसका मतलब है कि कोई आपको धोखा देने की कोशिश कर रहा है। ${analysis.red_flags?.[0] || 'यह संदिग्ध है'}। कृपया इस पर click मत करें और किसी भरोसेमंद व्यक्ति को दिखाएं।`
    }
    return `This message looks like ${category}. That means someone is trying to trick you. ${analysis.red_flags?.[0] || 'This is suspicious'}. Please don't click on it and show it to someone you trust.`
  }

  const brandVerification = checkBrandVerification(analysis.entities.urls)

  return (
    <div className="min-h-screen px-4 py-8 max-w-xl mx-auto">
      {showEmergency && <EmergencyModal onClose={() => setShowEmergency(false)} hi={hi} />}

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-slate-400 hover:text-white transition-colors text-sm">← {hi ? 'वापस' : 'Back'}</button>
        <span className="text-slate-600">|</span>
        <span className="text-slate-300 text-sm font-medium">🛡 {hi ? 'BobSec विश्लेषण' : 'BobSec Analysis'}</span>
      </div>

      {/* Fallback mode banner */}
      {isFallbackMode && (
        <div className="mb-4 p-4 bg-amber-950 border border-amber-800 rounded-xl flex gap-3">
          <span className="text-xl flex-shrink-0">⚠️</span>
          <div className="flex-1">
            <p className="text-amber-200 text-sm font-semibold mb-1">
              {hi ? 'Live Analysis उपलब्ध नहीं है' : 'Live Analysis Unavailable'}
            </p>
            <p className="text-amber-300 text-xs">
              {hi
                ? 'BobSec की live जाँच अभी उपलब्ध नहीं है। Demo डेटा दिखाया जा रहा है।'
                : 'BobSec\'s live analysis is unavailable right now. Showing demo data instead.'}
            </p>
          </div>
        </div>
      )}

      {/* Distressed empathy banner */}
      {analysis.distressed && (
        <div className="mb-4 p-4 bg-blue-950 border border-blue-700 rounded-xl flex gap-3">
          <span className="text-xl flex-shrink-0">💙</span>
          <p className="text-blue-200 text-sm">
            {hi
              ? 'मैं समझता/समझती हूँ यह परेशान करने वाला है। चलिए मिलकर इसे handle करते हैं।'
              : 'I understand this is stressful. Let\'s handle this together, step by step.'}
          </p>
        </div>
      )}

      {/* Risk verdict card */}
      <div className={`p-5 rounded-2xl border ${cfg.bg} ${cfg.border} mb-6`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{cfg.icon}</span>
              <span className="font-bold text-white text-lg">{hi ? cfg.labelHi : cfg.labelEn}</span>
            </div>
            <p className="text-slate-300 text-sm">
              {hi ? 'श्रेणी' : 'Category'}: {hi ? (CATEGORY_LABELS_HI[analysis.category] || analysis.category) : analysis.category.replace(/_/g, ' ')}
              {analysis.sub_type ? ` · ${analysis.sub_type}` : ''}
            </p>
          </div>
          <div className={`${cfg.badge} text-white font-bold text-lg px-3 py-1 rounded-lg flex-shrink-0`}>
            {analysis.risk_score}/100
          </div>
        </div>

        {/* Confidence bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>{hi ? 'विश्वास स्तर' : 'Confidence'}</span>
            <span>{analysis.confidence}%</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${cfg.badge}`}
              style={{ width: `${analysis.confidence}%` }}
            />
          </div>
        </div>
      </div>

      {/* Already paid/clicked emergency path */}
      {isHighRisk && (
        <div className="mb-6 p-4 bg-slate-900 border border-slate-700 rounded-xl">
          <p className="text-slate-400 text-sm mb-2">
            {hi ? '❓ पहले ही link पर क्लिक कर दिया या पैसे भेज दिए?' : '❓ Already clicked the link or sent money?'}
          </p>
          <button
            onClick={() => setShowEmergency(true)}
            className="w-full py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            🆘 {hi ? 'तुरंत मदद लें' : 'Get urgent help'}
          </button>
        </div>
      )}

      {/* Explanation */}
      <div className="mb-6 space-y-4">
        <div className="p-4 bg-slate-900 rounded-xl border border-slate-800">
          <p className="text-xs text-slate-400 mb-2 font-medium uppercase tracking-wide">
            {hi ? 'यह स्कैम क्यों है' : 'Why this is a scam'}
          </p>
          <p className="text-slate-200 text-sm leading-relaxed">{analysis.explanation_en}</p>
        </div>
        <div className="p-4 bg-slate-900 rounded-xl border border-slate-800">
          <p className="text-slate-200 text-sm leading-relaxed">{analysis.explanation_hi}</p>
        </div>
      </div>

      {/* Red flags */}
      {analysis.red_flags?.length > 0 && (
        <div className="mb-6">
          <p className="text-slate-400 text-xs uppercase tracking-wide mb-3 font-medium">
            {hi ? `मिले हुए खतरे (${analysis.red_flags.length})` : `Red Flags Detected (${analysis.red_flags.length})`}
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
      {(analysis.entities.phone_numbers?.length > 0 || analysis.entities.urls?.length > 0 || analysis.entities.upi_ids?.length > 0 || analysis.entities.impersonated_org) && (
        <div className="mb-6">
          <p className="text-slate-400 text-xs uppercase tracking-wide mb-3 font-medium">
            {hi ? 'निकाली गई जानकारी' : 'Extracted Entities'}
          </p>
          <div className="flex flex-wrap gap-2">
            {analysis.entities.phone_numbers?.map((p, i) => (
              <EntityPill key={`p${i}`} label="📞" value={p.value} verdict={p.verdict} detail={p.report_count ? `${p.report_count} reports` : null} />
            ))}
            {analysis.entities.urls?.map((u, i) => (
              <EntityPill key={`u${i}`} label="🔗" value={u.value} verdict={u.verdict} detail={u.feed_hits ? `${u.feed_hits} feeds` : null} />
            ))}
            {analysis.entities.upi_ids?.map((u, i) => (
              <EntityPill key={`upi${i}`} label="💳" value={u.value} verdict={u.verdict} detail={u.report_count ? `${u.report_count} reports` : null} />
            ))}
            {analysis.entities.impersonated_org && (
              <EntityPill label="🏛" value={analysis.entities.impersonated_org} verdict="FLAGGED" detail="impersonated" />
            )}
          </div>
        </div>
      )}

      {/* Brand verification hints */}
      {brandVerification && (
        <div className={`mb-6 p-4 rounded-xl border ${
          brandVerification.type === 'OFFICIAL'
            ? 'bg-emerald-950 border-emerald-800'
            : 'bg-red-950 border-red-800'
        }`}>
          <div className="flex items-start gap-3">
            <span className="text-xl flex-shrink-0">
              {brandVerification.type === 'OFFICIAL' ? '✓' : '⚠️'}
            </span>
            <div className="flex-1">
              <p className={`text-sm font-semibold mb-1 ${
                brandVerification.type === 'OFFICIAL' ? 'text-emerald-300' : 'text-red-300'
              }`}>
                {brandVerification.type === 'OFFICIAL'
                  ? (hi ? 'आधिकारिक Domain पाया गया' : 'Official Domain Detected')
                  : (hi ? 'संदिग्ध Domain पाया गया' : 'Suspicious Domain Detected')
                }
              </p>
              <p className={`text-xs ${
                brandVerification.type === 'OFFICIAL' ? 'text-emerald-200' : 'text-red-200'
              }`}>
                {brandVerification.message}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action */}
      <div className="mb-6 p-4 bg-slate-900 border border-slate-700 rounded-xl">
        <p className="text-slate-400 text-xs uppercase tracking-wide mb-2 font-medium">
          {hi ? 'आपको अभी क्या करना चाहिए' : 'What you should do right now'}
        </p>
        <p className="text-white text-sm font-medium">{hi ? analysis.user_action_hi : analysis.user_action}</p>
        
        {/* Explain for parents button */}
        {!showParentMode && (
          <button
            onClick={() => setShowParentMode(true)}
            className="mt-3 text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1 transition-colors"
          >
            <span>👵</span>
            <span>{hi ? 'माता-पिता के लिए समझाएं' : 'Explain for my parents'}</span>
          </button>
        )}
      </div>

      {/* Parent mode modal */}
      {showParentMode && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-base flex items-center gap-2">
                <span>👵</span>
                <span>{hi ? 'सरल भाषा में' : 'In Simple Words'}</span>
              </h3>
              <button
                onClick={() => setShowParentMode(false)}
                className="text-slate-400 hover:text-white text-xl transition-colors"
              >
                ×
              </button>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-4">
              <p className="text-slate-200 text-sm leading-relaxed">
                {getSimplifiedExplanation()}
              </p>
            </div>
            <div className="bg-blue-950 border border-blue-800 rounded-lg p-3">
              <p className="text-blue-200 text-xs">
                {hi
                  ? '💡 यह explanation technical शब्दों के बिना है ताकि आप अपने परिवार को आसानी से समझा सकें।'
                  : '💡 This explanation removes technical terms so you can easily explain to your family.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Feedback outlet */}
      {!showFeedback ? (
        <div className="mb-6 text-center">
          <button
            onClick={() => setShowFeedback(true)}
            className="text-slate-500 hover:text-slate-300 text-xs underline transition-colors"
          >
            {hi ? '❓ यह verdict गलत लगता है?' : '❓ Think this verdict is wrong?'}
          </button>
        </div>
      ) : (
        <div className="mb-6 p-4 bg-slate-900 border border-slate-700 rounded-xl">
          <p className="text-slate-300 text-sm mb-2 font-medium">
            {hi ? 'संक्षेप में बताएं कि यह verdict क्यों गलत लगता है:' : 'Briefly describe why you think this is wrong:'}
          </p>
          <textarea
            value={feedbackText}
            onChange={e => setFeedbackText(e.target.value)}
            placeholder={hi ? 'आपका feedback...' : 'Your feedback...'}
            className="w-full h-20 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 text-sm resize-none focus:outline-none focus:border-blue-500 transition-colors mb-3"
          />
          <div className="flex gap-2">
            <button
              onClick={() => { setShowFeedback(false); setFeedbackText('') }}
              className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors"
            >
              {hi ? 'रद्द करें' : 'Cancel'}
            </button>
            <button
              onClick={handleFeedbackSubmit}
              disabled={!feedbackText.trim()}
              className="flex-1 py-2 bg-blue-700 hover:bg-blue-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-colors"
            >
              {hi ? 'भेजें' : 'Submit'}
            </button>
          </div>
        </div>
      )}

      {/* Session stats widget */}
      {sessionStats.total > 0 && (
        <div className="mb-6 p-4 bg-slate-900 border border-slate-700 rounded-xl">
          <p className="text-slate-400 text-xs uppercase tracking-wide mb-3 font-medium">
            {hi ? '📊 आपका Session' : '📊 Your Session'}
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{sessionStats.total}</div>
              <div className="text-xs text-slate-500 mt-1">
                {hi ? 'कुल जाँच' : 'Total Checks'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">{sessionStats.highRisk}</div>
              <div className="text-xs text-slate-500 mt-1">
                {hi ? 'High Risk' : 'High Risk'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{sessionStats.learningEvents}</div>
              <div className="text-xs text-slate-500 mt-1">
                {hi ? 'Feedback' : 'Feedback'}
              </div>
            </div>
          </div>
          {familyMode && (
            <p className="text-center text-slate-500 text-xs mt-3">
              {hi
                ? '👪 परिवार के साथ मिलकर सुरक्षित रहें'
                : '👪 Staying safe together as a family'}
            </p>
          )}
        </div>
      )}

      {/* Trust panel - How BobSec checks */}
      <div className="mb-6 p-4 bg-blue-950 border border-blue-800 rounded-xl">
        <p className="text-blue-300 text-xs font-semibold mb-2">
          {hi ? '🔍 BobSec कैसे check करता है' : '🔍 How BobSec checks messages'}
        </p>
        <ul className="space-y-1 text-xs text-blue-200">
          <li>• {hi ? 'भारत में चलने वाले आम scam पैटर्न (fake KYC, fake job, lottery, digital arrest) से मिलान करता है।' : 'Looks for known scam patterns used in India (fake KYC, fake jobs, lottery, digital arrest).'}</li>
          <li>• {hi ? 'URL और नंबर को एक छोटे internal scam डेटाबेस से चेक करता है।' : 'Checks URLs and numbers against a small internal scam database.'}</li>
          <li>• {hi ? 'IBM Bob AI की मदद से risk को simple English और Hindi में समझाता है।' : 'Uses IBM Bob AI to explain the risk in simple English and Hindi.'}</li>
        </ul>
      </div>

      {/* Learn More Panel */}
      {showLearnMore && (
        <div className="mb-6 p-5 bg-blue-950 border border-blue-800 rounded-xl">
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-blue-300 font-semibold text-sm">
              {hi ? `📚 ${analysis.category.replace(/_/g, ' ')} के बारे में` : `📚 About ${analysis.category.replace(/_/g, ' ')}`}
            </h3>
            <button onClick={() => setShowLearnMore(false)} className="text-blue-400 hover:text-blue-300 text-xs">
              ✕
            </button>
          </div>
          <div className="space-y-3 text-sm text-blue-200">
            <div>
              <p className="font-semibold text-blue-300 mb-1">{hi ? 'यह scam कैसे काम करता है' : 'How this scam works'}</p>
              <p className="text-xs">{analysis.explanation_en}</p>
            </div>
            <div>
              <p className="font-semibold text-blue-300 mb-1">{hi ? 'भविष्य में कैसे पहचानें' : 'How to spot it in future'}</p>
              <ul className="text-xs space-y-1">
                {analysis.red_flags?.slice(0, 3).map((flag, i) => (
                  <li key={i}>• {flag}</li>
                ))}
              </ul>
            </div>
            <div className="pt-2 border-t border-blue-800">
              <p className="text-xs text-blue-400 italic">
                {hi
                  ? '💡 अगर आपको ऐसा कोई मैसेज मिले, तो तुरंत 1930 पर report करें।'
                  : '💡 If you receive a similar message, report it immediately to 1930.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Branching: Report vs Learn */}
      <div className="mb-6">
        <p className="text-center text-slate-400 text-xs mb-3">
          {hi ? 'आप क्या करना चाहते हैं?' : 'What would you like to do?'}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setShowLearnMore(!showLearnMore)}
            className="py-4 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 rounded-xl text-sm font-medium transition-colors flex flex-col items-center gap-1"
          >
            <span className="text-2xl">📚</span>
            <span>{hi ? 'इस scam के बारे में सीखें' : 'Learn about this scam'}</span>
          </button>
          <button
            onClick={onEvidence}
            className="py-4 bg-blue-700 hover:bg-blue-600 text-white rounded-xl text-sm font-medium transition-colors flex flex-col items-center gap-1"
          >
            <span className="text-2xl">📄</span>
            <span>{hi ? 'Police report बनाएं' : 'Report to police'}</span>
          </button>
        </div>
      </div>

      {/* Secondary action: Trace */}
      <button
        onClick={onTrace}
        className="w-full py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 rounded-xl text-sm transition-colors"
      >
        👁 {hi ? 'IBM Bob Trace देखें' : 'See IBM Bob Trace'}
      </button>

      {!isHighRisk && analysis.risk_level !== 'UNKNOWN' && (
        <p className="text-center text-emerald-400 text-xs mt-4">
          {hi ? 'यह message सुरक्षित लगता है। फिर भी सावधान रहें।' : 'This message looks safe based on what we can check. Stay cautious.'}
        </p>
      )}
    </div>
  )
}

// Made with Bob
