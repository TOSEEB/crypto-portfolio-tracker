const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const { pool } = require('../config/database');
const { sendWelcomeEmail } = require('../services/emailService');

// Configure Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID || 'your-google-client-id',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'your-google-client-secret',
  callbackURL: `${process.env.SERVER_URL || 'http://localhost:5000'}/api/auth/google/callback`
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user already exists with this Google ID
    let user = await pool.query(
      'SELECT * FROM users WHERE google_id = $1',
      [profile.id]
    );

    if (user.rows.length > 0) {
      return done(null, user.rows[0]);
    }

    // Check if user exists with this email
    user = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [profile.emails[0].value]
    );

    if (user.rows.length > 0) {
      // Update existing user with Google ID
      const updatedUser = await pool.query(
        'UPDATE users SET google_id = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2 RETURNING *',
        [profile.id, profile.emails[0].value]
      );
      return done(null, updatedUser.rows[0]);
    }

    // Create new user
    const newUser = await pool.query(
      'INSERT INTO users (username, email, google_id) VALUES ($1, $2, $3) RETURNING *',
      [profile.displayName, profile.emails[0].value, profile.id]
    );

    // Send welcome email
    await sendWelcomeEmail(profile.emails[0].value, profile.displayName);

    return done(null, newUser.rows[0]);
  } catch (error) {
    console.error('Google OAuth error:', error);
    return done(error, null);
  }
}));

// Configure JWT Strategy
passport.use(new JwtStrategy({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET || 'your-jwt-secret'
}, async (payload, done) => {
  try {
    const user = await pool.query(
      'SELECT id, username, email, google_id FROM users WHERE id = $1',
      [payload.userId]
    );

    if (user.rows.length > 0) {
      return done(null, user.rows[0]);
    } else {
      return done(null, false);
    }
  } catch (error) {
    console.error('JWT Strategy error:', error);
    return done(error, false);
  }
}));

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await pool.query(
      'SELECT id, username, email, google_id FROM users WHERE id = $1',
      [id]
    );
    done(null, user.rows[0]);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
