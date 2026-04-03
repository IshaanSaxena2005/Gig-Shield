# 🚀 GigShield AI - Local Development Startup Guide

## ✅ Successfully Running Services

All three components of GigShield AI are now running locally!

### Service Status

| Service | Port | Status | URL |
|---------|------|--------|-----|
| **Frontend** | 5173 | ✅ Running | http://localhost:5173 |
| **Backend API** | 5001 | ✅ Running | http://localhost:5001 |
| **AI Engine** | 5002 | ✅ Running | http://localhost:5002 |

---

## 🎯 Quick Access

### Frontend (React + Vite)
- **URL**: http://localhost:5173
- **Features**: 
  - Modern, polished UI with gradient themes
  - Smooth animations and transitions
  - Responsive design
  - Real-time weather integration
  - Dashboard for workers and admins

### Backend API (Node.js + Express + SQLite)
- **URL**: http://localhost:5001/api
- **Endpoints**:
  - `/api/auth` - Authentication routes
  - `/api/policies` - Policy management
  - `/api/claims` - Claims processing
  - `/api/payments` - Payment integration
  - `/api/admin` - Admin operations
  - `/api/user` - User profile management

### AI Engine (Python + Flask + Scikit-learn)
- **URL**: http://localhost:5002
- **Features**:
  - Risk prediction model
  - Fraud detection
  - Weather-based risk assessment
  - Machine learning inference

---

## 📋 Current Session Information

### Terminal Sessions
1. **Terminal 1**: Frontend dev server (Vite)
2. **Terminal 3**: Backend API (nodemon)
3. **Terminal 4**: AI Engine (Flask)

### Database
- **Type**: SQLite
- **File**: `backend/database.sqlite`
- **Status**: Fresh database created and synchronized

---

## 🎨 UI Improvements Applied

The frontend has been completely modernized with:

### Visual Enhancements
- ✨ Modern indigo-purple gradient theme
- 🎯 Professional Inter font family
- 🌊 Smooth animations (fade-in, slide-up, hover effects)
- 💎 Consistent shadow system (sm → md → lg → xl)
- 🎨 Enhanced color palette with proper gradients

### Component Improvements
- **Cards**: Rounded corners, lift-on-hover, better shadows
- **Buttons**: Gradient backgrounds, smooth transitions
- **Forms**: Focus rings, better error states
- **Tables**: Modern headers, row hover effects
- **Navbar**: Backdrop blur, improved spacing
- **Weather Card**: Cyan-blue gradient, glassmorphism

### Animations
- Page load animations
- Hover transform effects
- Rotating gradient backgrounds
- Loading spinner
- Custom scrollbar

---

## 🔧 Configuration Notes

### Environment Variables
Location: Root `.env` file

```
JWT_SECRET=your-secret-key
STRIPE_SECRET_KEY=your-stripe-key
OPENWEATHER_API_KEY=your-weather-api-key
FRONTEND_URL=http://localhost:5173
PORT=5001
AI_ENGINE_PORT=5002
```

⚠️ **Note**: Some environment variables show warnings but the app still functions for local development.

### Port Configuration
- Frontend: **5173** (Vite default)
- Backend: **5001** (configured in server.js)
- AI Engine: **5002** (configured in app.py)

---

## 📱 How to Use

### For Users/Gig Workers
1. Visit http://localhost:5173
2. Click "Get Started" or "Login"
3. Register as a delivery partner
4. Create an insurance policy
5. View dashboard with weather-based coverage
6. Track automatic claims during adverse weather

### For Admins
1. Login with admin credentials
2. Navigate to Admin Dashboard
3. View platform metrics
4. Monitor fraud detection alerts
5. Check risk zones
6. Review claims overview

---

## 🛠️ Development Commands

### Frontend
```bash
cd frontend
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
```

### Backend
```bash
cd backend
npm run dev      # Start with nodemon (auto-restart)
npm start        # Start without nodemon
```

### AI Engine
```bash
cd ai-engine
python app.py           # Run Flask server
python train_model.py   # Retrain ML models
```

---

## 🐛 Troubleshooting

### Backend Database Errors
If you see foreign key constraint errors:
```bash
cd backend
rm database.sqlite  # Delete old database
npm run dev         # Restart server
```

### Port Already in Use
If any port is already occupied:
- Frontend: Change in `vite.config.js`
- Backend: Change `PORT` in `.env`
- AI Engine: Change port in `ai-engine/app.py`

### Module Not Found
Run `npm install` in the respective directory:
```bash
cd frontend && npm install
cd backend && npm install
```

For AI engine:
```bash
cd ai-engine
pip install flask flask-cors scikit-learn pandas numpy joblib
```

---

## 📊 System Architecture

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
│  (database.sqlite)
└─────────────────┘
```

---

## 🎯 Key Features

### Parametric Insurance
- Automatic payouts triggered by weather events
- No paperwork required
- Instant claim processing

### AI-Powered Risk Assessment
- Machine learning risk prediction
- Dynamic premium calculation
- Fraud detection system

### Real-Time Weather Integration
- Live weather data via API
- Automatic disruption detection
- Location-based coverage

### Multi-Platform Support
- Zomato, Swiggy, Zepto
- Amazon, Flipkart
- Other delivery platforms

---

## 📈 Testing the Application

### Test User Registration
1. Go to http://localhost:5173
2. Click "Get Started"
3. Fill in registration form:
   - Name: Test User
   - Platform: Zomato
   - City: Mumbai
   - Daily Income: 500
   - Email: test@example.com
   - Password: password123

### Test Policy Creation
1. Login after registration
2. Navigate to Policy page
3. Create new policy:
   - Type: Standard
   - Coverage: 5000
   - Location: Mumbai
4. Activate the policy

### Test Weather Integration
1. Check weather card on dashboard
2. System automatically detects adverse conditions
3. Eligible claims trigger automatically

---

## 🔐 Default Test Accounts

If pre-populated in database:
- **Admin**: admin@gigshield.com / admin123
- **User**: user@example.com / user123

*(Check backend controllers for actual test credentials)*

---

## 📝 Recent Changes

### UI/UX Improvements (Latest)
- Complete visual redesign
- Modern gradient themes
- Enhanced animations
- Better responsive design
- Improved accessibility
- Professional typography

### Technical Updates
- Added Inter font via Google Fonts
- Implemented CSS variable system
- Enhanced shadow hierarchy
- Optimized performance
- Fixed database sync issues

---

## 🎉 Success Indicators

✅ Frontend accessible at http://localhost:5173  
✅ Backend API responding at http://localhost:5001/api  
✅ AI Engine running at http://localhost:5002  
✅ Database initialized and synchronized  
✅ Hot module replacement active (Vite)  
✅ Nodemon auto-restart enabled  
✅ All CORS configured correctly  

---

## 💡 Tips

1. **Hot Reload**: Frontend changes apply instantly
2. **Auto-Restart**: Backend restarts on file changes
3. **Debug Mode**: AI engine has Flask debugger enabled
4. **Database**: SQLite file persists in `backend/` folder
5. **Logs**: Check terminal outputs for debugging

---

## 🚀 Next Steps

1. Explore the modernized UI
2. Test user registration flow
3. Create insurance policies
4. Simulate weather-based claims
5. Check admin dashboard features
6. Review AI risk predictions

---

**Happy coding! 🎨✨**

*Application successfully started with enhanced UI/UX*
