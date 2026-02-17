# Firebase Security Setup Guide

## 🔒️ Security Improvements Implemented

### 1. Environment Variables
- Firebase configuration now supports environment variables
- Development fallbacks remain for local testing
- Production deployments should use environment variables

### 2. Security Warnings
- Console warnings when using development config in production
- Helps prevent accidental credential exposure

### 3. Database Rules Template
- `firebase-rules.json` provides secure database rules
- Includes user authentication requirements
- Admin-only write protection for sensitive areas

## 🚀 Deployment Instructions

### For Production:
1. Set up environment variables on your hosting platform:
   ```bash
   FIREBASE_API_KEY=your_production_api_key
   FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
   FIREBASE_PROJECT_ID=your_project_id
   FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   FIREBASE_APP_ID=your_app_id
   ```

2. Deploy Firebase Database Rules:
   ```bash
   firebase deploy --only database
   ```

### For Development:
1. Copy `.env.example` to `.env`
2. Fill in your development Firebase values
3. Use a local server that serves environment variables

## 🔧 Firebase Rules Explanation

The provided rules (`firebase-rules.json`) implement:

- **Public Read**: Anyone can read level data
- **Authenticated Write**: Only logged-in users can write
- **Author Control**: Users can only edit their own levels
- **Admin Protection**: Sensitive operations require admin privileges
- **Shared Levels**: Public sharing requires explicit flag

## ⚡ Additional Security Recommendations

1. **Enable Firebase Authentication** with email/password and social providers
2. **Implement Server-side Validation** for critical operations
3. **Use Firebase Security Rules** to validate data structure
4. **Monitor Firebase Console** for suspicious activity
5. **Regularly Rotate API Keys** if compromised

## 🛠️ Environment Setup Tools

### Node.js (Recommended):
```bash
npm install dotenv
```

Create `.env` file:
```env
FIREBASE_API_KEY=your_api_key_here
# ... other variables
```

### Docker:
```dockerfile
ENV FIREBASE_API_KEY=your_api_key_here
ENV FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
# ... other variables
```

### Vercel/Netlify:
Set environment variables in dashboard under:
- Settings → Environment Variables
