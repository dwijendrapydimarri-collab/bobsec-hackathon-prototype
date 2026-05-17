import { createContext, useContext, useState, useEffect } from 'react'
import { sessionManager } from '../utils/sessionManager'

const AnalysisContext = createContext(null)

export function AnalysisProvider({ children }) {
  const [analysis, setAnalysis] = useState(null)
  const [lang, setLang] = useState(() => {
    // Load language preference from localStorage
    return localStorage.getItem('bobsec_lang') || 'en'
  })
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const [userConfirmed, setUserConfirmed] = useState(false)
  const [toast, setToast] = useState(null)
  const [isFallbackMode, setIsFallbackMode] = useState(false)
  const [cachedAnalysis, setCachedAnalysis] = useState(null)
  const [feedbackCount, setFeedbackCount] = useState(() => {
    const stored = localStorage.getItem('bobsec_feedback_count')
    return stored ? parseInt(stored, 10) : 0
  })
  const [familyMode, setFamilyMode] = useState(() => {
    const stored = localStorage.getItem('bobsec_family_mode')
    return stored === 'true'
  })
  const [incidentMode, setIncidentMode] = useState(() => {
    const stored = localStorage.getItem('bobsec_incident_mode')
    return stored || 'prevention' // 'prevention' or 'post_incident'
  })
  const [sessionStats, setSessionStats] = useState(() => {
    const stored = localStorage.getItem('bobsec_session_stats')
    return stored ? JSON.parse(stored) : { highRisk: 0, total: 0, learningEvents: 0 }
  })
  const [currentScreen, setCurrentScreen] = useState(1)
  const [inputText, setInputText] = useState('')

  const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true'

  // Restore session on mount
  useEffect(() => {
    const restored = sessionManager.restore()
    if (restored) {
      setCurrentScreen(restored.screen)
      setInputText(restored.input)
      setAnalysis(restored.analysis)
      setLang(restored.lang)
      
      // Show toast about restored session
      const age = sessionManager.getAge()
      const minutes = Math.floor(age / 60000)
      showToast(
        lang === 'hi'
          ? `पिछला session restore किया गया (${minutes} मिनट पहले)`
          : `Session restored from ${minutes} minutes ago`,
        'info',
        4000
      )
    }
  }, [])

  // Save session whenever state changes
  useEffect(() => {
    if (currentScreen > 1 || inputText || analysis) {
      sessionManager.save({
        screen: currentScreen,
        input: inputText,
        analysis,
        lang
      })
    }
  }, [currentScreen, inputText, analysis, lang])

  // Persist family mode
  useEffect(() => {
    localStorage.setItem('bobsec_family_mode', familyMode.toString())
  }, [familyMode])

  // Persist incident mode
  useEffect(() => {
    localStorage.setItem('bobsec_incident_mode', incidentMode)
  }, [incidentMode])

  // Persist session stats
  useEffect(() => {
    localStorage.setItem('bobsec_session_stats', JSON.stringify(sessionStats))
  }, [sessionStats])

  // Persist language preference
  useEffect(() => {
    localStorage.setItem('bobsec_lang', lang)
  }, [lang])

  const LOADING_STEPS = [
    'Extracting entities...',
    'Running scam classification...',
    'Checking threat intelligence...',
    'Generating explanation...',
    'Running governance checks...',
    '✓ Analysis complete'
  ]

  const LOADING_STEPS_HI = [
    'जानकारी निकाली जा रही है...',
    'Scam classification हो रही है...',
    'Threat intelligence check हो रही है...',
    'Explanation बनाई जा रही है...',
    'Governance checks हो रहे हैं...',
    '✓ Analysis पूरी हुई'
  ]

  async function runAnalysis(inputText, mode = incidentMode) {
    // Check cache first
    if (cachedAnalysis && cachedAnalysis.input === inputText) {
      setAnalysis(cachedAnalysis.result)
      return cachedAnalysis.result
    }

    setLoading(true)
    setLoadingStep(0)
    setAnalysis(null)
    setIsFallbackMode(false)

    // Staged loading animation
    const delays = [0, 400, 900, 1500, 2000, 2300]
    delays.forEach((delay, i) => {
      setTimeout(() => setLoadingStep(i), delay)
    })

    try {
      // Check for known mock key first
      const { detectMockKey, getMockResponse } = await import('../mocks/responses.js')
      const mockKey = detectMockKey(inputText)

      await new Promise(r => setTimeout(r, 2400)) // let animation play

      if (mockKey) {
        const mockData = getMockResponse(mockKey)
        setAnalysis(mockData)
        setLoading(false)
        setCachedAnalysis({ input: inputText, result: mockData })
        return mockData
      }

      // Live API call with timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000) // 15s timeout

      const res = await fetch('/api/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: inputText, lang, mode }),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)

      if (!res.ok) {
        throw new Error('API error')
      }

      const data = await res.json()
      
      // Check if response is mock fallback
      if (data.source === 'mock') {
        setIsFallbackMode(true)
      }

      setAnalysis(data)
      setLoading(false)
      setCachedAnalysis({ input: inputText, result: data })
      return data
    } catch (err) {
      console.error('Analysis error:', err)
      
      // Fallback to mock
      const { getMockResponse } = await import('../mocks/responses.js')
      const fallbackData = getMockResponse('SAMPLE_1')
      
      setAnalysis(fallbackData)
      setIsFallbackMode(true)
      setLoading(false)
      setCachedAnalysis({ input: inputText, result: fallbackData })
      
      showToast(
        lang === 'hi' 
          ? 'Live analysis उपलब्ध नहीं है। Demo डेटा दिखाया जा रहा है।'
          : 'Live analysis unavailable. Showing demo data.',
        'warning',
        5000
      )
      
      return fallbackData
    }
  }

  function showToast(message, type = 'info', duration = 3000) {
    setToast({ message, type, duration })
  }

  function hideToast() {
    setToast(null)
  }

  function clearCache() {
    setCachedAnalysis(null)
  }

  function recordFeedback() {
    const newCount = feedbackCount + 1
    setFeedbackCount(newCount)
    localStorage.setItem('bobsec_feedback_count', newCount.toString())
    // Also increment learning events in session stats
    setSessionStats(prev => ({ ...prev, learningEvents: prev.learningEvents + 1 }))
  }

  function updateSessionStats(riskLevel) {
    setSessionStats(prev => ({
      ...prev,
      total: prev.total + 1,
      highRisk: riskLevel === 'HIGH' ? prev.highRisk + 1 : prev.highRisk
    }))
  }

  function clearSession() {
    sessionManager.clear()
    setCurrentScreen(1)
    setInputText('')
    setAnalysis(null)
    setUserConfirmed(false)
    clearCache()
  }

  function goToScreen(screen) {
    setCurrentScreen(screen)
    sessionManager.update({ screen })
  }

  return (
    <AnalysisContext.Provider value={{
      analysis, setAnalysis,
      lang, setLang,
      loading, loadingStep,
      LOADING_STEPS, LOADING_STEPS_HI,
      userConfirmed, setUserConfirmed,
      runAnalysis,
      toast, showToast, hideToast,
      isFallbackMode,
      isDemoMode,
      clearCache,
      feedbackCount, recordFeedback,
      familyMode, setFamilyMode,
      incidentMode, setIncidentMode,
      sessionStats, updateSessionStats,
      currentScreen, setCurrentScreen: goToScreen,
      inputText, setInputText,
      clearSession
    }}>
      {children}
    </AnalysisContext.Provider>
  )
}

export function useAnalysis() {
  return useContext(AnalysisContext)
}

// Made with Bob
