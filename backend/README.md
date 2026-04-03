# Gig-Shield Backend

Express API for the Gig-Shield worker insurance platform.

## Current Stack

- Node.js + Express
- Sequelize
- SQLite for local development
- JWT auth
- OpenWeather integration
- Demo-friendly Stripe payment flow
- AI-assisted risk and fraud calls with safe fallbacks

## Main Responsibilities

- Authentication and profile APIs
- Policy quote, creation, and status management
- Manual and automated claims
- Fraud review and soft-flag workflow
- Admin dashboard metrics and claim review
- Scheduled disruption checks

## Run Locally

```bash
cd backend
npm install
npm run dev
```

Default health URL:

```text
http://localhost:5001/api/health
```

## Scripts

- `npm run dev`
- `npm start`
- `npm test`

## Notes

- The local database is `backend/database.sqlite`.
- The backend reads environment variables from the repo root `.env`.
- Stripe stays in demo mode while `STRIPE_SECRET_KEY` is unset or left as a placeholder.
- The full project setup lives in the root [README.md](C:\Users\AKASHDEEP\OneDrive\Documents\GitHub\Gig-Shield\README.md).
