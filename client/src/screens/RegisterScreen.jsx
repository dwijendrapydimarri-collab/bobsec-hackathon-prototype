import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function RegisterScreen({ onSwitchToLogin, onRegisterSuccess }) {
  const { register, loading, error, clearError } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [localError, setLocalError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLocalError('')
    clearError()

    // Validation
    if (!name || !email || !password || !confirmPassword) {
      setLocalError('All fields are required')
      return
    }

    if (name.length < 2) {
      setLocalError('Name must be at least 2 characters')
      return
    }

    if (!email.includes('@')) {
      setLocalError('Please enter a valid email address')
      return
    }

    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters')
      return
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match')
      return
    }

    const result = await register(email, password, name)
    
    if (result.success) {
      onRegisterSuccess()
    } else {
      setLocalError(result.error)
    }
  }

  const displayError = localError || error

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-4xl">🛡</span>
            <span className="text-3xl font-bold text-white">BobSec</span>
          </div>
          <p className="text-slate-400 text-sm">Create your account</p>
        </div>

        {/* Error Banner */}
        {displayError && (
          <div className="mb-6 p-4 bg-red-950 border border-red-800 rounded-xl">
            <div className="flex items-start gap-3">
              <span className="text-red-400 text-lg flex-shrink-0">⚠</span>
              <div>
                <p className="text-red-300 text-sm font-medium">Registration Failed</p>
                <p className="text-red-400 text-xs mt-1">{displayError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Register Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-slate-300 text-sm mb-2">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="John Doe"
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-600 text-sm focus:outline-none focus:border-blue-500 transition-colors"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-slate-300 text-sm mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-600 text-sm focus:outline-none focus:border-blue-500 transition-colors"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-slate-300 text-sm mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-600 text-sm focus:outline-none focus:border-blue-500 transition-colors"
              disabled={loading}
            />
            <p className="text-slate-500 text-xs mt-1">Minimum 8 characters</p>
          </div>

          <div>
            <label className="block text-slate-300 text-sm mb-2">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-600 text-sm focus:outline-none focus:border-blue-500 transition-colors"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors text-base"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        {/* Switch to Login */}
        <div className="mt-6 text-center">
          <p className="text-slate-500 text-sm">
            Already have an account?{' '}
            <button
              onClick={onSwitchToLogin}
              className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
              disabled={loading}
            >
              Sign in
            </button>
          </p>
        </div>

        {/* Security Notice */}
        <div className="mt-8 p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <p className="text-slate-400 text-xs text-center">
            🔒 Your password is hashed with bcrypt before storage. We never store plain-text passwords.
          </p>
        </div>
      </div>
    </div>
  )
}

// Made with Bob
