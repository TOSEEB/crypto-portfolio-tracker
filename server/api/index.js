const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: [
    process.env.CLIENT_URL || 'http://localhost:3000',
    'https://client-psi-eight-53.vercel.app',
    'https://client-9hm4jrkax-toseeb-begs-projects.vercel.app',
    'https://client-rhun2l5j7-toseeb-begs-projects.vercel.app',
    'https://client-dla3jo08m-toseeb-begs-projects.vercel.app',
    'https://client-4f6qhs0cf-toseeb-begs-projects.vercel.app',
    'https://client-8jt6gu6xl-toseeb-begs-projects.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Crypto Portfolio Tracker API Server',
    status: 'Running',
    timestamp: new Date().toISOString(),
    endpoints: [
      '/api/test',
      '/api/health', 
      '/api/auth/test'
    ]
  });
});

// Public test endpoint (no auth required)
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Server is working!',
    timestamp: new Date().toISOString(),
    cors: 'enabled'
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Simple auth test endpoint
app.get('/api/auth/test', (req, res) => {
  res.json({ 
    message: 'Auth server is running!',
    timestamp: new Date().toISOString(),
    google_configured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Export for Vercel
module.exports = app;
