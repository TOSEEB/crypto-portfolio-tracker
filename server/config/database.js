const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'crypto_tracker',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test connection
const connect = async () => {
  try {
    const client = await pool.connect();
    console.log('Connected to PostgreSQL database');
    client.release();
    
    // Initialize database tables
    await initializeTables();
  } catch (err) {
    console.error('Database connection error:', err);
    throw err;
  }
};

// Initialize database tables
const initializeTables = async () => {
  try {
    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        google_id VARCHAR(100) UNIQUE,
        reset_token VARCHAR(255),
        reset_token_expires TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Cryptocurrencies table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cryptocurrencies (
        id SERIAL PRIMARY KEY,
        symbol VARCHAR(10) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        current_price DECIMAL(20, 8),
        market_cap DECIMAL(20, 2),
        volume_24h DECIMAL(20, 2),
        price_change_24h DECIMAL(10, 4),
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // User portfolios table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS portfolios (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        crypto_id INTEGER REFERENCES cryptocurrencies(id) ON DELETE CASCADE,
        amount DECIMAL(20, 8) NOT NULL,
        purchase_price DECIMAL(20, 8) NOT NULL,
        purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, crypto_id)
      )
    `);

    // Price history table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS price_history (
        id SERIAL PRIMARY KEY,
        crypto_id INTEGER REFERENCES cryptocurrencies(id) ON DELETE CASCADE,
        price DECIMAL(20, 8) NOT NULL,
        market_cap DECIMAL(20, 2),
        volume_24h DECIMAL(20, 2),
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_portfolios_user_id ON portfolios(user_id);
      CREATE INDEX IF NOT EXISTS idx_portfolios_crypto_id ON portfolios(crypto_id);
      CREATE INDEX IF NOT EXISTS idx_price_history_crypto_id ON price_history(crypto_id);
      CREATE INDEX IF NOT EXISTS idx_price_history_recorded_at ON price_history(recorded_at);
    `);

    // Seed top cryptocurrencies if they don't exist
    await seedTopCryptocurrencies();

    console.log('Database tables initialized successfully');
  } catch (err) {
    console.error('Error initializing database tables:', err);
    throw err;
  }
};

// Seed top 15 cryptocurrencies
const seedTopCryptocurrencies = async () => {
  try {
    const topCryptos = [
      { symbol: 'BTC', name: 'Bitcoin' },
      { symbol: 'ETH', name: 'Ethereum' },
      { symbol: 'BNB', name: 'Binance Coin' },
      { symbol: 'SOL', name: 'Solana' },
      { symbol: 'XRP', name: 'XRP' },
      { symbol: 'ADA', name: 'Cardano' },
      { symbol: 'DOGE', name: 'Dogecoin' },
      { symbol: 'AVAX', name: 'Avalanche' },
      { symbol: 'SHIB', name: 'Shiba Inu' },
      { symbol: 'DOT', name: 'Polkadot' },
      { symbol: 'LINK', name: 'Chainlink' },
      { symbol: 'LTC', name: 'Litecoin' },
      { symbol: 'UNI', name: 'Uniswap' },
      { symbol: 'MATIC', name: 'Polygon' },
      { symbol: 'ATOM', name: 'Cosmos' }
    ];

    for (const crypto of topCryptos) {
      // Check if crypto already exists
      const existing = await pool.query(
        'SELECT id FROM cryptocurrencies WHERE symbol = $1',
        [crypto.symbol]
      );

      if (existing.rows.length === 0) {
        // Insert new cryptocurrency
        await pool.query(
          'INSERT INTO cryptocurrencies (symbol, name) VALUES ($1, $2)',
          [crypto.symbol, crypto.name]
        );
        console.log(`Seeded ${crypto.symbol} - ${crypto.name}`);
      }
    }

    console.log('Top cryptocurrencies seeded successfully');
  } catch (err) {
    console.error('Error seeding cryptocurrencies:', err);
  }
};

module.exports = {
  pool,
  connect,
  query: (text, params) => pool.query(text, params)
};
