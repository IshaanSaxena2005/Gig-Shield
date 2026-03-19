import React from 'react'
import { Link } from 'react-router-dom'
import '../styles/dashboard.css'

/**
 * Home/Landing Page Component
 * Main landing page showcasing GigShield AI features
 */
const Home = () => {
  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Protect Your Income from Weather Disruptions</h1>
          <p className="hero-subtitle">AI Powered Insurance for Delivery Partners</p>
          <div className="hero-buttons">
            <Link to="/register" className="btn btn-primary">Get Started</Link>
            <Link to="/login" className="btn btn-secondary">Login</Link>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works">
        <h2 className="section-title">How It Works</h2>
        <div className="steps-grid">
          <div className="step-card">
            <div className="step-number">1</div>
            <h3>Register as Delivery Partner</h3>
            <p>Sign up and connect your delivery platform account</p>
          </div>
          <div className="step-card">
            <div className="step-number">2</div>
            <h3>AI Calculates Weekly Premium</h3>
            <p>Our AI analyzes risk factors to determine your weekly premium</p>
          </div>
          <div className="step-card">
            <div className="step-number">3</div>
            <h3>Automatic Payouts During Disruptions</h3>
            <p>Receive instant payouts when weather disrupts your work</p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <h2 className="section-title">Key Features</h2>
        <div className="features-grid">
          <div className="feature-card">
            <h3>🤖 AI Risk Assessment</h3>
            <p>Advanced algorithms analyze weather patterns and risk factors</p>
          </div>
          <div className="feature-card">
            <h3>📅 Weekly Premium Pricing</h3>
            <p>Flexible weekly premiums based on real-time risk assessment</p>
          </div>
          <div className="feature-card">
            <h3>⚡ Automatic Claims</h3>
            <p>No paperwork needed - claims triggered automatically by parametric events</p>
          </div>
          <div className="feature-card">
            <h3>💰 Instant Payouts</h3>
            <p>Direct bank transfers within minutes of claim approval</p>
          </div>
          <div className="feature-card">
            <h3>🔒 Fraud Detection</h3>
            <p>AI-powered fraud detection ensures fair claims for everyone</p>
          </div>
          <div className="feature-card">
            <h3>🌧️ Multiple Disruptions Covered</h3>
            <p>Heavy rain, extreme heat, floods, pollution, curfews and more</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p>&copy; 2026 GigShield AI. Protecting gig workers across India.</p>
      </footer>
    </div>
  )
}

export default Home
