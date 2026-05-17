'use client';

import { useState } from 'react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// UI Labels in English and Hindi
const UI_LABELS = {
  en: {
    appName: 'BobSec',
    tagline: 'Anti-Scam Guardian by IBM Bob',
    inputPlaceholder: 'Paste a suspicious message, link, UPI ID, or phone number below',
    orTrySample: 'or try a sample',
    analyzeButton: '🔍 Analyse Now',
    privacyNotice: 'Nothing you paste is stored. Analysis is session-only.',
    loading: ['Extracting entities...', 'Running scam classification...', 'Checking threat intelligence...', 'Generating explanation...', 'Running governance checks...', '✓ Analysis complete'],
    riskHeaders: {
      HIGH: '⚠ HIGH RISK — SCAM DETECTED',
      MEDIUM: '⚡ MEDIUM RISK — SUSPICIOUS',
      LOW: 'ℹ LOW RISK — POSSIBLY SAFE',
      SAFE: '✓ SAFE — No Threats Found',
      UNKNOWN: '❓ UNCERTAIN — Cannot Confirm'
    },
    category: 'Category',
    redFlags: 'RED FLAGS DETECTED',
    entities: 'EXTRACTED ENTITIES',
    action: 'WHAT YOU SHOULD DO RIGHT NOW',
    confidence: 'Confidence',
    seeTrace: '👁 See Agent Trace',
    buildEvidence: '📦 Build Evidence',
    generateReport: '📄 Generate Police Report',
    back: '← Back',
    helpline: '🆘 National Cyber Crime Helpline: 1930 (24/7, free)'
  },
  hi: {
    appName: 'BobSec',
    tagline: 'IBM Bob द्वारा Anti-Scam Guardian',
    inputPlaceholder: 'यहाँ संदिग्ध मैसेज, link, UPI ID या phone number paste करें',
    orTrySample: 'या एक sample आज़माएं',
    analyzeButton: '🔍 अभी जाँचें',
    privacyNotice: 'आप जो paste करते हैं वह save नहीं होता। Analysis session-only है।',
    loading: ['जानकारी निकाली जा रही है...', 'Scam classification हो रही है...', 'Threat intelligence check हो रही है...', 'Explanation बनाई जा रही है...', 'Governance checks हो रहे हैं...', '✓ Analysis पूरी हुई'],
    riskHeaders: {
      HIGH: '⚠ उच्च जोखिम — स्कैम मिला',
      MEDIUM: '⚡ मध्यम जोखिम — संदिग्ध',
      LOW: 'ℹ कम जोखिम — संभवतः सुरक्षित',
      SAFE: '✓ सुरक्षित — कोई खतरा नहीं मिला',
      UNKNOWN: '❓ अनिश्चित — पुष्टि नहीं हो सकती'
    },
    category: 'श्रेणी',
    redFlags: 'मिले हुए खतरे',
    entities: 'निकाली गई जानकारी',
    action: 'आपको अभी क्या करना चाहिए',
    confidence: 'विश्वास स्तर',
    seeTrace: '👁 Agent Trace देखें',
    buildEvidence: '📦 Evidence बनाएं',
    generateReport: '📄 Police Report बनाएं',
    back: '← वापस',
    helpline: '🆘 राष्ट्रीय साइबर अपराध हेल्पलाइन: 1930 (24/7, निःशुल्क)'
  }
};

