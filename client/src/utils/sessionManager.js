// Session state management for analysis flow
// Persists analysis progress to localStorage and restores on app mount

const SESSION_KEY = 'bobsec_session_state'
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000 // 24 hours

export const sessionManager = {
  /**
   * Save current analysis state to localStorage
   * @param {Object} state - Current analysis state
   * @param {number} state.screen - Current screen number (1-5)
   * @param {string} state.input - User input text
   * @param {Object} state.analysis - Analysis result (if available)
   * @param {string} state.lang - Current language
   */
  save(state) {
    try {
      const sessionData = {
        ...state,
        timestamp: Date.now(),
        version: '1.0'
      }
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData))
    } catch (err) {
      console.error('Failed to save session:', err)
    }
  },

  /**
   * Restore session state from localStorage
   * @returns {Object|null} Restored state or null if no valid session
   */
  restore() {
    try {
      const stored = localStorage.getItem(SESSION_KEY)
      if (!stored) return null

      const sessionData = JSON.parse(stored)
      
      // Check if session has expired
      if (Date.now() - sessionData.timestamp > SESSION_TIMEOUT) {
        this.clear()
        return null
      }

      // Validate session data structure
      if (!sessionData.screen || !sessionData.lang) {
        this.clear()
        return null
      }

      return {
        screen: sessionData.screen,
        input: sessionData.input || '',
        analysis: sessionData.analysis || null,
        lang: sessionData.lang || 'en',
        timestamp: sessionData.timestamp
      }
    } catch (err) {
      console.error('Failed to restore session:', err)
      this.clear()
      return null
    }
  },

  /**
   * Clear session state
   */
  clear() {
    try {
      localStorage.removeItem(SESSION_KEY)
    } catch (err) {
      console.error('Failed to clear session:', err)
    }
  },

  /**
   * Check if a valid session exists
   * @returns {boolean}
   */
  exists() {
    try {
      const stored = localStorage.getItem(SESSION_KEY)
      if (!stored) return false

      const sessionData = JSON.parse(stored)
      return Date.now() - sessionData.timestamp < SESSION_TIMEOUT
    } catch (err) {
      return false
    }
  },

  /**
   * Get session age in milliseconds
   * @returns {number|null}
   */
  getAge() {
    try {
      const stored = localStorage.getItem(SESSION_KEY)
      if (!stored) return null

      const sessionData = JSON.parse(stored)
      return Date.now() - sessionData.timestamp
    } catch (err) {
      return null
    }
  },

  /**
   * Update specific fields in session without replacing entire state
   * @param {Object} updates - Fields to update
   */
  update(updates) {
    try {
      const stored = localStorage.getItem(SESSION_KEY)
      if (!stored) {
        this.save(updates)
        return
      }

      const sessionData = JSON.parse(stored)
      const updated = {
        ...sessionData,
        ...updates,
        timestamp: Date.now()
      }
      localStorage.setItem(SESSION_KEY, JSON.stringify(updated))
    } catch (err) {
      console.error('Failed to update session:', err)
    }
  }
}

/**
 * Hook for React components to use session management
 */
export function useSession() {
  const save = (state) => sessionManager.save(state)
  const restore = () => sessionManager.restore()
  const clear = () => sessionManager.clear()
  const exists = () => sessionManager.exists()
  const update = (updates) => sessionManager.update(updates)

  return { save, restore, clear, exists, update }
}

// Made with Bob
