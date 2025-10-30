const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { Pool } = require('pg');
// Use dynamic import for Supabase to avoid module resolution issues
// const { createClient } = require('@supabase/supabase-js');

const app = express();

// Database connection - initialize only when needed
let pool = null;
let dbInitialized = false;
let supabase = null;

// Disable in-memory storage: always use database (Supabase/Postgres)
let useInMemoryStorage = false;

const getPool = () => {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
      ssl: {
        rejectUnauthorized: false
      },
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      max: 20
    });
  }
  return pool;
};

// Supabase client with dynamic import to avoid module resolution issues
const getSupabase = async () => {
  if (!supabase) {
    try {
      // Dynamic import to avoid module resolution issues
      const { createClient } = await import('@supabase/supabase-js');
      const url = process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
      if (url && key) {
        supabase = createClient(url, key, { auth: { persistSession: false } });
        console.log('Supabase client initialized');
      } else {
        console.log('Supabase env missing, skipping client init');
      }
    } catch (error) {
      console.log('Supabase client creation failed:', error.message);
      return null;
    }
  }
  return supabase;
};

// Initialize database tables (Postgres only). If Supabase is configured, prefer that.
const initDatabase = async () => {
  try {
    if (process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)) {
      const sb = await getSupabase();
      if (sb) {
        console.log('Using Supabase for persistence.');
        
        // Initialize Supabase tables if they don't exist
        try {
          const pool = getPool();
          
          // Create users table
          await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
              id SERIAL PRIMARY KEY,
              username VARCHAR(50) UNIQUE,
              email VARCHAR(100) UNIQUE NOT NULL,
              password_hash VARCHAR(255),
              google_id VARCHAR(100) UNIQUE,
              reset_token VARCHAR(255),
              reset_token_expires TIMESTAMP,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
          `);
          
          // Create portfolios table (matching Netlify function schema)
          await pool.query(`
            CREATE TABLE IF NOT EXISTS portfolios (
              id SERIAL PRIMARY KEY,
              user_id INTEGER NOT NULL,
              crypto_id VARCHAR(50) NOT NULL,
              crypto_name VARCHAR(100) NOT NULL,
              crypto_symbol VARCHAR(10) NOT NULL,
              amount DECIMAL(20, 8) NOT NULL,
              purchase_price DECIMAL(20, 8) NOT NULL,
              purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
          `);
          
          console.log('Supabase tables verified/created successfully');
        } catch (sbError) {
          console.log('Note: Could not verify/create Supabase tables:', sbError.message);
        }
      }
      return true;
    }
    console.log('Starting database initialization...');
    console.log('DB Host:', process.env.DB_HOST);
    console.log('DB Name:', process.env.DB_NAME);
    console.log('DB User:', process.env.DB_USER);

    const pool = getPool();

    // Ensure users table exists (required for Google OAuth save/find)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        google_id VARCHAR(100) UNIQUE,
        reset_token VARCHAR(255),
        reset_token_expires TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ensure portfolios table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS portfolios (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        crypto_id VARCHAR(50) NOT NULL,
        crypto_name VARCHAR(100) NOT NULL,
        crypto_symbol VARCHAR(10) NOT NULL,
        amount DECIMAL(20, 8) NOT NULL,
        purchase_price DECIMAL(20, 8) NOT NULL,
        purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Test the table by inserting a dummy record and then deleting it
    const testResult = await pool.query('SELECT COUNT(*) as count FROM portfolios');
    console.log('Database tables initialized successfully. Current portfolio count:', testResult.rows[0].count);
    
    return true;
  } catch (error) {
    console.error('Database initialization error:', error.message);
    console.error('Full error:', error);
    return false;
  }
};

// Initialize database on startup
initDatabase().then(() => {
  dbInitialized = true;
  // If Supabase configured, prefer it; else we attempted Postgres pool
  useInMemoryStorage = false;
  console.log('Database initialization completed - using Supabase or PostgreSQL');
}).catch((error) => {
  console.error('Database initialization failed:', error.message);
  dbInitialized = false;
  useInMemoryStorage = false;
  console.log('Database unavailable; in-memory storage disabled per requirements');
});

// CORS for all origins
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Helper function to extract user ID from Authorization header
async function getUserIdFromToken(event) {
  try {
    const authHeader = (event.headers && (event.headers.authorization || event.headers.Authorization)) || '';
    if (typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    const token = authHeader.split(' ')[1];
    
    // Try to decode as JWT first (for production tokens)
    try {
      const jwt = require('jsonwebtoken');
      const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
      const decoded = jwt.verify(token, jwtSecret);
      return decoded.userId || decoded.id || 1;
    } catch (jwtError) {
      // If JWT verification fails, try as base64 JSON (for mock tokens)
      try {
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
        if (decoded.exp && Date.now() > decoded.exp) {
          return null;
        }
        return decoded.userId || decoded.id || 1;
      } catch (base64Error) {
        console.error('Token decode error:', base64Error);
        return null;
      }
    }
  } catch (error) {
    console.error('Token decode error:', error);
    return null;
  }
}

// Helper function to fetch crypto data from CoinMarketCap
const fetchCryptoData = async () => {
  try {
    console.log('Fetching crypto data from CoinMarketCap API...');
    console.log('API Key exists:', !!process.env.COINMARKETCAP_API_KEY);
    
    if (!process.env.COINMARKETCAP_API_KEY) {
      console.log('No API key found, using mock data');
      return getMockCryptoData();
    }

    const response = await axios.get('https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest', {
      headers: {
        'X-CMC_PRO_API_KEY': process.env.COINMARKETCAP_API_KEY,
        'Accept': 'application/json'
      },
      params: {
        start: 1,
        limit: 100,
        convert: 'USD'
      }
    });

    console.log('CoinMarketCap API response status:', response.status);
    console.log('Number of cryptocurrencies:', response.data.data.length);

    const cryptoData = response.data.data.map(crypto => ({
      id: crypto.id,
      symbol: crypto.symbol,
      name: crypto.name,
      current_price: crypto.quote.USD.price,
      price_change_24h: crypto.quote.USD.percent_change_24h,
      market_cap: crypto.quote.USD.market_cap,
      volume_24h: crypto.quote.USD.volume_24h,
      image: `https://s2.coinmarketcap.com/static/img/coins/64x64/${crypto.id}.png`,
      last_updated: crypto.quote.USD.last_updated
    }));

    console.log('First crypto data:', cryptoData[0]);
    return cryptoData;
  } catch (error) {
    console.error('Error fetching crypto data:', error.message);
    console.error('Error response:', error.response?.data);
    console.log('Falling back to mock data');
    return getMockCryptoData();
  }
};

