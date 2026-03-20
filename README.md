# Gig-Shield

Gig-Shield is a prototype insurance platform for gig workers. It combines a React frontend, an Express API, and a small Python AI service to model a parametric insurance workflow where disruptions such as weather events can affect coverage, claims, and payouts.

This repository is currently best understood as a hackathon-style prototype. The core frontend and backend are usable for local development, while parts of the documentation and AI integration are still catching up with the codebase.

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
- Policy creation and management
- Claim submission
- Rule-based fraud detection
- Weather-based automatic claim processing
- Admin reporting endpoints
- User dashboard/profile endpoints

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
PORT=5000
AI_ENGINE_PORT=5002
```

Notes:

- The backend loads environment variables from `../.env` relative to `backend/server.js`.
- `PORT` defaults to `5000`.
- The AI engine defaults to `5002`.
- The frontend currently hardcodes `http://localhost:5001/api` in [frontend/src/services/api.js](C:\Users\AKASHDEEP\OneDrive\Documents\GitHub\Gig-Shield\frontend\src\services\api.js), so you will either need to change that file or run the backend on port `5001` to match it.

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
pip install flask joblib scikit-learn pandas
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
- Backend API: `http://localhost:5000` by default
- AI engine: `http://localhost:5002` by default

## Available Scripts

### `frontend/package.json`

- `npm run dev`
- `npm run build`
- `npm run preview`

### `backend/package.json`

- `npm start`
- `npm run dev`

There are currently no test or lint scripts defined in the main frontend/backend package files.

## Data Flow Overview

1. A user authenticates through the backend and receives a JWT.
2. The frontend stores the authenticated user in local storage and attaches the bearer token to API requests.
3. Policies are created and priced through backend controllers and utility logic.
4. Weather data is used by backend services to evaluate disruption conditions.
5. Automatic claim processing runs on startup and then every hour in the backend.
6. Manual claims are checked against simple fraud rules.
7. Admin endpoints aggregate stats, alerts, and zone-level summaries.

## Current Limitations

These are important repo realities worth knowing before you build on top of this project:

- The README and some docs were previously out of date; this file now reflects the current codebase more closely.
- The backend uses SQLite even though older files still mention MySQL or MongoDB.
- The frontend imports a `ProtectedRoute` component, but routes in [frontend/src/App.jsx](C:\Users\AKASHDEEP\OneDrive\Documents\GitHub\Gig-Shield\frontend\src\App.jsx) are not currently wrapped with it.
- The frontend API base URL and backend default port do not currently match.
- The AI service exists, but the Node backend does not appear to fully integrate with it yet.
- `ai-engine/models/` currently contains `risk_model.pkl`; `risk_prediction.py` also expects `location_encoder.pkl`.
- Automatic claims processing runs immediately on backend startup and then hourly, which means local development may depend on external weather API access.
- No automated tests or linting setup were found in the primary app packages.

## Useful Files

- [frontend/src/services/api.js](C:\Users\AKASHDEEP\OneDrive\Documents\GitHub\Gig-Shield\frontend\src\services\api.js)
- [backend/config/db.js](C:\Users\AKASHDEEP\OneDrive\Documents\GitHub\Gig-Shield\backend\config\db.js)
- [backend/controllers/authController.js](C:\Users\AKASHDEEP\OneDrive\Documents\GitHub\Gig-Shield\backend\controllers\authController.js)
- [backend/controllers/policyController.js](C:\Users\AKASHDEEP\OneDrive\Documents\GitHub\Gig-Shield\backend\controllers\policyController.js)
- [backend/controllers/claimController.js](C:\Users\AKASHDEEP\OneDrive\Documents\GitHub\Gig-Shield\backend\controllers\claimController.js)
- [backend/services/triggerService.js](C:\Users\AKASHDEEP\OneDrive\Documents\GitHub\Gig-Shield\backend\services\triggerService.js)
- [ai-engine/app.py](C:\Users\AKASHDEEP\OneDrive\Documents\GitHub\Gig-Shield\ai-engine\app.py)

## Status

Gig-Shield is a solid prototype with a readable separation between UI, API, and ML service boundaries. The main app path is in place, but there are still a few integration and documentation gaps to resolve before it would feel production-ready.

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
