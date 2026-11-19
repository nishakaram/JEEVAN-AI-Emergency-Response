import { useState, useCallback, useRef, useEffect } from 'react'

// Fallback used when the browser denies/lacks GPS, so the prototype can
// still be demonstrated end-to-end without real hardware. Center of
// Jaipur, Rajasthan — matches the seeded demo responders.
const DEMO_LOCATION = {
  latitude: 26.9124,
  longitude: 75.7873,
  label: 'Jaipur (Demo Location)',
  isDemo: true,
}

// Turns a browser GeolocationPositionError into something the UI can show.
// `reason` is one of: permission | insecure | unavailable | timeout | unknown.
function describeError(err) {
  const code = err && err.code
  if (code === 1) {
    // Browsers only allow geolocation on https:// or http://localhost.
    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      return {
        code,
        reason: 'insecure',
        message:
          'Location is blocked because this page is not served over HTTPS or localhost.',
      }
    }
    return {
      code,
      reason: 'permission',
      message:
        'Location permission was denied. Allow location access for this site in the browser and try again.',
    }
  }
  if (code === 2) {
    return { code, reason: 'unavailable', message: 'Your device could not determine a position.' }
  }
  if (code === 3) {
    return { code, reason: 'timeout', message: 'Timed out waiting for a location fix.' }
  }
  return {
    code: code || null,
    reason: 'unknown',
    message: (err && err.message) || 'Could not get your location.',
  }
}

function toLocation(position) {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy, // metres
    label: null,
    isDemo: false,
    timestamp: new Date(position.timestamp).toISOString(),
  }
}

// Returns:
//   location        { latitude, longitude, accuracy?, label, isDemo, timestamp? } | null
//   status          one-shot (requestLocation): idle | loading | success | denied | unsupported
//                   watching (startWatching) adds: unavailable (no fix right now)
//                   NOTE: for requestLocation every failure still ends as 'denied'
//                   (unchanged behaviour the Home page relies on); use `error.reason`
//                   to tell permission / timeout / unavailable apart.
//   error           { code, reason, message } | null
//   isWatching      true while a live watch is active
//   requestLocation()  one-time position (used by the Home page)
//   useDemoLocation()  switch to the Jaipur demo location
//   startWatching() / stopWatching()  continuous updates via watchPosition
export function useGeolocation() {
  const [location, setLocation] = useState(null)
  // idle | loading | success | denied | unsupported | unavailable
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const [isWatching, setIsWatching] = useState(false)

  const watchIdRef = useRef(null)
  const mountedRef = useRef(true)

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current)
    }
    watchIdRef.current = null
    if (mountedRef.current) setIsWatching(false)
  }, [])

  // Always release the watcher when the component using this hook unmounts.
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
      watchIdRef.current = null
    }
  }, [])

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus('unsupported')
      return
    }
    // Start from a clean slate so a previous (demo or stale) location or
    // error can never be mistaken for the result of this request.
    setLocation(null)
    setError(null)
    setStatus('loading')

    const onSuccess = (position) => {
      if (!mountedRef.current) return
      setLocation(toLocation(position))
      setError(null)
      setStatus('success')
    }

    navigator.geolocation.getCurrentPosition(
      onSuccess,
      (firstErr) => {
        // Permission problems will not be fixed by retrying. A timeout or
        // "position unavailable" often is (laptops without GPS), so try
        // once more with high accuracy off.
        if (firstErr && (firstErr.code === 2 || firstErr.code === 3)) {
          navigator.geolocation.getCurrentPosition(
            onSuccess,
            (secondErr) => {
              if (!mountedRef.current) return
              setError(describeError(secondErr))
              setStatus('denied')
            },
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
          )
          return
        }
        if (!mountedRef.current) return
        setError(describeError(firstErr))
        setStatus('denied')
      },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }, [])

  // Continuous updates. Safe to call more than once: it never registers a
  // second watcher. To retry after an error, call stopWatching() first.
  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus('unsupported')
      return
    }
    if (watchIdRef.current !== null) return

    setError(null)
    setStatus('loading')
    setIsWatching(true)

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        if (!mountedRef.current) return
        setLocation(toLocation(position))
        setError(null)
        setStatus('success')
      },
      (err) => {
        if (!mountedRef.current) return
        const described = describeError(err)
        setError(described)
        if (described.reason === 'permission' || described.reason === 'insecure') {
          // Permission errors end the watch for good — release it.
          stopWatching()
          setStatus('denied')
        } else {
          // Timeouts / "no position right now" are temporary: the browser
          // keeps the watch running, and we keep the last known location.
          setStatus('unavailable')
        }
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    )
  }, [stopWatching])

  const useDemoLocation = useCallback(() => {
    // A demo location must not be overwritten by a live watcher.
    stopWatching()
    setError(null)
    setLocation(DEMO_LOCATION)
    setStatus('success')
  }, [stopWatching])

  return {
    location,
    status,
    error,
    isWatching,
    requestLocation,
    useDemoLocation,
    startWatching,
    stopWatching,
  }
}