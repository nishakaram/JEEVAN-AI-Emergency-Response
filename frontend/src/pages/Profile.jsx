import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { createUser, fetchUser, addContact } from '../api/client'

export const USER_ID_KEY = 'jeevan_user_id'

function Profile() {
  const [userId, setUserId] = useState(() => localStorage.getItem(USER_ID_KEY))
  const [user, setUser] = useState(null)
  const [checkingSaved, setCheckingSaved] = useState(() => !!localStorage.getItem(USER_ID_KEY))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [bloodGroup, setBloodGroup] = useState('')
  const [medicalNotes, setMedicalNotes] = useState('')

  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactRelation, setContactRelation] = useState('')

  useEffect(() => {
    if (!userId) {
      setCheckingSaved(false)
      return
    }
    fetchUser(userId)
      .then((data) => {
        setUser(data)
        setCheckingSaved(false)
      })
      .catch(() => {
        // Saved id no longer exists (e.g. database was reset) — clear it
        // so the create-profile form shows again instead of erroring.
        localStorage.removeItem(USER_ID_KEY)
        setUserId(null)
        setCheckingSaved(false)
      })
  }, [userId])

  const handleCreateProfile = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const created = await createUser({
        name,
        phone,
        blood_group: bloodGroup || undefined,
        medical_notes: medicalNotes || undefined,
      })
      localStorage.setItem(USER_ID_KEY, created.id)
      setUserId(created.id)
      setUser(created)
    } catch {
      setError('Could not create profile. Make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  const handleAddContact = async (e) => {
    e.preventDefault()
    if (!userId) return
    setLoading(true)
    setError(null)
    try {
      await addContact(userId, {
        name: contactName,
        phone: contactPhone,
        relationship_type: contactRelation || undefined,
      })
      const refreshed = await fetchUser(userId)
      setUser(refreshed)
      setContactName('')
      setContactPhone('')
      setContactRelation('')
    } catch {
      setError('Could not add contact.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-800">Profile &amp; Emergency Contacts</h1>
          <Link to="/" className="text-sm underline text-slate-500">
            Back
          </Link>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {checkingSaved && (
          <p className="text-sm text-slate-400 animate-pulse">Loading profile…</p>
        )}

        {!checkingSaved && !user && (
          <form onSubmit={handleCreateProfile} className="bg-white rounded-lg shadow p-4 space-y-3">
            <h2 className="font-semibold text-slate-700">Create your profile</h2>
            <input
              className="w-full border border-slate-300 rounded-lg p-2"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <input
              className="w-full border border-slate-300 rounded-lg p-2"
              placeholder="Phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            <input
              className="w-full border border-slate-300 rounded-lg p-2"
              placeholder="Blood group (optional)"
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value)}
            />
            <textarea
              className="w-full border border-slate-300 rounded-lg p-2 h-20"
              placeholder="Medical notes (optional, e.g. allergies)"
              value={medicalNotes}
              onChange={(e) => setMedicalNotes(e.target.value)}
            />
            <button
              disabled={loading}
              className="w-full bg-emergency text-white font-semibold py-2 rounded-lg disabled:opacity-40"
            >
              Save Profile
            </button>
          </form>
        )}

        {user && (
          <>
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="font-semibold text-slate-700 mb-1">{user.name}</h2>
              <p className="text-sm text-slate-500">{user.phone}</p>
              {user.blood_group && (
                <p className="text-sm text-slate-500">Blood group: {user.blood_group}</p>
              )}
              {user.medical_notes && (
                <p className="text-sm text-slate-500">Notes: {user.medical_notes}</p>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-4 space-y-3">
              <h2 className="font-semibold text-slate-700">Emergency Contacts</h2>
              {user.contacts.length === 0 && (
                <p className="text-sm text-slate-400">No emergency contacts added yet.</p>
              )}
              <ul className="space-y-1">
                {user.contacts.map((c) => (
                  <li key={c.id} className="text-sm text-slate-600">
                    {c.name} ({c.relationship_type || 'contact'}) — {c.phone}
                  </li>
                ))}
              </ul>

              <form onSubmit={handleAddContact} className="space-y-2 pt-2 border-t border-slate-100">
                <input
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                  placeholder="Contact name"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  required
                />
                <input
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                  placeholder="Contact phone"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  required
                />
                <input
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                  placeholder="Relationship (e.g. Son, Daughter)"
                  value={contactRelation}
                  onChange={(e) => setContactRelation(e.target.value)}
                />
                <button
                  disabled={loading}
                  className="w-full bg-slate-800 text-white text-sm font-semibold py-2 rounded-lg disabled:opacity-40"
                >
                  Add Contact
                </button>
              </form>
            </div>
          </>
        )}

        <p className="text-xs text-slate-400">
          For this prototype, contact notification is simulated — no real SMS or calls are sent.
        </p>
      </div>
    </div>
  )
}

export default Profile
