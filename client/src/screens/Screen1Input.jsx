import { useState } from 'react'
import { useAnalysis } from '../context/AnalysisContext'

const SAMPLES = [
  {
    key: '🏦',
    labelEn: 'Fake Bank KYC',
    labelHi: 'नकली Bank KYC',
    text: 'Dear Customer, Your HDFC Bank account will be SUSPENDED within 24 hours due to incomplete KYC. Update immediately: http://hdfc-kyc-update.tk/verify or call 9876500000. Ignore at your own risk. — HDFC KYC Team'
  },
  {
    key: '💼',
    labelEn: 'Job Scam',
    labelHi: 'Job Scam',
    text: 'Work from home and earn ₹5000/day! No experience needed. Just pay ₹499 registration fee to start. WhatsApp HR: 8800000001. Limited slots! Apply now.'
  },
  {
    key: '🎰',
    labelEn: 'Lottery',
    labelHi: 'Lottery',
    text: 'Congratulations! You have been selected in KBC Lucky Draw 2024. You have WON ₹25,00,000. To claim, pay ₹599 processing fee to UPI: refund@paytm123. Hurry! Offer expires in 2 hours.'
  },
  {
    key: '📦',
    labelEn: 'Fake Delivery',
    labelHi: 'नकली Delivery',
    text: 'Your Amazon parcel (AWB: 7823991) is held at customs. Pay ₹299 clearance fee at: amazon-refund-claim.in. Failure to pay within 12 hours will result in parcel return.'
  },
  {
    key: '📵',
    labelEn: 'TRAI Threat',
    labelHi: 'TRAI Threat',
    text: 'This is TRAI Cyber Cell. Your mobile number has been linked to 47 illegal transactions. You are under DIGITAL ARREST. Do not contact anyone. Pay ₹15,000 to avoid immediate police action. Call: 9876500000'
  },
  {
    key: '📈',
    labelEn: 'Investment',
    labelHi: 'Investment',
    text: 'Join our SEBI-certified WhatsApp group and get GUARANTEED 40% monthly returns on stock tips! 500+ members earning ₹1 lakh/month. Limited seats. Invest minimum ₹10,000. Contact: 8800000001'
  },
  {
    key: '🚨',
    labelEn: 'Digital Arrest',
    labelHi: 'Digital Arrest',
    text: 'URGENT: This is CBI Officer Rajesh Kumar (Badge #4729). Your Aadhaar has been used in a money laundering case worth ₹4.2 crore. You are under DIGITAL ARREST effective immediately. Do NOT disconnect this call or contact anyone. Failure to cooperate will result in physical arrest within 2 hours. Transfer ₹50,000 to this account for bail verification: 9876500000@paytm'
  }
]

function AboutModal({ onClose, hi }) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
        <h3 className="text-white font-bold text-lg mb-4">
          {hi ? '📋 BobSec के बारे में और सीमाएं' : '📋 About BobSec & Limitations'}
        </h3>
        
        <div className="space-y-4 text-sm text-slate-300">
          <div>
            <p className="font-semibold text-slate-200 mb-1">{hi ? '⚠️ यह क्या है' : '⚠️ What this is'}</p>
            <p className="text-slate-400">
              {hi 
                ? 'BobSec एक experimental tool है जो भारत में आम scams को पहचानने में मदद करता है। यह कानूनी सलाह नहीं है।'
                : 'BobSec is an experimental tool to help identify common scams in India. This is not legal advice.'}
            </p>
          </div>

          <div>
            <p className="font-semibold text-slate-200 mb-1">{hi ? '✓ यह क्या कर सकता है' : '✓ What it can do'}</p>
            <ul className="text-slate-400 space-y-1 text-xs">
              <li>• {hi ? 'भारत में चलने वाले आम financial scams को पहचानता है' : 'Identifies common financial scams targeting Indians'}</li>
              <li>• {hi ? 'संदिग्ध URLs और phone numbers को check करता है' : 'Checks suspicious URLs and phone numbers'}</li>
              <li>• {hi ? 'English और Hindi दोनों में समझाता है' : 'Explains risks in both English and Hindi'}</li>
              <li>• {hi ? 'Police complaint draft तैयार करने में मदद करता है' : 'Helps draft police complaints'}</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-slate-200 mb-1">{hi ? '⚠️ सीमाएं' : '⚠️ Limitations'}</p>
            <ul className="text-slate-400 space-y-1 text-xs">
              <li>• {hi ? 'सिर्फ Hindi और English support करता है' : 'Only supports Hindi and English'}</li>
              <li>• {hi ? '100% accuracy की guarantee नहीं है' : 'No guarantee of 100% accuracy'}</li>
              <li>• {hi ? 'नए या अनजान scam patterns को miss कर सकता है' : 'May miss new or unknown scam patterns'}</li>
              <li>• {hi ? 'Demo mode में limited database का इस्तेमाल करता है' : 'Uses limited database in demo mode'}</li>
            </ul>
          </div>

          <div className="pt-3 border-t border-slate-700">
            <p className="text-xs text-slate-500">
              {hi 
                ? '🔒 आपका डेटा session के बाद delete हो जाता है। हम कुछ भी store नहीं करते।'
                : '🔒 Your data is deleted after the session. We store nothing.'}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-5 py-3 bg-blue-700 hover:bg-blue-600 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          {hi ? 'समझ गया' : 'Got it'}
        </button>
      </div>
    </div>
  )
}

