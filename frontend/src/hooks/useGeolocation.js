import { useState, useCallback } from 'react'

// Fallback used when the browser denies/lacks GPS, so the prototype can
// still be demonstrated end-to-end without real hardware. Center of
// Jaipur, Rajasthan — matches the seeded demo responders.
const DEMO_LOCATION = {
  latitude: 26.9124,
  longitude: 75.7873,
  label: 'Jaipur (Demo Location)',
  isDemo: true,
}

export function useGeolocation() {
  const [location, setLocation] = useState(null)
  // idle | loading | success | denied | unsupported
  const [status, setStatus] = useState('idle')

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus('unsupported')
      return
    }
    setStatus('loading')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          label: null,
          isDemo: false,
          timestamp: new Date(position.timestamp).toISOString(),
        })
        setStatus('success')
      },
      () => {
        setStatus('denied')
      },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }, [])

  const useDemoLocation = useCallback(() => {
    setLocation(DEMO_LOCATION)
    setStatus('success')
  }, [])

  return { location, status, requestLocation, useDemoLocation }
}
