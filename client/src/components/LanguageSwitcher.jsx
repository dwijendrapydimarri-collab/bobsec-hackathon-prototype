import { useState, useRef, useEffect } from 'react'
import { useI18n } from '../i18n/i18nContext'

export default function LanguageSwitcher({ className = '' }) {
  const { language, changeLanguage, getSupportedLanguages, getCurrentLanguage, t } = useI18n()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  const languages = getSupportedLanguages()
  const currentLang = getCurrentLanguage()

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Close dropdown on Escape key
  useEffect(() => {
    function handleEscape(event) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  function handleLanguageChange(langCode) {
    changeLanguage(langCode)
    setIsOpen(false)
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setIsOpen(!isOpen)
          }
        }}
        className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-950"
        aria-label={t('accessibility.toggleLanguage')}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className="text-base">🌐</span>
        <span className="font-medium">{currentLang.nativeName}</span>
        <span className="text-xs">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-lg overflow-hidden z-50"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="language-menu"
        >
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleLanguageChange(lang.code)
                }
              }}
              className={`w-full px-4 py-3 text-left text-sm transition-colors focus:outline-none focus:bg-slate-700 ${
                language === lang.code
                  ? 'bg-blue-900 text-white font-medium'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
              role="menuitem"
              aria-current={language === lang.code ? 'true' : 'false'}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{lang.nativeName}</div>
                  <div className="text-xs opacity-75">{lang.name}</div>
                </div>
                {language === lang.code && (
                  <span className="text-blue-300" aria-label="Selected">✓</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Screen reader announcement */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {t('accessibility.currentLanguage', { language: currentLang.name })}
      </div>
    </div>
  )
}

// Made with Bob
