import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { fetchEmergency, fetchNearbyResponders } from '../api/client'
import { useGeolocation } from '../hooks/useGeolocation'
import AppHeader from '../components/AppHeader'
import SeverityBadge from '../components/SeverityBadge'
import EmergencyMap from '../components/EmergencyMap'

// Timeline stages that come directly from logged events during creation
// (Phases 2-4). The last two ("Assistance on the way" / "Resolved") are
// set later by a responder from the dashboard, so they're derived from
// emergency.status instead of an event type.
const EVENT_STAGES = [
  { key: 'emergency_request_received', label: 'Emergency request received' },
  { key: 'location_obtained', label: 'Location obtained' },
  { key: 'ai_assessment_completed', label: 'AI emergency assessment completed' },
  { key: 'responder_identified', label: 'Responder identified' },
  { key: 'responder_assigned', label: 'Responder assigned' },
]

// Shared look for white cards on the light-grey page background.
const CARD = 'bg-white rounded-xl border border-slate-200 shadow-sm p-4'
const CARD_TITLE = 'text-xs font-semibold uppercase tracking-wide text-navy-500'

function formatEta(minutes) {
  if (minutes < 1) return '< 1 min'
  return `~${Math.round(minutes)} min`
}

function Tracking() {
  const { id } = useParams()
  const [emergency, setEmergency] = useState(null)
  const [error, setError] = useState(null)
  // Illustrative ETA / distance for the assigned responder, taken from the
  // existing /api/responders/nearby endpoint (null until loaded).
  const [etaInfo, setEtaInfo] = useState(null)

  // The viewer's own live position (browser Geolocation API, continuous
  // updates). Shown on the map only — it is not sent to the backend.
  const {
    location: userLocation,
    status: geoStatus,
    error: geoError,
    isWatching,
    startWatching,
    stopWatching,
  } = useGeolocation()

  const load = useCallback(() => {
    fetchEmergency(id)
      .then(setEmergency)
      .catch(() =>
        setError('Could not load this emergency. Check the ID and that the backend is running.')
      )
  }, [id])

  useEffect(() => {
    load()
    // Poll so status changes made from the dashboard (Phase 7) show up
    // here without a manual refresh — a simple stand-in for a live feed.
    const interval = setInterval(load, 5000)
    return () => clearInterval(interval)
  }, [load])

  // Start live location when the page opens; stop it when the page closes.
  // (The hook also releases the watcher on unmount as a safety net.)
  useEffect(() => {
    startWatching()
    return () => stopWatching()
  }, [startWatching, stopWatching])

  // Look up the illustrative ETA once per responder/location/severity —
  // not on every 5-second poll. If the call fails, only the ETA row shows
  // "Unavailable"; the rest of the page is unaffected.
  const responderId = emergency && emergency.assigned_responder ? emergency.assigned_responder.id : null
  const emergencyLat = emergency ? emergency.latitude : null
  const emergencyLng = emergency ? emergency.longitude : null
  const emergencySeverity = emergency ? emergency.severity : null

  useEffect(() => {
    if (!responderId) {
      setEtaInfo(null)
      return
    }
    let cancelled = false
    setEtaInfo({ status: 'loading' })
    fetchNearbyResponders(emergencyLat, emergencyLng, emergencySeverity || 'Moderate')
      .then((matches) => {
        if (cancelled) return
        const match = matches.find((m) => m.responder.id === responderId)
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
  }, [responderId, emergencyLat, emergencyLng, emergencySeverity])

  // Retry after a permission/support problem: release the old watcher
  // (if any) and start a fresh one.
  const retryLiveLocation = () => {
    stopWatching()
    startWatching()
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col">
        <AppHeader />
        <main className="flex-1 flex flex-col items-center justify-center px-4 gap-4">
          <p className="text-red-600 text-center">{error}</p>
          <Link to="/" className="underline text-navy-600 hover:text-navy">
            Back home
          </Link>
        </main>
      </div>
    )
  }

  if (!emergency) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col">
        <AppHeader />
        <main className="flex-1 flex items-center justify-center text-slate-500">
          <span className="animate-pulse" role="status" aria-live="polite">
            Loading…
          </span>
        </main>
      </div>
    )
  }

  const eventTypes = new Set(emergency.events.map((e) => e.event_type))
  const stages = [
    ...EVENT_STAGES.map((s) => ({ label: s.label, done: eventTypes.has(s.key) })),
    {
      label: 'Assistance on the way',
      done: ['EnRoute', 'Resolved'].includes(emergency.status),
    },
    { label: 'Emergency resolved', done: emergency.status === 'Resolved' },
  ]
  // The first unfinished stage is the one currently in progress.
  const currentIndex = stages.findIndex((s) => !s.done)

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <AppHeader />

      <main className="flex-1 flex flex-col items-center px-4 py-8">
        <div className="w-full max-w-md space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-navy">Emergency #{emergency.id}</h1>
            <Link to="/" className="text-sm underline text-navy-500 hover:text-navy">
              Home
            </Link>
          </div>

          <div className={CARD}>
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-navy">
                {emergency.emergency_type || 'Assessing…'}
              </span>
              <SeverityBadge severity={emergency.severity} />
            </div>
            <p className="text-sm text-slate-500">
              Status:{' '}
              <span className="font-medium text-navy-700">{emergency.status}</span>
            </p>
          </div>

          <div className="space-y-2">
            <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
              <EmergencyMap emergency={emergency} userLocation={userLocation} />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 px-1">
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-emergency" />
                Emergency location
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-600" />
                Assigned responder
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-400" />
                Other demo responders
              </span>
              {userLocation && (
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-navy ring-2 ring-navy-200" />
                  Your live location
                </span>
              )}
            </div>
            <LiveLocationStatus
              status={geoStatus}
              error={geoError}
              location={userLocation}
              isWatching={isWatching}
              onRetry={retryLiveLocation}
            />
            <p className="text-xs text-slate-400 px-1">
              Responder positions are seeded demonstration data, not live GPS.
            </p>
          </div>

          <div className={CARD}>
            <h2 className={`${CARD_TITLE} mb-3`}>Response Timeline</h2>
            <ol>
              {stages.map((s, i) => {
                const isCurrent = i === currentIndex
                const isLast = i === stages.length - 1
                return (
                  <li key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0 ${
                          s.done
                            ? 'bg-navy text-white'
                            : isCurrent
                            ? 'bg-white text-navy border-2 border-navy animate-pulse'
                            : 'bg-white text-slate-300 border-2 border-slate-200'
                        }`}
                        aria-hidden="true"
                      >
                        {s.done ? '✓' : i + 1}
                      </span>
                      {!isLast && (
                        <span
                          className={`w-0.5 flex-1 min-h-[1rem] ${
                            s.done ? 'bg-navy' : 'bg-slate-200'
                          }`}
                          aria-hidden="true"
                        />
                      )}
                    </div>
                    <div
                      className={`pb-3 text-sm pt-0.5 ${
                        s.done
                          ? 'text-navy font-medium'
                          : isCurrent
                          ? 'text-navy-600'
                          : 'text-slate-400'
                      }`}
                    >
                      {s.label}
                      <span className="sr-only">
                        {s.done ? ' (completed)' : isCurrent ? ' (in progress)' : ' (pending)'}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ol>
          </div>

          {emergency.assigned_responder && (
            <div className={`${CARD} border-l-4 border-l-emergency`}>
              <div className="flex items-center justify-between mb-1">
                <h3 className={CARD_TITLE}>Assigned Responder</h3>
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

              <div className="mt-3 rounded-lg bg-navy-50 border border-navy-100 px-3 py-2">
                <EtaRow etaInfo={etaInfo} />
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Demonstration data — not a real responder or dispatch.
              </p>
            </div>
          )}

          <p className="text-xs text-slate-500 bg-white border border-slate-200 rounded-lg p-3">
            This page refreshes automatically every few seconds. All data is
            demonstration data — not a real emergency service.
          </p>
        </div>
      </main>
    </div>
  )
}

// One clear line describing the state of the live-location feature.
function LiveLocationStatus({ status, error, location, isWatching, onRetry }) {
  const BASE = 'rounded-lg border px-3 py-2 text-xs'

  if (status === 'unsupported') {
    return (
      <div className={`${BASE} bg-slate-50 border-slate-200 text-slate-600`} role="status">
        Live location is not supported by this browser.
      </div>
    )
  }

  if (status === 'denied') {
    return (
      <div className={`${BASE} bg-red-50 border-red-200 text-red-700`} role="alert">
        <p className="font-semibold">Live location is off</p>
        <p className="mt-0.5">
          {error ? error.message : 'Location could not be accessed.'} The map still shows the
          emergency and the demo responders.
        </p>
        <button
          onClick={onRetry}
          className="mt-1.5 font-semibold underline hover:text-red-900"
          type="button"
        >
          Try again
        </button>
      </div>
    )
  }

  if (!location) {
    // Watching has started but there is no fix yet (or none is available).
    if (status === 'unavailable') {
      return (
        <div className={`${BASE} bg-amber-50 border-amber-200 text-amber-800`} role="status">
          Waiting for a location fix — {error ? error.message : 'no position available right now.'}
        </div>
      )
    }
    if (isWatching || status === 'loading') {
      return (
        <div
          className={`${BASE} bg-slate-50 border-slate-200 text-slate-600 animate-pulse`}
          role="status"
          aria-live="polite"
        >
          Locating you… allow location access if your browser asks.
        </div>
      )
    }
    return null
  }

  const accuracy = typeof location.accuracy === 'number' ? Math.round(location.accuracy) : null
  const isApproximate = accuracy !== null && accuracy > 1000
  const updated = location.timestamp ? new Date(location.timestamp).toLocaleTimeString() : null

  // A fix exists. If the browser is temporarily failing to update it, say so
  // while keeping the last known position on the map.
  if (status === 'unavailable') {
    return (
      <div className={`${BASE} bg-amber-50 border-amber-200 text-amber-800`} role="status">
        <p className="font-semibold">Live location paused</p>
        <p className="mt-0.5">
          {error ? error.message : 'No new position right now.'} Showing your last known position
          {updated ? ` (from ${updated})` : ''}.
        </p>
      </div>
    )
  }

  return (
    <div className={`${BASE} bg-emerald-50 border-emerald-200 text-emerald-800`} role="status">
      <p className="flex items-center gap-1.5 font-semibold">
        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true" />
        Live location on
      </p>
      <p className="mt-0.5">
        {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
        {accuracy !== null ? ` · accuracy ±${accuracy} m` : ''}
        {updated ? ` · updated ${updated}` : ''}
      </p>
      {isApproximate && (
        <p className="mt-0.5 text-amber-700">
          Approximate location only (likely network-based) — the marker may be far from your real
          position.
        </p>
      )}
      <p className="mt-0.5 text-emerald-700/80">
        Shown on this device only — your position is not sent to the server.
      </p>
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

export default Tracking