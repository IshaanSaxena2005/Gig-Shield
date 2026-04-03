# Gig-Shield

Gig-Shield is a working parametric income-protection platform for gig workers. It combines a React frontend, an Express API, SQLite-backed policy and claims management, and a Python AI service for dynamic risk and fraud support.

The project started as a hackathon prototype, but the current repo now supports the full Phase 2 story: worker onboarding, protected dashboards, policy quotes, dynamic premium calculation, automated triggers, zero-touch claims, admin review, payment simulation, and AI-assisted scoring with safe fallbacks.

## Phase 2 Focus

This version of the project is tuned for the DEV Trails Phase 2 theme, "Protect Your Worker". The current app flow emphasizes:

- Registration and protected access to worker/admin experiences
- Insurance policy management with pause, resume, pay, and cancel actions
- Dynamic premium calculation with a quote preview before policy creation
- Claims management with both manual submission and automated disruption-triggered payouts
- A zero-touch claims path for verified events, with soft review for ambiguous or higher-risk triggers
- Percentile-based payout logic internally, while the worker only sees the final payout amount

## What Is In This Repo

- `frontend/`: React 19 + Vite client application
- `backend/`: Express API with Sequelize models and authentication
- `ai-engine/`: Flask microservice for risk prediction and fraud-related endpoints
- `docs/`: supporting notes and architecture sketches
- Root Vite files: present, but the main app runtime appears to live under `frontend/` and `backend/`

## Current Stack

### Frontend

- React 19
- Vite
- React Router
- Axios

### Backend

- Node.js
- Express
- Sequelize
- JWT authentication
- bcryptjs
- Stripe SDK

### Database

- SQLite via Sequelize

The backend currently runs against SQLite in `backend/database.sqlite` through [backend/config/db.js](C:\Users\AKASHDEEP\OneDrive\Documents\GitHub\Gig-Shield\backend\config\db.js). Older references to MySQL or MongoDB in the repo do not reflect the current implementation.

### AI Service

- Python
- Flask
- pandas
- joblib / scikit-learn style model loading

The AI layer is now wired into the backend quote and claim flow. If the Python service or model artifacts are unavailable, the Node backend falls back to built-in risk and fraud heuristics so the app remains usable.

## Main Application Areas

### Frontend pages

- Landing page
- Login and registration
- Forgot/reset password
- Worker dashboard
- Policy management
- Admin dashboard
- Profile page

Primary frontend entry points:

- [frontend/src/main.jsx](C:\Users\AKASHDEEP\OneDrive\Documents\GitHub\Gig-Shield\frontend\src\main.jsx)
- [frontend/src/App.jsx](C:\Users\AKASHDEEP\OneDrive\Documents\GitHub\Gig-Shield\frontend\src\App.jsx)

### Backend capabilities

- User authentication and JWT issuance
- Password reset flow
- Policy creation, premium quoting, and management
- Claim submission and zero-touch automated claims
- AI-assisted and rule-based fraud detection
- Weather-based and mock-feed automatic claim processing
- Admin reporting endpoints
- User dashboard/profile endpoints
- Demo-friendly premium payment flow with Stripe-ready upgrade path

Primary backend entry point:

- [backend/server.js](C:\Users\AKASHDEEP\OneDrive\Documents\GitHub\Gig-Shield\backend\server.js)

### AI engine endpoints

- `POST /predict-risk`
- `POST /detect-fraud`
- `GET /health`

Primary AI entry point:

- [ai-engine/app.py](C:\Users\AKASHDEEP\OneDrive\Documents\GitHub\Gig-Shield\ai-engine\app.py)

## Project Structure

```text
Gig-Shield/
|-- frontend/
|   |-- src/
|   |   |-- components/
|   |   |-- pages/
|   |   |-- services/
|   |   |-- styles/
|   |   |-- App.jsx
|   |   `-- main.jsx
|   `-- package.json
|-- backend/
|   |-- config/
|   |-- controllers/
|   |-- middleware/
|   |-- models/
|   |-- routes/
|   |-- services/
|   |-- utils/
|   |-- server.js
|   `-- package.json
|-- ai-engine/
|   |-- models/
|   |-- app.py
|   `-- risk_prediction.py
|-- docs/
`-- README.md
```

## Local Development

### Prerequisites

- Node.js 18+ recommended
- npm
- Python 3.8+

### Environment variables

Create a root `.env` file for the backend and AI-related settings. Based on the current code, these values are expected or strongly recommended:

```env
JWT_SECRET=replace-with-a-real-secret
STRIPE_SECRET_KEY=replace-with-a-real-key
OPENWEATHER_API_KEY=replace-with-a-real-key
FRONTEND_URL=http://localhost:5173
PORT=5001
AI_ENGINE_PORT=5002
ENABLE_AUTOMATION=true
AUTOMATION_INTERVAL_MINUTES=60
EXPOSE_RESET_TOKEN=false
```

Notes:

- The backend loads environment variables from `../.env` relative to `backend/server.js`.
- `PORT` is commonly run as `5001` in this repo.
- The AI engine defaults to `5002`.
- `ENABLE_AUTOMATION=false` disables scheduled claim processing for safer local testing.
- `AUTOMATION_INTERVAL_MINUTES` controls how often automated triggers are evaluated.
- `EXPOSE_RESET_TOKEN=true` is only for demo-mode password reset testing.
- The frontend reads `VITE_API_BASE_URL` from `frontend/.env.local`. An example file is included at [frontend/.env.example](C:\Users\AKASHDEEP\OneDrive\Documents\GitHub\Gig-Shield\frontend\.env.example).

### Install dependencies

Frontend:

```bash
cd frontend
npm install
```

Backend:

```bash
cd backend
npm install
```

AI engine:

```bash
cd ai-engine
pip install -r requirements.txt
```

### Run the services

Start the backend:

```bash
cd backend
npm run dev
```

Start the frontend:

```bash
cd frontend
npm run dev
```

Start the AI engine:

```bash
cd ai-engine
python app.py
```

Expected local URLs:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5001` in the current local setup
- AI engine: `http://localhost:5002` by default

