import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { fetchEmergency } from '../api/client'
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

function Tracking() {
  const { id } = useParams()
  const [emergency, setEmergency] = useState(null)
  const [error, setError] = useState(null)

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

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 gap-4">
        <p className="text-red-600 text-center">{error}</p>
        <Link to="/" className="underline text-slate-600">
          Back home
        </Link>
      </div>
    )
  }

  if (!emergency) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">
        Loading…
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-md space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-800">Emergency #{emergency.id}</h1>
          <Link to="/" className="text-sm underline text-slate-500">
            Home
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-slate-800">
              {emergency.emergency_type || 'Assessing…'}
            </span>
            <SeverityBadge severity={emergency.severity} />
          </div>
          <p className="text-sm text-slate-500">Status: {emergency.status}</p>
        </div>

        <EmergencyMap emergency={emergency} />

        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-xs uppercase tracking-wide text-slate-400 mb-2">
            Response Timeline
          </h2>
          <ol className="space-y-2">
            {stages.map((s, i) => (
              <li
                key={i}
                className={`flex items-center gap-2 text-sm ${
                  s.done ? 'text-slate-800' : 'text-slate-400'
                }`}
              >
                <span>{s.done ? '✅' : '⬜'}</span>
                {s.label}
              </li>
            ))}
          </ol>
        </div>

        {emergency.assigned_responder && (
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-emergency">
            <h3 className="text-xs uppercase tracking-wide text-slate-400 mb-1">
              Assigned Responder
            </h3>
            <p className="text-lg font-semibold text-slate-800">
              {emergency.assigned_responder.name}
            </p>
            <p className="text-sm text-slate-500">
              {emergency.assigned_responder.type} · {emergency.assigned_responder.availability}
            </p>
          </div>
        )}

        <p className="text-xs text-slate-400">
          This page refreshes automatically every few seconds. All data is
          demonstration data — not a real emergency service.
        </p>
      </div>
    </div>
  )
}

export default Tracking
