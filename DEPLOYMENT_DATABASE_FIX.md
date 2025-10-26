# Database Connection Fix for Production Deployment

## Problem
When deploying to production, portfolio data is not persisting after Google OAuth login because the application is connecting to different databases in local vs production environments.

## Root Cause
The production environment needs to connect to the same Supabase database. The environment variables were not properly configured to use the Supabase connection string.

## Solution

### 1. Set Environment Variables in Your Deployment Platform

For **Vercel** or **Netlify**, you need to set these environment variables:

#### Required Environment Variables:

```bash
# Database Connection (Supabase)
DATABASE_URL=postgresql://[user]:[password]@[host]:[port]/[database]?sslmode=require

# OR use individual parameters:
DB_HOST=your-supabase-host
DB_PORT=5432
DB_NAME=your-database-name
DB_USER=your-database-user
DB_PASSWORD=your-database-password

# Authentication
JWT_SECRET=your-secret-key-make-it-long-and-random

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# URLs (important for production!)
CLIENT_URL=https://your-frontend-url.vercel.app
SERVER_URL=https://your-backend-url.vercel.app

# CoinMarketCap API
COINMARKETCAP_API_KEY=your-api-key

# Email (optional, for password reset)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### 2. How to Get Your Supabase Connection String

1. Go to your Supabase project dashboard
2. Click on "Settings" → "Database"
3. Find the connection string under "Connection string" or "Connection pooling"
4. Copy the connection string and set it as `DATABASE_URL` environment variable

The connection string format looks like:
```
postgresql://postgres.xxxxxxxxxxxxx:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
```

### 3. Make Sure JWT_SECRET is Consistent

**IMPORTANT**: The `JWT_SECRET` must be the same everywhere:
- In your local `.env` file
- In your production environment variables
- This ensures tokens created in production work with your deployed backend

### 4. Verify Database Tables are Created

After deployment, check the server logs to ensure:
- Database connection is successful
- Tables are being created automatically
- User creation/authentication works

### 5. Check Deployment Logs

Look for these log messages in your deployment:
```
Database connection initialized with: { ... }
Using DATABASE_URL connection string
Google OAuth: User found by google_id: [id]
```

If you see errors like "relation 'users' does not exist", the database tables weren't created. You may need to run the initialization manually.

## Testing

After deploying with the correct environment variables:

1. **Test Google OAuth Login**
   - Login with Google account
   - Check server logs for user creation/retrieval
   - Note the user ID

2. **Add Crypto to Portfolio**
   - Add a cryptocurrency to your portfolio
   - Check logs: Should see "Portfolio entry created successfully for user: [id]"

3. **Logout and Login Again**
   - Logout
   - Login again with Google
   - Your portfolio should still be there with the same user ID

## Troubleshooting

### Issue: Portfolio data disappears after logout/login

**Check:**
1. Are environment variables set correctly in your deployment platform?
2. Is `DATABASE_URL` or database credentials correct?
3. Are you connecting to the same Supabase database?
4. Check server logs for the user ID - is it the same ID across logins?

### Issue: User ID changes between logins

**Cause:** Database connection is pointing to different databases, or JWT secret is different

**Solution:** Ensure:
- DATABASE_URL points to the same Supabase database
- JWT_SECRET is identical in all environments
- GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are the same

### Issue: "Invalid token" errors

**Cause:** JWT_SECRET mismatch or expired tokens

**Solution:** Set the same `JWT_SECRET` in production as you use in development

## Quick Checklist

- [ ] Set `DATABASE_URL` in production environment
- [ ] Set `JWT_SECRET` (same as development)
- [ ] Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- [ ] Set `CLIENT_URL` and `SERVER_URL` to production URLs
- [ ] Verify database connection in logs
- [ ] Test complete login → add crypto → logout → login flow
- [ ] Check that user ID remains consistent

## Additional Notes

The code now includes extensive logging to help debug these issues. When you deploy, check your server logs for:
- Database connection status
- Google OAuth user creation/retrieval
- Portfolio operations with user IDs

This will help identify where the data is being lost.