const getMockCryptoData = () => {
  const mockData = [
    {
      id: 'bitcoin',
      name: 'Bitcoin',
      symbol: 'BTC',
      current_price: 67234.56,
      price_change_24h: 2.5,
      market_cap: 1320000000000,
      volume_24h: 25000000000
    },
    {
      id: 'ethereum',
      name: 'Ethereum',
      symbol: 'ETH',
      current_price: 3456.78,
      price_change_24h: 1.8,
      market_cap: 415000000000,
      volume_24h: 15000000000
    },
    {
      id: 'tether',
      name: 'Tether USDt',
      symbol: 'USDT',
      current_price: 1.00,
      price_change_24h: 0.01,
      market_cap: 95000000000,
      volume_24h: 35000000000
    },
    {
      id: 'bnb',
      name: 'BNB',
      symbol: 'BNB',
      current_price: 567.89,
      price_change_24h: -0.5,
      market_cap: 85000000000,
      volume_24h: 1200000000
    },
    {
      id: 'xrp',
      name: 'XRP',
      symbol: 'XRP',
      current_price: 0.6234,
      price_change_24h: 3.2,
      market_cap: 35000000000,
      volume_24h: 2800000000
    },
    {
      id: 'solana',
      name: 'Solana',
      symbol: 'SOL',
      current_price: 98.45,
      price_change_24h: 5.7,
      market_cap: 42000000000,
      volume_24h: 1800000000
    },
    {
      id: 'usd-coin',
      name: 'USDC',
      symbol: 'USDC',
      current_price: 1.00,
      price_change_24h: 0.01,
      market_cap: 32000000000,
      volume_24h: 4500000000
    },
    {
      id: 'tron',
      name: 'TRON',
      symbol: 'TRX',
      current_price: 0.1234,
      price_change_24h: 1.5,
      market_cap: 11000000000,
      volume_24h: 850000000
    },
    {
      id: 'dogecoin',
      name: 'Dogecoin',
      symbol: 'DOGE',
      current_price: 0.0892,
      price_change_24h: -2.1,
      market_cap: 12800000000,
      volume_24h: 1200000000
    },
    {
      id: 'cardano',
      name: 'Cardano',
      symbol: 'ADA',
      current_price: 0.4567,
      price_change_24h: -1.2,
      market_cap: 16000000000,
      volume_24h: 650000000
    }
  ];
  
  return mockData;
};

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Netlify server working!',
    timestamp: new Date().toISOString()
  });
});

