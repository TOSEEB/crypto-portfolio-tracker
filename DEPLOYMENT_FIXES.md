# Portfolio Summary Fix for Netlify Deployment

## Issues Fixed

### 1. **JWT Authentication Token Mismatch**
**Problem**: JWT tokens were being signed and verified with different secrets, causing "invalid signature" errors.

**Fix**: 
- Updated `server/middleware/auth.js` to use a fallback JWT_SECRET
- Updated `server/routes/auth.js` to use the same JWT_SECRET for signing tokens
- Default secret: `development_secret_key_12345`

### 2. **Login Endpoint Accepts Username OR Email**
**Problem**: Client sends `{ email, password }` but server expected `{ username, password }`.

**Fix**: 
- Updated `server/routes/auth.js` login endpoint to accept both username and email
- Now searches database with: `WHERE username = $1 OR email = $1`

### 3. **Google OAuth Database Constraint**
**Problem**: `password_hash` column had NOT NULL constraint, but Google OAuth users don't have passwords.

**Fix**:
- Added database migration in `server/config/database.js` to drop NOT NULL constraint
- Google OAuth users can now be created without password_hash

### 4. **Portfolio Summary Returns Zeros**
**Problem**: On deployed Netlify site, portfolio summary shows 0 for all values.

**Fix**:
- Added `await` to `getSupabase()` call in summary endpoint
- Added debug logging to track data flow
- Improved crypto symbol matching logic

## Files Changed

1. `server/middleware/auth.js` - JWT secret fallback
2. `server/routes/auth.js` - Login accepts email/username, JWT secret fix
3. `server/config/database.js` - Drop NOT NULL constraint for password_hash
4. `netlify/functions/server.js` - Portfolio summary fixes, await getSupabase()

## Deployment Steps

### For Netlify:
1. Set environment variable in Netlify dashboard:
   ```
   JWT_SECRET = your-secret-key-here
   ```
   Generate one with: `openssl rand -base64 32`

2. Commit and push:
   ```bash
   git add .
   git commit -m "Fix authentication and portfolio summary"
   git push
   ```

### For Local Testing:
1. Make sure your `.env` file has `JWT_SECRET` set
2. Restart your development server
3. Test login and portfolio features

## Testing Checklist

- [ ] Login with username works
- [ ] Login with email works  
- [ ] Google OAuth login works
- [ ] Portfolio items display correctly
- [ ] Portfolio summary shows correct totals
- [ ] No 401 authentication errors
- [ ] Dashboard loads without errors

## Next Steps

After deploying to Netlify:
1. Test login with your account
2. Add cryptocurrency holdings
3. Verify portfolio summary shows correct totals
4. Check browser console for any errors
5. Check Netlify function logs for backend errors

