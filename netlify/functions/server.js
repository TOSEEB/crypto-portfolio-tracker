const express = require('express');
const cors = require('cors');

const app = express();

// CORS for all origins
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Netlify server working!',
    timestamp: new Date().toISOString()
  });
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
          message: 'Login endpoint working!',
          user: body,
          timestamp: new Date().toISOString()
        }),
      };
    }

    // Crypto endpoints
    if (path === '/api/crypto' && method === 'GET') {
      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Crypto endpoint working!',
          cryptos: [],
          timestamp: new Date().toISOString()
        }),
      };
    }

    // Portfolio endpoints
    if (path === '/api/portfolio' && method === 'GET') {
      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Portfolio endpoint working!',
          portfolio: [],
          timestamp: new Date().toISOString()
        }),
      };
    }

    if (path === '/api/portfolio' && method === 'POST') {
      const body = event.body ? JSON.parse(event.body) : {};
      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Add to portfolio working!',
          data: body,
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