const SAMPLES = [
  { id: 'SAMPLE_1', label_en: '🏦 Fake Bank KYC', label_hi: '🏦 नकली Bank KYC', message: "Your HDFC Bank account will be SUSPENDED within 24 hours due to incomplete KYC. Update immediately: http://hdfc-kyc-update.tk/verify or call 9876500000." },
  { id: 'SAMPLE_2', label_en: '💼 Job Scam', label_hi: '💼 Job Scam', message: "Work from home and earn ₹5000/day! No experience needed. Just pay ₹499 registration fee to start. WhatsApp HR: 8800000001. Limited slots!" },
  { id: 'SAMPLE_3', label_en: '🎰 Lottery', label_hi: '🎰 Lottery', message: "Congratulations! You have been selected in KBC Lucky Draw 2024. You have WON ₹25,00,000. To claim, pay ₹599 processing fee to UPI: refund@paytm123." },
  { id: 'SAMPLE_4', label_en: '📦 Fake Delivery', label_hi: '📦 नकली Delivery', message: "Your Amazon parcel (AWB: 7823991) is held at customs. Pay ₹299 clearance fee at: amazon-refund-claim.in. Failure to pay within 12 hours will result in parcel return." },
  { id: 'SAMPLE_5', label_en: '📵 TRAI Threat', label_hi: '📵 TRAI Threat', message: "This is TRAI Cyber Cell. Your mobile number has been linked to 47 illegal transactions. You are under DIGITAL ARREST. Do not contact anyone. Pay ₹15,000 to avoid immediate police action." },
  { id: 'SAMPLE_6', label_en: '📈 Investment', label_hi: '📈 Investment', message: "Join our SEBI-certified WhatsApp group and get GUARANTEED 40% monthly returns on stock tips! 500+ members earning ₹1 lakh/month. Limited seats. Invest minimum ₹10,000. Contact: 8800000001" }
];

const RISK_COLORS = {
  HIGH: '#DC2626',
  MEDIUM: '#D97706',
  LOW: '#2563EB',
  SAFE: '#16A34A',
  UNKNOWN: '#6B7280'
};

