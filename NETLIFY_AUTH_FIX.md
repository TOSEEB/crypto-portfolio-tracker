# Netlify Authentication Fix

## Problem
The application was receiving 401 Unauthorized errors when deployed on Netlify because:
1. The token format was inconsistent between the login endpoint and the auth verification endpoints
2. The `/api/auth/me` endpoint was trying to decode tokens as simple base64 JSON, but the actual authentication system uses JWT tokens

## Changes Made

### 1. Updated `getUserIdFromToken` function
- Now properly handles both JWT tokens (for production) and base64 JSON tokens (for fallback)
- Made the function `async` to support async JWT verification
- Updated all calls to this function to use `await`

### 2. Updated `/api/auth/me` endpoint
- Now tries to decode tokens as JWT first, then falls back to base64 JSON
- Properly handles token expiration

### 3. Updated `/api/auth/login` endpoint
- Now generates proper JWT tokens (or base64 JSON as fallback)
- Includes proper user data: userId, email, name
- Sets expiration to 7 days

### 4. Updated all portfolio endpoints to use `await` with `getUserIdFromToken`
- `/api/portfolio` (GET)
- `/api/portfolio` (POST)  
- `/api/portfolio/summary`
- `/api/auth/profile`

## Configuration Required

### Netlify Environment Variables
You need to set the following environment variable in your Netlify dashboard:

1. Go to: **Site settings** → **Environment variables**
2. Add the following variable:
   - Key: `JWT_SECRET`
   - Value: A strong random string (e.g., generate using: `openssl rand -base64 32`)

**Important**: The same `JWT_SECRET` value should be used across:
- Netlify environment variables (for serverless functions)
- Any backend server you have deployed

### How to Generate a Secure JWT_SECRET
Run this command in your terminal:
```bash
openssl rand -base64 32
```

Or use an online generator, or simply use a long random string.

## Testing the Fix

After deploying these changes to Netlify:

1. Log in to your application
2. The login should now generate a proper token
3. The `/api/auth/me` endpoint should successfully verify the token
4. Portfolio data should load without 401 errors

## Deploy Instructions

1. Commit and push your changes:
```bash
git add netlify/functions/server.js
git commit -m "Fix authentication token handling for Netlify deployment"
git push
```

2. Netlify will automatically redeploy
3. Verify the `JWT_SECRET` environment variable is set in Netlify dashboard
4. Test the login and dashboard functionality

## Notes

- The fix is backward compatible - it handles both JWT tokens and base64 JSON tokens
- If `JWT_SECRET` is not set, it falls back to using base64 JSON tokens
- The token includes user ID, email, and name
- Tokens expire after 7 days

