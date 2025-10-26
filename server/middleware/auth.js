const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const jwtSecret = process.env.JWT_SECRET || 'development_secret_key_12345';
    console.log('Using JWT_SECRET:', jwtSecret ? 'Set' : 'Missing');
    
    const decoded = jwt.verify(token, jwtSecret);
    console.log('Token decoded successfully:', { userId: decoded.userId, username: decoded.username });
    
    // CRITICAL: Validate userId is an integer
    const userId = parseInt(decoded.userId);
    if (isNaN(userId) || userId <= 0) {
      console.error('Invalid user ID in token:', decoded.userId);
      return res.status(401).json({ message: 'Invalid token - bad user ID' });
    }
    
    // Verify user still exists in database
    const result = await pool.query(
      'SELECT id, username, email FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      console.error('Token verification failed: User not found in database', { userId: userId });
      return res.status(401).json({ message: 'Invalid token' });
    }

    console.log('User authenticated:', { userId: result.rows[0].id, username: result.rows[0].username, email: result.rows[0].email });
    // Use email from token if available (more recent), otherwise use DB email
    req.user = {
      ...result.rows[0],
      email: decoded.email || result.rows[0].email,
      username: decoded.username || result.rows[0].username
    };
    next();
  } catch (err) {
    console.error('Token verification error:', err.message);
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

module.exports = { authenticateToken };