export default function Home() {
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [analysis, setAnalysis] = useState<any>(null);
  const [error, setError] = useState('');
  const [view, setView] = useState<'input' | 'result' | 'trace' | 'evidence' | 'report'>('input');

  const labels = UI_LABELS[language];

  const handleAnalyze = async () => {
    if (!inputMessage.trim() || inputMessage.length < 10) {
      setError(language === 'en' 
        ? 'Please paste the full message — at least 10 characters.'
        : 'कृपया पूरा मैसेज paste करें — कम से कम 10 characters।'
      );
      return;
    }

    setError('');
    setLoading(true);
    setLoadingStep(0);

    // Simulate loading steps
    const stepInterval = setInterval(() => {
      setLoadingStep(prev => {
        if (prev >= 5) {
          clearInterval(stepInterval);
          return prev;
        }
        return prev + 1;
      });
    }, 500);

    try {
      const response = await axios.post(`${API_URL}/api/analyze`, {
        message: inputMessage
      });

      clearInterval(stepInterval);
      setLoadingStep(6);
      
      setTimeout(() => {
        setAnalysis(response.data);
        setLoading(false);
        setView('result');
      }, 300);

    } catch (err: any) {
      clearInterval(stepInterval);
      setLoading(false);
      setError(err.response?.data?.message || 'Analysis failed. Please try again.');
    }
  };

  const handleSample = (sample: typeof SAMPLES[0]) => {
    setInputMessage(sample.message);
  };

  const getRiskColor = (level: string) => {
    return RISK_COLORS[level as keyof typeof RISK_COLORS] || RISK_COLORS.UNKNOWN;
  };

  if (view === 'input' || loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
        <div className="max-w-4xl mx-auto py-12">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-4 mb-4">
              <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {labels.appName}
              </h1>
              <button
                onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
                className="px-4 py-2 bg-white border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                {language === 'en' ? 'हिंदी' : 'English'}
              </button>
            </div>
            <p className="text-xl text-gray-600">{labels.tagline}</p>
          </div>

          {/* Input Section */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={labels.inputPlaceholder}
              className="w-full h-48 p-4 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none resize-none text-lg"
              disabled={loading}
            />
            
            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-300 rounded-lg text-red-700">
                {error}
              </div>
            )}

            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="w-full mt-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xl font-bold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? labels.loading[loadingStep] : labels.analyzeButton}
            </button>

            <p className="text-center text-sm text-gray-500 mt-4">
              🔒 {labels.privacyNotice}
            </p>
          </div>

          {/* Sample Buttons */}
          <div className="text-center mb-4">
            <p className="text-gray-600 mb-4">{labels.orTrySample}</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {SAMPLES.map(sample => (
                <button
                  key={sample.id}
                  onClick={() => handleSample(sample)}
                  disabled={loading}
                  className="px-4 py-3 bg-white border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {language === 'en' ? sample.label_en : sample.label_hi}
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (view === 'result' && analysis) {
    const riskColor = getRiskColor(analysis.risk_level);
    const explanation = language === 'en' ? analysis.explanation_en : analysis.explanation_hi;
    const userAction = language === 'en' ? analysis.user_action : analysis.user_action_hi;

    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
        <div className="max-w-4xl mx-auto py-12">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => {
                setView('input');
                setAnalysis(null);
                setInputMessage('');
              }}
              className="px-4 py-2 bg-white border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
            >
              {labels.back}
            </button>
            <button
              onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
              className="px-4 py-2 bg-white border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
            >
              {language === 'en' ? 'हिंदी' : 'English'}
            </button>
          </div>

          {/* Risk Header */}
          <div 
            className="rounded-2xl p-8 mb-6 text-white"
            style={{ backgroundColor: riskColor }}
          >
            <h2 className="text-3xl font-bold mb-2">
              {labels.riskHeaders[analysis.risk_level as keyof typeof labels.riskHeaders]}
            </h2>
            <div className="flex items-center gap-4 text-lg">
              <span>Score: {analysis.risk_score}/100</span>
              <span>•</span>
              <span>{labels.confidence}: {analysis.confidence}%</span>
            </div>
          </div>

          {/* Analysis Details */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <div className="mb-6">
              <h3 className="text-xl font-bold mb-2">{labels.category}</h3>
              <p className="text-lg text-gray-700">{analysis.category} - {analysis.sub_type}</p>
            </div>

            <div className="mb-6">
              <h3 className="text-xl font-bold mb-3">{labels.redFlags}</h3>
              <ul className="space-y-2">
                {analysis.red_flags.map((flag: string, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-red-600 font-bold">•</span>
                    <span className="text-gray-700">{flag}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-600 rounded">
              <p className="text-gray-800 leading-relaxed">{explanation}</p>
            </div>

            <div className="p-4 bg-green-50 border-l-4 border-green-600 rounded">
              <h3 className="font-bold mb-2">{labels.action}</h3>
              <p className="text-gray-800 leading-relaxed">{userAction}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <button
              onClick={() => setView('trace')}
              className="px-6 py-4 bg-white border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              {labels.seeTrace}
            </button>
            <button
              onClick={() => setView('evidence')}
              className="px-6 py-4 bg-white border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              {labels.buildEvidence}
            </button>
            <button
              onClick={() => setView('report')}
              className="px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all"
            >
              {labels.generateReport}
            </button>
          </div>

          {/* Helpline */}
          <div className="text-center p-4 bg-red-50 border border-red-300 rounded-lg">
            <p className="text-red-800 font-semibold">{labels.helpline}</p>
          </div>
        </div>
      </main>
    );
  }

  if (view === 'trace' && analysis) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
        <div className="max-w-4xl mx-auto py-12">
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => setView('result')}
              className="px-4 py-2 bg-white border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
            >
              {labels.back}
            </button>
            <h2 className="text-2xl font-bold">IBM Bob — Orchestration Trace</h2>
            <div className="w-24"></div>
          </div>

          <div className="space-y-4">
            {analysis.trace.map((step: any, i: number) => (
              <div key={i} className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-600">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold">Step {step.step}: {step.agent}</h3>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${step.policy_passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {step.policy_passed ? 'PASS' : 'FAIL'}
                  </span>
                </div>
                <p className="text-gray-600 mb-2"><strong>Model:</strong> {step.model}</p>
                <p className="text-gray-600 mb-2"><strong>Action:</strong> {step.action}</p>
                <p className="text-gray-700 mb-2"><strong>Result:</strong> {step.result}</p>
                <p className="text-gray-500 text-sm">Time: {step.time_ms}ms</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return <div>Loading...</div>;
}

// Made with Bob
