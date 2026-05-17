import { useAuth } from '../context/AuthContext'

export default function AccountScreen({ onBack }) {
  const { user, tenantId, logout } = useAuth()

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={onBack}
            className="text-slate-400 hover:text-white transition-colors text-sm"
          >
            ← Back
          </button>
          <span className="text-slate-600">|</span>
          <span className="text-slate-300 text-sm font-medium">Account Settings</span>
        </div>

        {/* Profile Card */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl mb-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h2 className="text-white text-xl font-bold mb-1">{user?.name}</h2>
              <p className="text-slate-400 text-sm mb-3">{user?.email}</p>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-slate-800 border border-slate-700 text-slate-300 rounded-lg text-xs font-medium">
                  {user?.role}
                </span>
                <span className="px-3 py-1 bg-slate-800 border border-slate-700 text-slate-300 rounded-lg text-xs font-medium">
                  Tenant: {tenantId}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Account Details */}
        <div className="space-y-4 mb-6">
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl">
            <p className="text-slate-400 text-xs uppercase tracking-wide mb-2">User ID</p>
            <p className="text-white text-sm font-mono">{user?.id}</p>
          </div>

          <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl">
            <p className="text-slate-400 text-xs uppercase tracking-wide mb-2">Account Created</p>
            <p className="text-white text-sm">{new Date(user?.createdAt).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</p>
          </div>

          <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl">
            <p className="text-slate-400 text-xs uppercase tracking-wide mb-2">Tenant ID</p>
            <p className="text-white text-sm font-mono">{tenantId}</p>
            <p className="text-slate-500 text-xs mt-1">Your analyses are scoped to this tenant</p>
          </div>
        </div>

        {/* Security Section */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl mb-6">
          <h3 className="text-white text-sm font-semibold mb-3">Security</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-300 text-sm">Password</p>
                <p className="text-slate-500 text-xs">Last changed: Never</p>
              </div>
              <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg text-xs transition-colors">
                Change Password
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-300 text-sm">Two-Factor Authentication</p>
                <p className="text-slate-500 text-xs">Not enabled</p>
              </div>
              <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg text-xs transition-colors">
                Enable 2FA
              </button>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="p-5 bg-red-950 border border-red-900 rounded-xl">
          <h3 className="text-red-300 text-sm font-semibold mb-3">Danger Zone</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-200 text-sm">Delete Account</p>
              <p className="text-red-400 text-xs">Permanently delete your account and all data</p>
            </div>
            <button className="px-4 py-2 bg-red-900 hover:bg-red-800 border border-red-800 text-red-200 rounded-lg text-xs transition-colors">
              Delete Account
            </button>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={logout}
          className="w-full mt-6 py-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-colors"
        >
          🚪 Logout
        </button>

        {/* Footer */}
        <div className="mt-6 p-4 bg-slate-900 border border-slate-800 rounded-xl text-center">
          <p className="text-slate-500 text-xs">
            BobSec v2.0.0 | Powered by IBM Bob & watsonx.ai
          </p>
        </div>
      </div>
    </div>
  )
}

// Made with Bob
