require('dotenv').config();

console.log('📊 Database Configuration Check\n');
console.log('Local Environment (development):');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✓ Set' : '✗ Not set');
console.log('DB_HOST:', process.env.DB_HOST || 'localhost');
console.log('DB_NAME:', process.env.DB_NAME || 'crypto_tracker');
console.log('\nProduction Environment:');
console.log('NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set (connecting to Supabase)' : 'Using individual DB parameters');

