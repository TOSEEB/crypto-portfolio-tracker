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

// Auth register endpoint
app.post('/api/auth/register', (req, res) => {
  res.json({ 
    message: 'Register endpoint working!',
    user: req.body
  });
});

// Export for Netlify
exports.handler = async (event, context) => {
  return new Promise((resolve) => {
    app(event, context, (err, result) => {
      if (err) {
        resolve({
          statusCode: 500,
          body: JSON.stringify({ error: err.message })
        });
      } else {
        resolve(result);
      }
    });
  });
};
