const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { sendPasswordResetEmail } = require('../services/emailService');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email',
      [username, email, passwordHash]
    );

    const user = result.rows[0];

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET || 'development_secret_key_12345';
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      jwtSecret,
      { expiresIn: '7d' }
    );

    // Extract display name from email (e.g., toseebbeg02@gmail.com -> toseebbeg02)
    const displayName = user.email ? user.email.split('@')[0] : user.username;
    
    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: displayName
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    console.log('Login attempt:', { username, email, hasPassword: !!password });

    // Validation
    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }

    // Check if username or email is provided
    const identifier = username || email;
    if (!identifier) {
      return res.status(400).json({ message: 'Username or email is required' });
    }

    // Find user by username OR email
    const result = await pool.query(
      'SELECT id, username, email, password_hash FROM users WHERE username = $1 OR email = $1',
      [identifier]
    );

    console.log('User lookup result:', result.rows.length ? 'User found' : 'No user found');

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Extract display name from email (e.g., toseebbeg02@gmail.com -> toseebbeg02)
    const displayName = user.email ? user.email.split('@')[0] : user.username;
    
    // Generate JWT token with email included
    const jwtSecret = process.env.JWT_SECRET || 'development_secret_key_12345';
    const token = jwt.sign(
      { userId: user.id, username: displayName, email: user.email },
      jwtSecret,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: displayName,
        email: user.email,
        name: displayName
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    // Always use email prefix for display name to ensure consistency
    // This prevents showing old/wrong usernames from database
    const displayName = req.user.email ? req.user.email.split('@')[0] : req.user.username;
    
    console.log('Current user:', { 
      id: req.user.id, 
      email: req.user.email, 
      dbUsername: req.user.username,
      displayName 
    });
    
    res.json({
      user: {
        id: req.user.id,
        username: displayName,
        email: req.user.email,
        name: displayName
      }
    });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Forgot Password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Check if user exists
    const user = await pool.query(
      'SELECT id, email FROM users WHERE email = $1',
      [email]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ message: 'Email not found in our system' });
    }

    // Generate reset token
    const resetToken = uuidv4();
    const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour

    // Save reset token to database
    await pool.query(
      'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE email = $3',
      [resetToken, resetTokenExpires, email]
    );

    // Send reset email
    const emailSent = await sendPasswordResetEmail(email, resetToken);

    if (emailSent) {
      res.json({ message: 'Password reset link sent to your email' });
    } else {
      res.status(500).json({ message: 'Error sending reset email' });
    }
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ message: 'Token and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Find user with valid reset token
    const user = await pool.query(
      'SELECT id FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()',
      [token]
    );

    if (user.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Hash new password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Update password and clear reset token
    await pool.query(
      'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2',
      [passwordHash, user.rows[0].id]
    );

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Test endpoint to check if server is running
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Auth server is running!',
    timestamp: new Date().toISOString(),
    google_configured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
  });
});

// Google OAuth Routes
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

router.get('/google/callback', 
  passport.authenticate('google', { session: false }),
  async (req, res) => {
    try {
      const user = req.user;
      
      console.log('Google OAuth callback: User authenticated', { 
        userId: user.id, 
        username: user.username, 
        email: user.email,
        google_id: user.google_id 
      });
      
      // CRITICAL: Ensure user.id is a valid integer database ID, not a timestamp
      const userId = parseInt(user.id);
      if (isNaN(userId) || userId <= 0) {
        console.error('Invalid user ID detected:', user.id, 'Type:', typeof user.id);
        return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/login?error=invalid_user_id`);
      }
      
      console.log('Using validated user ID:', userId, '(original was:', user.id, ')');
      
      // Generate JWT token with validated user ID
      const jwtSecret = process.env.JWT_SECRET || 'development_secret_key_12345';
      const token = jwt.sign(
        { userId: userId, username: user.username },
        jwtSecret,
        { expiresIn: '7d' }
      );

      console.log('Google OAuth callback: JWT token generated for user ID:', userId);

      // Redirect to frontend with token
      const frontendUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/auth/callback?token=${token}`;
      res.redirect(frontendUrl);
    } catch (err) {
      console.error('Google callback error:', err);
      res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/login?error=google_auth_failed`);
    }
  }
);

module.exports = router;
