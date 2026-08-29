import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useGeolocation } from '../hooks/useGeolocation'
import { createEmergency } from '../api/client'
import SeverityBadge from '../components/SeverityBadge'
import VoiceInput from '../components/VoiceInput'
import { USER_ID_KEY } from './Profile'

const STAGES = {
  IDLE: 'idle',
  LOCATING: 'locating',
  DESCRIBE: 'describe',
  SUBMITTING: 'submitting',
  DONE: 'done',
  ERROR: 'error',
}

// The exact scenario from the project brief's presentation demo. One
// click fills in the location (skipping the GPS permission dialog, which
// can stall a live demo) and the description text, so a presenter can
// run the whole flow repeatably in front of an audience.
const DEMO_SCENARIO_TEXT =
  'An elderly person has been hit by a vehicle. He is unconscious and bleeding.'

function Home() {
  const { location, status: geoStatus, requestLocation, useDemoLocation } = useGeolocation()
  const [stage, setStage] = useState(STAGES.IDLE)
  const [description, setDescription] = useState('')
  const [emergency, setEmergency] = useState(null)
  const [error, setError] = useState(null)

  // Once the browser resolves (or fails to resolve) GPS, move on to the
  // description step automatically — the user should never be stuck
  // staring at a spinner.
  useEffect(() => {
    if (
      stage === STAGES.LOCATING &&
      (geoStatus === 'success' || geoStatus === 'denied' || geoStatus === 'unsupported')
    ) {
      setStage(STAGES.DESCRIBE)
    }
  }, [geoStatus, stage])

  const startEmergency = () => {
    setStage(STAGES.LOCATING)
    requestLocation()
  }

  const runDemoScenario = () => {
    useDemoLocation()
    setDescription(DEMO_SCENARIO_TEXT)
    setStage(STAGES.DESCRIBE)
  }

  const handleSubmit = async () => {
    if (!description.trim()) return
    setStage(STAGES.SUBMITTING)
    setError(null)
    try {
      // If GPS never resolved, fall back to the Jaipur demo location so
      // the request can still go through.
      const loc = location || {
        latitude: 26.9124,
        longitude: 75.7873,
        label: 'Jaipur (Demo Location)',
      }
      const result = await createEmergency({
        description_text: description,
        latitude: loc.latitude,
        longitude: loc.longitude,
        location_label: loc.label,
        user_id: localStorage.getItem(USER_ID_KEY)
          ? Number(localStorage.getItem(USER_ID_KEY))
          : undefined,
      })
      setEmergency(result)
      setStage(STAGES.DONE)
    } catch (err) {
      setError('Could not reach the JEEVAN backend. Make sure it is running on localhost:8000.')
      setStage(STAGES.ERROR)
    }
  }

  const reset = () => {
    setStage(STAGES.IDLE)
    setDescription('')
    setEmergency(null)
    setError(null)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-800 mb-1">JEEVAN</h1>
      <p className="text-slate-500 text-sm mb-8 text-center max-w-sm">
        AI-assisted emergency response prototype. Not a substitute for
        official emergency services.
      </p>

      {stage === STAGES.IDLE && (
        <div className="flex gap-4 mb-6">
          <Link to="/profile" className="text-xs underline text-slate-400">
            Manage profile &amp; emergency contacts
          </Link>
          <Link to="/dashboard" className="text-xs underline text-slate-400">
            Responder dashboard
          </Link>
        </div>
      )}

      {stage === STAGES.IDLE && (
        <button
          onClick={startEmergency}
          className="w-64 h-64 rounded-full bg-emergency text-white text-2xl font-bold shadow-lg active:scale-95 transition-transform leading-snug focus:outline-none focus-visible:ring-4 focus-visible:ring-red-300"
        >
          REQUEST
          <br />
          EMERGENCY
          <br />
          HELP
        </button>
      )}

      {stage === STAGES.IDLE && (
        <button
          onClick={runDemoScenario}
          className="mt-6 text-sm px-4 py-2 rounded-full border border-slate-300 text-slate-500 hover:border-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        >
          ▶ Run Demo Scenario
        </button>
      )}

      {stage === STAGES.LOCATING && (
        <div className="text-center text-slate-600" role="status" aria-live="polite">
          <div className="animate-pulse text-lg">Getting your location…</div>
        </div>
      )}

      {stage === STAGES.DESCRIBE && (
        <div className="w-full max-w-md space-y-4">
          <LocationBadge location={location} geoStatus={geoStatus} onUseDemo={useDemoLocation} />
          <VoiceInput onTranscript={setDescription} />
          <textarea
            className="w-full border border-slate-300 rounded-lg p-3 h-32 text-lg"
            placeholder="Describe the emergency (e.g. 'There has been an accident, my father is unconscious and bleeding')"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            autoFocus
          />
          <button
            onClick={handleSubmit}
            disabled={!description.trim()}
            className="w-full bg-emergency text-white text-lg font-semibold py-3 rounded-lg disabled:opacity-40 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-300"
          >
            Send Emergency Request
          </button>
        </div>
      )}

      {stage === STAGES.SUBMITTING && (
        <div className="text-slate-600 text-lg animate-pulse" role="status" aria-live="polite">
          Sending emergency request…
        </div>
      )}

      {stage === STAGES.ERROR && (
        <div className="text-center space-y-4" role="alert">
          <p className="text-red-600">{error}</p>
          <button onClick={reset} className="underline text-slate-600">
            Try again
          </button>
        </div>
      )}

      {stage === STAGES.DONE && emergency && (
        <div className="w-full max-w-md space-y-4">
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="font-semibold text-lg mb-2">Emergency #{emergency.id} received</h2>
            <ul className="space-y-1 text-sm text-slate-600">
              {emergency.events.map((ev) => (
                <li key={ev.id}>✓ {ev.description || ev.event_type}</li>
              ))}
            </ul>
          </div>

          {emergency.emergency_type && (
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs uppercase tracking-wide text-slate-400">
                  AI Emergency Assessment
                </h3>
                <SeverityBadge severity={emergency.severity} />
              </div>
              <p className="text-lg font-semibold text-slate-800">{emergency.emergency_type}</p>
              <p className="text-sm text-slate-600 mt-1">{emergency.ai_summary}</p>
              <p className="text-sm text-slate-500 mt-1">
                Needs: {emergency.assistance_required}
              </p>
              {emergency.indicators && JSON.parse(emergency.indicators).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {JSON.parse(emergency.indicators).map((ind) => (
                    <span
                      key={ind}
                      className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full"
                    >
                      {ind}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-xs text-slate-400 mt-2">
                AI-assisted classification — not a medical diagnosis.
              </p>
            </div>
          )}

          {emergency.assigned_responder && (
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-emergency">
              <h3 className="text-xs uppercase tracking-wide text-slate-400 mb-1">
                Recommended Responder
              </h3>
              <p className="text-lg font-semibold text-slate-800">
                {emergency.assigned_responder.name}
              </p>
              <p className="text-sm text-slate-500">
                {emergency.assigned_responder.type} · {emergency.assigned_responder.availability}
              </p>
              <p className="text-sm text-slate-600 mt-1">
                {emergency.assigned_responder.capabilities}
              </p>
            </div>
          )}

          <ContactsNotifiedCard events={emergency.events} />

          <Link
            to={`/tracking/${emergency.id}`}
            className="block text-center bg-slate-800 text-white text-sm font-semibold py-2 rounded-lg"
          >
            View Live Tracking
          </Link>

          <p className="text-xs text-slate-400">
            This is a prototype. AI classifications are not medical
            diagnoses, and all responder data is demonstration data — not
            real emergency services. In a real emergency, contact official
            emergency services.
          </p>
          <button onClick={reset} className="underline text-slate-600 text-sm">
            Start a new request
          </button>
        </div>
      )}
    </div>
  )
}

function LocationBadge({ location, geoStatus, onUseDemo }) {
  if (geoStatus === 'denied' || geoStatus === 'unsupported') {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 flex items-center justify-between gap-2">
        <span>Location unavailable — using demo mode.</span>
        <button onClick={onUseDemo} className="underline whitespace-nowrap">
          Use demo location
        </button>
      </div>
    )
  }
  if (location) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-800">
        Location captured: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
        {location.isDemo && ' (demo)'}
      </div>
    )
  }
  return null
}

function ContactsNotifiedCard({ events }) {
  const notified = events.filter((ev) => ev.event_type === 'emergency_contact_notified')
  const noneOnFile = events.some((ev) => ev.event_type === 'no_contacts_notified')

  if (notified.length === 0 && !noneOnFile) return null

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-xs uppercase tracking-wide text-slate-400 mb-2">
        Emergency Contact Notification
      </h3>
      {notified.length > 0 ? (
        <ul className="space-y-1 text-sm text-slate-600">
          {notified.map((ev) => (
            <li key={ev.id}>✓ {ev.description}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">
          No emergency contacts on file.{' '}
          <Link to="/profile" className="underline">
            Add some
          </Link>{' '}
          so they can be notified next time.
        </p>
      )}
      <p className="text-xs text-slate-400 mt-2">Simulated — no real SMS/calls were sent.</p>
    </div>
  )
}

export default Home
