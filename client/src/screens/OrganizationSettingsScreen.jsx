import { useState, useEffect } from 'react'
import { useOrganization } from '../context/OrganizationContext'
import { useAuth } from '../context/AuthContext'

export default function OrganizationSettingsScreen({ onBack }) {
  const { organization, updateOrganization, loading, error, clearError } = useOrganization()
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    primaryColor: '#3B82F6',
    accentColor: '#10B981',
    logoUrl: '',
    maxAnalysesPerMonth: 1000,
    maxMembers: 50,
    maxAnalysesPerDay: 100,
    retentionDays: 90
  })
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const isOrgAdmin = user?.orgRole === 'ORG_ADMIN' || user?.role === 'ADMIN'

  useEffect(() => {
    if (organization) {
      setFormData({
        name: organization.name || '',
        slug: organization.slug || '',
        primaryColor: organization.settings?.branding?.primaryColor || '#3B82F6',
        accentColor: organization.settings?.branding?.accentColor || '#10B981',
        logoUrl: organization.settings?.branding?.logoUrl || '',
        maxAnalysesPerMonth: organization.settings?.features?.maxAnalysesPerMonth || 1000,
        maxMembers: organization.settings?.limits?.maxMembers || 50,
        maxAnalysesPerDay: organization.settings?.limits?.maxAnalysesPerDay || 100,
        retentionDays: organization.settings?.limits?.retentionDays || 90
      })
    }
  }, [organization])

  async function handleSave(e) {
    e.preventDefault()
    if (!isOrgAdmin) return

    setSaving(true)
    setSaveSuccess(false)
    clearError()

    try {
      await updateOrganization({
        name: formData.name,
        slug: formData.slug,
        settings: {
          branding: {
            primaryColor: formData.primaryColor,
            accentColor: formData.accentColor,
            logoUrl: formData.logoUrl || null
          },
          features: {
            maxAnalysesPerMonth: parseInt(formData.maxAnalysesPerMonth)
          },
          limits: {
            maxMembers: parseInt(formData.maxMembers),
            maxAnalysesPerDay: parseInt(formData.maxAnalysesPerDay),
            retentionDays: parseInt(formData.retentionDays)
          }
        }
      })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      // Error handled by context
    } finally {
      setSaving(false)
    }
  }

  if (!organization) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-slate-400 mb-4">No organization found</p>
          <button onClick={onBack} className="text-blue-400 hover:text-blue-300">
            ← Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen px-4 py-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-slate-400 hover:text-white text-sm transition-colors">
          ← Back
        </button>
        <span className="text-slate-600">|</span>
        <span className="text-slate-300 text-sm font-medium">⚙️ Organization Settings</span>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-6 p-4 bg-red-950 border border-red-800 rounded-xl">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* Success Banner */}
      {saveSuccess && (
        <div className="mb-6 p-4 bg-emerald-950 border border-emerald-800 rounded-xl">
          <p className="text-emerald-300 text-sm">✓ Settings saved successfully</p>
        </div>
      )}

      {/* Non-admin notice */}
      {!isOrgAdmin && (
        <div className="mb-6 p-4 bg-amber-950 border border-amber-800 rounded-xl">
          <p className="text-amber-300 text-sm">
            ⚠️ You are viewing organization settings in read-only mode. Only organization administrators can make changes.
          </p>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Basic Info */}
        <div className="p-6 bg-slate-900 border border-slate-700 rounded-xl">
          <h3 className="text-white font-semibold mb-4">Basic Information</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-slate-300 text-sm mb-2">Organization Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                disabled={!isOrgAdmin}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:border-blue-500"
                required
                minLength={2}
                maxLength={100}
              />
            </div>

            <div>
              <label className="block text-slate-300 text-sm mb-2">Organization Slug</label>
              <input
                type="text"
                value={formData.slug}
                onChange={e => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                disabled={!isOrgAdmin}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-slate-200 font-mono text-sm disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:border-blue-500"
                pattern="[a-z0-9-]+"
                required
              />
              <p className="text-slate-500 text-xs mt-1">Lowercase letters, numbers, and hyphens only</p>
            </div>

            <div>
              <label className="block text-slate-300 text-sm mb-2">Organization ID</label>
              <input
                type="text"
                value={organization.id}
                disabled
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-slate-500 font-mono text-sm cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Branding */}
        <div className="p-6 bg-slate-900 border border-slate-700 rounded-xl">
          <h3 className="text-white font-semibold mb-4">Branding</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-slate-300 text-sm mb-2">Logo URL (optional)</label>
              <input
                type="url"
                value={formData.logoUrl}
                onChange={e => setFormData({ ...formData, logoUrl: e.target.value })}
                disabled={!isOrgAdmin}
                placeholder="https://example.com/logo.png"
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 text-sm mb-2">Primary Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData.primaryColor}
                    onChange={e => setFormData({ ...formData, primaryColor: e.target.value })}
                    disabled={!isOrgAdmin}
                    className="w-12 h-10 rounded-lg border border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <input
                    type="text"
                    value={formData.primaryColor}
                    onChange={e => setFormData({ ...formData, primaryColor: e.target.value })}
                    disabled={!isOrgAdmin}
                    className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-slate-200 font-mono text-sm disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:border-blue-500"
                    pattern="#[0-9A-Fa-f]{6}"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 text-sm mb-2">Accent Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData.accentColor}
                    onChange={e => setFormData({ ...formData, accentColor: e.target.value })}
                    disabled={!isOrgAdmin}
                    className="w-12 h-10 rounded-lg border border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <input
                    type="text"
                    value={formData.accentColor}
                    onChange={e => setFormData({ ...formData, accentColor: e.target.value })}
                    disabled={!isOrgAdmin}
                    className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-slate-200 font-mono text-sm disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:border-blue-500"
                    pattern="#[0-9A-Fa-f]{6}"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Limits */}
        <div className="p-6 bg-slate-900 border border-slate-700 rounded-xl">
          <h3 className="text-white font-semibold mb-4">Usage Limits</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 text-sm mb-2">Max Analyses/Month</label>
              <input
                type="number"
                value={formData.maxAnalysesPerMonth}
                onChange={e => setFormData({ ...formData, maxAnalysesPerMonth: e.target.value })}
                disabled={!isOrgAdmin}
                min="100"
                max="100000"
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 text-sm mb-2">Max Analyses/Day</label>
              <input
                type="number"
                value={formData.maxAnalysesPerDay}
                onChange={e => setFormData({ ...formData, maxAnalysesPerDay: e.target.value })}
                disabled={!isOrgAdmin}
                min="10"
                max="10000"
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 text-sm mb-2">Max Members</label>
              <input
                type="number"
                value={formData.maxMembers}
                onChange={e => setFormData({ ...formData, maxMembers: e.target.value })}
                disabled={!isOrgAdmin}
                min="1"
                max="1000"
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 text-sm mb-2">Data Retention (days)</label>
              <input
                type="number"
                value={formData.retentionDays}
                onChange={e => setFormData({ ...formData, retentionDays: e.target.value })}
                disabled={!isOrgAdmin}
                min="30"
                max="365"
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        {isOrgAdmin && (
          <button
            type="submit"
            disabled={saving || loading}
            className="w-full py-3 bg-blue-700 hover:bg-blue-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-colors"
          >
            {saving ? 'Saving...' : '💾 Save Settings'}
          </button>
        )}
      </form>
    </div>
  )
}

// Made with Bob