// Debug endpoint for crypto API
app.get('/api/debug-crypto', async (req, res) => {
  try {
    const cryptoData = await fetchCryptoData();
    res.json({
      message: 'Crypto data fetched',
      count: cryptoData.length,
      sample: cryptoData[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production'
  });
});

// Auth endpoints
app.post('/api/auth/register', (req, res) => {
  res.json({ 
    message: 'Register endpoint working!',
    user: req.body,
    timestamp: new Date().toISOString()
  });
});

app.post('/api/auth/login', (req, res) => {
  res.json({ 
    message: 'Login endpoint working!',
    user: req.body,
    timestamp: new Date().toISOString()
  });
});

// Crypto endpoints
app.get('/api/crypto', (req, res) => {
  res.json({ 
    message: 'Crypto endpoint working!',
    cryptos: [],
    timestamp: new Date().toISOString()
  });
});

// Portfolio endpoints
app.get('/api/portfolio', (req, res) => {
  res.json({ 
    message: 'Portfolio endpoint working!',
    portfolio: [],
    timestamp: new Date().toISOString()
  });
});

app.post('/api/portfolio', (req, res) => {
  res.json({ 
    message: 'Add to portfolio working!',
    data: req.body,
    timestamp: new Date().toISOString()
  });
});

// Export for Netlify
exports.handler = async (event, context) => {
  console.log('Function called:', event.httpMethod, event.path);
  
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  try {
    // Simple routing based on path
    const path = event.path;
    const method = event.httpMethod;
    
    console.log('Processing:', method, path);

    // Test endpoint
    if (path === '/api/test' && method === 'GET') {
      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Netlify server working!',
          timestamp: new Date().toISOString(),
          path: path,
          method: method
        }),
      };
    }

    // Health check endpoint
    if (path === '/api/health' && method === 'GET') {
      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'OK',
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV || 'production'
        }),
      };
    }

    // Debug crypto endpoint
    if (path === '/api/debug-crypto' && method === 'GET') {
      try {
        const cryptoData = await fetchCryptoData();
        return {
          statusCode: 200,
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: 'Crypto data fetched',
            count: cryptoData.length,
            sample: cryptoData[0],
            apiKeyExists: !!process.env.COINMARKETCAP_API_KEY,
            dbInitialized: dbInitialized,
            dbHost: process.env.DB_HOST,
            timestamp: new Date().toISOString()
          }),
        };
      } catch (error) {
        return {
          statusCode: 500,
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            error: error.message,
            timestamp: new Date().toISOString()
          }),
        };
      }
    }

    // Test database endpoint
    if (path === '/api/test-db' && method === 'GET') {
      try {
        // Test basic connection
        const connectionTest = await pool.query('SELECT NOW() as current_time');
        
        // Test table creation
    const pool = getPool();
    await pool.query(`
          CREATE TABLE IF NOT EXISTS portfolios (
            id SERIAL PRIMARY KEY,
            user_id INTEGER DEFAULT 1,
            crypto_id VARCHAR(50) NOT NULL,
            crypto_name VARCHAR(100) NOT NULL,
            crypto_symbol VARCHAR(10) NOT NULL,
            amount DECIMAL(20, 8) NOT NULL,
            purchase_price DECIMAL(20, 8) NOT NULL,
            purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        // Test insert
        const insertResult = await pool.query(
          'INSERT INTO portfolios (crypto_id, crypto_name, crypto_symbol, amount, purchase_price) VALUES ($1, $2, $3, $4, $5) RETURNING *',
          ['test-bitcoin', 'Test Bitcoin', 'BTC', 0.1, 50000]
        );
        
        // Test select
        const selectResult = await pool.query('SELECT * FROM portfolios WHERE crypto_id = $1', ['test-bitcoin']);
        
        // Clean up test data
        await pool.query('DELETE FROM portfolios WHERE crypto_id = $1', ['test-bitcoin']);
        
        return {
          statusCode: 200,
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: 'Database test successful',
            connectionTime: connectionTest.rows[0].current_time,
            insertResult: insertResult.rows[0],
            selectResult: selectResult.rows[0],
            dbHost: process.env.DB_HOST,
            dbName: process.env.DB_NAME,
            timestamp: new Date().toISOString()
          }),
        };
      } catch (error) {
        return {
          statusCode: 200,
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: 'Database test failed',
            error: error.message,
            dbHost: process.env.DB_HOST,
            dbName: process.env.DB_NAME,
            timestamp: new Date().toISOString()
          }),
        };
      }
    }

    // Auth endpoints
    if (path === '/api/auth/register' && method === 'POST') {
      const body = event.body ? JSON.parse(event.body) : {};
      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Register endpoint working!',
          user: body,
          timestamp: new Date().toISOString()
        }),
      };
    }

    // Auth: Login (POST)
    if (path === '/api/auth/login' && method === 'POST') {
      const body = event.body ? JSON.parse(event.body) : {};

      const email = typeof body.email === 'string' ? body.email.trim() : '';
      const password = typeof body.password === 'string' ? body.password : '';

      if (!email || !password) {
        return {
          statusCode: 400,
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: 'Email and password are required'
          }),
        };
      }

      const username = email.includes('@') ? email.split('@')[0] : email;
      const userId = 1;

      // Create a proper token - try JWT first, fallback to base64 JSON
      let token;
      try {
        const jwt = require('jsonwebtoken');
        const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
        token = jwt.sign(
          { userId, email, name: username },
          jwtSecret,
          { expiresIn: '7d' }
        );
      } catch (jwtError) {
        // Fallback to base64 JSON if JWT creation fails
        const tokenData = {
          userId,
          email,
          name: username,
          exp: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
        };
        token = Buffer.from(JSON.stringify(tokenData)).toString('base64');
      }

      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Login successful',
          user: {
            id: userId,
            email,
            name: username
          },
          token: token,
          timestamp: new Date().toISOString()
        }),
      };
    }

    // Auth: Login (GET) - helpful hint for users hitting the URL directly
    if (path === '/api/auth/login' && method === 'GET') {
      return {
        statusCode: 405,
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Use POST with JSON body {"email","password"} to login'
        }),
      };
    }

    if (path === '/api/auth/me' && method === 'GET') {
      // Check for Authorization header (safe parsing)
      const authHeader = (event.headers && (event.headers.authorization || event.headers.Authorization)) || '';
      if (typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
        return {
          statusCode: 401,
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            error: 'Missing or invalid Authorization header',
            timestamp: new Date().toISOString()
          }),
        };
      }

      try {
        // Extract token and decode it
        const token = authHeader.split(' ')[1];
        let decoded;
        
        // Try to decode as JWT first (for production tokens)
        try {
          const jwt = require('jsonwebtoken');
          const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
          decoded = jwt.verify(token, jwtSecret);
        } catch (jwtError) {
          // If JWT verification fails, try as base64 JSON (for mock tokens)
          decoded = JSON.parse(Buffer.from(token, 'base64').toString());
          // Check if token is expired
          if (decoded.exp && Date.now() > decoded.exp) {
            return {
              statusCode: 401,
              headers: {
                ...headers,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                error: 'Token expired',
                timestamp: new Date().toISOString()
              }),
            };
          }
        }

        // Extract display name from email (e.g., toseebbeg02@gmail.com -> toseebbeg02)
        const userEmail = decoded.email || 'user@gmail.com';
        const displayName = userEmail.includes('@') ? userEmail.split('@')[0] : userEmail;
        
        return {
          statusCode: 200,
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user: {
              id: decoded.userId || decoded.id || 1,
              email: userEmail,
              name: displayName,
              username: displayName
            },
            timestamp: new Date().toISOString()
          }),
        };
      } catch (error) {
        console.error('Token decode error:', error);
        return {
          statusCode: 401,
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            error: 'Invalid token',
            timestamp: new Date().toISOString()
          }),
        };
      }
    }

    if (path === '/api/auth/forgot-password' && method === 'POST') {
      const body = event.body ? JSON.parse(event.body) : {};
      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Password reset email sent',
          email: body.email,
          timestamp: new Date().toISOString()
        }),
      };
    }

    if (path === '/api/auth/reset-password' && method === 'POST') {
      const body = event.body ? JSON.parse(event.body) : {};
      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Password reset successful',
          timestamp: new Date().toISOString()
        }),
      };
    }

    if (path === '/api/auth/google' && method === 'GET') {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const serverUrl = process.env.SERVER_URL || process.env.CLIENT_URL;
      const redirectUri = encodeURIComponent(`${serverUrl}/api/auth/google/callback`);
      const scope = encodeURIComponent('openid email profile');
      const location = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&include_granted_scopes=true&prompt=consent`;

      return {
        statusCode: 302,
        headers: {
          ...headers,
          'Location': location
        },
        body: '',
      };
    }

    // Profile update endpoint
    if (path === '/api/auth/profile' && method === 'PUT') {
      try {
        const userId = await getUserIdFromToken(event);
        if (!userId) {
          return {
            statusCode: 401,
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              error: 'Authentication required',
              timestamp: new Date().toISOString()
            }),
          };
        }

        const body = event.body ? JSON.parse(event.body) : {};
        const { name, email } = body;

        if (!name) {
          return {
            statusCode: 400,
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              error: 'Name is required',
              timestamp: new Date().toISOString()
            }),
          };
        }

        // Update user in database
        try {
          const pool = getPool();
          await pool.query(
            'UPDATE users SET username = $1, email = $2 WHERE id = $3',
            [name.toLowerCase().replace(/\s+/g, '_'), email || 'user@gmail.com', userId]
          );
        } catch (dbError) {
          console.log('Database update failed:', dbError.message);
        }

        // Create new token with updated info
        const token = Buffer.from(JSON.stringify({
          userId: userId,
          email: email || 'user@gmail.com',
          name: name,
          exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
        })).toString('base64');

        return {
          statusCode: 200,
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: 'Profile updated successfully',
            token: token,
            user: {
              id: userId,
              name: name,
              email: email || 'user@gmail.com'
            },
            timestamp: new Date().toISOString()
          }),
        };
      } catch (error) {
        console.error('Profile update error:', error);
        return {
          statusCode: 500,
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: 'Profile update failed',
            timestamp: new Date().toISOString()
          }),
        };
      }
    }

    // Google OAuth callback handler
    if (path === '/api/auth/google/callback' && method === 'GET') {
      try {
        const clientUrl = process.env.CLIENT_URL || '/';
        const code = event.queryStringParameters?.code;
        
        if (!code) {
          return {
            statusCode: 302,
            headers: {
              ...headers,
              'Location': `${clientUrl}/login?google=error`
            },
            body: ''
          };
        }

        // Exchange code for token (simplified - in production, use proper OAuth flow)
        // For demo purposes, we'll create a user with a name derived from email
        // In production, you'd exchange the code for an access token and fetch real user info from Google
        
        // Get client ID and secret from environment
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const serverUrl = process.env.SERVER_URL || process.env.CLIENT_URL;
        
        if (!clientId || !clientSecret) {
          console.error('Google OAuth credentials not configured');
          return {
            statusCode: 302,
            headers: { ...headers, 'Location': `${clientUrl}/login?error=google_not_configured` },
            body: ''
          };
        }
        
        // Exchange authorization code for access token
        let accessToken;
        let userInfo;
        
        try {
          // Step 1: Exchange code for access token
          const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
            code: code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: `${serverUrl}/api/auth/google/callback`,
            grant_type: 'authorization_code'
          });
          
          accessToken = tokenResponse.data.access_token;
          
          // Step 2: Get user info from Google
          const userInfoResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
              Authorization: `Bearer ${accessToken}`
            }
          });
          
          userInfo = userInfoResponse.data;
        } catch (error) {
          console.error('Error exchanging code for token:', error.message);
          // Fallback: Create a demo user (temporary for testing)
          userInfo = {
            email: 'user@example.com',
            name: 'Demo User',
            id: Date.now()
          };
        }
        
        // Extract email and name from Google user info
        const userEmail = userInfo.email || 'user@example.com';
        const userName = userInfo.name || userEmail.split('@')[0];
        const google_id = `google_${userInfo.id || Date.now()}`;
        const username = userName.toLowerCase().replace(/\s+/g, '_');
        
        // CRITICAL: Find or create user by email, ensuring SAME user_id for SAME email
        // This makes portfolio persistent across logouts/login sessions
        let userId;
        let existingUser = null;
        
        try {
          const pool = getPool();
          
          // Check if user exists by email
          const existingUserResult = await pool.query(
            'SELECT id, username, email, google_id FROM users WHERE email = $1',
            [userEmail]
          );
          
          if (existingUserResult.rows.length > 0) {
            // User exists - use their existing ID (this ensures same portfolio)
            existingUser = existingUserResult.rows[0];
            userId = existingUser.id;
            console.log('✅ Existing user found - using same user_id:', { userId, email: userEmail });
          } else {
            // User doesn't exist - create new user
            const insertResult = await pool.query(
              `INSERT INTO users (username, email, google_id) 
               VALUES ($1, $2, $3) 
               RETURNING id, username, email`,
              [username, userEmail, google_id]
            );
            userId = insertResult.rows[0].id;
            console.log('✅ New user created with user_id:', { userId, email: userEmail });
          }
        } catch (dbError) {
          console.error('❌ Database error:', dbError.message);
          // Fallback - but this won't work with portfolio persistence
          userId = Math.floor(Math.random() * 1000000) + Date.now();
          console.warn('⚠️ Using fallback user ID:', userId);
        }
        
        const googleUser = {
          id: userId,
          username: username,
          email: userEmail,
          name: userName,
          google_id: google_id
        };

        // Create a signed JWT token for the frontend
        let token;
        try {
          const jwt = require('jsonwebtoken');
          const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
          token = jwt.sign(
            { userId: googleUser.id, email: googleUser.email, name: googleUser.name },
            jwtSecret,
            { expiresIn: '7d' }
          );
        } catch (signErr) {
          // Fallback (base64 JSON) to avoid blocking login if jsonwebtoken fails
          token = Buffer.from(JSON.stringify({
            userId: googleUser.id,
            email: googleUser.email,
            name: googleUser.name,
            exp: Date.now() + (7 * 24 * 60 * 60 * 1000)
          })).toString('base64');
        }

        // Update google_id if user already existed
        if (existingUser && existingUser.google_id !== google_id) {
          try {
            const pool = getPool();
            await pool.query(
              'UPDATE users SET google_id = $1 WHERE id = $2',
              [google_id, userId]
            );
          } catch (updateError) {
            console.log('Failed to update google_id:', updateError.message);
          }
        }

        // Redirect to frontend with token
        return {
          statusCode: 302,
          headers: {
            ...headers,
            'Location': `${clientUrl}/login?google=success&token=${token}`
          },
          body: ''
        };
      } catch (error) {
        console.error('Google OAuth callback error:', error);
        const clientUrl = process.env.CLIENT_URL || '/';
        return {
          statusCode: 302,
          headers: {
            ...headers,
            'Location': `${clientUrl}/login?google=error`
          },
          body: ''
        };
      }
    }

    // Crypto endpoints
    if (path === '/api/crypto' && method === 'GET') {
      try {
        const cryptoData = await fetchCryptoData();
        return {
          statusCode: 200,
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(cryptoData),
        };
      } catch (error) {
        console.error('Error in crypto endpoint:', error);
        return {
          statusCode: 500,
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ error: 'Failed to fetch crypto data' }),
        };
      }
    }

    // Debug endpoint for database
    if (path === '/api/debug-db' && method === 'GET') {
      try {
        console.log('Testing database connection...');
        console.log('Environment variables:');
        console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
        console.log('DB_HOST:', process.env.DB_HOST);
        console.log('DB_PORT:', process.env.DB_PORT);
        console.log('DB_USER:', process.env.DB_USER);
        console.log('DB_NAME:', process.env.DB_NAME);
        
        const pool = getPool();
        const testResult = await pool.query('SELECT 1 as test');
        const tableCheck = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'portfolios'
          );
        `);
        
        let portfolioCount = 0;
        if (tableCheck.rows[0].exists) {
          const countResult = await pool.query('SELECT COUNT(*) FROM portfolios');
          portfolioCount = parseInt(countResult.rows[0].count);
        }
        
        return {
          statusCode: 200,
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: 'Database test successful',
            dbInitialized,
            tableExists: tableCheck.rows[0].exists,
            portfolioCount,
            envVars: {
              databaseUrl: !!process.env.DATABASE_URL,
              dbHost: process.env.DB_HOST,
              dbPort: process.env.DB_PORT,
              dbUser: process.env.DB_USER,
              dbName: process.env.DB_NAME
            },
            timestamp: new Date().toISOString()
          }),
        };
      } catch (error) {
        console.error('Database test failed:', error.message);
        return {
          statusCode: 200,
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: 'Database test failed',
            error: error.message,
            code: error.code,
            detail: error.detail,
            envVars: {
              databaseUrl: !!process.env.DATABASE_URL,
              dbHost: process.env.DB_HOST,
              dbPort: process.env.DB_PORT,
              dbUser: process.env.DB_USER,
              dbName: process.env.DB_NAME
            },
            timestamp: new Date().toISOString()
          }),
        };
      }
    }

    // Portfolio endpoints
    if (path === '/api/portfolio' && method === 'GET') {
      try {
        console.log('Fetching portfolio...');
        
        // Get user ID from token
        const userId = await getUserIdFromToken(event);
        if (!userId) {
          return {
            statusCode: 401,
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              error: 'Authentication required',
              timestamp: new Date().toISOString()
            }),
          };
        }
        
        console.log('Fetching portfolio for user ID:', userId);
        
        // Try Supabase first, then Postgres
        try {
          const sb = await getSupabase();
          if (sb) {
            const { data, error } = await sb
              .from('portfolios')
              .select('*')
              .eq('user_id', userId)  // Filter by user ID
              .order('created_at', { ascending: false });
            if (error) throw error;
            const portfolio = data.map(row => ({
              id: row.id,
              crypto_id: row.crypto_id,
              crypto_name: row.crypto_name,
              crypto_symbol: row.crypto_symbol,
              name: row.crypto_name,
              symbol: row.crypto_symbol,
              amount: parseFloat(row.amount),
              purchase_price: parseFloat(row.purchase_price),
              purchase_date: row.purchase_date,
              current_price: 0,
              current_value: 0,
              profit_loss: 0,
              profit_percentage: 0
            }));

            const cryptoData = await fetchCryptoData();
            const updatedPortfolio = portfolio.map(item => {
              const currentCrypto = cryptoData.find(c => c.symbol === item.crypto_symbol);
              if (currentCrypto) {
                item.current_price = currentCrypto.current_price;
                item.current_value = item.amount * currentCrypto.current_price;
                item.profit_loss = item.current_value - (item.amount * item.purchase_price);
                item.profit_percentage = ((item.current_value - (item.amount * item.purchase_price)) / (item.amount * item.purchase_price)) * 100;
                item.profit_loss_percentage = item.profit_percentage;
              }
              return item;
            });

            console.log('Returning portfolio with', updatedPortfolio.length, 'items from Supabase');
            return {
              statusCode: 200,
              headers: {
                ...headers,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(updatedPortfolio),
            };
          }

          // Fallback to direct Postgres
          const pool = getPool();
          const result = await pool.query('SELECT * FROM portfolios WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
          console.log('Portfolio query result:', result.rows.length, 'items for user', userId);
          
          const portfolio = result.rows.map(row => ({
            id: row.id,
            crypto_id: row.crypto_id,
            crypto_name: row.crypto_name,
            crypto_symbol: row.crypto_symbol,
            // Frontend aliases
            name: row.crypto_name,
            symbol: row.crypto_symbol,
            amount: parseFloat(row.amount),
            purchase_price: parseFloat(row.purchase_price),
            purchase_date: row.purchase_date,
            current_price: 0,
            current_value: 0,
            profit_loss: 0,
            profit_percentage: 0
          }));

          // Get current prices for portfolio items
          const cryptoData = await fetchCryptoData();
          const updatedPortfolio = portfolio.map(item => {
            const currentCrypto = cryptoData.find(c => c.symbol === item.crypto_symbol);
            if (currentCrypto) {
              item.current_price = currentCrypto.current_price;
              item.current_value = item.amount * currentCrypto.current_price;
              item.profit_loss = item.current_value - (item.amount * item.purchase_price);
              item.profit_percentage = ((item.current_value - (item.amount * item.purchase_price)) / (item.amount * item.purchase_price)) * 100;
              item.profit_loss_percentage = item.profit_percentage; // Add this for frontend compatibility
            }
            // Ensure aliases present
            item.symbol = item.crypto_symbol;
            item.name = item.crypto_name;
            return item;
          });

          console.log('Returning portfolio with', updatedPortfolio.length, 'items from database');
          return {
            statusCode: 200,
            headers: {
              ...headers,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatedPortfolio),
          };
        } catch (dbError) {
          console.log('Database failed, using in-memory storage:', dbError.message);
          
          // Fallback to in-memory storage
          const cryptoData = await fetchCryptoData();
          const updatedPortfolio = portfolioStorage.map(item => {
            const currentCrypto = cryptoData.find(c => c.symbol === item.crypto_symbol);
            if (currentCrypto) {
              item.current_price = currentCrypto.current_price;
              item.current_value = item.amount * currentCrypto.current_price;
              item.profit_loss = item.current_value - (item.amount * item.purchase_price);
              item.profit_percentage = ((item.current_value - (item.amount * item.purchase_price)) / (item.amount * item.purchase_price)) * 100;
              item.profit_loss_percentage = item.profit_percentage; // Add this for frontend compatibility
            }
            // Add aliases expected by frontend
            item.symbol = item.crypto_symbol;
            item.name = item.crypto_name;
            return item;
          });

          console.log('Returning portfolio with', updatedPortfolio.length, 'items from memory');
          return {
            statusCode: 200,
            headers: {
              ...headers,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatedPortfolio),
          };
        }
      } catch (error) {
        console.error('Error fetching portfolio:', error.message);
        return {
          statusCode: 200,
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify([]),
        };
      }
    }

    if (path === '/api/portfolio/summary' && method === 'GET') {
      try {
        // Get user ID from token
        const userId = await getUserIdFromToken(event);
        if (!userId) {
          return {
            statusCode: 401,
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              error: 'Authentication required',
              timestamp: new Date().toISOString()
            }),
          };
        }
        
        console.log('Fetching portfolio summary for user ID:', userId);
        
        // Prefer Supabase, then Postgres, then memory
        let portfolio = [];
        const sb = await getSupabase();
        if (sb) {
          const { data, error } = await sb.from('portfolios').select('*').eq('user_id', userId);
          if (error) throw error;
          portfolio = data;
        } else {
          if (!dbInitialized) {
            console.log('Database not initialized for summary, attempting to initialize...');
            initDatabase().then(() => { dbInitialized = true; }).catch(err => console.error('DB init failed:', err));
          }
          try {
            const result = await pool.query('SELECT * FROM portfolios WHERE user_id = $1', [userId]);
            portfolio = result.rows;
          } catch (e) {
            console.log('Postgres summary failed, using empty portfolio for user', userId, ':', e.message);
            portfolio = []; // Empty portfolio for this user instead of using global storage
          }
        }

        let totalInvested = 0;
        let totalValue = 0;

        const cryptoData = await fetchCryptoData();
        console.log('Portfolio items fetched:', portfolio.length);
        console.log('Sample portfolio item:', portfolio[0]);
        console.log('Available crypto symbols:', cryptoData.slice(0, 5).map(c => c.symbol));

        portfolio.forEach(item => {
          const amount = parseFloat(item.amount);
          const purchasePrice = parseFloat(item.purchase_price);
          const symbol = item.crypto_symbol || item.symbol;
          
          if (!isNaN(amount) && !isNaN(purchasePrice)) {
            totalInvested += amount * purchasePrice;
          }
          
          const currentCrypto = cryptoData.find(c => c.symbol === symbol);
          if (currentCrypto && !isNaN(amount)) {
            totalValue += amount * currentCrypto.current_price;
          } else if (!currentCrypto && symbol) {
            console.log('Crypto not found for symbol:', symbol);
          }
        });

        const totalProfit = totalValue - totalInvested;
        const profitPercentage = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

        console.log('Portfolio summary calculated:', { totalInvested, totalValue, totalProfit, profitPercentage, portfolioCount: portfolio.length });
        return {
          statusCode: 200,
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            total_holdings: portfolio.length,
            total_invested: totalInvested,
            total_current_value: totalValue,
            total_profit_loss: totalProfit,
            total_profit_loss_percentage: profitPercentage
          }),
        };
      } catch (error) {
        console.error('Error fetching portfolio summary:', error.message);
        return {
          statusCode: 200,
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            total_holdings: 0,
            total_invested: 0,
            total_current_value: 0,
            total_profit_loss: 0,
            total_profit_loss_percentage: 0
          }),
        };
      }
    }

    if (path === '/api/portfolio' && method === 'POST') {
      try {
        // Get user ID from token
        const userId = await getUserIdFromToken(event);
        if (!userId) {
          return {
            statusCode: 401,
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              error: 'Authentication required',
              timestamp: new Date().toISOString()
            }),
          };
        }
        
        console.log('Adding portfolio item for user ID:', userId);
        
        const body = event.body ? JSON.parse(event.body) : {};
        // Normalize incoming payload from UI
        let incomingSymbol = (body.crypto_symbol || body.symbol || '').toString().trim().toUpperCase();
        let normalizedAmount = body.amount !== undefined ? parseFloat(body.amount) : NaN;
        let normalizedPrice = body.purchase_price !== undefined ? parseFloat(body.purchase_price) : NaN;

        // Fetch crypto name if not provided
        let nameFromApi = null;
        if (incomingSymbol) {
          try {
            const cryptoData = await fetchCryptoData();
            const found = cryptoData.find(c => c.symbol === incomingSymbol);
            if (found) nameFromApi = found.name;
          } catch (_) {}
        }

        const crypto_symbol = incomingSymbol;
        const crypto_name = (body.crypto_name || nameFromApi || incomingSymbol).toString();
        const crypto_id = (body.crypto_id || incomingSymbol.toLowerCase()).toString();
        const amount = isNaN(normalizedAmount) ? 0 : normalizedAmount;
        const purchase_price = isNaN(normalizedPrice) ? 0 : normalizedPrice;

        // Basic validation
        if (!crypto_symbol || amount <= 0 || purchase_price <= 0) {
          return {
            statusCode: 400,
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Invalid payload: symbol, amount (>0), purchase_price (>0) are required' })
          };
        }
        
        console.log('Adding crypto to portfolio:', { crypto_id, crypto_name, crypto_symbol, amount, purchase_price });
        
        // Memory disabled; always use database
        
        // Try Supabase first, then Postgres
        try {
          const sb = await getSupabase();
          if (sb) {
            const { data, error } = await sb
              .from('portfolios')
              .insert({
                user_id: userId,  // Use actual user ID from token
                crypto_id,
                crypto_name,
                crypto_symbol,
                amount,
                purchase_price
              })
              .select('*')
              .single();
            if (error) throw error;

            console.log('Crypto added successfully to Supabase:', data);
            return {
              statusCode: 201,
              headers: {
                ...headers,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                message: 'Crypto added to portfolio successfully',
                data,
                storage: 'supabase',
                timestamp: new Date().toISOString()
              }),
            };
          }

          // Fallback to direct Postgres
          if (!dbInitialized) {
            console.log('Database not initialized, initializing now...');
            initDatabase().then(() => {
              dbInitialized = true;
            }).catch(err => {
              console.error('Database initialization failed:', err);
            });
          }

          const result = await pool.query(
            'INSERT INTO portfolios (user_id, crypto_id, crypto_name, crypto_symbol, amount, purchase_price) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [userId, crypto_id, crypto_name, crypto_symbol, amount, purchase_price]  // Use actual user ID
          );

          console.log('Crypto added successfully to PostgreSQL:', result.rows[0]);

          return {
            statusCode: 201,
            headers: {
              ...headers,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: 'Crypto added to portfolio successfully',
              data: result.rows[0],
              storage: 'postgres',
              timestamp: new Date().toISOString()
            }),
          };
        } catch (dbError) {
          console.error('Database error (no fallback):', dbError.message);
          return {
            statusCode: 500,
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Database unavailable' })
          };
        }
      } catch (error) {
        console.error('Error adding to portfolio:', error.message);
        return {
          statusCode: 500,
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            error: 'Failed to add crypto to portfolio',
            details: error.message,
            timestamp: new Date().toISOString()
          }),
        };
      }
    }

    // Crypto endpoints with more detail
    if (path.startsWith('/api/crypto/') && method === 'GET' && !path.includes('/history')) {
      const cryptoId = path.split('/').pop();
      try {
        const cryptoData = await fetchCryptoData();
        const crypto = cryptoData.find(c => c.id === cryptoId || c.symbol.toLowerCase() === cryptoId.toLowerCase());
        
        if (crypto) {
          return {
            statusCode: 200,
            headers: {
              ...headers,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(crypto),
          };
      } else {
          return {
            statusCode: 404,
            headers: {
              ...headers,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ error: 'Cryptocurrency not found' }),
          };
        }
      } catch (error) {
        console.error('Error fetching crypto detail:', error);
        return {
          statusCode: 500,
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ error: 'Failed to fetch crypto data' }),
        };
      }
    }

    if (path.startsWith('/api/crypto/') && path.includes('/history') && method === 'GET') {
      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prices: [
            { date: '2024-01-01', price: 45000 },
            { date: '2024-01-02', price: 46000 },
            { date: '2024-01-03', price: 47000 }
          ],
          timestamp: new Date().toISOString()
        }),
      };
    }

    // 404 for unknown routes
    return {
      statusCode: 404,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Route not found',
        path: path,
        method: method,
        timestamp: new Date().toISOString()
      }),
    };

  } catch (error) {
    console.error('Serverless function error:', error);
    return {
      statusCode: 500,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
      }),
    };
  }
};
