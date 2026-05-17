import { useState, useEffect } from 'react'
import { useOrganization } from '../context/OrganizationContext'
import { useAuth } from '../context/AuthContext'

export default function OrganizationMembersScreen({ onBack }) {
  const { organization, fetchMembers, inviteMember, removeMember, error, clearError } = useOrganization()
  const { user } = useAuth()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteSuccess, setInviteSuccess] = useState(null)
  const [removing, setRemoving] = useState(null)

  const isOrgAdmin = user?.orgRole === 'ORG_ADMIN' || user?.role === 'ADMIN'

  useEffect(() => {
    loadMembers()
  }, [organization])

  async function loadMembers() {
    if (!organization) return
    
    setLoading(true)
    try {
      const membersList = await fetchMembers()
      setMembers(membersList)
    } catch (err) {
      // Error handled by context
    } finally {
      setLoading(false)
    }
  }

  async function handleInvite(e) {
    e.preventDefault()
    if (!inviteEmail || !isOrgAdmin) return

    setInviting(true)
    setInviteSuccess(null)
    clearError()

    try {
      const result = await inviteMember(inviteEmail)
      setInviteSuccess(result.message || 'Member invited successfully')
      setInviteEmail('')
      await loadMembers() // Refresh member list
      setTimeout(() => setInviteSuccess(null), 5000)
    } catch (err) {
      // Error handled by context
    } finally {
      setInviting(false)
    }
  }

  async function handleRemove(memberId) {
    if (!isOrgAdmin || !confirm('Are you sure you want to remove this member?')) return

    setRemoving(memberId)
    clearError()

    try {
      await removeMember(memberId)
      await loadMembers() // Refresh member list
    } catch (err) {
      // Error handled by context
    } finally {
      setRemoving(null)
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
        <span className="text-slate-300 text-sm font-medium">👥 Organization Members</span>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-6 p-4 bg-red-950 border border-red-800 rounded-xl">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* Success Banner */}
      {inviteSuccess && (
        <div className="mb-6 p-4 bg-emerald-950 border border-emerald-800 rounded-xl">
          <p className="text-emerald-300 text-sm">✓ {inviteSuccess}</p>
        </div>
      )}

      {/* Invite Form */}
      {isOrgAdmin && (
        <div className="mb-6 p-6 bg-slate-900 border border-slate-700 rounded-xl">
          <h3 className="text-white font-semibold mb-4">Invite New Member</h3>
          <form onSubmit={handleInvite} className="flex gap-3">
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="member@example.com"
              className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              required
            />
            <button
              type="submit"
              disabled={inviting || !inviteEmail}
              className="px-6 py-2 bg-blue-700 hover:bg-blue-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-colors"
            >
              {inviting ? 'Inviting...' : '✉️ Invite'}
            </button>
          </form>
          <p className="text-slate-500 text-xs mt-2">
            If the user already has an account, they'll be added immediately. Otherwise, they'll receive an invitation email.
          </p>
        </div>
      )}

      {/* Members List */}
      <div className="p-6 bg-slate-900 border border-slate-700 rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Members ({members.length})</h3>
          {!isOrgAdmin && (
            <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded">View Only</span>
          )}
        </div>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-slate-400 text-sm">Loading members...</p>
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-400 text-sm">No members yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {members.map(member => {
              const isOwner = member.id === organization.ownerId
              const isCurrentUser = member.id === user?.id
              const canRemove = isOrgAdmin && !isOwner && !isCurrentUser

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 bg-slate-800 border border-slate-700 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-blue-900 border border-blue-700 flex items-center justify-center text-blue-300 font-semibold">
                      {member.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">{member.name}</span>
                        {isCurrentUser && (
                          <span className="text-xs bg-blue-900 text-blue-300 px-2 py-0.5 rounded-full">You</span>
                        )}
                        {isOwner && (
                          <span className="text-xs bg-amber-900 text-amber-300 px-2 py-0.5 rounded-full">Owner</span>
                        )}
                        {member.orgRole === 'ORG_ADMIN' && !isOwner && (
                          <span className="text-xs bg-purple-900 text-purple-300 px-2 py-0.5 rounded-full">Admin</span>
                        )}
                      </div>
                      <p className="text-slate-400 text-sm">{member.email}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {member.role !== 'USER' && (
                      <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded">
                        {member.role}
                      </span>
                    )}
                    {canRemove && (
                      <button
                        onClick={() => handleRemove(member.id)}
                        disabled={removing === member.id}
                        className="px-3 py-1 text-xs bg-red-900 hover:bg-red-800 disabled:bg-slate-700 text-red-300 hover:text-red-200 disabled:text-slate-500 rounded transition-colors"
                      >
                        {removing === member.id ? 'Removing...' : 'Remove'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-950 border border-blue-800 rounded-xl">
        <p className="text-blue-300 text-xs">
          <span className="font-semibold">💡 Member Roles:</span>
          {' '}
          <span className="text-blue-400">Owner</span> — Full control, cannot be removed.
          {' '}
          <span className="text-blue-400">Admin</span> — Can manage settings and members.
          {' '}
          <span className="text-blue-400">Member</span> — Can use BobSec features.
        </p>
      </div>
    </div>
  )
}

// Made with Bob
