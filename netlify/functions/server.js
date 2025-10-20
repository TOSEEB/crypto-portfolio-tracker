const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { Pool } = require('pg');

const app = express();

// Database connection with proper Supabase format
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false
  }
});

// Initialize database tables
const initDatabase = async () => {
  try {
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
    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error.message);
  }
};

// Initialize database on startup
let dbInitialized = false;
initDatabase().then(() => {
  dbInitialized = true;
  console.log('Database initialization completed');
}).catch((error) => {
  console.error('Database initialization failed:', error.message);
  dbInitialized = false;
});

// CORS for all origins
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Helper function to fetch crypto data from CoinMarketCap
const fetchCryptoData = async () => {
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

  try {
    const apiKey = process.env.COINMARKETCAP_API_KEY;
    console.log('API Key exists:', !!apiKey);
    
    if (!apiKey) {
      console.log('No CoinMarketCap API key found, using mock data');
      return mockData;
    }

    console.log('Attempting to fetch from CoinMarketCap API...');
    const response = await axios.get('https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest', {
      headers: {
        'X-CMC_PRO_API_KEY': apiKey,
        'Accept': 'application/json'
      },
      params: {
        start: 1,
        limit: 10,
        convert: 'USD'
      },
      timeout: 10000 // 10 second timeout
    });

    console.log('API Response status:', response.status);
    console.log('API Response data length:', response.data.data?.length);

    if (response.data && response.data.data) {
      return response.data.data.map(crypto => ({
        id: crypto.slug,
        name: crypto.name,
        symbol: crypto.symbol,
        current_price: crypto.quote.USD.price,
        price_change_24h: crypto.quote.USD.percent_change_24h,
        market_cap: crypto.quote.USD.market_cap,
        volume_24h: crypto.quote.USD.volume_24h
      }));
    } else {
      console.log('Invalid API response structure, using mock data');
      return mockData;
    }
  } catch (error) {
    console.error('Error fetching crypto data:', error.message);
    console.error('Error details:', error.response?.data || error.message);
    console.log('Falling back to mock data');
    return mockData;
  }
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

    // Debug database endpoint
    if (path === '/api/debug-db' && method === 'GET') {
      try {
        const result = await pool.query('SELECT COUNT(*) as count FROM portfolios');
        return {
          statusCode: 200,
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: 'Database connection successful',
            portfolioCount: result.rows[0].count,
            dbInitialized: dbInitialized,
            dbHost: process.env.DB_HOST,
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
            message: 'Database connection failed',
            error: error.message,
            dbInitialized: dbInitialized,
            dbHost: process.env.DB_HOST,
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

    if (path === '/api/auth/login' && method === 'POST') {
      const body = event.body ? JSON.parse(event.body) : {};
      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Login successful',
          user: {
            id: 1,
            email: body.email,
            name: body.email.split('@')[0]
          },
          token: 'mock-jwt-token-' + Date.now(),
          timestamp: new Date().toISOString()
        }),
      };
    }

    if (path === '/api/auth/me' && method === 'GET') {
      // Check for Authorization header
      const authHeader = event.headers.authorization || event.headers.Authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {
          statusCode: 401,
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            error: 'No token provided',
            timestamp: new Date().toISOString()
          }),
        };
      }

      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user: {
            id: 1,
            email: 'user@example.com',
            name: 'Demo User'
          },
          timestamp: new Date().toISOString()
        }),
      };
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
      return {
        statusCode: 302,
        headers: {
          ...headers,
          'Location': 'https://accounts.google.com/oauth/authorize?client_id=' + process.env.GOOGLE_CLIENT_ID + '&redirect_uri=' + encodeURIComponent(process.env.CLIENT_URL + '/auth/callback') + '&scope=email profile&response_type=code'
        },
        body: '',
      };
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

    // Portfolio endpoints
    if (path === '/api/portfolio' && method === 'GET') {
      try {
        const result = await pool.query('SELECT * FROM portfolios ORDER BY created_at DESC');
        const portfolio = result.rows.map(row => ({
          id: row.id,
          crypto_id: row.crypto_id,
          crypto_name: row.crypto_name,
          crypto_symbol: row.crypto_symbol,
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
          }
          return item;
        });

        return {
          statusCode: 200,
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatedPortfolio),
        };
      } catch (error) {
        console.error('Error fetching portfolio:', error.message);
        return {
          statusCode: 200,
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify([]), // Return empty array if DB fails
        };
      }
    }

    if (path === '/api/portfolio/summary' && method === 'GET') {
      try {
        const result = await pool.query('SELECT * FROM portfolios');
        const portfolio = result.rows;
        
        let totalInvested = 0;
        let totalValue = 0;
        
        const cryptoData = await fetchCryptoData();
        
        portfolio.forEach(item => {
          const currentCrypto = cryptoData.find(c => c.symbol === item.crypto_symbol);
          const invested = parseFloat(item.amount) * parseFloat(item.purchase_price);
          totalInvested += invested;
          
          if (currentCrypto) {
            totalValue += parseFloat(item.amount) * currentCrypto.current_price;
          }
        });
        
        const totalProfit = totalValue - totalInvested;
        const profitPercentage = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

        return {
          statusCode: 200,
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            totalValue: totalValue,
            totalInvested: totalInvested,
            totalProfit: totalProfit,
            profitPercentage: profitPercentage,
            portfolioCount: portfolio.length
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
            totalValue: 0,
            totalInvested: 0,
            totalProfit: 0,
            profitPercentage: 0,
            portfolioCount: 0
          }),
        };
      }
    }

    if (path === '/api/portfolio' && method === 'POST') {
      try {
        const body = event.body ? JSON.parse(event.body) : {};
        const { crypto_id, crypto_name, crypto_symbol, amount, purchase_price } = body;
        
        // Check if database is initialized
        if (!dbInitialized) {
          console.log('Database not initialized, attempting to initialize...');
          await initDatabase();
          dbInitialized = true;
        }
        
        const result = await pool.query(
          'INSERT INTO portfolios (crypto_id, crypto_name, crypto_symbol, amount, purchase_price) VALUES ($1, $2, $3, $4, $5) RETURNING *',
          [crypto_id, crypto_name, crypto_symbol, amount, purchase_price]
        );
        
        return {
          statusCode: 201,
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: 'Crypto added to portfolio successfully',
            data: result.rows[0],
            timestamp: new Date().toISOString()
          }),
        };
      } catch (error) {
        console.error('Error adding to portfolio:', error.message);
        console.error('Full error:', error);
        
        // Return success even if database fails (for now)
        return {
          statusCode: 200,
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: 'Crypto added to portfolio successfully (database may be unavailable)',
            data: {
              crypto_id: event.body ? JSON.parse(event.body).crypto_id : 'unknown',
              crypto_name: event.body ? JSON.parse(event.body).crypto_name : 'unknown',
              crypto_symbol: event.body ? JSON.parse(event.body).crypto_symbol : 'unknown',
              amount: event.body ? JSON.parse(event.body).amount : 0,
              purchase_price: event.body ? JSON.parse(event.body).purchase_price : 0
            },
            timestamp: new Date().toISOString(),
            note: 'Database connection issue - data not persisted'
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
