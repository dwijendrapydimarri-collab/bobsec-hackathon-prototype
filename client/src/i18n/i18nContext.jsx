import { createContext, useContext, useState, useEffect } from 'react'
import enTranslations from './translations/en.json'
import hiTranslations from './translations/hi.json'

const I18nContext = createContext(null)

const translations = {
  en: enTranslations,
  hi: hiTranslations
}

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' }
]

const STORAGE_KEY = 'bobsec_language'
const DEFAULT_LANGUAGE = 'en'

export function I18nProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    // Load from localStorage or browser preference
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && translations[stored]) {
      return stored
    }
    
    // Check browser language
    const browserLang = navigator.language.split('-')[0]
    if (translations[browserLang]) {
      return browserLang
    }
    
    return DEFAULT_LANGUAGE
  })

  // Persist language preference
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language)
    document.documentElement.lang = language
  }, [language])

  /**
   * Get translated string by key path
   * @param {string} key - Dot-notation key (e.g., 'common.back')
   * @param {object} params - Optional parameters for interpolation
   * @returns {string} Translated string
   */
  function t(key, params = {}) {
    const keys = key.split('.')
    let value = translations[language]
    
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k]
      } else {
        // Fallback to English if key not found
        value = translations[DEFAULT_LANGUAGE]
        for (const fallbackKey of keys) {
          if (value && typeof value === 'object') {
            value = value[fallbackKey]
          } else {
            return key // Return key if not found in fallback
          }
        }
        break
      }
    }
    
    if (typeof value !== 'string') {
      return key
    }
    
    // Interpolate parameters
    return value.replace(/\{\{(\w+)\}\}/g, (match, param) => {
      return params[param] !== undefined ? params[param] : match
    })
  }

  /**
   * Change current language
   * @param {string} newLanguage - Language code
   */
  function changeLanguage(newLanguage) {
    if (translations[newLanguage]) {
      setLanguage(newLanguage)
    }
  }

  /**
   * Get all supported languages
   * @returns {Array} Array of language objects
   */
  function getSupportedLanguages() {
    return SUPPORTED_LANGUAGES
  }

  /**
   * Get current language info
   * @returns {object} Current language object
   */
  function getCurrentLanguage() {
    return SUPPORTED_LANGUAGES.find(lang => lang.code === language) || SUPPORTED_LANGUAGES[0]
  }

  const value = {
    language,
    t,
    changeLanguage,
    getSupportedLanguages,
    getCurrentLanguage
  }

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  )
}

/**
 * Hook to use i18n in components
 * @returns {object} i18n context value
 */
export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider')
  }
  return context
}

/**
 * HOC to inject i18n into components
 * @param {Component} Component - React component
 * @returns {Component} Wrapped component with i18n props
 */
export function withI18n(Component) {
  return function WrappedComponent(props) {
    const i18n = useI18n()
    return <Component {...props} i18n={i18n} />
  }
}

// Made with Bob
