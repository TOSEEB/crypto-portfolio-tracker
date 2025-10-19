# Crypto Tracker - Vercel Deployment Guide

## Prerequisites
1. Install Vercel CLI: `npm i -g vercel`
2. Create Vercel account at https://vercel.com
3. Set up PostgreSQL database (Vercel Postgres or external)

## Deployment Steps

### 1. Deploy Backend (Server)

```bash
# Navigate to server directory
cd server

# Login to Vercel
vercel login

# Deploy backend
vercel

# Set environment variables in Vercel dashboard:
# - NODE_ENV=production
# - DB_HOST=your-db-host
# - DB_PORT=5432
# - DB_NAME=your-db-name
# - DB_USER=your-db-user
# - DB_PASSWORD=your-db-password
# - JWT_SECRET=your-secure-jwt-secret
# - COINMARKETCAP_API_KEY=your_coinmarketcap_api_key
# - GOOGLE_CLIENT_ID=your_google_client_id
# - GOOGLE_CLIENT_SECRET=your_google_client_secret
# - CLIENT_URL=https://your-frontend-app.vercel.app
# - SERVER_URL=https://your-backend-app.vercel.app
# - EMAIL_USER=your_email@gmail.com
# - EMAIL_PASS=your_app_password
```

### 2. Deploy Frontend (Client)

```bash
# Navigate to client directory
cd client

# Deploy frontend
vercel

# Set environment variables in Vercel dashboard:
# - REACT_APP_API_URL=https://your-backend-app.vercel.app
```

### 3. Update Frontend API Configuration

Update `client/src/setupProxy.js` or axios base URL to point to your backend URL.

### 4. Database Setup

#### Option A: Vercel Postgres
1. Go to Vercel dashboard
2. Add Vercel Postgres integration
3. Use connection string in environment variables

#### Option B: External PostgreSQL
1. Use services like:
   - Supabase (Free tier available)
   - Railway
   - Neon
   - PlanetScale
2. Update DB_* environment variables

### 5. Google OAuth Setup

1. Go to Google Cloud Console
2. Update OAuth redirect URIs:
   - `https://your-backend-app.vercel.app/api/auth/google/callback`
3. Update authorized JavaScript origins:
   - `https://your-frontend-app.vercel.app`

## Environment Variables Summary

### Backend (Server) Environment Variables:
- NODE_ENV=production
- DB_HOST=your-db-host
- DB_PORT=5432
- DB_NAME=your-db-name
- DB_USER=your-db-user
- DB_PASSWORD=your-db-password
- JWT_SECRET=your-secure-jwt-secret
- COINMARKETCAP_API_KEY=your_coinmarketcap_api_key
- GOOGLE_CLIENT_ID=your_google_client_id
- GOOGLE_CLIENT_SECRET=your_google_client_secret
- CLIENT_URL=https://your-frontend-app.vercel.app
- SERVER_URL=https://your-backend-app.vercel.app
- EMAIL_USER=your_email@gmail.com
- EMAIL_PASS=your_app_password

### Frontend (Client) Environment Variables:
- REACT_APP_API_URL=https://your-backend-app.vercel.app

## Post-Deployment

1. Test all endpoints
2. Verify CoinMarketCap API is working
3. Test Google OAuth login
4. Check database connections
5. Monitor logs in Vercel dashboard

## Troubleshooting

- Check Vercel function logs for errors
- Verify environment variables are set correctly
- Ensure database is accessible from Vercel
- Check CORS settings for frontend-backend communication
