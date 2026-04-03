import React from 'react'
import { Link } from 'react-router-dom'
import '../styles/dashboard.css'

const Home = () => {
  return (
    <div className="landing-page">

      {/* HERO */}
      <section className="hero-section">
        <div className="hero-content">
          <div style={{ fontSize: 13, letterSpacing: '0.08em', color: '#a78bfa', textTransform: 'uppercase', marginBottom: 12, fontWeight: 600 }}>
            IRDAI Regulatory Sandbox · Parametric Income Protection
          </div>
          <h1 className="hero-title">
            Income lost to rain or AQI?<br />You get paid automatically.
          </h1>
          <p className="hero-subtitle" style={{ maxWidth: 560, margin: '1rem auto' }}>
            GigShield is a parametric insurance platform built exclusively for Zomato and Swiggy food delivery partners.
            When extreme weather or pollution disrupts your work, we pay your lost income directly to your UPI account — no paperwork, no waiting.
          </p>
          <div style={{ fontSize: 13, color: '#f8c' , marginBottom: '1.5rem' }}>
            ⚠️ This is income protection only. Health, vehicle damage, and accidents are not covered.
          </div>
          <div className="hero-buttons">
            <Link to="/register" className="btn btn-primary">Get Insured — From ₹99/week</Link>
            <Link to="/login"    className="btn btn-secondary">Login</Link>
          </div>
        </div>
      </section>

      {/* PLANS */}
      <section className="features-section">
        <h2 className="section-title">Weekly Plans — Aligned to Your Pay Cycle</h2>
        <p style={{ textAlign: 'center', color: '#888', marginBottom: '2rem', fontSize: 14 }}>
          Zomato and Swiggy pay weekly. So does GigShield. Cancel anytime.
        </p>
        <div className="steps-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {[
            {
              name: 'Shield Basic', price: '₹99/week', cap: '₹2,500 coverage cap',
              triggers: ['Heavy rain (≥50mm)', 'Severe AQI (≥200)'],
              for: 'Dry season / low-risk zones'
            },
            {
              name: 'Shield Standard', price: '₹149/week', cap: '₹3,500 coverage cap',
              recommended: true,
              triggers: ['Heavy rain (≥50mm)', 'Severe AQI (≥200)', 'Extreme heat (≥42°C)', 'Cyclone / Red Alert'],
              for: 'Monsoon season · Chennai, Mumbai'
            },
            {
              name: 'Shield Pro', price: '₹229/week', cap: '₹5,000 coverage cap',
              triggers: ['Heavy rain (≥50mm)', 'Severe AQI (≥200)', 'Extreme heat (≥42°C)', 'Cyclone / Red Alert', 'Section 144 curfew / hartal'],
              for: 'All-year cover · high-density cities'
            },
          ].map(plan => (
            <div key={plan.name} className="step-card" style={{ position: 'relative', border: plan.recommended ? '2px solid #667eea' : undefined }}>
              {plan.recommended && (
                <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#667eea', color: '#fff', fontSize: 11, padding: '2px 12px', borderRadius: 20, fontWeight: 600, whiteSpace: 'nowrap' }}>
                  AI RECOMMENDED
                </div>
              )}
              <h3 style={{ marginTop: plan.recommended ? 8 : 0 }}>{plan.name}</h3>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#667eea', margin: '4px 0' }}>{plan.price}</div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>{plan.cap}</div>
              {plan.triggers.map(t => <p key={t} style={{ fontSize: 13, color: '#444', margin: '3px 0' }}>✓ {t}</p>)}
              <p style={{ fontSize: 11, color: '#aaa', marginTop: 10 }}>Best for: {plan.for}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="how-it-works">
        <h2 className="section-title">How It Works</h2>
        <div className="steps-grid">
          {[
            { n: '1', title: 'Register as Zomato / Swiggy Partner', desc: 'Enter your partner ID, city, and average daily earnings. Takes 2 minutes.' },
            { n: '2', title: 'AI Calculates Your Weekly Premium', desc: 'Our actuarial engine uses 5-year IMD weather data and your city\'s disruption frequency to price your plan.' },
            { n: '3', title: 'Disruption Detected → Auto Payout', desc: 'When IMD confirms rain ≥50mm or AQI ≥200, your income-loss payout is initiated automatically. No claim form needed.' },
          ].map(s => (
            <div key={s.n} className="step-card">
              <div className="step-number">{s.n}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="features-section">
        <h2 className="section-title">Built for Delivery Partners, Not Generic Workers</h2>
        <div className="features-grid">
          {[
            { icon: '🌧️', title: 'Parametric Rain Trigger', desc: 'IMD rainfall ≥50mm/3hr fires your claim automatically. No photos, no proof, no hassle.' },
            { icon: '💰', title: 'UPI Payout in 4 Hours', desc: 'Income-loss payout directly to your UPI account. ₹600–₹1,200 per disruption day.' },
            { icon: '📅', title: 'Weekly Pricing', desc: 'Premium deducted from your weekly Zomato/Swiggy payout. No upfront costs.' },
            { icon: '🤖', title: 'AI Risk Assessment', desc: '5-year IMD + CPCB data, city-specific disruption frequency, and your earnings profile.' },
            { icon: '🔍', title: 'Fraud Detection', desc: 'Multi-signal trust scoring checks GPS, device, and claim pattern — protecting honest workers.' },
            { icon: '📋', title: 'IRDAI Compliant', desc: 'Operating under IRDAI Regulatory Sandbox (Ref: IRDAI/SB/2024/0091). Your premiums are protected.' },
          ].map(f => (
            <div key={f.title} className="feature-card">
              <h3>{f.icon} {f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* EXCLUSIONS — visible on landing for trust */}
      <section className="how-it-works" style={{ background: '#fff5f5' }}>
        <h2 className="section-title" style={{ color: '#c00' }}>What We Do NOT Cover</h2>
        <p style={{ textAlign: 'center', color: '#666', fontSize: 14, marginBottom: '1.5rem' }}>
          GigShield is income protection only. We are not a health, vehicle, or life insurer.
        </p>
        <div className="steps-grid">
          {[
            { icon: '🏥', label: 'Health & Medical', desc: 'Doctor visits, hospitalisation, or illness — not covered.' },
            { icon: '🛵', label: 'Vehicle Repairs', desc: 'Bike damage, fuel, or maintenance — not covered.' },
            { icon: '🚑', label: 'Accidents & Injuries', desc: 'Personal injury or third-party liability — not covered.' },
            { icon: '💀', label: 'Life Insurance', desc: 'Death benefit or disability cover — not covered.' },
          ].map(e => (
            <div key={e.label} className="step-card" style={{ border: '1px solid #fcc' }}>
              <div style={{ fontSize: 28 }}>{e.icon}</div>
              <h3 style={{ color: '#c00' }}>{e.label}</h3>
              <p style={{ color: '#888' }}>{e.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="landing-footer">
        <p>
          © 2026 GigShield · IRDAI Regulatory Sandbox Ref: IRDAI/SB/2024/0091 ·
          Protecting food delivery partners across India ·
          <a href="/register" style={{ color: '#a78bfa', marginLeft: 8 }}>Get covered from ₹99/week →</a>
        </p>
      </footer>
    </div>
  )
}

export default Home
