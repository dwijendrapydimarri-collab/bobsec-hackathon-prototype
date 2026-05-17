import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useOrganization } from '../context/OrganizationContext'
import LanguageSwitcher from './LanguageSwitcher'

export default function AuthBanner({ onViewAccount, onViewOrgSettings, onViewOrgMembers, onViewHistory }) {
  const { user, logout, isAuthenticated } = useAuth()
  const { organization } = useOrganization()
  const [showOrgMenu, setShowOrgMenu] = useState(false)

  if (!isAuthenticated || !user) return null

  const isOrgAdmin = user?.orgRole === 'ORG_ADMIN' || user?.role === 'ADMIN'

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">🛡</span>
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-sm">Logged in as</span>
            <span className="text-white text-sm font-medium">{user.name}</span>
            {user.role !== 'USER' && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900 text-blue-300 font-medium">
                {user.role}
              </span>
            )}
            {organization && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                {organization.name}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {organization && (
            <div className="relative">
              <button
                onClick={() => setShowOrgMenu(!showOrgMenu)}
                className="px-3 py-1.5 text-sm text-slate-300 hover:text-white transition-colors flex items-center gap-1"
              >
                Organization
                <span className="text-xs">{showOrgMenu ? '▲' : '▼'}</span>
              </button>
              {showOrgMenu && (
                <div className="absolute right-0 mt-1 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-lg overflow-hidden">
                  {isOrgAdmin && (
                    <button
                      onClick={() => {
                        setShowOrgMenu(false)
                        onViewOrgSettings()
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                    >
                      ⚙️ Settings
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowOrgMenu(false)
                      onViewOrgMembers()
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                  >
                    👥 Members
                  </button>
                </div>
              )}
            </div>
          )}
          <LanguageSwitcher />
          <button
            onClick={onViewHistory}
            className="px-3 py-1.5 text-sm text-slate-300 hover:text-white transition-colors"
            aria-label="View analysis history"
          >
            📚 History
          </button>
          <button
            onClick={onViewAccount}
            className="px-3 py-1.5 text-sm text-slate-300 hover:text-white transition-colors"
            aria-label="View account settings"
          >
            Account
          </button>
          <button
            onClick={logout}
            className="px-3 py-1.5 text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors"
            aria-label="Logout"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  )
}

// Made with Bob