## Available Scripts

### `frontend/package.json`

- `npm run dev`
- `npm run build`
- `npm run preview`

### `backend/package.json`

- `npm start`
- `npm run dev`
- `npm test`

Frontend scripts remain lightweight, but the backend now includes executable Node-based tests for pricing, trigger evaluation, and AI fallback behavior.

## Data Flow Overview

1. A user authenticates through the backend and receives a JWT.
2. The frontend stores the authenticated user in local storage and attaches the bearer token to API requests.
3. Policies are quoted and priced through a dynamic premium engine using location risk, live weather, coverage, occupation, and AI/fallback risk scoring.
4. Weather data plus mock civic/environment feeds are evaluated to detect disruption triggers.
5. Automatic claim processing runs on startup and at a configurable interval in the backend.
6. Manual claims are checked against fraud rules plus AI/fallback fraud assessment and can enter a `flagged` soft-review state.
7. Admin endpoints aggregate stats, automation metrics, fraud alerts, review queues, and zone-level summaries.

## Automated Triggers

The current backend is designed around these disruption triggers that support the Phase 2 zero-touch claims story:

- Heavy rain
- Thunderstorm
- Flood and waterlogging risk
- Extreme heat
- Mock civic restriction
- Air-quality stress

Verified weather triggers can auto-approve claims, while ambiguous signals are sent into a soft-review queue so honest workers are not unfairly blocked. Internally, each trigger maps to a payout percentile; the worker only sees the final payout amount in the UI.

## Health And Verification

Two lightweight health endpoints are available:

- Backend: `GET /api/health`
- AI engine: `GET /health`

Before demoing or deploying locally, the project has been verified with:

- `npm test` in [backend/package.json](C:\Users\AKASHDEEP\OneDrive\Documents\GitHub\Gig-Shield\backend\package.json)
- `npm run build` in [frontend/package.json](C:\Users\AKASHDEEP\OneDrive\Documents\GitHub\Gig-Shield\frontend\package.json)
- `python -m py_compile app.py risk_prediction.py` in [ai-engine](C:\Users\AKASHDEEP\OneDrive\Documents\GitHub\Gig-Shield\ai-engine)

## Current Limitations

These are important repo realities worth knowing before you build on top of this project:

- The backend uses SQLite, which is fine for local demos but should move to PostgreSQL or MySQL for real production scale.
- Automatic claims processing still depends on weather access when automation is enabled.
- Stripe is implemented in a demo-friendly mode unless a real secret key is provided.
- The AI engine now falls back safely when model artifacts are missing, but it is still not a fully trained production ML stack.
- Backend tests exist now, but frontend test coverage and linting are still missing.

## Useful Files

- [frontend/src/services/api.js](C:\Users\AKASHDEEP\OneDrive\Documents\GitHub\Gig-Shield\frontend\src\services\api.js)
- [backend/config/db.js](C:\Users\AKASHDEEP\OneDrive\Documents\GitHub\Gig-Shield\backend\config\db.js)
- [backend/controllers/authController.js](C:\Users\AKASHDEEP\OneDrive\Documents\GitHub\Gig-Shield\backend\controllers\authController.js)
- [backend/controllers/policyController.js](C:\Users\AKASHDEEP\OneDrive\Documents\GitHub\Gig-Shield\backend\controllers\policyController.js)
- [backend/controllers/claimController.js](C:\Users\AKASHDEEP\OneDrive\Documents\GitHub\Gig-Shield\backend\controllers\claimController.js)
- [backend/services/triggerService.js](C:\Users\AKASHDEEP\OneDrive\Documents\GitHub\Gig-Shield\backend\services\triggerService.js)
- [ai-engine/app.py](C:\Users\AKASHDEEP\OneDrive\Documents\GitHub\Gig-Shield\ai-engine\app.py)

## Status

Gig-Shield is now a strong working model for a hackathon or demo environment. It supports the full user journey locally and has safer AI, payment, health, and automation behavior than the original prototype. The main remaining gap is production hardening at infrastructure scale, not missing core product flow.

