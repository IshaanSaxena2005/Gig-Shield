import React from 'react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Uncaught error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', background: '#f8fafc', padding: '2rem', textAlign: 'center' }}>
          <div style={{ fontSize: 48 }}>⚠️</div>
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>Something went wrong</h2>
          <p style={{ color: '#666', maxWidth: 420 }}>
            An unexpected error occurred. Please refresh the page. If the issue persists, try logging out and back in.
          </p>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button
              style={{ padding: '8px 20px', background: '#667eea', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </button>
            <button
              style={{ padding: '8px 20px', background: 'transparent', color: '#666', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer' }}
              onClick={() => { localStorage.removeItem('user'); window.location.href = '/login' }}
            >
              Logout & Login Again
            </button>
          </div>
          {process.env.NODE_ENV !== 'production' && (
            <pre style={{ marginTop: '1rem', fontSize: 11, color: '#999', maxWidth: 600, overflow: 'auto', textAlign: 'left', background: '#f1f5f9', padding: '1rem', borderRadius: 6 }}>
              {this.state.error?.toString()}
            </pre>
          )}
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
