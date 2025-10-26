require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function clearAllTables() {
  try {
    console.log('⚠️  WARNING: This will DELETE ALL DATA in the database!\n');
    
    // Check if we're in production
    if (process.env.NODE_ENV === 'production') {
      console.log('🚨 You are about to clear PRODUCTION database!');
      console.log('Are you sure? Press Ctrl+C to cancel.\n');
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
    }
    
    console.log('Clearing all tables...\n');
    
    // Delete in correct order to handle foreign keys
    await pool.query('DELETE FROM portfolios');
    console.log('✓ Cleared portfolios table');
    
    await pool.query('DELETE FROM price_history');
    console.log('✓ Cleared price_history table');
    
    await pool.query('DELETE FROM cryptocurrencies');
    console.log('✓ Cleared cryptocurrencies table');
    
    await pool.query('DELETE FROM users');
    console.log('✓ Cleared users table');
    
    console.log('\n✅ All tables cleared successfully!');
    console.log('\n⚠️  Important: After clearing, restart your server to recreate tables automatically.');
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

clearAllTables();

