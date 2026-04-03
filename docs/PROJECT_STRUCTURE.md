# 📁 Project Structure Guide

## Clean & Professional Organization

This document outlines the organized structure of the GigShield AI project.

---

## Root Directory

```
Gig-Shield/
├── 📄 README.md              # Main project documentation
├── 📄 .env                   # Environment variables (create from template)
├── 📄 .gitignore            # Git ignore rules
├── 📄 package.json          # Root package config (scripts)
├── 📄 package-lock.json     # Dependency lock file
│
├── 📂 frontend/             # React + Vite application
├── 📂 backend/              # Express REST API
├── 📂 ai-engine/            # Python Flask ML service
├── 📂 docs/                 # All documentation
└── 📂 scripts/              # Utility scripts
```

---

## Detailed Breakdown

### 🎨 Frontend (`frontend/`)

Modern React application with Vite

```
frontend/
├── 📂 src/
│   ├── 📂 components/       # Reusable UI components
│   │   ├── Navbar.jsx
│   │   ├── ProtectedRoute.jsx
│   │   ├── ClaimAlert.jsx
│   │   ├── StatCard.jsx
│   │   └── WorkerCard.jsx
│   │
│   ├── 📂 pages/            # Page-level components
│   │   ├── Home.jsx
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── WorkerDashboard.jsx
│   │   ├── PolicyPage.jsx
│   │   ├── AdminDashboard.jsx
│   │   ├── ProfilePage.jsx
│   │   ├── ForgotPassword.jsx
│   │   └── ResetPassword.jsx
│   │
│   ├── 📂 services/         # API integration layer
│   │   ├── api.js
│   │   ├── authService.js
│   │   ├── policyService.js
│   │   ├── claimService.js
│   │   ├── userService.js
│   │   └── adminService.js
│   │
│   ├── 📂 styles/           # Global CSS
│   │   └── dashboard.css    # Main stylesheet (modernized)
│   │
│   ├── App.jsx              # Main app component
│   └── main.jsx             # Entry point
│
├── index.html               # HTML template
├── vite.config.js           # Vite configuration
└── package.json             # Dependencies & scripts
```

**Key Features:**
- Modern gradient theme design
- Responsive layout
- Smooth animations
- Custom Inter font integration

---

### ⚙️ Backend (`backend/`)

Express REST API with SQLite database

```
backend/
├── 📂 config/
│   └── db.js                # Database configuration
│
├── 📂 controllers/          # Route handlers
│   ├── authController.js
│   ├── policyController.js
│   ├── claimController.js
│   ├── paymentController.js
│   ├── userController.js
│   ├── adminController.js
│   └── passwordResetController.js
│
├── 📂 middleware/
│   └── authMiddleware.js    # JWT authentication
│
├── 📂 models/               # Sequelize ORM models
│   ├── User.js
│   ├── Policy.js
│   ├── Claim.js
│   └── RiskZone.js
│
├── 📂 routes/               # API route definitions
│   ├── authRoutes.js
│   ├── policyRoutes.js
│   ├── claimRoutes.js
│   ├── paymentRoutes.js
│   ├── userRoutes.js
│   └── adminRoutes.js
│
├── 📂 services/             # Business logic
│   ├── triggerService.js    # Automatic claims
│   ├── weatherService.js    # Weather integration
│   └── fraudDetection.js    # Fraud detection
│
├── 📂 utils/
│   └── premiumCalculator.js # Premium calculation
│
├── database.sqlite          # SQLite database file
├── database-setup.sql       # SQL schema reference
├── server.js                # Main server entry point
└── package.json             # Dependencies & scripts
```

**Key Features:**
- JWT authentication
- Automatic weather-based claims
- Fraud detection system
- Real-time admin endpoints

---

### 🤖 AI Engine (`ai-engine/`)

Python Flask ML microservice

```
ai-engine/
├── 📂 data/
│   └── weather_history.csv  # Training dataset
│
├── 📂 models/
│   └── risk_model.pkl       # Trained risk model
│
├── app.py                   # Flask application
├── fraud_model.py           # Fraud detection logic
├── risk_prediction.py       # Risk scoring
├── train_model.py           # Model training script
└── requirements.txt         # Python dependencies
```

**Endpoints:**
- `POST /predict-risk` - Risk assessment
- `POST /detect-fraud` - Fraud analysis
- `GET /health` - Health check

---

### 📚 Documentation (`docs/`)

All project documentation in one place

```
docs/
├── README.md                # This file
├── architecture.md          # System architecture
├── workflow.md              # User workflows
├── STARTUP_GUIDE.md        # Local development setup
└── UI_IMPROVEMENTS.md      # Design enhancements
```

---

### 🛠️ Scripts (`scripts/`)

Utility and automation scripts

```
scripts/
└── simulateRain.js          # Weather simulation for testing
```

---

## File Organization Principles

### ✅ What We Did

1. **Moved all documentation to `docs/`**
   - Centralized knowledge base
   - Easy to find and maintain
   - Clear separation from code

2. **Clean root directory**
   - Only essential config files at root
   - No scattered markdown files
   - Professional appearance

3. **Logical grouping**
   - Frontend, backend, AI clearly separated
   - Each module has consistent internal structure
   - Easy navigation for new developers

4. **Clear naming conventions**
   - Descriptive file names
   - Consistent casing (PascalCase for components, camelCase for utilities)
   - Obvious purpose from filename

### ❌ What We Removed

- Redundant root-level HTML/config files
- Scattered documentation files
- Duplicate configuration
- Messy structure

---

## Quick Reference

### Starting Services

```bash
# Frontend (Port 5173)
cd frontend && npm run dev

# Backend (Port 5001)
cd backend && npm run dev

# AI Engine (Port 5002)
cd ai-engine && python app.py
```

### Key URLs

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5001/api
- **AI Engine**: http://localhost:5002

### Important Files

| Purpose | File Path |
|---------|-----------|
| Environment Setup | `.env` (root) |
| Main Styles | `frontend/src/styles/dashboard.css` |
| Server Config | `backend/server.js` |
| AI Service | `ai-engine/app.py` |
| API Routes | `backend/routes/*.js` |

---

## Best Practices

### For Developers

1. **Keep it organized**
   - New files go in appropriate folders
   - Follow existing naming patterns
   - Update docs when adding features

2. **Code structure**
   - Components in `components/`
   - Pages in `pages/`
   - Services in `services/`
   - Utils in `utils/`

3. **Documentation**
   - Add to `docs/` folder
   - Update README if needed
   - Comment complex logic

4. **Git hygiene**
   - Respect `.gitignore`
   - Commit messages should be clear
   - PRs should include relevant docs

---

## Benefits of This Structure

✅ **Professional** - Clean, organized layout  
✅ **Scalable** - Easy to add new features  
✅ **Maintainable** - Clear file locations  
✅ **Onboard-friendly** - New devs can navigate easily  
✅ **Separation of concerns** - Frontend/backend/AI clearly divided  

---

**Last Updated:** April 2, 2026  
**Version:** 2.0 (Reorganized Structure)
