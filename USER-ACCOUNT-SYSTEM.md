# User Account & Credit System

## Overview
The sidebar now features a user account system with credit-based monetization at the top of the interface, replacing the previous bottom logo area.

## Features

### 1. Credit Display
- Shows current credit balance with a diamond icon (💎)
- Displays "0 Credits" for non-logged-in users
- Updates in real-time when credits are used or added

### 2. Login/Sign Up Button
- **Not Logged In**: Shows "🔓 Login / Sign Up"
- **Logged In**: Shows "👤 [email]"
- Gradient orange button with hover effects

### 3. User Flow

#### Sign Up
1. Click "Login / Sign Up" button
2. Select "OK" for Sign Up
3. Enter email address
4. Receive 100 welcome credits

#### Login
1. Click "Login / Sign Up" button
2. Select "Cancel" for Login
3. Enter email address
4. Credits are loaded from account

#### Logout
1. Click account button (when logged in)
2. Confirm logout
3. Credits reset to 0

## Implementation Details

### Storage
User account data is stored in Chrome's local storage:
```javascript
{
  isLoggedIn: boolean,
  credits: number,
  email: string
}
```

### Credit Management

#### Deduct Credits
```javascript
deductCredits(amount) // Returns true if successful, false if insufficient
```

#### Add Credits
```javascript
addCredits(amount) // For purchases or rewards
```

### UI Location
- Positioned below the header (top logo area)
- Above the main tab navigation
- Fixed height, doesn't scroll

## Styling
- Background: Semi-transparent with gradient accent
- Credit display: Orange gradient border with highlighted amount
- Auth button: Full-width gradient button with shadow effects
- Responsive hover states and animations

## Next Steps for Production

### Backend Integration
Replace mock functions with real API calls:

1. **Authentication**
   - `signupUser()` → POST /api/auth/signup
   - `loginUser()` → POST /api/auth/login
   - `logoutUser()` → POST /api/auth/logout

2. **Credit Management**
   - `deductCredits()` → POST /api/credits/deduct
   - `addCredits()` → POST /api/credits/add
   - Sync credits from server on login

3. **Payment Integration**
   - Add "Buy Credits" button
   - Integrate Stripe/PayPal
   - Credit packages (e.g., 100 credits for $5)

### Security
- Add JWT token authentication
- Secure API endpoints
- Encrypt sensitive data
- Add session management

### Features to Add
- Password authentication
- Email verification
- Password reset
- Credit purchase history
- Usage analytics
- Subscription plans
- Referral rewards

## Credit Pricing Suggestions
- 1 credit = 1 AI request
- Packages:
  - 100 credits: $5 (5¢ per credit)
  - 500 credits: $20 (4¢ per credit)
  - 1000 credits: $35 (3.5¢ per credit)
- Free tier: 10 credits per day
- Premium: Unlimited for $15/month
