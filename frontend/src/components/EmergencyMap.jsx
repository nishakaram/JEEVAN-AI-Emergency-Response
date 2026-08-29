import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { fetchNearbyResponders } from '../api/client'

// Plain colored-dot markers via divIcon, so we don't have to fight
// Vite/bundler asset-path issues with Leaflet's default marker images.
const dot = (color, size = 14) =>
  L.divIcon({
    className: '',
    html: `<div style="background:${color};width:${size}px;height:${size}px;border-radius:50%;border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,0.4)"></div>`,
    iconSize: [size, size],
  })

const VICTIM_ICON = dot('#dc2626', 18) // red — emergency location
const ASSIGNED_ICON = dot('#2563eb', 16) // blue — the responder we assigned
const OTHER_ICON = dot('#94a3b8', 10) // grey — other nearby responders

// Shows the emergency location, the assigned responder, and other nearby
// responders on an OpenStreetMap tile layer via Leaflet — free, no API
// key needed. Responder positions are the seeded demo data, not live GPS.
function EmergencyMap({ emergency }) {
  const [matches, setMatches] = useState([])

  useEffect(() => {
    if (!emergency) return
    fetchNearbyResponders(emergency.latitude, emergency.longitude, emergency.severity || 'Moderate')
      .then(setMatches)
      .catch(() => setMatches([]))
  }, [emergency])

  if (!emergency) return null

  return (
    <div className="rounded-lg overflow-hidden shadow h-64">
      <MapContainer
        center={[emergency.latitude, emergency.longitude]}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[emergency.latitude, emergency.longitude]} icon={VICTIM_ICON}>
          <Popup>Emergency location{emergency.location_label ? ` — ${emergency.location_label}` : ''}</Popup>
        </Marker>
        {matches.map((m) => (
          <Marker
            key={m.responder.id}
            position={[m.responder.latitude, m.responder.longitude]}
            icon={m.responder.id === emergency.assigned_responder_id ? ASSIGNED_ICON : OTHER_ICON}
          >
            <Popup>
              {m.responder.name} ({m.responder.type}) — {m.distance_km} km, score {m.total_score}/100
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}

export default EmergencyMap
