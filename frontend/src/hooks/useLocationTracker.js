import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Custom hook for geolocation tracking with one-time permission & auto-sync
 * - Requests permission only once (stored in localStorage)
 * - Auto-syncs location every minute when tracking is enabled
 * - Returns { lat, lng, accuracy, timestamp, isTracking, error, startTracking, stopTracking }
 */
export const useLocationTracker = (autoSyncInterval = 60000) => {
  const [location, setLocation] = useState(null)
  const [isTracking, setIsTracking] = useState(false)
  const [error, setError] = useState(null)
  const [permissionStatus, setPermissionStatus] = useState(null)
  
  const trackingRef = useRef(false)
  const intervalRef = useRef(null)
  const watchIdRef = useRef(null)

  // Check if user has already given permission
  const hasPermissionGranted = useCallback(() => {
    return localStorage.getItem('locationPermissionGranted') === 'true'
  }, [])

  // Request geolocation once
  const requestLocationOnce = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported in this browser')
      return
    }

    // Check if already have permission
    if (hasPermissionGranted()) {
      setPermissionStatus('granted')
      return
    }

    // Request permission
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords
        setLocation({
          lat: latitude,
          lng: longitude,
          accuracy: accuracy.toFixed(2),
          timestamp: new Date(position.timestamp)
        })
        setError(null)
        localStorage.setItem('locationPermissionGranted', 'true')
        setPermissionStatus('granted')
      },
      (geoError) => {
        console.error('Geolocation error:', geoError)
        if (geoError.code === 1) {
          setError('Location permission denied. Please enable in browser settings.')
          localStorage.setItem('locationPermissionGranted', 'false')
        } else {
          setError(geoError.message)
        }
        setPermissionStatus('denied')
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  }, [hasPermissionGranted])

  // Sync location (called every minute)
  const syncLocation = useCallback(() => {
    if (!navigator.geolocation) return

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords
        setLocation({
          lat: latitude,
          lng: longitude,
          accuracy: accuracy.toFixed(2),
          timestamp: new Date(position.timestamp)
        })
        setError(null)
      },
      (geoError) => {
        console.error('Location sync error:', geoError)
        setError(`Sync failed: ${geoError.message}`)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  }, [])

  // Start tracking with auto-sync
  const startTracking = useCallback(() => {
    if (trackingRef.current) return

    trackingRef.current = true
    setIsTracking(true)

    // Request permission first
    requestLocationOnce()

    // Setup auto-sync interval every minute
    intervalRef.current = setInterval(() => {
      if (hasPermissionGranted()) {
        syncLocation()
      }
    }, autoSyncInterval)
  }, [requestLocationOnce, syncLocation, autoSyncInterval, hasPermissionGranted])

  // Stop tracking
  const stopTracking = useCallback(() => {
    trackingRef.current = false
    setIsTracking(false)

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking()
    }
  }, [stopTracking])

  return {
    location,
    isTracking,
    error,
    permissionStatus,
    startTracking,
    stopTracking,
    syncLocation,
    hasPermission: hasPermissionGranted()
  }
}
