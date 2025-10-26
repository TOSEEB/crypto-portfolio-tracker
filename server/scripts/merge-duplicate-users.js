require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function mergeDuplicateUsers() {
  try {
    console.log('Checking for duplicate users...\n');
    
    // Find duplicate users by email
    const emailGroups = await pool.query(`
      SELECT email, COUNT(*) as count, array_agg(id ORDER BY id) as user_ids
      FROM users
      GROUP BY email
      HAVING COUNT(*) > 1
    `);
    
    if (emailGroups.rows.length === 0) {
      console.log('✓ No duplicate users found');
      await pool.end();
      return;
    }
    
    console.log(`Found ${emailGroups.rows.length} groups of duplicate users\n`);
    
    for (const group of emailGroups.rows) {
      const userIds = group.user_ids;
      const primaryUserId = userIds[0]; // Keep the first user
      const secondaryUserIds = userIds.slice(1); // Delete the rest
      
      console.log(`\nMerging duplicates for email: ${group.email}`);
      console.log(`  Keeping user ID: ${primaryUserId}`);
      console.log(`  Removing user IDs: ${secondaryUserIds.join(', ')}`);
      
      // Move portfolios from secondary users to primary user
      for (const secondaryUserId of secondaryUserIds) {
        const portfolioCount = await pool.query(
          'SELECT COUNT(*) as count FROM portfolios WHERE user_id = $1',
          [secondaryUserId]
        );
        
        if (portfolioCount.rows[0].count > 0) {
          await pool.query(
            'UPDATE portfolios SET user_id = $1 WHERE user_id = $2',
            [primaryUserId, secondaryUserId]
          );
          console.log(`  Moved ${portfolioCount.rows[0].count} portfolio entries to primary user`);
        }
        
        // Delete the duplicate user
        await pool.query('DELETE FROM users WHERE id = $1', [secondaryUserId]);
        console.log(`  Deleted user ID: ${secondaryUserId}`);
      }
    }
    
    console.log('\n✓ Duplicate users merged successfully');
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

mergeDuplicateUsers();

