import { useEffect } from 'react'

export default function Toast({ message, type = 'info', onClose, duration = 3000 }) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration)
      return () => clearTimeout(timer)
    }
  }, [duration, onClose])

  const styles = {
    success: 'bg-emerald-900 border-emerald-700 text-emerald-200',
    error: 'bg-red-900 border-red-700 text-red-200',
    warning: 'bg-amber-900 border-amber-700 text-amber-200',
    info: 'bg-blue-900 border-blue-700 text-blue-200'
  }

  const icons = {
    success: '✓',
    error: '✗',
    warning: '⚠',
    info: 'ℹ'
  }

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg max-w-md ${styles[type]}`}>
        <span className="text-lg flex-shrink-0">{icons[type]}</span>
        <p className="text-sm flex-1">{message}</p>
        <button 
          onClick={onClose}
          className="text-lg opacity-60 hover:opacity-100 transition-opacity flex-shrink-0"
          aria-label="Close"
        >
          ×
        </button>
      </div>
    </div>
  )
}

// Made with Bob
