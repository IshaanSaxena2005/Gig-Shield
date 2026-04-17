import React, { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default marker icon issue in Leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png'
})

/**
 * LocationMap Component
 * Displays user's current location on an interactive map with accuracy circle
 * 
 * Props:
 * - location: { lat, lng, accuracy, timestamp }
 * - isTracking: boolean
 * - error: string or null
 */
export const LocationMap = ({ location, isTracking, error }) => {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markerRef = useRef(null)
  const circleRef = useRef(null)

  useEffect(() => {
    // Initialize map only once
    if (!mapInstanceRef.current && mapRef.current) {
      mapInstanceRef.current = L.map(mapRef.current).setView([28.6139, 77.2090], 13)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(mapInstanceRef.current)
    }

    // Update marker and circle if location changes
    if (mapInstanceRef.current && location?.lat && location?.lng) {
      const { lat, lng, accuracy } = location
      const latlng = [lat, lng]

      // Update or create marker
      if (markerRef.current) {
        markerRef.current.setLatLng(latlng)
      } else {
        markerRef.current = L.marker(latlng, {
          title: 'Your Location',
          icon: L.icon({
            iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
            shadowSize: [41, 41]
          })
        }).addTo(mapInstanceRef.current)
        
        markerRef.current.bindPopup(
          `<div style="font-size: 12px; font-weight: 500;">
            📍 Your Location<br/>
            <small>${lat.toFixed(4)}, ${lng.toFixed(4)}</small><br/>
            <small style="color: #666;">Accuracy: ${accuracy}m</small><br/>
            <small style="color: #666;">Updated: ${new Date(location.timestamp).toLocaleTimeString()}</small>
          </div>`
        )
      }

      // Update or create accuracy circle
      if (circleRef.current) {
        circleRef.current.setLatLng(latlng).setRadius(accuracy)
      } else {
        circleRef.current = L.circle(latlng, {
          radius: accuracy,
          color: '#667eea',
          fillColor: '#667eea',
          fillOpacity: 0.15,
          weight: 2
        }).addTo(mapInstanceRef.current)
      }

      // Center map on location with animation
      mapInstanceRef.current.setView(latlng, 15, { animate: true })
    }
  }, [location])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Map Container */}
      <div
        ref={mapRef}
        style={{
          width: '100%',
          height: '400px',
          borderRadius: '12px',
          border: '2px solid #e2e8f0',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)'
        }}
      />

      {/* Location Status */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1rem'
      }}>
        {/* Tracking Status */}
        <div style={{
          background: isTracking ? '#e8f5e9' : '#f5f5f5',
          border: `2px solid ${isTracking ? '#4caf50' : '#e2e8f0'}`,
          borderRadius: '8px',
          padding: '1rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.25rem' }}>Tracking Status</div>
          <div style={{ fontSize: '1.1rem', fontWeight: '600', color: isTracking ? '#2e7d32' : '#999' }}>
            {isTracking ? '🟢 Active' : '⚪ Inactive'}
          </div>
        </div>

        {/* Last Sync */}
        <div style={{
          background: '#e3f2fd',
          border: '2px solid #bbdefb',
          borderRadius: '8px',
          padding: '1rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.25rem' }}>Last Sync</div>
          <div style={{ fontSize: '0.95rem', fontWeight: '600', color: '#1976d2' }}>
            {location?.timestamp ? new Date(location.timestamp).toLocaleTimeString() : 'Never'}
          </div>
        </div>
      </div>

      {/* Location Details */}
      {location && (
        <div style={{
          background: '#f9f9f9',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '1rem',
          fontSize: '0.9rem'
        }}>
          <p style={{ margin: '0 0 0.5rem 0', fontWeight: '600' }}>📍 Current Location</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.75rem' }}>
            <div>
              <span style={{ color: '#666', fontSize: '0.85rem' }}>Latitude</span>
              <div style={{ fontWeight: '600', fontSize: '1rem' }}>{location.lat.toFixed(6)}</div>
            </div>
            <div>
              <span style={{ color: '#666', fontSize: '0.85rem' }}>Longitude</span>
              <div style={{ fontWeight: '600', fontSize: '1rem' }}>{location.lng.toFixed(6)}</div>
            </div>
            <div>
              <span style={{ color: '#666', fontSize: '0.85rem' }}>Accuracy</span>
              <div style={{ fontWeight: '600', fontSize: '1rem' }}>±{location.accuracy}m</div>
            </div>
            <div>
              <span style={{ color: '#666', fontSize: '0.85rem' }}>Updated</span>
              <div style={{ fontWeight: '600', fontSize: '1rem' }}>{new Date(location.timestamp).toLocaleTimeString()}</div>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div style={{
          background: '#ffebee',
          border: '1px solid #ffcdd2',
          borderRadius: '8px',
          padding: '1rem',
          color: '#c62828',
          fontSize: '0.9rem'
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Auto-Sync Info */}
      {isTracking && (
        <div style={{
          background: '#e3f2fd',
          border: '1px solid #90caf9',
          borderRadius: '8px',
          padding: '0.75rem 1rem',
          fontSize: '0.85rem',
          color: '#1565c0',
          textAlign: 'center'
        }}>
          ✅ Location syncs automatically every minute
        </div>
      )}
    </div>
  )
}
