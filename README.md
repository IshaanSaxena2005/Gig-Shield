# 🛡️ GigShield AI - Parametric Insurance for Gig Workers

[![React](https://img.shields.io/badge/React-19-blue)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-8.0-purple)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-green)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-Flask-yellow)](https://flask.palletsprojects.com/)
[![SQLite](https://img.shields.io/badge/Database-SQLite-orange)](https://www.sqlite.org/)

**GigShield AI** is an intelligent insurance platform designed for gig workers, leveraging AI and parametric insurance to provide automatic payouts during weather disruptions and other adverse conditions.

## ✨ Key Features

- 🤖 **AI-Powered Risk Assessment** - Machine learning models for dynamic premium calculation
- ⚡ **Automatic Claims** - No paperwork required; claims triggered by parametric events
- 🌧️ **Weather Integration** - Real-time weather data for disruption detection
- 🔒 **Fraud Detection** - Multi-signal trust architecture with anti-spoofing measures
- 💰 **Instant Payouts** - Direct bank transfers within minutes of claim approval
- 📊 **Admin Dashboard** - Real-time monitoring of policies, claims, and risk zones

## 🏗️ Architecture

### Tech Stack

**Frontend**
- React 19 with modern hooks
- Vite for blazing-fast development
- React Router for navigation
- Axios for API communication
- Custom CSS with modern gradient themes

**Backend**
- Node.js + Express REST API
- Sequelize ORM with SQLite
- JWT authentication
- bcryptjs for password hashing
- Stripe integration for payments

**AI Engine**
- Python Flask microservice
- Scikit-learn ML models
- Pandas for data processing
- Joblib model serialization

### System Diagram

```
┌─────────────────┐
│   Frontend      │  Port 5173
│  (React + Vite) │
└────────┬────────┘
         │
         ├──────────────────┐
         │                  │
         ▼                  ▼
┌─────────────────┐  ┌─────────────────┐
│   Backend API   │  │   AI Engine     │
│ Port 5001       │  │  Port 5002      │
│ (Node + Express)│  │ (Flask + ML)    │
└────────┬────────┘  └─────────────────┘
         │
         ▼
┌─────────────────┐
│   SQLite DB     │
│  database.sqlite
└─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.8+
- **Git** for version control

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Gig-Shield-main
```

### 2. Environment Setup

Create a `.env` file in the root directory:

```env
# Authentication & Security
JWT_SECRET=your-super-secret-jwt-key-change-this
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key

# External Services
OPENWEATHER_API_KEY=your_openweather_api_key

# Application URLs
FRONTEND_URL=http://localhost:5173
PORT=5001
AI_ENGINE_PORT=5002
```

### 3. Install Dependencies

**Frontend:**
```bash
cd frontend
npm install
```

**Backend:**
```bash
cd backend
npm install
```

**AI Engine:**
```bash
cd ai-engine
pip install flask flask-cors scikit-learn pandas numpy joblib
```

### 4. Run All Services

Open three terminal windows:

**Terminal 1 - Frontend:**
```bash
cd frontend
npm run dev
```
→ Frontend runs on http://localhost:5173

**Terminal 2 - Backend:**
```bash
cd backend
npm run dev
```
→ Backend API runs on http://localhost:5001

**Terminal 3 - AI Engine:**
```bash
cd ai-engine
python app.py
```
→ AI Engine runs on http://localhost:5002

### 5. Access the Application

Visit **http://localhost:5173** in your browser.

---

## 📁 Project Structure

```
Gig-Shield/
├── frontend/              # React + Vite application
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API service layer
│   │   ├── styles/       # Global CSS styles
│   │   ├── App.jsx       # Main app component
│   │   └── main.jsx      # Entry point
│   ├── index.html
│   └── package.json
│
├── backend/              # Express REST API
│   ├── config/          # Database configuration
│   ├── controllers/     # Route controllers
│   ├── middleware/      # Auth middleware
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── utils/           # Utility functions
│   ├── database.sqlite  # SQLite database
│   └── server.js        # Server entry point
│
├── ai-engine/           # Python Flask ML service
│   ├── data/            # Training datasets
│   ├── models/          # Trained ML models
│   ├── app.py           # Flask application
│   ├── fraud_model.py   # Fraud detection logic
│   ├── risk_prediction.py # Risk scoring
│   └── train_model.py   # Model training script
│
├── docs/                # Documentation
│   ├── architecture.md
│   ├── workflow.md
│   ├── STARTUP_GUIDE.md
│   └── UI_IMPROVEMENTS.md
│
├── scripts/             # Utility scripts
├── .env                 # Environment variables
├── .gitignore
└── README.md
```

## 🔐 Security & Anti-Fraud

GigShield employs a **multi-signal trust architecture** to prevent fraud while maintaining a smooth user experience:

### Anti-Spoofing Measures

- **Event Authentication**: Verifies weather/emergency events occurred at claimed time and location
- **Activity Continuity**: Analyzes worker activity patterns before and after disruption
- **Movement Realism**: Detects synthetic GPS patterns vs. genuine delivery routes
- **Device Integrity**: Identifies mock-location tools, emulators, and rooted devices
- **Network Consistency**: Validates IP, carrier, and signal patterns
- **Group Anomaly Detection**: Spots coordinated fraud rings through clustering analysis

### Three-Lane Claim Flow

1. **Low-Risk** → Auto-approved instantly
2. **Medium-Risk** → Soft review with lightweight verification  
3. **High-Risk** → Held for manual investigation

This approach balances fraud prevention with fair treatment of honest workers during genuine disruptions.

---

## 📚 Documentation

Detailed guides available in [`docs/`](docs/):

- **[Architecture](docs/architecture.md)** - System design overview
- **[Workflow](docs/workflow.md)** - User flows and logic
- **[Startup Guide](docs/STARTUP_GUIDE.md)** - Complete setup instructions
- **[UI Improvements](docs/UI_IMPROVEMENTS.md)** - Design enhancements

---

## 🤝 Contributing

This is a prototype. Areas for improvement:

- [ ] Automated test coverage
- [ ] Production environment setup
- [ ] Enhanced AI model training
- [ ] Mobile optimizations
- [ ] Additional payment integrations

---

**Built with ❤️ for gig workers** | **Prototype - Not Production Ready**
