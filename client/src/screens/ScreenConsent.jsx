/**
 * Consent Management Screen
 * 
 * Allows users to view and manage their data processing consents.
 * GDPR and CCPA compliant.
 */

import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n/i18nContext'
import Toast from '../components/Toast'

export default function ScreenConsent() {
  const { token } = useAuth()
  const { t } = useI18n()
  const [consents, setConsents] = useState([])
  const [consentTypes, setConsentTypes] = useState([])
  const [auditTrail, setAuditTrail] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAudit, setShowAudit] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      // Load consent types
      const typesRes = await fetch('/api/consent/types', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const typesData = await typesRes.json()
      setConsentTypes(typesData.types || [])

      // Load user consents
      const consentsRes = await fetch('/api/consent', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const consentsData = await consentsRes.json()
      setConsents(consentsData.consents || [])

      // Load audit trail
      const auditRes = await fetch('/api/consent/audit', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const auditData = await auditRes.json()
      setAuditTrail(auditData.auditTrail || [])
    } catch (error) {
      showToast('Failed to load consent data', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function grantConsent(type) {
    try {
      const consentType = consentTypes.find(t => t.type === type)
      if (!consentType) return

      const res = await fetch('/api/consent/grant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          consentType: type,
          purpose: consentType.description,
          version: '1.0'
        })
      })

      if (!res.ok) throw new Error('Failed to grant consent')

      await loadData()
      showToast('Consent granted successfully', 'success')
    } catch (error) {
      showToast(error.message, 'error')
    }
  }

  async function revokeConsent(type) {
    if (!confirm('Are you sure you want to revoke this consent? This may limit some features.')) {
      return
    }

    try {
      const res = await fetch('/api/consent/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ consentType: type })
      })

      if (!res.ok) throw new Error('Failed to revoke consent')

      await loadData()
      showToast('Consent revoked successfully', 'success')
    } catch (error) {
      showToast(error.message, 'error')
    }
  }

  function getConsentStatus(type) {
    const consent = consents.find(c => c.consentType === type)
    return consent?.status || 'not_granted'
  }

  function isConsentGranted(type) {
    return getConsentStatus(type) === 'active'
  }

  function showToast(message, type = 'info') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  function getCategoryColor(category) {
    const colors = {
      essential: 'bg-blue-900 text-blue-300',
      functional: 'bg-emerald-900 text-emerald-300',
      marketing: 'bg-purple-900 text-purple-300'
    }
    return colors[category] || 'bg-slate-800 text-slate-300'
  }

  function getStatusBadge(status) {
    const badges = {
      active: { bg: 'bg-emerald-900', text: 'text-emerald-300', label: 'Active' },
      revoked: { bg: 'bg-red-900', text: 'text-red-300', label: 'Revoked' },
      expired: { bg: 'bg-amber-900', text: 'text-amber-300', label: 'Expired' },
      not_granted: { bg: 'bg-slate-800', text: 'text-slate-400', label: 'Not Granted' }
    }
    const badge = badges[status] || badges.not_granted
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-400">Loading consent preferences...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Privacy & Consent</h1>
          <p className="text-slate-400 text-sm">
            Manage how BobSec processes your data. You have full control over your privacy.
          </p>
        </div>

        {/* Privacy notice */}
        <div className="mb-8 p-5 bg-blue-950 border border-blue-800 rounded-xl">
          <div className="flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">🔒</span>
            <div>
              <h3 className="text-blue-300 font-semibold mb-2">Your Privacy Matters</h3>
              <p className="text-blue-200 text-sm leading-relaxed mb-3">
                BobSec is committed to protecting your privacy. We only process data necessary to detect scams and keep you safe. 
                You can grant or revoke consent at any time.
              </p>
              <div className="flex items-center gap-4 text-xs text-blue-300">
                <span>✓ GDPR Compliant</span>
                <span>✓ CCPA Compliant</span>
                <span>✓ Data Minimization</span>
                <span>✓ Right to be Forgotten</span>
              </div>
            </div>
          </div>
        </div>

        {/* Consent types */}
        <div className="space-y-4 mb-8">
          {consentTypes.map(type => {
            const granted = isConsentGranted(type.type)
            const status = getConsentStatus(type.type)

            return (
              <div
                key={type.type}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-white font-semibold">{type.name}</h3>
                      {type.required && (
                        <span className="px-2 py-0.5 bg-red-900 text-red-300 rounded text-xs font-medium">
                          Required
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getCategoryColor(type.category)}`}>
                        {type.category}
                      </span>
                      {getStatusBadge(status)}
                    </div>
                    <p className="text-slate-400 text-sm">{type.description}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                  <div className="text-xs text-slate-500">
                    {granted && consents.find(c => c.consentType === type.type)?.grantedAt && (
                      <span>
                        Granted on {new Date(consents.find(c => c.consentType === type.type).grantedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {granted ? (
                      <button
                        onClick={() => revokeConsent(type.type)}
                        disabled={type.required}
                        className="px-4 py-2 bg-red-900 hover:bg-red-800 disabled:bg-slate-800 disabled:cursor-not-allowed text-red-300 disabled:text-slate-600 rounded-lg text-sm font-medium transition-colors"
                      >
                        {type.required ? 'Required' : 'Revoke'}
                      </button>
                    ) : (
                      <button
                        onClick={() => grantConsent(type.type)}
                        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        Grant Consent
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Audit trail toggle */}
        <button
          onClick={() => setShowAudit(!showAudit)}
          className="w-full py-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-colors mb-4"
        >
          {showAudit ? '▼ Hide Audit Trail' : '▶ View Audit Trail'}
        </button>

        {/* Audit trail */}
        {showAudit && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-white font-semibold mb-4">Consent Audit Trail</h3>
            {auditTrail.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">No consent history yet</p>
            ) : (
              <div className="space-y-3">
                {auditTrail.map((entry, i) => (
                  <div
                    key={i}
                    className="p-3 bg-slate-950 border border-slate-800 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-300 text-sm font-medium">
                        {consentTypes.find(t => t.type === entry.consentType)?.name || entry.consentType}
                      </span>
                      {getStatusBadge(entry.status)}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                      {entry.grantedAt && (
                        <div>
                          <span className="text-slate-600">Granted:</span>{' '}
                          {new Date(entry.grantedAt).toLocaleString()}
                        </div>
                      )}
                      {entry.revokedAt && (
                        <div>
                          <span className="text-slate-600">Revoked:</span>{' '}
                          {new Date(entry.revokedAt).toLocaleString()}
                        </div>
                      )}
                      {entry.ipAddress && (
                        <div>
                          <span className="text-slate-600">IP:</span> {entry.ipAddress}
                        </div>
                      )}
                      {entry.version && (
                        <div>
                          <span className="text-slate-600">Version:</span> {entry.version}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Data rights */}
        <div className="mt-8 p-5 bg-slate-900 border border-slate-800 rounded-xl">
          <h3 className="text-white font-semibold mb-3">Your Data Rights</h3>
          <div className="space-y-2 text-sm text-slate-400">
            <p>✓ <strong className="text-slate-300">Right to Access:</strong> Request a copy of your data</p>
            <p>✓ <strong className="text-slate-300">Right to Rectification:</strong> Correct inaccurate data</p>
            <p>✓ <strong className="text-slate-300">Right to Erasure:</strong> Request deletion of your data</p>
            <p>✓ <strong className="text-slate-300">Right to Portability:</strong> Export your data</p>
            <p>✓ <strong className="text-slate-300">Right to Object:</strong> Object to data processing</p>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-800">
            <p className="text-xs text-slate-500">
              To exercise these rights, contact us at privacy@bobsec.com or use the account settings page.
            </p>
          </div>
        </div>

        {/* Toast */}
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    </div>
  )
}

// Made with Bob
