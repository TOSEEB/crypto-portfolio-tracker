# Setup Supabase for Production

## Steps to Connect to Supabase

1. **Get Your Supabase Connection String**
   - Go to your Supabase project dashboard
   - Click **Settings** → **Database**
   - Copy the connection string under **Connection string** or **Connection pooling**

2. **Set Environment Variable in Vercel/Netlify**
   
   **Vercel:**
   - Go to your project → **Settings** → **Environment Variables**
   - Add: `DATABASE_URL` = `postgresql://postgres.xxx:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres`
   
   **Netlify:**
   - Go to site → **Site settings** → **Environment variables**
   - Add the same `DATABASE_URL` variable

3. **Other Required Variables**
   ```bash
   DATABASE_URL=postgresql://postgres.xxx:[PASSWORD]@[HOST]:[PORT]/postgres
   JWT_SECRET=your-secret-key
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   CLIENT_URL=https://your-frontend.vercel.app
   SERVER_URL=https://your-backend.vercel.app
   COINMARKETCAP_API_KEY=your-api-key
   ```

4. **Redeploy** your application

5. **Verify Connection**
   - Check server logs for: `"Using DATABASE_URL connection string"`
   - Test login with Google - user should be created in Supabase

## Automatic Functionality

When a user logs in with Google:
- ✅ User is automatically registered in Supabase
- ✅ Portfolio data is saved to Supabase
- ✅ Data persists across logins
- ✅ Works in both local (PostgreSQL) and production (Supabase)

## Checking Which Database You're Using

The server logs will show:
```
Database connection initialized with: {
  host: 'DATABASE_URL',
  database: 'from connection string',
  env: 'production'
}
```

This confirms you're using Supabase!

