import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { OrganizationProvider } from './context/OrganizationContext'
import { AnalysisProvider, useAnalysis } from './context/AnalysisContext'
import { I18nProvider } from './i18n/i18nContext'
import Toast from './components/Toast'
import AuthBanner from './components/AuthBanner'
import SkipLink from './components/SkipLink'
import LanguageSwitcher from './components/LanguageSwitcher'
import LoginScreen from './screens/LoginScreen'
import RegisterScreen from './screens/RegisterScreen'
import DashboardScreen from './screens/DashboardScreen'
import AccountScreen from './screens/AccountScreen'
import OrganizationSettingsScreen from './screens/OrganizationSettingsScreen'
import OrganizationMembersScreen from './screens/OrganizationMembersScreen'
import HistoryScreen from './screens/HistoryScreen'
import HistoryDetailScreen from './screens/HistoryDetailScreen'
import Screen1Input from './screens/Screen1Input'
import Screen2Analysis from './screens/Screen2Analysis'
import Screen3Trace from './screens/Screen3Trace'
import Screen4Evidence from './screens/Screen4Evidence'
import Screen5Report from './screens/Screen5Report'
import LabsView from './screens/LabsView'

function AppContent() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const [authScreen, setAuthScreen] = useState('login') // 'login' | 'register'
  const [screen, setScreen] = useState('dashboard') // 'dashboard' | 'account' | 'org-settings' | 'org-members' | 'analysis' | 'history' | 'history-detail'
  const [selectedHistoryAnalysis, setSelectedHistoryAnalysis] = useState(null)
  const { toast, hideToast, currentScreen, setCurrentScreen, clearSession, setAnalysis } = useAnalysis()

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <span className="text-5xl mb-4 block">🛡</span>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    )
  }

  // Unauthenticated: Show login/register
  if (!isAuthenticated) {
    return (
      <>
        <div className="min-h-screen bg-slate-950 text-slate-100">
          {authScreen === 'login' && (
            <LoginScreen
              onSwitchToRegister={() => setAuthScreen('register')}
              onLoginSuccess={() => setScreen('dashboard')}
            />
          )}
          {authScreen === 'register' && (
            <RegisterScreen
              onSwitchToLogin={() => setAuthScreen('login')}
              onRegisterSuccess={() => setScreen('dashboard')}
            />
          )}
        </div>
        {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} duration={toast.duration} />}
      </>
    )
  }

  // Authenticated: Show dashboard or analysis flow
  function goToAnalysisScreen(n) {
    setCurrentScreen(n)
  }
  
  function goBackInAnalysis() {
    setCurrentScreen(s => Math.max(1, s - 1))
  }

  function goToLabs() {
    setCurrentScreen(99)
  }

  function startNewAnalysis() {
    clearSession()
    setScreen('analysis')
  }

  function viewHistoryAnalysis(analysis) {
    setSelectedHistoryAnalysis(analysis)
    setAnalysis(analysis)
    setScreen('history-detail')
  }

  return (
    <>
      <SkipLink />
      <AuthBanner
        onViewAccount={() => setScreen('account')}
        onViewOrgSettings={() => setScreen('org-settings')}
        onViewOrgMembers={() => setScreen('org-members')}
        onViewHistory={() => setScreen('history')}
      />
      <div
        id="main-content"
        className="min-h-screen bg-slate-950 text-slate-100"
        style={{ paddingTop: isAuthenticated ? '48px' : '0' }}
        role="main"
        aria-label="Main content"
      >
        {screen === 'dashboard' && (
          <DashboardScreen
            onStartAnalysis={startNewAnalysis}
            onViewAccount={() => setScreen('account')}
            onViewOrgSettings={() => setScreen('org-settings')}
            onViewHistory={() => setScreen('history')}
          />
        )}
        {screen === 'account' && (
          <AccountScreen onBack={() => setScreen('dashboard')} />
        )}
        {screen === 'org-settings' && (
          <OrganizationSettingsScreen onBack={() => setScreen('dashboard')} />
        )}
        {screen === 'org-members' && (
          <OrganizationMembersScreen onBack={() => setScreen('dashboard')} />
        )}
        {screen === 'history' && (
          <HistoryScreen
            onBack={() => setScreen('dashboard')}
            onViewAnalysis={viewHistoryAnalysis}
          />
        )}
        {screen === 'history-detail' && selectedHistoryAnalysis && (
          <HistoryDetailScreen
            analysis={selectedHistoryAnalysis}
            onBack={() => setScreen('history')}
          />
        )}
        {screen === 'analysis' && (
          <>
            {currentScreen === 1 && <Screen1Input onAnalyse={() => goToAnalysisScreen(2)} onLabs={goToLabs} onBackToDashboard={() => setScreen('dashboard')} />}
            {currentScreen === 2 && <Screen2Analysis onBack={goBackInAnalysis} onTrace={() => goToAnalysisScreen(3)} onEvidence={() => goToAnalysisScreen(4)} />}
            {currentScreen === 3 && <Screen3Trace onBack={goBackInAnalysis} onEvidence={() => goToAnalysisScreen(4)} onLabs={goToLabs} />}
            {currentScreen === 4 && <Screen4Evidence onBack={goBackInAnalysis} onReport={() => goToAnalysisScreen(5)} />}
            {currentScreen === 5 && <Screen5Report onBack={goBackInAnalysis} />}
            {currentScreen === 99 && <LabsView onBack={() => goToAnalysisScreen(1)} />}
          </>
        )}
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} duration={toast.duration} />}
    </>
  )
}

export default function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <OrganizationProvider>
          <AnalysisProvider>
            <AppContent />
          </AnalysisProvider>
        </OrganizationProvider>
      </AuthProvider>
    </I18nProvider>
  )
}

// Made with Bob
