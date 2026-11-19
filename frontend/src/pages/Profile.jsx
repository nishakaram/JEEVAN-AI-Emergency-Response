import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { createUser, fetchUser, addContact } from '../api/client'
import AppHeader from '../components/AppHeader'

export const USER_ID_KEY = 'jeevan_user_id'

// Shared look for white cards and form fields on the light-grey page.
const CARD = 'bg-white rounded-xl border border-slate-200 shadow-sm p-4'
const CARD_TITLE = 'text-xs font-semibold uppercase tracking-wide text-navy-500'
const LABEL = 'block text-xs font-medium text-slate-600 mb-1'
const INPUT =
  'w-full border border-slate-300 bg-white rounded-lg p-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy-400 focus:border-navy-400'
const BUTTON_PRIMARY =
  'w-full bg-navy hover:bg-navy-800 text-white text-sm font-semibold py-2.5 rounded-lg shadow-sm disabled:opacity-40 disabled:hover:bg-navy focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-400'

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
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <AppHeader />

      <main className="flex-1 flex flex-col items-center px-4 py-8">
        <div className="w-full max-w-md space-y-5">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-navy">Profile &amp; Emergency Contacts</h1>
            <Link to="/" className="text-sm underline text-navy-500 hover:text-navy">
              Back
            </Link>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3" role="alert">
              {error}
            </p>
          )}

          {checkingSaved && (
            <p className="text-sm text-slate-400 animate-pulse" role="status" aria-live="polite">
              Loading profile…
            </p>
          )}

          {!checkingSaved && !user && (
            <form onSubmit={handleCreateProfile} className={`${CARD} space-y-3`}>
              <h2 className="font-semibold text-navy">Create your profile</h2>
              <div>
                <label htmlFor="profile-name" className={LABEL}>
                  Full name
                </label>
                <input
                  id="profile-name"
                  className={INPUT}
                  placeholder="Full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="profile-phone" className={LABEL}>
                  Phone number
                </label>
                <input
                  id="profile-phone"
                  className={INPUT}
                  placeholder="Phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="profile-blood" className={LABEL}>
                  Blood group <span className="text-slate-400">(optional)</span>
                </label>
                <input
                  id="profile-blood"
                  className={INPUT}
                  placeholder="Blood group (optional)"
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="profile-notes" className={LABEL}>
                  Medical notes <span className="text-slate-400">(optional)</span>
                </label>
                <textarea
                  id="profile-notes"
                  className={`${INPUT} h-20`}
                  placeholder="Medical notes (optional, e.g. allergies)"
                  value={medicalNotes}
                  onChange={(e) => setMedicalNotes(e.target.value)}
                />
              </div>
              <button disabled={loading} className={BUTTON_PRIMARY}>
                Save Profile
              </button>
            </form>
          )}

          {user && (
            <>
              <div className={CARD}>
                <h2 className={`${CARD_TITLE} mb-2`}>Your profile</h2>
                <p className="text-lg font-semibold text-navy">{user.name}</p>
                <p className="text-sm text-slate-500">{user.phone}</p>
                {user.blood_group && (
                  <p className="text-sm text-slate-500">Blood group: {user.blood_group}</p>
                )}
                {user.medical_notes && (
                  <p className="text-sm text-slate-500">Notes: {user.medical_notes}</p>
                )}
              </div>

              <div className={`${CARD} space-y-3`}>
                <div className="flex items-center justify-between">
                  <h2 className={CARD_TITLE}>Emergency Contacts</h2>
                  <span className="text-[10px] font-semibold uppercase tracking-wide bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                    Notifications simulated
                  </span>
                </div>
                {user.contacts.length === 0 && (
                  <p className="text-sm text-slate-400">No emergency contacts added yet.</p>
                )}
                <ul className="space-y-2">
                  {user.contacts.map((c) => (
                    <li
                      key={c.id}
                      className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                    >
                      <span className="font-medium text-navy">{c.name}</span> (
                      {c.relationship_type || 'contact'}) — {c.phone}
                    </li>
                  ))}
                </ul>

                <form onSubmit={handleAddContact} className="space-y-2 pt-3 border-t border-slate-100">
                  <h3 className="text-sm font-semibold text-navy">Add a contact</h3>
                  <div>
                    <label htmlFor="contact-name" className={LABEL}>
                      Contact name
                    </label>
                    <input
                      id="contact-name"
                      className={INPUT}
                      placeholder="Contact name"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-phone" className={LABEL}>
                      Contact phone
                    </label>
                    <input
                      id="contact-phone"
                      className={INPUT}
                      placeholder="Contact phone"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-relation" className={LABEL}>
                      Relationship <span className="text-slate-400">(optional)</span>
                    </label>
                    <input
                      id="contact-relation"
                      className={INPUT}
                      placeholder="Relationship (e.g. Son, Daughter)"
                      value={contactRelation}
                      onChange={(e) => setContactRelation(e.target.value)}
                    />
                  </div>
                  <button disabled={loading} className={BUTTON_PRIMARY}>
                    Add Contact
                  </button>
                </form>
              </div>
            </>
          )}

          <p className="text-xs text-slate-500 bg-white border border-slate-200 rounded-lg p-3">
            For this prototype, contact notification is simulated — no real SMS or calls are sent.
            Details are saved to the prototype's local demo database only.
          </p>
        </div>
      </main>
    </div>
  )
}

export default Profile