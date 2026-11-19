import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useGeolocation } from '../hooks/useGeolocation'
import { createEmergency, fetchNearbyResponders } from '../api/client'
import AppHeader from '../components/AppHeader'
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

// Shared look for white cards on the light-grey page background.
const CARD = 'bg-white rounded-xl border border-slate-200 shadow-sm p-4'
const CARD_TITLE = 'text-xs font-semibold uppercase tracking-wide text-navy-500'

// The backend stores `indicators` as a JSON-encoded string. Parse it once,
// defensively, so a malformed value can never crash the results screen.
function parseIndicators(raw) {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

// Display-only: the backend logs "... assigned. ETA ~N min." Make it
// explicit on screen that this number is an illustrative estimate.
// The stored event text is not modified.
function labelEta(text) {
  return text ? text.replace(/\bETA\b/g, 'Illustrative ETA') : text
}

function formatEta(minutes) {
  if (minutes < 1) return '< 1 min'
  return `~${Math.round(minutes)} min`
}

function Home() {
  const { location, status: geoStatus, requestLocation, useDemoLocation } = useGeolocation()
  const [stage, setStage] = useState(STAGES.IDLE)
  const [description, setDescription] = useState('')
  const [emergency, setEmergency] = useState(null)
  const [error, setError] = useState(null)
  // Illustrative ETA / distance for the assigned responder, taken from the
  // existing /api/responders/nearby endpoint (null until loaded).
  const [etaInfo, setEtaInfo] = useState(null)

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

  // After an emergency is created, look up the assigned responder's
  // illustrative ETA. If this call fails the rest of the screen is
  // unaffected — the ETA row just shows "unavailable".
  useEffect(() => {
    if (!emergency || !emergency.assigned_responder) return
    let cancelled = false
    setEtaInfo({ status: 'loading' })
    fetchNearbyResponders(emergency.latitude, emergency.longitude, emergency.severity || 'Moderate')
      .then((matches) => {
        if (cancelled) return
        const match = matches.find((m) => m.responder.id === emergency.assigned_responder.id)
        setEtaInfo(
          match
            ? { status: 'ready', minutes: match.eta_minutes, distanceKm: match.distance_km }
            : { status: 'unavailable' }
        )
      })
      .catch(() => {
        if (!cancelled) setEtaInfo({ status: 'unavailable' })
      })
    return () => {
      cancelled = true
    }
  }, [emergency])

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
    setEtaInfo(null)
  }

  const indicators = emergency ? parseIndicators(emergency.indicators) : []

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <AppHeader />

      <main className="flex-1 flex flex-col items-center px-4 py-8">
        <h1 className="text-2xl font-bold text-navy mb-1 text-center">Request Emergency Help</h1>
        <p className="text-slate-500 text-sm mb-6 text-center max-w-sm">
          AI-assisted emergency response prototype. Not a substitute for
          official emergency services.
        </p>

        {stage === STAGES.IDLE && (
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 mb-6">
            <Link to="/profile" className="text-xs underline text-navy-500 hover:text-navy">
              Manage profile &amp; emergency contacts
            </Link>
            <Link to="/dashboard" className="text-xs underline text-navy-500 hover:text-navy">
              Responder dashboard
            </Link>
          </div>
        )}

        {stage === STAGES.IDLE && (
          <button
            onClick={startEmergency}
            className="w-60 h-60 rounded-full bg-emergency hover:bg-emergency-dark text-white text-2xl font-bold shadow-xl ring-8 ring-red-100 active:scale-95 transition-all leading-snug focus:outline-none focus-visible:ring-4 focus-visible:ring-red-300"
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
            className="mt-8 text-sm font-medium px-5 py-2 rounded-full border border-navy-300 bg-white text-navy hover:bg-navy-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-400"
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
              className="w-full border border-slate-300 bg-white rounded-lg p-3 h-32 text-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy-400 focus:border-navy-400"
              placeholder="Describe the emergency (e.g. 'There has been an accident, my father is unconscious and bleeding')"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              autoFocus
            />
            <button
              onClick={handleSubmit}
              disabled={!description.trim()}
              className="w-full bg-emergency hover:bg-emergency-dark text-white text-lg font-semibold py-3 rounded-lg shadow-sm disabled:opacity-40 disabled:hover:bg-emergency focus:outline-none focus-visible:ring-4 focus-visible:ring-red-300"
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
            <button onClick={reset} className="underline text-navy-600 hover:text-navy">
              Try again
            </button>
          </div>
        )}

        {stage === STAGES.DONE && emergency && (
          <div className="w-full max-w-md space-y-4">
            <div className={CARD}>
              <h2 className="font-semibold text-lg text-navy mb-2">
                Emergency #{emergency.id} received
              </h2>
              <ul className="space-y-1 text-sm text-slate-600">
                {emergency.events.map((ev) => (
                  <li key={ev.id} className="flex gap-2">
                    <span aria-hidden="true" className="text-navy-500">
                      ✓
                    </span>
                    <span>{labelEta(ev.description || ev.event_type)}</span>
                  </li>
                ))}
              </ul>
            </div>

            {emergency.emergency_type && (
              <div className={CARD}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className={CARD_TITLE}>AI Emergency Assessment</h3>
                  <SeverityBadge severity={emergency.severity} />
                </div>
                <p className="text-lg font-semibold text-navy">{emergency.emergency_type}</p>
                <p className="text-sm text-slate-600 mt-1">{emergency.ai_summary}</p>
                <p className="text-sm text-slate-500 mt-1">
                  Needs: {emergency.assistance_required}
                </p>
                {indicators.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {indicators.map((ind) => (
                      <span
                        key={ind}
                        className="text-xs bg-navy-50 text-navy-700 border border-navy-100 px-2 py-0.5 rounded-full"
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
              <div className={`${CARD} border-l-4 border-l-emergency`}>
                <div className="flex items-center justify-between mb-1">
                  <h3 className={CARD_TITLE}>Recommended Responder</h3>
                  <span className="text-[10px] font-semibold uppercase tracking-wide bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                    Demo responder
                  </span>
                </div>
                <p className="text-lg font-semibold text-navy">
                  {emergency.assigned_responder.name}
                </p>
                <p className="text-sm text-slate-500">
                  {emergency.assigned_responder.type} · {emergency.assigned_responder.availability}
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  {emergency.assigned_responder.capabilities}
                </p>

                <div className="mt-3 rounded-lg bg-navy-50 border border-navy-100 px-3 py-2">
                  <EtaRow etaInfo={etaInfo} />
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Demonstration data — not a real responder or dispatch.
                </p>
              </div>
            )}

            <ContactsNotifiedCard events={emergency.events} />

            <Link
              to={`/tracking/${emergency.id}`}
              className="block text-center bg-navy hover:bg-navy-800 text-white text-sm font-semibold py-2.5 rounded-lg shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-400"
            >
              View Live Tracking
            </Link>

            <p className="text-xs text-slate-500 bg-white border border-slate-200 rounded-lg p-3">
              This is a prototype. AI classifications are not medical
              diagnoses, and all responder data is demonstration data — not
              real emergency services. In a real emergency, contact official
              emergency services.
            </p>
            <button onClick={reset} className="underline text-navy-600 hover:text-navy text-sm">
              Start a new request
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

function EtaRow({ etaInfo }) {
  let value
  if (!etaInfo || etaInfo.status === 'loading') {
    value = <span className="text-slate-400 animate-pulse">Calculating…</span>
  } else if (etaInfo.status === 'unavailable') {
    value = <span className="text-slate-500">Unavailable</span>
  } else if (typeof etaInfo.minutes === 'number') {
    value = <span className="font-semibold text-navy">{formatEta(etaInfo.minutes)}</span>
  } else {
    // The backend returns no ETA for stationary responders (e.g. hospitals).
    value = <span className="text-slate-500">Not available for this responder type</span>
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-slate-600">Illustrative ETA</span>
        {value}
      </div>
      {etaInfo && etaInfo.status === 'ready' && typeof etaInfo.distanceKm === 'number' && (
        <p className="text-xs text-slate-500 mt-0.5">
          About {etaInfo.distanceKm} km straight-line distance
        </p>
      )}
      <p className="text-xs text-slate-400 mt-0.5">
        Simple distance ÷ speed estimate — no real traffic or routing.
      </p>
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
    <div className={CARD}>
      <div className="flex items-center justify-between mb-2">
        <h3 className={CARD_TITLE}>Emergency Contact Notification</h3>
        <span className="text-[10px] font-semibold uppercase tracking-wide bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
          Simulated
        </span>
      </div>
      {notified.length > 0 ? (
        <ul className="space-y-1 text-sm text-slate-600">
          {notified.map((ev) => (
            <li key={ev.id}>✓ {ev.description}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">
          No emergency contacts on file.{' '}
          <Link to="/profile" className="underline text-navy-600">
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