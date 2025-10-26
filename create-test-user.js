const path = require('path');
const { pool } = require('./server/config/database');
const bcrypt = require('./server/node_modules/bcryptjs');

async function createTestUser() {
  try {
    console.log('Creating test user...');
    
    // Check if users table exists, create if not
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reset_token VARCHAR(255),
        reset_token_expires TIMESTAMP,
        google_id VARCHAR(255),
        email_verified BOOLEAN DEFAULT FALSE
      )
    `);

    // Check if test user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $1',
      ['test@example.com']
    );

    if (existingUser.rows.length > 0) {
      console.log('Test user already exists!');
      console.log('Email: test@example.com');
      console.log('Password: password123');
      process.exit(0);
    }

    // Create test user
    const password = 'password123';
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email',
      ['testuser', 'test@example.com', passwordHash]
    );

    console.log('Test user created successfully!');
    console.log('\nLogin Credentials:');
    console.log('==================');
    console.log('Email: test@example.com');
    console.log('Username: testuser');
    console.log('Password: password123');
    console.log('==================\n');

    process.exit(0);
  } catch (error) {
    console.error('Error creating test user:', error);
    process.exit(1);
  }
}

// Run the function
createTestUser();

