const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({
  origin: true,
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Test endpoint to check if Supabase can be imported
app.get('/api/test-supabase', async (req, res) => {
  try {
    const { createClient } = require('@supabase/supabase-js');
    res.json({ 
      success: true, 
      message: 'Supabase import successful',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Simple test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Function is working',
    timestamp: new Date().toISOString()
  });
});

exports.handler = async (event, context) => {
  return new Promise((resolve) => {
    app(event, context, () => {
      resolve({
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Test function working',
          timestamp: new Date().toISOString()
        }),
      });
    });
  });
};