## Adversarial Defense & Anti-Spoofing Strategy

The first market crash changed the way we think about this product. In that scenario, a coordinated group of delivery workers used GPS-spoofing tools to fake their presence inside a severe weather zone and trigger false parametric payouts at scale. That means location alone can no longer be treated as truth. Our defense strategy is to move from single-point verification to behavior-based verification, where a claim is judged through a wider pattern of signals instead of one GPS reading.

### 1. The Differentiation

Our AI/ML architecture would distinguish a genuinely stranded worker from a spoofing actor by looking for consistency between location, movement, platform activity, device behavior, and surrounding event data. A real stranded worker usually leaves behind a believable operational story: they were active before the disruption, their movement pattern made sense for a delivery route, the weather event matches the timing of the interruption, and their digital behavior remains natural even if the network is unstable. A spoofing actor may be able to fake a coordinate, but it is much harder to fake a full chain of believable context.

Instead of asking, "Is this worker inside the red zone?", the model asks a stronger question: "Does this claim look like the behavior of a real worker who was genuinely affected by this event?" That shift is the core of our anti-spoofing design.

We would score each claim on a trust spectrum using multiple layers:

- Event authenticity: did a verified weather or emergency event actually occur in that place and time?
- Activity continuity: was the worker genuinely active before the disruption and then interrupted in a realistic way?
- Movement realism: does the route history look like normal delivery movement or like synthetic jumps and impossible travel?
- Device integrity: are there signs of mock-location tools, rooted devices, emulator patterns, or sudden device-environment changes?
- Network consistency: do IP region, carrier behavior, and signal-loss patterns roughly match the claimed situation?
- Group anomaly detection: is this claim part of a suspicious cluster of very similar claims from the same area, channel, or time window?

In simple terms, a real worker tends to produce messy but believable signals. A fraud ring tends to produce clean, repeated, and coordinated manipulation patterns.

### 2. The Data

To detect a coordinated fraud ring, our system would analyze more than raw latitude and longitude. The goal is to combine environmental, behavioral, device, and network evidence into one fraud-risk view.

Important data points would include:

- Route history over time, not just a final pinned point
- Speed, acceleration, stoppage pattern, and direction changes
- Timestamp consistency between claimed disruption, recent delivery activity, and app usage
- Delivery-platform signals such as order acceptance, pickup attempts, cancellations, and session activity
- Device telemetry such as mock-location detection, developer mode indicators, rooted-device signals, emulator signatures, sensor availability, and sudden GPS-source switching
- Network clues such as IP geolocation, carrier consistency, SIM change patterns, and unusual VPN or proxy usage
- Weather severity data mapped to time and micro-location, including whether nearby workers show similar but not identical disruption patterns
- Claim frequency by worker, device, phone number, payout account, and locality
- Shared-fingerprint signals that may reveal collusion, such as many claims tied to the same device family, bank destination, IP cluster, or repeated timing pattern
- Historical reliability score for each worker based on prior genuine activity and prior flagged behavior

This matters because fraud at this level is not usually a single fake claim. It is a coordinated pattern. A ring may use different identities, but clusters often still appear through repeated devices, similar timing, identical movement profiles, common payout paths, or synchronized filing behavior. Our system is designed to spot both the suspicious individual claim and the wider group signature behind it.

### 3. The UX Balance

The biggest risk in anti-fraud design is overcorrecting and punishing honest workers, especially during real storms when networks are unstable and location quality gets worse. Our workflow therefore avoids turning every suspicious signal into an automatic rejection.

We use a three-lane claim decision flow:

- Low-risk claims: auto-approve quickly when signals are consistent
- Medium-risk claims: place into a soft-review state and request lightweight confirmation
- High-risk claims: hold payout temporarily and escalate for deeper fraud review

For flagged claims, the user experience should stay fair and respectful. A worker should not be treated like a fraudster just because their signal dropped in bad weather. If a claim is flagged, the system should explain that additional verification is needed due to inconsistent telemetry, not accuse the worker of misconduct. We would ask for the least burdensome proof first, such as recent order timeline confirmation, passive device re-check, or a short in-app verification step once connectivity stabilizes.

We would also build in a "benefit of doubt" layer for genuine edge cases. For example, if severe weather is confirmed, the worker has a strong history, and only one signal is missing because of a temporary network drop, the claim should move into assisted verification rather than hard denial. The platform should slow down suspicious payouts, not block honest workers from support when they need it most.

### First Market Crash Response Summary

The lesson from the first market crash is clear: parametric insurance cannot rely on GPS alone. Our response is a multi-signal trust architecture that looks at whether a claim is believable as a real-world event, not just whether a device reported a location. By combining behavior analytics, device trust checks, network context, event validation, and fraud-ring clustering, Gig-Shield becomes much harder to exploit through mass spoofing. At the same time, the workflow remains worker-sensitive by using soft review and progressive verification instead of blunt rejection. That gives us a system that is both more resilient against organized fraud and more humane toward honest gig workers.
