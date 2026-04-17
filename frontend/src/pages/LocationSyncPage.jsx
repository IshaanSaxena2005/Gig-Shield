import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { LocationMap } from '../components/LocationMap'
import { useLocationTracker } from '../hooks/useLocationTracker'
import { updateProfile, getDashboardData } from '../services/userService'
import '../styles/dashboard.css'

const LocationSyncPage = () => {
  const navigate = useNavigate()
  const locationTracker = useLocationTracker(60000) // 60 second auto-sync
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [formData, setFormData] = useState({
    latitude: '',
    longitude: '',
    accuracy: '',
    location: '',
    deliveryZone: ''
  })

  // Fetch current user details to pre-fill if available
  useEffect(() => {
    getDashboardData()
      .then(data => {
        if (data?.user) {
          setFormData(prev => ({
            ...prev,
            location: data.user.location || '',
            deliveryZone: data.user.deliveryZone || ''
          }))
        }
      })
      .catch(err => console.error('Failed to fetch user data', err))
  }, [])

  // When location is captured, auto-populate location and delivery zone
  useEffect(() => {
    if (locationTracker.location && !formData.latitude) {
      const { lat, lng, accuracy } = locationTracker.location
      
      // Initial set with coordinates while geocoding
      setFormData(prev => ({
        ...prev,
        latitude: lat.toFixed(6),
        longitude: lng.toFixed(6),
        accuracy: accuracy,
        location: 'Fetching location details...',
        deliveryZone: 'Fetching zone details...'
      }))

      // Try reverse geocoding
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.address) {
            const city = data.address.city || data.address.town || data.address.village || data.address.state_district || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
            const suburb = data.address.suburb || data.address.neighbourhood || data.address.residential || `Zone: ${lat.toFixed(2)}, ${lng.toFixed(2)}`;
            setFormData(prev => ({
              ...prev,
              location: city,
              deliveryZone: suburb
            }))
          } else {
             setFormData(prev => ({
              ...prev,
              location: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
              deliveryZone: `Zone: ${lat.toFixed(2)}, ${lng.toFixed(2)}`
            }))
          }
        })
        .catch(err => {
          console.error("Reverse geocoding failed", err);
          setFormData(prev => ({
            ...prev,
            location: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
            deliveryZone: `Zone: ${lat.toFixed(2)}, ${lng.toFixed(2)}`
          }))
        });
      
      setMessage('✅ Location captured! You can now save it to your profile.')
    }
  }, [locationTracker.location, formData.latitude])

  const handleSaveLocation = async () => {
    if (!formData.latitude || !formData.longitude) {
      setMessage('❌ Please capture your location first')
      return
    }

    setSaving(true)
    setMessage('')

    try {
      const updateData = {
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        deliveryZone: formData.deliveryZone,
        location: formData.location,
        locationTrackingConsent: true,
        lastTrackedAt: new Date().toISOString()
      }

      await updateProfile(updateData)
      setMessage('✅ Location saved successfully to your profile!')
      
      // Reset after 2 seconds and navigate back
      setTimeout(() => {
        setFormData({
          latitude: '',
          longitude: '',
          accuracy: '',
          location: '',
          deliveryZone: ''
        })
        setMessage('')
        // Navigate back to dashboard with a refresh
        navigate('/dashboard', { replace: true })
      }, 2000)
    } catch (err) {
      setMessage(`❌ ${err.response?.data?.message || 'Failed to save location'}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="dashboard-container">
      <Navbar />
      <div className="dashboard-content">
        <h2 className="page-title">📍 Sync Your Location</h2>

        <div className="dashboard-section">
          <div className="info-card">
            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: '600' }}>
              Live Location Tracking
            </h3>
            <p style={{ color: '#666', fontSize: '14px', marginBottom: '1.5rem', lineHeight: '1.6' }}>
              Your location helps us verify trigger zones, match local weather data, and prevent fraud.
              <br />
              <strong>Permission is requested only once</strong> and stored securely.
            </p>

            {/* Location Map */}
            <LocationMap 
              location={locationTracker.location}
              isTracking={locationTracker.isTracking}
              error={locationTracker.error}
            />

            {/* Start/Stop Tracking Buttons */}
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem' }}>
              {!locationTracker.isTracking ? (
                <button 
                  type="button" 
                  className="submit-btn"
                  onClick={locationTracker.startTracking}
                  style={{ flex: 1 }}
                >
                  🟢 Start Location Tracking
                </button>
              ) : (
                <>
                  <button 
                    type="button" 
                    className="action-btn cancel"
                    onClick={locationTracker.stopTracking}
                    style={{ flex: 1 }}
                  >
                    🛑 Stop Tracking
                  </button>
                  <button 
                    type="button" 
                    className="action-btn"
                    onClick={locationTracker.syncLocation}
                    style={{ flex: 1 }}
                  >
                    🔄 Sync Now
                  </button>
                </>
              )}
            </div>

            {/* Location Details Form */}
            {locationTracker.location && (
              <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '2px solid #e2e8f0' }}>
                <h3 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: '600' }}>
                  📌 Location Details
                </h3>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1rem',
                  marginBottom: '1rem'
                }}>
                  <div className="form-group">
                    <label>Latitude</label>
                    <input 
                      type="text" 
                      value={formData.latitude}
                      readOnly
                      style={{ background: '#f5f5f5' }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Longitude</label>
                    <input 
                      type="text" 
                      value={formData.longitude}
                      readOnly
                      style={{ background: '#f5f5f5' }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Accuracy (meters)</label>
                  <input 
                    type="text" 
                    value={formData.accuracy}
                    readOnly
                    style={{ background: '#f5f5f5' }}
                  />
                </div>

                <div className="form-group">
                  <label>📍 Location Reference (Auto-populated)</label>
                  <input 
                    type="text" 
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Location coordinates"
                  />
                  <small style={{ color: '#666', marginTop: '0.25rem', display: 'block' }}>
                    Can be edited to add context (e.g., "Bandra, Mumbai")
                  </small>
                </div>

                <div className="form-group">
                  <label>🚚 Delivery Zone (Auto-populated)</label>
                  <input 
                    type="text" 
                    value={formData.deliveryZone}
                    onChange={(e) => setFormData({ ...formData, deliveryZone: e.target.value })}
                    placeholder="Delivery zone"
                  />
                  <small style={{ color: '#666', marginTop: '0.25rem', display: 'block' }}>
                    Can be edited to define your working area
                  </small>
                </div>

                {/* Status Message */}
                {message && (
                  <div style={{
                    marginTop: '1rem',
                    padding: '1rem',
                    background: message.includes('✅') ? '#e8f5e9' : '#ffebee',
                    color: message.includes('✅') ? '#2e7d32' : '#c62828',
                    border: `1px solid ${message.includes('✅') ? '#c8e6c9' : '#ffcdd2'}`,
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}>
                    {message}
                  </div>
                )}

                {/* Save Button */}
                <button 
                  type="button" 
                  className="submit-btn"
                  onClick={handleSaveLocation}
                  disabled={saving || !formData.latitude}
                  style={{ width: '100%', marginTop: '1.5rem' }}
                >
                  {saving ? '💾 Saving...' : '✅ Save Location to Profile'}
                </button>

                {/* Info Box */}
                <div style={{
                  marginTop: '1.5rem',
                  padding: '1rem',
                  background: '#e3f2fd',
                  border: '1px solid #90caf9',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: '#1565c0',
                  lineHeight: '1.6'
                }}>
                  <p style={{ margin: '0 0 0.5rem 0', fontWeight: '600' }}>ℹ️ Why We Track Location:</p>
                  <ul style={{ margin: '0', paddingLeft: '1.25rem' }}>
                    <li>Verify your exact delivery zone for trigger matching</li>
                    <li>Match local weather and AQI data to your claims</li>
                    <li>Prevent location spoofing and fraud</li>
                    <li>Ensure fair, accurate payouts</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default LocationSyncPage
