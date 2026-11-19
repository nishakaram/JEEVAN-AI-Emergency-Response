import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { fetchEmergencies, updateEmergencyStatus, assignResponder } from '../api/client'
import AppHeader from '../components/AppHeader'
import SeverityBadge from '../components/SeverityBadge'

// The order a demo emergency moves through. "Advance status" just steps
// to the next one — enough to demo EnRoute -> Resolved without building
// a full status picker.
const STATUS_FLOW = ['Created', 'Assessed', 'ResponderAssigned', 'EnRoute', 'Resolved']

// Colour-coded status pill. Resolved = green, in motion = navy, the
// earlier "waiting" statuses = grey. Unknown statuses fall back to grey.
const STATUS_STYLES = {
  Resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  EnRoute: 'bg-navy-50 text-navy-700 border-navy-200',
  ResponderAssigned: 'bg-navy-50 text-navy-700 border-navy-200',
}
const STATUS_DEFAULT_STYLE = 'bg-slate-100 text-slate-600 border-slate-200'

function StatusPill({ status }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold border ${
        STATUS_STYLES[status] || STATUS_DEFAULT_STYLE
      }`}
    >
      {status}
    </span>
  )
}

function SummaryTile({ label, value, tone }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-navy-500">{label}</p>
      <p className={`text-2xl font-bold ${tone}`}>{value}</p>
    </div>
  )
}

function Dashboard() {
  const [emergencies, setEmergencies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(() => {
    fetchEmergencies()
      .then((data) => {
        setEmergencies(data)
        setError(null)
      })
      .catch(() => setError('Could not reach the JEEVAN backend. Make sure it is running on localhost:8000.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 5000)
    return () => clearInterval(interval)
  }, [load])

  const handleAdvanceStatus = async (emergency) => {
    const currentIndex = STATUS_FLOW.indexOf(emergency.status)
    const next = STATUS_FLOW[currentIndex + 1]
    if (!next) return
    setBusyId(emergency.id)
    try {
      await updateEmergencyStatus(emergency.id, next)
      load()
    } finally {
      setBusyId(null)
    }
  }

  const handleAssign = async (emergency) => {
    setBusyId(emergency.id)
    try {
      await assignResponder(emergency.id)
      load()
    } finally {
      setBusyId(null)
    }
  }

  // Summary counts are derived from the list already loaded above — no
  // extra API calls.
  const activeCount = emergencies.filter((e) => e.status !== 'Resolved').length
  const criticalActiveCount = emergencies.filter(
    (e) => e.status !== 'Resolved' && e.severity === 'Critical'
  ).length
  const resolvedCount = emergencies.filter((e) => e.status === 'Resolved').length

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <AppHeader />

      <main className="flex-1 px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-navy">Responder / Admin Dashboard</h1>
            <Link to="/" className="text-sm underline text-navy-500 hover:text-navy">
              Home
            </Link>
          </div>
          <p className="text-xs text-slate-500 bg-white border border-slate-200 rounded-lg p-3">
            Demo dashboard — no authentication in this prototype. All data is demonstration data,
            not real emergency services. Responders shown are demo responders.
          </p>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3" role="alert">
              {error}
            </p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryTile label="Total" value={emergencies.length} tone="text-navy" />
            <SummaryTile label="Active" value={activeCount} tone="text-navy" />
            <SummaryTile label="Critical (active)" value={criticalActiveCount} tone="text-emergency" />
            <SummaryTile label="Resolved" value={resolvedCount} tone="text-emerald-600" />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide bg-navy text-white">
                  <th className="p-3 font-semibold">ID</th>
                  <th className="p-3 font-semibold">Type</th>
                  <th className="p-3 font-semibold">Severity</th>
                  <th className="p-3 font-semibold">Location</th>
                  <th className="p-3 font-semibold">Responder</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {emergencies.map((e) => (
                  <tr
                    key={e.id}
                    className="border-b border-slate-100 last:border-0 odd:bg-white even:bg-slate-50 hover:bg-navy-50"
                  >
                    <td className="p-3 font-medium text-navy">#{e.id}</td>
                    <td className="p-3 text-slate-700">{e.emergency_type || '—'}</td>
                    <td className="p-3">
                      <SeverityBadge severity={e.severity} />
                    </td>
                    <td className="p-3 text-slate-700">
                      {e.location_label || `${e.latitude.toFixed(2)}, ${e.longitude.toFixed(2)}`}
                    </td>
                    <td className="p-3 text-slate-700">
                      {e.assigned_responder ? e.assigned_responder.name : 'Unassigned'}
                    </td>
                    <td className="p-3">
                      <StatusPill status={e.status} />
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/tracking/${e.id}`}
                          className="text-navy-600 hover:text-navy underline text-xs font-medium"
                        >
                          View
                        </Link>
                        {e.status !== 'Resolved' && (
                          <button
                            onClick={() => handleAdvanceStatus(e)}
                            disabled={busyId === e.id}
                            className="text-xs font-semibold px-2.5 py-1 rounded-md border border-emergency text-emergency hover:bg-emergency hover:text-white disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-emergency transition-colors"
                          >
                            Advance status
                          </button>
                        )}
                        {!e.assigned_responder && (
                          <button
                            onClick={() => handleAssign(e)}
                            disabled={busyId === e.id}
                            className="text-xs font-semibold px-2.5 py-1 rounded-md border border-navy-300 text-navy hover:bg-navy-50 disabled:opacity-40 transition-colors"
                          >
                            Assign
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {emergencies.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-400">
                      No emergencies yet.
                    </td>
                  </tr>
                )}
                {loading && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-400 animate-pulse">
                      Loading emergencies…
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-slate-400">
            This table refreshes automatically every few seconds.
          </p>
        </div>
      </main>
    </div>
  )
}

export default Dashboard