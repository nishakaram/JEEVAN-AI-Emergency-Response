import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
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

// Navy dot with a soft halo — the viewer's own live position. Looks
// different from every other marker so it can't be confused with them.
const USER_ICON = L.divIcon({
  className: '',
  html: `<div style="width:30px;height:30px;border-radius:50%;background:rgba(20,38,74,0.18);display:flex;align-items:center;justify-content:center"><div style="background:#14264a;width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 0 4px rgba(0,0,0,0.5)"></div></div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
})

// Keeps the map framed around the live position without fighting the
// user: the first fix brings both the emergency and the user into view
// (only if the user is off-screen); after that the map only pans when the
// user's position moves out of view. Panning/zooming by hand is respected.
// Renders nothing — it only drives the map.
function FollowUser({ emergencyLat, emergencyLng, userLat, userLng }) {
  const map = useMap()
  const framedRef = useRef(false)

  useEffect(() => {
    if (typeof userLat !== 'number' || typeof userLng !== 'number') return
    const user = L.latLng(userLat, userLng)

    if (!framedRef.current) {
      framedRef.current = true
      if (!map.getBounds().contains(user)) {
        map.fitBounds(L.latLngBounds([[emergencyLat, emergencyLng], user]), {
          padding: [30, 30],
          maxZoom: 14,
        })
      }
      return
    }

    if (!map.getBounds().contains(user)) {
      map.panTo(user)
    }
  }, [map, emergencyLat, emergencyLng, userLat, userLng])

  return null
}

// Shows the emergency location, the assigned responder, and other nearby
// responders on an OpenStreetMap tile layer via Leaflet — free, no API
// key needed. Responder positions are the seeded demo data, not live GPS.
//
// Optional `userLocation` ({ latitude, longitude, accuracy? }): the
// viewer's live position from the browser. When provided, a separate
// marker is drawn and moves as the position changes. When omitted, the
// map behaves exactly as before.
function EmergencyMap({ emergency, userLocation }) {
  const [matches, setMatches] = useState([])

  useEffect(() => {
    if (!emergency) return
    fetchNearbyResponders(emergency.latitude, emergency.longitude, emergency.severity || 'Moderate')
      .then(setMatches)
      .catch(() => setMatches([]))
  }, [emergency])

  if (!emergency) return null

  const hasUser =
    !!userLocation &&
    typeof userLocation.latitude === 'number' &&
    typeof userLocation.longitude === 'number'

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
        {hasUser && (
          <>
            <Marker
              position={[userLocation.latitude, userLocation.longitude]}
              icon={USER_ICON}
              zIndexOffset={1000}
            >
              <Popup>
                Your current location
                {typeof userLocation.accuracy === 'number'
                  ? ` (accuracy ±${Math.round(userLocation.accuracy)} m)`
                  : ''}
              </Popup>
            </Marker>
            <FollowUser
              emergencyLat={emergency.latitude}
              emergencyLng={emergency.longitude}
              userLat={userLocation.latitude}
              userLng={userLocation.longitude}
            />
          </>
        )}
      </MapContainer>
    </div>
  )
}

export default EmergencyMap