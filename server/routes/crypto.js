const express = require('express');
const axios = require('axios');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all cryptocurrencies with current prices
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.*,
        CASE 
          WHEN c.last_updated < NOW() - INTERVAL '5 minutes' THEN true
          ELSE false
        END as needs_update
      FROM cryptocurrencies c
      ORDER BY c.market_cap DESC NULLS LAST
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Get cryptocurrencies error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get specific cryptocurrency
router.get('/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM cryptocurrencies WHERE symbol = $1',
      [symbol.toUpperCase()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Cryptocurrency not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get cryptocurrency error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get price history for a cryptocurrency
router.get('/:symbol/history', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { days = 7 } = req.query;

    const result = await pool.query(`
      SELECT 
        ph.price,
        ph.market_cap,
        ph.volume_24h,
        ph.recorded_at
      FROM price_history ph
      JOIN cryptocurrencies c ON ph.crypto_id = c.id
      WHERE c.symbol = $1
        AND ph.recorded_at >= NOW() - INTERVAL '${parseInt(days)} days'
      ORDER BY ph.recorded_at ASC
    `, [symbol.toUpperCase()]);

    res.json(result.rows);
  } catch (err) {
    console.error('Get price history error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Force update all cryptocurrency prices (admin endpoint)
router.post('/force-update-all', authenticateToken, async (req, res) => {
  try {
    // Get all cryptocurrencies
    const result = await pool.query('SELECT id, symbol FROM cryptocurrencies');
    
    let updatedCount = 0;
    
    for (const crypto of result.rows) {
      try {
        // Map symbols to CoinGecko IDs
        const coinGeckoIds = {
          'BTC': 'bitcoin',
          'ETH': 'ethereum',
          'BNB': 'binancecoin',
          'ADA': 'cardano',
          'SOL': 'solana',
          'XRP': 'ripple',
          'DOT': 'polkadot',
          'DOGE': 'dogecoin',
          'AVAX': 'avalanche-2',
          'SHIB': 'shiba-inu',
          'MATIC': 'matic-network',
          'LTC': 'litecoin',
          'LINK': 'chainlink',
          'UNI': 'uniswap',
          'ATOM': 'cosmos'
        };

        const coinGeckoId = coinGeckoIds[crypto.symbol];
        if (!coinGeckoId) {
          console.log(`No CoinGecko ID found for ${crypto.symbol}`);
          continue;
        }

        // Try multiple price sources with fallback
        let priceData = null;
        
        try {
          // Primary source: CoinGecko
          const response = await axios.get(
            `https://api.coingecko.com/api/v3/simple/price?ids=${coinGeckoId}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`,
            { timeout: 10000 }
          );

          priceData = response.data[coinGeckoId];
          
          // Validate price data
          if (priceData && priceData.usd && priceData.usd > 0) {
            // Additional validation for Bitcoin - should be reasonable range
            if (crypto.symbol === 'BTC' && (priceData.usd < 10000 || priceData.usd > 200000)) {
              console.log(`Suspicious Bitcoin price: $${priceData.usd}, skipping update`);
              continue;
            }
          } else {
            throw new Error('Invalid price data from CoinGecko');
          }
        } catch (primaryError) {
          console.log(`CoinGecko API failed for ${crypto.symbol}:`, primaryError.message);
          
          // Fallback: Use CoinCap API
          try {
            const fallbackResponse = await axios.get(
              `https://api.coincap.io/v2/assets/${coinGeckoId}`,
              { timeout: 10000 }
            );
            
            const fallbackData = fallbackResponse.data.data;
            if (fallbackData && fallbackData.priceUsd) {
              priceData = {
                usd: parseFloat(fallbackData.priceUsd),
                usd_market_cap: parseFloat(fallbackData.marketCapUsd),
                usd_24h_vol: parseFloat(fallbackData.volumeUsd24Hr),
                usd_24h_change: parseFloat(fallbackData.changePercent24Hr)
              };
              console.log(`Using CoinCap fallback for ${crypto.symbol}`);
            }
          } catch (fallbackError) {
            console.log(`Fallback API also failed for ${crypto.symbol}:`, fallbackError.message);
            continue;
          }
        }
        
        if (priceData && priceData.usd) {
          // Update cryptocurrency table
          await pool.query(`
            UPDATE cryptocurrencies 
            SET 
              current_price = $1,
              market_cap = $2,
              volume_24h = $3,
              price_change_24h = $4,
              last_updated = CURRENT_TIMESTAMP
            WHERE id = $5
          `, [
            priceData.usd,
            priceData.usd_market_cap || 0,
            priceData.usd_24h_vol || 0,
            priceData.usd_24h_change || 0,
            crypto.id
          ]);

          console.log(`Updated ${crypto.symbol}: $${priceData.usd}`);
          updatedCount++;
        }
      } catch (err) {
        console.error(`Error updating ${crypto.symbol}:`, err.message);
      }
    }

    res.json({
      message: `Force updated prices for ${updatedCount} cryptocurrencies`,
      updated_count: updatedCount
    });
  } catch (err) {
    console.error('Force update all error:', err);
    res.status(500).json({ message: 'Failed to force update all prices' });
  }
});

// Simple working endpoint with real CoinMarketCap data
router.get('/simple-data', async (req, res) => {
  try {
    // Use CoinGecko API (more reliable than CoinMarketCap for free tier)
    const topCryptos = ['bitcoin', 'ethereum', 'binancecoin', 'solana', 'ripple', 'cardano', 'dogecoin', 'avalanche-2', 'shiba-inu', 'polkadot', 'chainlink', 'litecoin', 'uniswap', 'matic-network', 'cosmos'];
    
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price?ids=${topCryptos.join(',')}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`,
      { timeout: 15000 }
    );

    const cryptoData = Object.entries(response.data).map(([id, data]) => {
      const symbolMap = {
        'bitcoin': 'BTC',
        'ethereum': 'ETH', 
        'binancecoin': 'BNB',
        'solana': 'SOL',
        'ripple': 'XRP',
        'cardano': 'ADA',
        'dogecoin': 'DOGE',
        'avalanche-2': 'AVAX',
        'shiba-inu': 'SHIB',
        'polkadot': 'DOT',
        'chainlink': 'LINK',
        'litecoin': 'LTC',
        'uniswap': 'UNI',
        'matic-network': 'MATIC',
        'cosmos': 'ATOM'
      };
      
      const nameMap = {
        'bitcoin': 'Bitcoin',
        'ethereum': 'Ethereum',
        'binancecoin': 'Binance Coin', 
        'solana': 'Solana',
        'ripple': 'XRP',
        'cardano': 'Cardano',
        'dogecoin': 'Dogecoin',
        'avalanche-2': 'Avalanche',
        'shiba-inu': 'Shiba Inu',
        'polkadot': 'Polkadot',
        'chainlink': 'Chainlink',
        'litecoin': 'Litecoin',
        'uniswap': 'Uniswap',
        'matic-network': 'Polygon',
        'cosmos': 'Cosmos'
      };

      return {
        id: id,
        symbol: symbolMap[id] || id.toUpperCase(),
        name: nameMap[id] || id,
        current_price: data.usd,
        market_cap: data.usd_market_cap,
        volume_24h: data.usd_24h_vol,
        price_change_24h: data.usd_24h_change,
        last_updated: new Date().toISOString()
      };
    });

    // Sort by market cap (descending)
    cryptoData.sort((a, b) => (b.market_cap || 0) - (a.market_cap || 0));

    res.json(cryptoData);
  } catch (err) {
    console.error('Simple crypto data error:', err.message);
    res.status(500).json({ message: 'Failed to fetch cryptocurrency data' });
  }
});

// Get cryptocurrencies from CoinMarketCap ONLY - NO OTHER APIs
router.get('/cmc-data', async (req, res) => {
  try {
    console.log('Fetching LIVE data from CoinMarketCap API ONLY...');
    console.log('API Key:', process.env.COINMARKETCAP_API_KEY ? 'Present' : 'Missing');
    
    // Use ONLY CoinMarketCap API with your API key
    const response = await axios.get(
      'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest',
      {
        headers: {
          'X-CMC_PRO_API_KEY': process.env.COINMARKETCAP_API_KEY,
          'Accept': 'application/json'
        },
        params: {
          start: 1,
          limit: 15,
          convert: 'USD'
        },
        timeout: 20000
      }
    );

    console.log('CoinMarketCap API response received:', response.data.status);

    if (!response.data.data || response.data.data.length === 0) {
      throw new Error('No LIVE data received from CoinMarketCap API');
    }

    const cryptoData = response.data.data.map((crypto, index) => ({
      id: crypto.slug,
      symbol: crypto.symbol,
      name: crypto.name,
      current_price: crypto.quote.USD.price,
      market_cap: crypto.quote.USD.market_cap,
      volume_24h: crypto.quote.USD.volume_24h,
      price_change_24h: crypto.quote.USD.percent_change_24h,
      last_updated: new Date().toISOString(),
      rank: crypto.cmc_rank
    }));

    console.log(`Successfully fetched ${cryptoData.length} LIVE cryptocurrencies from CoinMarketCap ONLY`);
    res.json(cryptoData);
  } catch (err) {
    console.error('CoinMarketCap API error:', err.response?.data || err.message);
    console.error('Using ONLY CoinMarketCap API - no fallbacks');
    res.status(500).json({ 
      message: 'Failed to fetch LIVE cryptocurrency data from CoinMarketCap API',
      error: err.response?.data || err.message
    });
  }
});

// Manual price update endpoint (for users to trigger)
router.post('/manual-update', authenticateToken, async (req, res) => {
  try {
    const updatedCryptos = await updateCryptoPrices();
    
    res.json({
      message: `Prices updated successfully`,
      updated_count: updatedCryptos,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Manual price update error:', err);
    res.status(500).json({ message: 'Failed to update prices' });
  }
});

// Update cryptocurrency prices (admin endpoint)
router.post('/update-prices', authenticateToken, async (req, res) => {
  try {
    // In a real app, you'd want to add admin role checking here
    const updatedCryptos = await updateCryptoPrices();
    
    res.json({
      message: 'Prices updated successfully',
      updated_count: updatedCryptos
    });
  } catch (err) {
    console.error('Update prices error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add new cryptocurrency to track
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { symbol, name } = req.body;

    if (!symbol || !name) {
      return res.status(400).json({ message: 'Symbol and name are required' });
    }

    // Check if crypto already exists
    const existing = await pool.query(
      'SELECT id FROM cryptocurrencies WHERE symbol = $1',
      [symbol.toUpperCase()]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Cryptocurrency already exists' });
    }

    // Insert new cryptocurrency
    const result = await pool.query(
      'INSERT INTO cryptocurrencies (symbol, name) VALUES ($1, $2) RETURNING *',
      [symbol.toUpperCase(), name]
    );

    res.status(201).json({
      message: 'Cryptocurrency added successfully',
      crypto: result.rows[0]
    });
  } catch (err) {
    console.error('Add cryptocurrency error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper function to update crypto prices with fallback
async function updateCryptoPrices() {
  try {
    // Get all cryptocurrencies that need updating
    const result = await pool.query(`
      SELECT id, symbol FROM cryptocurrencies 
      WHERE last_updated < NOW() - INTERVAL '5 minutes'
    `);

    if (result.rows.length === 0) {
      return 0;
    }

    let updatedCount = 0;

    for (const crypto of result.rows) {
      // Add delay between requests to avoid rate limiting
      if (updatedCount > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      }
      try {
        // Use ONLY CoinMarketCap API - NO OTHER APIs
        let priceData = null;
        
        try {
          // ONLY CoinMarketCap API
          const cmcResponse = await axios.get(
            `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${crypto.symbol}`,
            {
              headers: {
                'X-CMC_PRO_API_KEY': process.env.COINMARKETCAP_API_KEY,
                'Accept': 'application/json'
              },
              timeout: 10000
            }
          );

          const cmcData = cmcResponse.data.data[crypto.symbol];
          if (cmcData && cmcData.quote && cmcData.quote.USD) {
            const usdQuote = cmcData.quote.USD;
            priceData = {
              usd: usdQuote.price,
              usd_market_cap: usdQuote.market_cap,
              usd_24h_vol: usdQuote.volume_24h,
              usd_24h_change: usdQuote.percent_change_24h
            };
            console.log(`Updated ${crypto.symbol} via CoinMarketCap ONLY: $${priceData.usd}`);
          } else {
            throw new Error('Invalid data from CoinMarketCap');
          }
        } catch (cmcError) {
          console.log(`CoinMarketCap API failed for ${crypto.symbol}:`, cmcError.message);
          console.log(`Using ONLY CoinMarketCap API - skipping ${crypto.symbol}`);
          continue; // Skip this crypto, no fallbacks
        }
        
        if (priceData && priceData.usd) {
          // Update cryptocurrency table
          await pool.query(`
            UPDATE cryptocurrencies 
            SET 
              current_price = $1,
              market_cap = $2,
              volume_24h = $3,
              price_change_24h = $4,
              last_updated = CURRENT_TIMESTAMP
            WHERE id = $5
          `, [
            priceData.usd,
            priceData.usd_market_cap || 0,
            priceData.usd_24h_vol || 0,
            priceData.usd_24h_change || 0,
            crypto.id
          ]);

          // Insert price history
          await pool.query(`
            INSERT INTO price_history (crypto_id, price, market_cap, volume_24h)
            VALUES ($1, $2, $3, $4)
          `, [
            crypto.id,
            priceData.usd,
            priceData.usd_market_cap || 0,
            priceData.usd_24h_vol || 0
          ]);

          console.log(`Updated ${crypto.symbol}: $${priceData.usd}`);
          updatedCount++;
        }
      } catch (err) {
        console.error(`Error updating ${crypto.symbol}:`, err.message);
      }
    }

    return updatedCount;
  } catch (err) {
    console.error('Update crypto prices error:', err);
    throw err;
  }
}

module.exports = { router, updateCryptoPrices };
