import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { fetchEmergencies, updateEmergencyStatus, assignResponder } from '../api/client'
import SeverityBadge from '../components/SeverityBadge'

// The order a demo emergency moves through. "Advance status" just steps
// to the next one — enough to demo EnRoute -> Resolved without building
// a full status picker.
const STATUS_FLOW = ['Created', 'Assessed', 'ResponderAssigned', 'EnRoute', 'Resolved']

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

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-800">Responder / Admin Dashboard</h1>
          <Link to="/" className="text-sm underline text-slate-500">
            Home
          </Link>
        </div>
        <p className="text-xs text-slate-400">
          Demo dashboard — no authentication in this prototype. All data is demonstration data,
          not real emergency services.
        </p>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-slate-400 border-b border-slate-100">
                <th className="p-3">ID</th>
                <th className="p-3">Type</th>
                <th className="p-3">Severity</th>
                <th className="p-3">Location</th>
                <th className="p-3">Responder</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {emergencies.map((e) => (
                <tr key={e.id} className="border-b border-slate-50 last:border-0">
                  <td className="p-3">#{e.id}</td>
                  <td className="p-3">{e.emergency_type || '—'}</td>
                  <td className="p-3">
                    <SeverityBadge severity={e.severity} />
                  </td>
                  <td className="p-3">
                    {e.location_label || `${e.latitude.toFixed(2)}, ${e.longitude.toFixed(2)}`}
                  </td>
                  <td className="p-3">{e.assigned_responder ? e.assigned_responder.name : 'Unassigned'}</td>
                  <td className="p-3">{e.status}</td>
                  <td className="p-3 space-x-3 whitespace-nowrap">
                    <Link to={`/tracking/${e.id}`} className="underline text-slate-600">
                      View
                    </Link>
                    {e.status !== 'Resolved' && (
                      <button
                        onClick={() => handleAdvanceStatus(e)}
                        disabled={busyId === e.id}
                        className="text-emergency underline disabled:opacity-40"
                      >
                        Advance status
                      </button>
                    )}
                    {!e.assigned_responder && (
                      <button
                        onClick={() => handleAssign(e)}
                        disabled={busyId === e.id}
                        className="text-slate-600 underline disabled:opacity-40"
                      >
                        Assign
                      </button>
                    )}
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
      </div>
    </div>
  )
}

export default Dashboard
