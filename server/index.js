const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
require('dotenv').config();

const db = require('./config/database');
const passport = require('./config/passport');
const authRoutes = require('./routes/auth');
const { router: cryptoRoutes } = require('./routes/crypto');
const portfolioRoutes = require('./routes/portfolio');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] 
    : ['http://localhost:3000'],
  credentials: true
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Passport middleware
app.use(session({
  secret: process.env.JWT_SECRET || 'your-session-secret',
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/crypto', cryptoRoutes);
app.use('/api/portfolio', portfolioRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Import the price update function
const { updateCryptoPrices } = require('./routes/crypto');

// Database connection and server startup
db.connect()
  .then(() => {
    console.log('Database connected successfully');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      
      // Start automatic price updates every 5 minutes
      console.log('Starting automatic price updates...');
      setInterval(async () => {
        try {
          const updatedCount = await updateCryptoPrices();
          if (updatedCount > 0) {
            console.log(`Updated prices for ${updatedCount} cryptocurrencies`);
          }
        } catch (error) {
          console.error('Error updating prices:', error.message);
        }
      }, 5 * 60 * 1000); // 5 minutes
      
      // Update prices immediately on startup
      updateCryptoPrices()
        .then(count => {
          if (count > 0) {
            console.log(`Initial price update: ${count} cryptocurrencies updated`);
          }
        })
        .catch(error => {
          console.error('Initial price update failed:', error.message);
        });
    });
  })
  .catch((err) => {
    console.error('Database connection failed:', err);
    process.exit(1);
  });