export default function Screen1Input({ onAnalyse, onBackToDashboard }) {
  const { lang, setLang, runAnalysis, loading, loadingStep, LOADING_STEPS, LOADING_STEPS_HI, isDemoMode, feedbackCount, familyMode, setFamilyMode, incidentMode, setIncidentMode } = useAnalysis()
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [showAbout, setShowAbout] = useState(false)

  const hi = lang === 'hi'

  // Demo mode: Check if input is one of the allowed samples
  const SAMPLE_TEXTS = SAMPLES.map(s => s.text.toLowerCase())
  
  function isAllowedInDemoMode(text) {
    if (!isDemoMode) return true
    const lower = text.toLowerCase().trim()
    // Allow sample texts or very short test messages
    return SAMPLE_TEXTS.some(s => lower.includes(s.substring(0, 50))) || lower.length < 100
  }

  async function handleAnalyse() {
    setError('')
    
    // Validation
    const trimmed = input.trim()
    if (trimmed.length === 0) {
      setError(hi ? 'कृपया मैसेज पेस्ट करें या कोई demo चुनें।' : 'Please paste the message or choose a demo sample.')
      return
    }
    
    if (trimmed.length < 10) {
      setError(hi
        ? 'इस छोटे मैसेज में मुझे कोई scam संकेत नहीं दिख रहा। अगर कोई पैसे, OTP या link माँग रहा है, वह हिस्सा यहाँ पेस्ट करें।'
        : 'I don\'t see any scam signals in this short message. If someone is asking for money, OTP, or a link somewhere else, paste that part instead.')
      return
    }

    if (trimmed.length > 2000) {
      setError(hi
        ? 'यह मैसेज बहुत लंबा है। कृपया सिर्फ संदिग्ध हिस्सा पेस्ट करें।'
        : 'This looks very long. Please paste only the suspicious part of the message or email.')
      return
    }

    // Demo mode guardrail
    if (isDemoMode && !isAllowedInDemoMode(trimmed)) {
      setError(hi
        ? '⚠️ Demo Mode: कृपया ऊपर दिए गए samples में से एक चुनें या छोटा test मैसेज लिखें।'
        : '⚠️ Demo Mode: Please choose one of the samples above or enter a short test message.')
      return
    }

    const result = await runAnalysis(trimmed)
    if (result) onAnalyse()
  }

  if (loading) {
    const steps = hi ? LOADING_STEPS_HI : LOADING_STEPS
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="w-full max-w-md px-6">
          <div className="text-center mb-8">
            <span className="text-5xl">🛡</span>
            <p className="text-slate-400 mt-3 text-sm">
              {hi ? 'BobSec scam डेटाबेस और पैटर्न चेक कर रहा है...' : 'BobSec is checking scam databases and patterns...'}
            </p>
          </div>
          <div className="space-y-3">
            {steps.map((step, i) => (
              <div key={i} className={`flex items-center gap-3 transition-all duration-300 ${i <= loadingStep ? 'opacity-100' : 'opacity-20'}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${i < loadingStep ? 'bg-emerald-500 text-white' : i === loadingStep ? 'bg-blue-500 text-white animate-pulse' : 'bg-slate-700'}`}>
                  {i < loadingStep ? '✓' : i === loadingStep ? '●' : '○'}
                </span>
                <span className={`text-sm ${i <= loadingStep ? 'text-slate-200' : 'text-slate-600'}`}>{step}</span>
                {i < loadingStep && <span className="ml-auto text-xs text-slate-500">done</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} hi={hi} />}
      
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {onBackToDashboard && (
              <button
                onClick={onBackToDashboard}
                className="text-slate-400 hover:text-white transition-colors text-sm"
                aria-label={hi ? 'Dashboard पर वापस जाएं' : 'Back to Dashboard'}
              >
                ← {hi ? 'Dashboard' : 'Dashboard'}
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-3xl">🛡</span>
                <span className="text-2xl font-bold text-white">BobSec</span>
                {isDemoMode && (
                  <span className="px-2 py-1 bg-amber-900 border border-amber-700 text-amber-200 text-xs rounded-md font-semibold">
                    DEMO
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-sm mt-1">{hi ? 'IBM Bob द्वारा Anti-Scam Guardian' : 'Anti-Scam Guardian by IBM Bob'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFamilyMode(!familyMode)}
              className={`px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                familyMode
                  ? 'bg-blue-900 border-blue-700 text-blue-200'
                  : 'border-slate-600 text-slate-400 hover:border-slate-400'
              }`}
              aria-label={hi ? 'Family Mode टॉगल करें' : 'Toggle Family Mode'}
            >
              👪 {hi ? 'परिवार' : 'Family'}
            </button>
            <button
              onClick={() => setLang(hi ? 'en' : 'hi')}
              className="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 text-sm hover:border-slate-400 transition-colors"
              aria-label={hi ? 'Switch to English' : 'हिंदी में बदलें'}
            >
              {hi ? 'EN' : 'हिंदी'}
            </button>
          </div>
        </div>

        {/* Family Mode Info */}
        {familyMode && (
          <div className="mb-4 p-3 bg-blue-950 border border-blue-800 rounded-lg">
            <p className="text-blue-300 text-xs">
              <span className="font-semibold">👪 {hi ? 'परिवार मोड सक्रिय' : 'Family Mode Active'}</span>
              {' · '}
              {hi
                ? 'BobSec अब आपके परिवार की सुरक्षा के लिए protective tone में काम करेगा।'
                : 'BobSec will use protective language designed for family safety.'}
            </p>
          </div>
        )}

        {/* How it works strip */}
        <div className="mb-6 p-4 bg-blue-950 border border-blue-800 rounded-xl">
          <div className="flex items-start justify-between mb-2">
            <p className="text-blue-300 text-xs font-semibold">
              {hi ? '🔍 BobSec कैसे काम करता है' : '🔍 How BobSec works'}
            </p>
            {feedbackCount > 0 && (
              <span className="px-2 py-0.5 bg-emerald-900 border border-emerald-700 text-emerald-300 text-xs rounded-md font-semibold flex items-center gap-1">
                <span>🧠</span>
                <span>{feedbackCount} {hi ? 'से सीखा' : 'learned'}</span>
              </span>
            )}
          </div>
          <ul className="space-y-1 text-xs text-blue-200">
            <li>• {hi ? 'कोई भी संदिग्ध मैसेज यहाँ पेस्ट करें।' : 'Paste any suspicious message.'}</li>
            <li>• {hi ? 'BobSec इसे scam पैटर्न, URL और नंबर से चेक करता है।' : 'BobSec checks scam patterns, URLs, and numbers.'}</li>
            <li>• {hi ? 'फैसला आप लेते हैं। हम कभी ऑटो-रिपोर्ट नहीं करते।' : 'You decide what to do. We never auto-report.'}</li>
          </ul>
          {feedbackCount > 0 && (
            <p className="text-emerald-400 text-xs mt-2 italic">
              {hi
                ? `✨ ${feedbackCount} user feedback से BobSec बेहतर हो रहा है`
                : `✨ BobSec is learning from ${feedbackCount} user feedback${feedbackCount > 1 ? 's' : ''}`}
            </p>
          )}
        </div>

        {/* Mode Toggle */}
        <div className="mb-6 p-4 bg-slate-900 border border-slate-700 rounded-xl">
          <p className="text-slate-400 text-xs mb-3 font-medium uppercase tracking-wide">
            {hi ? 'आप किस स्थिति में हैं?' : 'What\'s your situation?'}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setIncidentMode('prevention')}
              className={`p-4 rounded-lg border transition-all ${
                incidentMode === 'prevention'
                  ? 'bg-blue-900 border-blue-700 text-blue-200'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
              }`}
            >
              <div className="text-2xl mb-2">🔍</div>
              <div className="text-sm font-semibold mb-1">
                {hi ? 'मैसेज चेक करना है' : 'Check a message'}
              </div>
              <div className="text-xs opacity-75">
                {hi ? 'संदिग्ध मैसेज मिला है' : 'Got a suspicious message'}
              </div>
            </button>
            
            <button
              onClick={() => setIncidentMode('post_incident')}
              className={`p-4 rounded-lg border transition-all ${
                incidentMode === 'post_incident'
                  ? 'bg-red-900 border-red-700 text-red-200'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
              }`}
            >
              <div className="text-2xl mb-2">🆘</div>
              <div className="text-sm font-semibold mb-1">
                {hi ? 'पहले ही scam हो गया' : 'Already scammed'}
              </div>
              <div className="text-xs opacity-75">
                {hi ? 'पैसे कट चुके हैं' : 'Money already lost'}
              </div>
            </button>
          </div>
        </div>

        {/* Textarea */}
        <div className="mb-2">
          <label className="block text-slate-300 text-sm mb-2">
            {incidentMode === 'post_incident'
              ? (hi ? 'क्या हुआ था? पूरी घटना बताएं (कब, कैसे, कितना)' : 'What happened? Describe the full incident (when, how, how much)')
              : (hi ? 'यहाँ संदिग्ध मैसेज, link, UPI ID या phone number paste करें' : 'Paste a suspicious message, link, UPI ID, or phone number below.')
            }
          </label>
          <textarea
            value={input}
            onChange={e => { setInput(e.target.value); setError('') }}
            placeholder={incidentMode === 'post_incident'
              ? (hi ? 'उदाहरण: "कल शाम 6 बजे मुझे एक call आया जो HDFC Bank बताकर OTP माँग रहा था। मैंने दे दिया और ₹25,000 कट गए..."' : 'Example: "Yesterday at 6pm I got a call claiming to be HDFC Bank asking for OTP. I gave it and ₹25,000 was debited..."')
              : (hi ? 'मैसेज यहाँ paste करें...' : 'Paste the suspicious message here...')
            }
            className="w-full h-36 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 text-sm resize-none focus:outline-none focus:border-blue-500 transition-colors"
            aria-label={hi ? 'संदिग्ध मैसेज' : 'Suspicious message'}
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-950 border border-red-800 rounded-lg">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Sample buttons */}
        <div className="mb-6">
          <p className="text-center text-slate-500 text-xs mb-3">— {hi ? 'या एक sample आज़माएं' : 'or try a sample'} —</p>
          <div className="grid grid-cols-3 gap-2">
            {SAMPLES.map(s => (
              <button
                key={s.key}
                onClick={() => { setInput(s.text); setError('') }}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs text-slate-300 hover:text-white transition-all text-left"
                aria-label={`${hi ? 'Sample' : 'Sample'}: ${hi ? s.labelHi : s.labelEn}`}
              >
                {s.key} {hi ? s.labelHi : s.labelEn}
              </button>
            ))}
          </div>
        </div>

        {/* Analyse button */}
        <button
          onClick={handleAnalyse}
          disabled={input.trim().length < 10}
          className={`w-full py-4 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors text-base ${
            incidentMode === 'post_incident'
              ? 'bg-red-600 hover:bg-red-500'
              : 'bg-blue-600 hover:bg-blue-500'
          }`}
          aria-label={incidentMode === 'post_incident' ? (hi ? 'मदद लें' : 'Get Help') : (hi ? 'अभी जाँचें' : 'Analyse Now')}
        >
          {incidentMode === 'post_incident'
            ? (hi ? '🆘 तुरंत मदद लें' : '🆘 Get Urgent Help')
            : (hi ? '🔍 अभी जाँचें' : '🔍 Analyse Now')
          }
        </button>

        {/* WhatsApp concept hint */}
        <div className="mt-4 p-3 bg-slate-900 border border-slate-700 rounded-lg">
          <div className="flex items-start gap-2">
            <span className="text-lg flex-shrink-0">💡</span>
            <div className="flex-1">
              <p className="text-slate-300 text-xs font-medium mb-1">
                {hi ? 'भविष्य में: WhatsApp से सीधे जाँच' : 'Coming Soon: Check directly from WhatsApp'}
              </p>
              <p className="text-slate-500 text-xs">
                {hi
                  ? 'जल्द ही आप संदिग्ध मैसेज को BobSec WhatsApp नंबर पर forward कर सकेंगे और तुरंत verdict पा सकेंगे।'
                  : 'Soon you\'ll be able to forward suspicious messages to BobSec\'s WhatsApp number and get instant verdicts.'}
              </p>
            </div>
          </div>
        </div>

        {/* Footer links */}
        <div className="mt-4 flex items-center justify-between text-xs">
          <p className="text-slate-600">
            🔒 {hi ? 'Session-only. कुछ भी save नहीं होता।' : 'Session-only. Nothing saved.'}
          </p>
          <button
            onClick={() => setShowAbout(true)}
            className="text-slate-500 hover:text-slate-300 underline transition-colors"
          >
            {hi ? 'About & सीमाएं' : 'About & Limitations'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Made with Bob
