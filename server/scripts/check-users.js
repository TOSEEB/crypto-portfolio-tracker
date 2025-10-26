require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkUsers() {
  try {
    console.log('Checking users in database...\n');
    
    // Get all users
    const users = await pool.query('SELECT id, username, email, google_id, created_at FROM users ORDER BY id');
    
    console.log(`Total users: ${users.rows.length}\n`);
    
    if (users.rows.length > 0) {
      console.log('Users:');
      users.rows.forEach(user => {
        console.log({
          id: user.id,
          username: user.username,
          email: user.email,
          google_id: user.google_id,
          created_at: user.created_at
        });
      });
    }
    
    // Check for users with Google ID
    const googleUsers = await pool.query('SELECT id, email, google_id FROM users WHERE google_id IS NOT NULL');
    console.log(`\nGoogle OAuth users: ${googleUsers.rows.length}`);
    googleUsers.rows.forEach(user => {
      console.log({
        id: user.id,
        email: user.email,
        google_id: user.google_id
      });
    });
    
    // Check for potential duplicates by email
    const emailGroups = await pool.query(`
      SELECT email, COUNT(*) as count, array_agg(id) as user_ids
      FROM users
      GROUP BY email
      HAVING COUNT(*) > 1
    `);
    
    if (emailGroups.rows.length > 0) {
      console.log('\n⚠️  DUPLICATE USERS FOUND (by email):');
      emailGroups.rows.forEach(group => {
        console.log({
          email: group.email,
          count: group.count,
          user_ids: group.user_ids
        });
      });
    }
    
    // Check for potential duplicates by google_id
    const googleIdGroups = await pool.query(`
      SELECT google_id, COUNT(*) as count, array_agg(id) as user_ids
      FROM users
      WHERE google_id IS NOT NULL
      GROUP BY google_id
      HAVING COUNT(*) > 1
    `);
    
    if (googleIdGroups.rows.length > 0) {
      console.log('\n⚠️  DUPLICATE USERS FOUND (by google_id):');
      googleIdGroups.rows.forEach(group => {
        console.log({
          google_id: group.google_id,
          count: group.count,
          user_ids: group.user_ids
        });
      });
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUsers();

