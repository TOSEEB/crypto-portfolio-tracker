const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get user's portfolio
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('Fetching portfolio for user ID:', req.user.id, 'Email:', req.user.email);
    const result = await pool.query(`
      SELECT 
        p.id,
        p.amount,
        p.purchase_price,
        p.purchase_date,
        p.notes,
        c.symbol,
        c.name,
        c.current_price,
        (p.amount * c.current_price) as current_value,
        (p.amount * c.current_price - p.amount * p.purchase_price) as profit_loss,
        ((c.current_price - p.purchase_price) / p.purchase_price * 100) as profit_loss_percentage
      FROM portfolios p
      JOIN cryptocurrencies c ON p.crypto_id = c.id
      WHERE p.user_id = $1
      ORDER BY current_value DESC
    `, [req.user.id]);

    console.log('Found', result.rows.length, 'portfolio entries for user ID:', req.user.id);
    res.json(result.rows);
  } catch (err) {
    console.error('Get portfolio error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add cryptocurrency to portfolio
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { symbol, amount, purchase_price, notes } = req.body;
    
    console.log('Adding to portfolio:', { 
      userId: req.user.id, 
      symbol, 
      amount, 
      purchase_price, 
      notes 
    });

    // Validation
    if (!symbol || !amount || !purchase_price) {
      return res.status(400).json({ 
        message: 'Symbol, amount, and purchase price are required' 
      });
    }

    if (amount <= 0 || purchase_price <= 0) {
      return res.status(400).json({ 
        message: 'Amount and purchase price must be positive' 
      });
    }

    // Get cryptocurrency ID
    const cryptoResult = await pool.query(
      'SELECT id FROM cryptocurrencies WHERE symbol = $1',
      [symbol.toUpperCase()]
    );

    if (cryptoResult.rows.length === 0) {
      return res.status(404).json({ message: 'Cryptocurrency not found' });
    }

    const cryptoId = cryptoResult.rows[0].id;
    console.log('Found crypto ID:', cryptoId, 'for symbol:', symbol);

    // Check if user already has this crypto in portfolio
    const existingResult = await pool.query(
      'SELECT id, amount, purchase_price FROM portfolios WHERE user_id = $1 AND crypto_id = $2',
      [req.user.id, cryptoId]
    );

    if (existingResult.rows.length > 0) {
      console.log('Updating existing portfolio entry for user:', req.user.id);
      // Update existing entry with weighted average
      const existing = existingResult.rows[0];
      const totalAmount = parseFloat(existing.amount) + parseFloat(amount);
      const weightedPrice = (
        (parseFloat(existing.amount) * parseFloat(existing.purchase_price)) +
        (parseFloat(amount) * parseFloat(purchase_price))
      ) / totalAmount;

      const updateResult = await pool.query(`
        UPDATE portfolios 
        SET 
          amount = $1,
          purchase_price = $2,
          notes = $3,
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $4 AND crypto_id = $5
        RETURNING *
      `, [totalAmount, weightedPrice, notes, req.user.id, cryptoId]);

      console.log('Portfolio updated successfully for user:', req.user.id);
      return res.json({
        message: 'Portfolio updated successfully',
        portfolio: updateResult.rows[0]
      });
    } else {
      console.log('Creating new portfolio entry for user:', req.user.id);
      // Insert new entry
      const insertResult = await pool.query(`
        INSERT INTO portfolios (user_id, crypto_id, amount, purchase_price, notes)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [req.user.id, cryptoId, amount, purchase_price, notes]);

      console.log('Portfolio entry created successfully for user:', req.user.id, 'Entry ID:', insertResult.rows[0].id);
      return res.status(201).json({
        message: 'Cryptocurrency added to portfolio',
        portfolio: insertResult.rows[0]
      });
    }
  } catch (err) {
    console.error('Add to portfolio error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update portfolio entry
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, purchase_price, notes } = req.body;

    // Validation
    if (!amount || !purchase_price) {
      return res.status(400).json({ 
        message: 'Amount and purchase price are required' 
      });
    }

    if (amount <= 0 || purchase_price <= 0) {
      return res.status(400).json({ 
        message: 'Amount and purchase price must be positive' 
      });
    }

    // Check if portfolio entry exists and belongs to user
    const existingResult = await pool.query(
      'SELECT id FROM portfolios WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ message: 'Portfolio entry not found' });
    }

    // Update portfolio entry
    const updateResult = await pool.query(`
      UPDATE portfolios 
      SET 
        amount = $1,
        purchase_price = $2,
        notes = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4 AND user_id = $5
      RETURNING *
    `, [amount, purchase_price, notes, id, req.user.id]);

    res.json({
      message: 'Portfolio updated successfully',
      portfolio: updateResult.rows[0]
    });
  } catch (err) {
    console.error('Update portfolio error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove cryptocurrency from portfolio
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if portfolio entry exists and belongs to user
    const existingResult = await pool.query(
      'SELECT id FROM portfolios WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ message: 'Portfolio entry not found' });
    }

    // Delete portfolio entry
    await pool.query(
      'DELETE FROM portfolios WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    res.json({ message: 'Cryptocurrency removed from portfolio' });
  } catch (err) {
    console.error('Delete portfolio error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get portfolio summary/stats
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_holdings,
        SUM(p.amount * p.purchase_price) as total_invested,
        SUM(p.amount * c.current_price) as total_current_value,
        SUM(p.amount * c.current_price - p.amount * p.purchase_price) as total_profit_loss,
        CASE 
          WHEN SUM(p.amount * p.purchase_price) > 0 
          THEN SUM(p.amount * c.current_price - p.amount * p.purchase_price) / SUM(p.amount * p.purchase_price) * 100
          ELSE 0
        END as total_profit_loss_percentage
      FROM portfolios p
      JOIN cryptocurrencies c ON p.crypto_id = c.id
      WHERE p.user_id = $1
    `, [req.user.id]);

    const summary = result.rows[0];
    
    res.json({
      total_holdings: parseInt(summary.total_holdings),
      total_invested: parseFloat(summary.total_invested || 0),
      total_current_value: parseFloat(summary.total_current_value || 0),
      total_profit_loss: parseFloat(summary.total_profit_loss || 0),
      total_profit_loss_percentage: parseFloat(summary.total_profit_loss_percentage || 0)
    });
  } catch (err) {
    console.error('Get portfolio summary error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Clean up suspicious portfolio entries (for development)
router.post('/cleanup', authenticateToken, async (req, res) => {
  try {
    // Find entries with suspiciously large amounts (likely wrong data)
    const result = await pool.query(`
      SELECT 
        p.id,
        p.amount,
        c.symbol,
        (p.amount * c.current_price) as current_value
      FROM portfolios p
      JOIN cryptocurrencies c ON p.crypto_id = c.id
      WHERE p.user_id = $1 AND p.amount > 1
    `, [req.user.id]);

    if (result.rows.length === 0) {
      return res.json({ message: 'No suspicious entries found', deleted: 0 });
    }

    console.log('Found suspicious entries:', result.rows);

    // Delete suspicious entries
    const deleteResult = await pool.query(`
      DELETE FROM portfolios 
      WHERE user_id = $1 AND amount > 1
    `, [req.user.id]);

    res.json({ 
      message: `Cleaned up ${result.rows.length} suspicious entries`, 
      deleted: result.rows.length,
      entries: result.rows
    });
  } catch (err) {
    console.error('Portfolio cleanup error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
