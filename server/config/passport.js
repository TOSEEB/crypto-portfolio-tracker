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
    console.log('Google OAuth: Processing profile', { id: profile.id, email: profile.emails[0].value, name: profile.displayName });
    
    // Check if user already exists with this Google ID
    let user = await pool.query(
      'SELECT * FROM users WHERE google_id = $1',
      [profile.id]
    );

    if (user.rows.length > 0) {
      console.log('Google OAuth: User found by google_id:', user.rows[0].id);
      console.log('Google OAuth: User details:', { 
        userId: user.rows[0].id, 
        username: user.rows[0].username, 
        email: user.rows[0].email,
        google_id: user.rows[0].google_id
      });
      return done(null, user.rows[0]);
    }

    console.log('Google OAuth: No user found with google_id, checking by email:', profile.emails[0].value);
    
    // Check if user exists with this email
    user = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [profile.emails[0].value]
    );

    if (user.rows.length > 0) {
      console.log('Google OAuth: User found by email:', user.rows[0].id);
      console.log('Google OAuth: Updating existing user with google_id');
      // Update existing user with Google ID
      const updatedUser = await pool.query(
        'UPDATE users SET google_id = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2 RETURNING *',
        [profile.id, profile.emails[0].value]
      );
      console.log('Google OAuth: User updated successfully:', {
        userId: updatedUser.rows[0].id,
        email: updatedUser.rows[0].email,
        google_id: updatedUser.rows[0].google_id
      });
      return done(null, updatedUser.rows[0]);
    }

    // Generate a username from email (more reliable than displayName)
    // Extract the part before @ from email (e.g., toseebbeg02@gmail.com -> toseebbeg02)
    const emailPrefix = profile.emails[0].value.split('@')[0];
    let username = emailPrefix.replace(/[^a-z0-9_]/gi, '').toLowerCase();
    
    // Fallback to displayName if email prefix is invalid
    if (!username || username.length < 3) {
      username = profile.displayName.replace(/\s+/g, '_').toLowerCase().substring(0, 20);
    }
    
    let usernameAttempts = 0;
    let finalUsername = username;
    
    while (true) {
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE username = $1',
        [finalUsername]
      );
      
      if (existingUser.rows.length === 0) {
        break;
      }
      
      usernameAttempts++;
      finalUsername = `${username}_${usernameAttempts}`;
      
      if (usernameAttempts > 100) {
        // Fallback to timestamp-based username
        finalUsername = `user_${Date.now()}`;
        break;
      }
    }

    console.log('Google OAuth: Creating new user with username:', finalUsername);
    
    // Try to create new user - wrap in try-catch to handle unique constraint violations
    let newUser;
    try {
      const result = await pool.query(
        'INSERT INTO users (username, email, google_id) VALUES ($1, $2, $3) RETURNING *',
        [finalUsername, profile.emails[0].value, profile.id]
      );
      newUser = result;
      console.log('Google OAuth: Created new user:', newUser.rows[0].id);
    } catch (insertError) {
      console.error('Error creating user:', insertError.message);
      
      // If insert failed due to unique constraint, try to find existing user
      if (insertError.code === '23505') { // PostgreSQL unique violation
        console.log('Username conflict, trying to find existing user by email...');
        const existingUser = await pool.query(
          'SELECT * FROM users WHERE email = $1 OR google_id = $2',
          [profile.emails[0].value, profile.id]
        );
        
        if (existingUser.rows.length > 0) {
          console.log('Found existing user after insert conflict:', existingUser.rows[0].id);
          return done(null, existingUser.rows[0]);
        }
      }
      // Re-throw if it's not a unique constraint violation
      throw insertError;
    }

    // Send welcome email
    try {
      await sendWelcomeEmail(profile.emails[0].value, profile.displayName);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail auth if email fails
    }

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

// Serialize user for session - ensure ID is an integer
passport.serializeUser((user, done) => {
  const userId = parseInt(user.id);
  console.log('Serializing user with ID:', userId, '(original:', user.id, ')');
  done(null, userId);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const userId = parseInt(id);
    if (isNaN(userId) || userId <= 0) {
      console.error('Invalid user ID in deserialize:', id);
      return done(new Error('Invalid user ID'), null);
    }
    
    const user = await pool.query(
      'SELECT id, username, email, google_id FROM users WHERE id = $1',
      [userId]
    );
    
    if (user.rows.length === 0) {
      console.error('User not found during deserialize for ID:', userId);
      return done(new Error('User not found'), null);
    }
    
    done(null, user.rows[0]);
  } catch (error) {
    console.error('Deserialize user error:', error);
    done(error, null);
  }
});

module.exports = passport;
