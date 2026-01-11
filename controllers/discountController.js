const pool = require('../config/database');

// Get all discount codes
exports.getAllDiscounts = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM discount_codes ORDER BY created_at DESC'
    );

    res.json({ success: true, discounts: result.rows });
  } catch (error) {
    console.error('Get discounts error:', error);
    res.status(500).json({ error: 'Server error fetching discount codes' });
  }
};

// Create discount code
exports.createDiscount = async (req, res) => {
  try {
    const { code, type, value, affiliateName } = req.body;

    // Validate input
    if (!code || !type || !value) {
      return res.status(400).json({ error: 'Please provide code, type, and value' });
    }

    if (type !== 'percentage' && type !== 'fixed') {
      return res.status(400).json({ error: 'Type must be either percentage or fixed' });
    }

    // Check if code already exists
    const existing = await pool.query(
      'SELECT * FROM discount_codes WHERE code = $1',
      [code.toUpperCase()]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Discount code already exists' });
    }

    // Create discount code
    const result = await pool.query(
      `INSERT INTO discount_codes (code, type, value, affiliate_name) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [code.toUpperCase(), type, value, affiliateName || null]
    );

    res.json({
      success: true,
      message: 'Discount code created successfully',
      discount: result.rows[0]
    });
  } catch (error) {
    console.error('Create discount error:', error);
    res.status(500).json({ error: 'Server error creating discount code' });
  }
};

// Update discount code
exports.updateDiscount = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, value, affiliateName, isActive } = req.body;

    const result = await pool.query(
      `UPDATE discount_codes 
       SET type = COALESCE($1, type),
           value = COALESCE($2, value),
           affiliate_name = COALESCE($3, affiliate_name),
           is_active = COALESCE($4, is_active)
       WHERE id = $5
       RETURNING *`,
      [type, value, affiliateName, isActive, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Discount code not found' });
    }

    res.json({
      success: true,
      message: 'Discount code updated successfully',
      discount: result.rows[0]
    });
  } catch (error) {
    console.error('Update discount error:', error);
    res.status(500).json({ error: 'Server error updating discount code' });
  }
};

// Delete discount code
exports.deleteDiscount = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM discount_codes WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Discount code not found' });
    }

    res.json({
      success: true,
      message: 'Discount code deleted successfully'
    });
  } catch (error) {
    console.error('Delete discount error:', error);
    res.status(500).json({ error: 'Server error deleting discount code' });
  }
};

// Validate discount code (public endpoint)
exports.validateDiscount = async (req, res) => {
  try {
    const { code } = req.params;

    const result = await pool.query(
      'SELECT * FROM discount_codes WHERE code = $1 AND is_active = true',
      [code.toUpperCase()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid or inactive discount code' });
    }

    const discount = result.rows[0];

    res.json({
      success: true,
      discount: {
        code: discount.code,
        type: discount.type,
        value: discount.value
      }
    });
  } catch (error) {
    console.error('Validate discount error:', error);
    res.status(500).json({ error: 'Server error validating discount code' });
  }
};

// Get discount stats (for affiliate tracking)
exports.getDiscountStats = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        dc.id,
        dc.code,
        dc.affiliate_name,
        dc.usage_count,
        COALESCE(SUM(o.total), 0) as total_sales,
        COALESCE(SUM(o.discount_amount), 0) as total_discount_given,
        COUNT(o.id) as order_count
      FROM discount_codes dc
      LEFT JOIN orders o ON o.discount_code = dc.code
      GROUP BY dc.id, dc.code, dc.affiliate_name, dc.usage_count
      ORDER BY total_sales DESC
    `);

    res.json({ success: true, stats: result.rows });
  } catch (error) {
    console.error('Get discount stats error:', error);
    res.status(500).json({ error: 'Server error fetching discount stats' });
  }
};

