require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function fixCorruptedPortfolios() {
  try {
    console.log('Starting portfolio cleanup...\n');
    
    // Get all users
    const users = await pool.query('SELECT id, email, google_id, username FROM users ORDER BY id');
    console.log(`Found ${users.rows.length} users in database\n`);
    
    // Get all portfolio entries with invalid user_ids (timestamps or non-existent)
    const portfolios = await pool.query(`
      SELECT p.*, u.id as valid_user_id 
      FROM portfolios p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE u.id IS NULL
    `);
    
    console.log(`Found ${portfolios.rows.length} corrupted portfolio entries\n`);
    
    if (portfolios.rows.length === 0) {
      console.log('✓ No corrupted portfolios found');
      await pool.end();
      return;
    }
    
    let deletedCount = 0;
    let fixedCount = 0;
    
    for (const portfolio of portfolios.rows) {
      console.log(`\nProcessing portfolio ID: ${portfolio.id}`);
      console.log(`  Corrupted user_id: ${portfolio.user_id}`);
      
      // Try to find the correct user based on other data
      // Since we don't have enough info to match, we'll just delete these
      console.log(`  ❌ Cannot determine correct user - deleting entry`);
      
      await pool.query('DELETE FROM portfolios WHERE id = $1', [portfolio.id]);
      deletedCount++;
    }
    
    console.log(`\n✓ Cleanup complete!`);
    console.log(`  Deleted ${deletedCount} corrupted entries`);
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixCorruptedPortfolios();

