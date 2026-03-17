# GigShield AI - AI Powered Parametric Insurance for Gig Workers

A comprehensive React frontend platform that protects delivery partners (Zomato, Swiggy, Zepto, Amazon etc.) from income loss caused by external disruptions like heavy rain, extreme heat, floods, pollution or curfews.

## 🚀 Features

### For Delivery Partners (Workers)

- **Worker Dashboard** - View insurance summary, earnings protection, and claims history
- **Policy Management** - Activate, pause, or cancel insurance policies
- **Automatic Claims** - Parametric triggers automatically process claims during disruptions
- **Real-time Alerts** - Instant notifications when claims are approved and paid

### For Admins

- **Platform Metrics** - Track workers insured, active policies, premiums, and payouts
- **Claims Overview** - Monitor daily, weekly, and total claims
- **Fraud Detection** - AI-powered fraud alerts for suspicious claims
- **Risk Zones** - Geographic risk assessment visualization

### Key Characteristics

- ✅ Loss of income insurance ONLY (no health/accident/life/vehicle)
- ✅ Weekly-based insurance pricing
- ✅ Automatic claims through parametric events
- ✅ Clean, minimal, professional UI
- ✅ Responsive design for all devices

## 🛠️ Tech Stack

### Frontend

- **React 19** with Vite
- **React Router DOM** for routing
- **Axios** for API calls
- **CSS3** with modern styling
- **Functional Components** with Hooks

### Backend

- **Node.js** with Express.js
- **MySQL** with Sequelize ORM
- **JWT** for authentication
- **bcryptjs** for password hashing

### AI Engine

- **Python** with scikit-learn
- **pandas** for data processing
- **Machine Learning** for risk assessment

### External Services

- **OpenWeatherMap API** for weather data
- **Stripe** for payments

## 📁 Project Structure

```
src/
├── components/
│   ├── Navbar.jsx          # Navigation bar component
│   ├── WorkerCard.jsx      # Worker insurance summary card
│   ├── ClaimAlert.jsx      # Claim notification component
│   └── StatCard.jsx        # Statistics card component
├── pages/
│   ├── Home.jsx            # Landing page
│   ├── Login.jsx           # User login page
│   ├── Register.jsx        # User registration page
│   ├── WorkerDashboard.jsx # Worker dashboard
│   ├── PolicyPage.jsx      # Policy management page
│   └── AdminDashboard.jsx  # Admin dashboard
├── services/
│   ├── api.js              # Axios instance configuration
│   ├── authService.js      # Authentication functions
│   └── claimService.js     # Claims management functions
├── styles/
│   └── dashboard.css       # Global styles
├── App.jsx                 # Main app component with routing
└── main.jsx                # Entry point
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- MySQL Server (v8.0 or higher)
- Python 3.8+ (for AI engine)

### Database Setup

1. Install and start MySQL Server
2. Create the database:
   - Open MySQL Workbench or command line
   - Run: `CREATE DATABASE gig_shield;`
   - Or use the provided `database-setup.sql` file

3. Update `.env` file with your MySQL credentials:
   ```
   DB_USER=your_mysql_username
   DB_PASSWORD=your_mysql_password
   ```

### Installation

1. Install backend dependencies:

```bash
cd backend
npm install
```

2. Install frontend dependencies:

```bash
cd frontend
npm install
```

3. Start the backend server:

```bash
cd backend
npm start
```

4. Start the frontend development server:

```bash
cd frontend
npm start
```

The application will be available at:

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
  npm run dev

```

3. Open browser and navigate to:
```

http://localhost:5173

```

## 📱 Available Routes

- `/` - Landing page with features and how it works
- `/login` - User login
- `/register` - New user registration
- `/dashboard` - Worker dashboard (protected)
- `/policy` - Policy management (protected)
- `/admin` - Admin dashboard (protected)

## 🎨 Design Features

### Color Scheme
- Primary gradient: Purple to violet (#667eea to #764ba2)
- Success states: Green (#28a745)
- Warning states: Yellow/Orange (#ffc107)
- Danger states: Red (#dc3545)

### UI Components
- **Cards** - Clean white cards with subtle shadows
- **Tables** - Responsive data tables with hover effects
- **Badges** - Color-coded status indicators
- **Buttons** - Gradient buttons with hover animations
- **Alerts** - Slide-in notifications

### Responsive Design
- Mobile-first approach
- Breakpoints at 768px
- Flexible grid layouts
- Touch-friendly buttons

## 🔌 API Integration (Mock)

The application uses mocked services for prototype purposes:

### Base URL
```

http://localhost:5000/api

```

### Services
- **authService.js** - Login, register, logout
- **claimService.js** - Get claims, submit claims
- **api.js** - Axios instance with interceptors

To connect to real backend:
1. Update base URL in `src/services/api.js`
2. Uncomment actual API calls in service files
3. Remove mock data responses

## 📊 Sample Data

The application includes realistic mock data for:
- Worker profiles (name, platform, location)
- Insurance policies (premiums, coverage limits)
- Claims history (dates, disruptions, amounts)
- Admin statistics (metrics, fraud alerts, risk zones)

## 🎯 Use Cases

### Example Scenarios

1. **Heavy Rain Disruption**
   - Weather API detects heavy rainfall in worker's area
   - System automatically triggers insurance claim
   - Worker receives alert: "Disruption detected in your area"
   - ₹150 credited to account instantly

2. **Flood Event**
   - Flood warning issued for specific zone
   - All workers in that zone automatically covered
   - Claims processed without manual intervention
   - Direct bank transfer within minutes

3. **Extreme Heat Wave**
   - Temperature exceeds threshold (e.g., 45°C)
   - Parametric trigger activates coverage
   - Workers compensated for lost income

## 🔐 Security Notes

For production deployment:
- Implement JWT authentication
- Add protected route guards
- Secure API endpoints
- Validate all user inputs
- Implement CSRF protection
- Use HTTPS in production

## 📝 Future Enhancements

- [ ] Real-time weather API integration
- [ ] GPS-based disruption detection
- [ ] Payment gateway integration
- [ ] Multi-language support
- [ ] Push notifications
- [ ] Mobile app version
- [ ] Analytics dashboard
- [ ] Export reports (PDF/Excel)

## 👥 Target Users

Delivery partners working with:
- Zomato
- Swiggy
- Zepto
- Amazon
- Flipkart
- Other gig platforms

## 💡 What Makes This Special

1. **Parametric Insurance** - No claims paperwork, automatic payouts
2. **Weekly Pricing** - Flexible premiums based on real-time risk
3. **AI-Powered** - Smart risk assessment and fraud detection
4. **Income Protection** - Focused solely on loss of earnings
5. **Instant Payouts** - Money credited within minutes

## 📄 License

This is a hackathon project prototype.

## 🙏 Acknowledgments

Built for the AI Powered Parametric Insurance Hackathon.

---

**GigShield AI** - Protecting gig workers across India 🇮🇳
```
