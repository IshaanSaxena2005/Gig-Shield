# Gig-Shield Backend

Backend API for the Gig-Shield AI-powered insurance platform for delivery partners.

## Features

- **User Authentication**: JWT-based authentication for workers and admins
- **Policy Management**: Create and manage insurance policies with AI-calculated premiums
- **Claims Processing**: Submit and manage insurance claims with fraud detection
- **Admin Dashboard**: Platform metrics, risk zone management, and fraud monitoring
- **Weather Integration**: Automatic claim triggering based on weather conditions
- **Payment Processing**: Stripe integration for premium payments

## Tech Stack

- **Node.js** with Express.js
- **MySQL** with Sequelize ORM
- **JWT** for authentication
- **Stripe** for payments
- **OpenWeather API** for weather data

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile

### Policies

- `GET /api/policies` - Get user's policies
- `POST /api/policies` - Create new policy
- `GET /api/policies/:id` - Get policy by ID
- `GET /api/policies/all` - Get all policies (admin)

### Claims

- `GET /api/claims` - Get user's claims
- `POST /api/claims` - Submit new claim
- `GET /api/claims/:id` - Get claim by ID
- `PUT /api/claims/:id` - Update claim status (admin)
- `GET /api/claims/all` - Get all claims (admin)

### Payments

- `POST /api/payments/process` - Process payment

### Admin

- `GET /api/admin/dashboard` - Get dashboard statistics
- `GET /api/admin/risk-zones` - Get risk zones
- `PUT /api/admin/risk-zones` - Update risk zone
- `GET /api/admin/fraud-alerts` - Get fraud alerts

### User

- `GET /api/user/dashboard` - Get user dashboard data

## Setup Instructions

1. **Install Dependencies**

   ```bash
   npm install
   ```

2. **Environment Variables**
   Create a `.env` file in the root directory:

   ```
   NODE_ENV=development
   PORT=5000
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your-password
   DB_NAME=gig_shield
   DB_PORT=3306
   JWT_SECRET=your-secret-key
   OPENWEATHER_API_KEY=your-api-key
   STRIPE_SECRET_KEY=your-stripe-key
   ```

3. **Setup MySQL Database**
   - Install MySQL Server on your system
   - Create a database named `gig_shield`
   - Update the database credentials in your `.env` file

4. **Run the Server**
   ```bash
   npm start
   # or for development
   npm run dev
   ```

## Database Models

### User

- name, email, password, role, occupation, location

### Policy

- user (ref), type, premium, coverage, startDate, endDate, status

### Claim

- user (ref), policy (ref), amount, description, status, submittedAt, processedAt

### RiskZone

- location, riskLevel, weatherConditions, updatedAt

## Services

### Fraud Detection

- Analyzes claim patterns for suspicious activity
- Checks claim frequency and amount ratios

### Weather Service

- Fetches weather data from OpenWeather API
- Used for risk assessment and automatic claims

### Trigger Service

- Automatically creates claims based on weather conditions
- Runs hourly to check for weather disruptions

### Premium Calculator

- Calculates insurance premiums based on risk factors
- Considers location, weather, and occupation risks

## Security Features

- JWT authentication with role-based access
- Password hashing with bcrypt
- Fraud detection algorithms
- Admin-only endpoints protection

## Automatic Features

- **Weather-based Claims**: Automatically creates claims when severe weather is detected
- **Risk Assessment**: AI-powered premium calculation based on multiple risk factors
- **Fraud Monitoring**: Real-time fraud detection and alerts

## Development

The backend is structured with:

- `controllers/` - Request handlers
- `models/` - Database schemas
- `routes/` - API route definitions
- `middleware/` - Authentication and other middleware
- `services/` - Business logic and external API integrations
- `utils/` - Helper functions

## Testing

To test the API endpoints, you can use tools like Postman or curl:

```bash
# Register a new user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"password123"}'
```
