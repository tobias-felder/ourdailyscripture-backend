const pool = require('../config/database');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { sendOrderConfirmation } = require('../utils/email');

// Generate unique order number
const generateOrderNumber = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `ODS-${timestamp}-${random}`.toUpperCase();
};

// Create payment intent
exports.createPaymentIntent = async (req, res) => {
  try {
    const { items, customerEmail, discountCode } = req.body;

    // Calculate subtotal
    let subtotal = items.reduce((sum, item) => {
      const price = item.onSale ? item.salePrice : item.price;
      return sum + (price * (item.quantity || 1));
    }, 0);

    let discountAmount = 0;
    let discount = null;

    // Apply discount if provided
    if (discountCode) {
      const discountResult = await pool.query(
        'SELECT * FROM discount_codes WHERE code = $1 AND is_active = true',
        [discountCode.toUpperCase()]
      );

      if (discountResult.rows.length > 0) {
        discount = discountResult.rows[0];
        
        if (discount.type === 'percentage') {
          discountAmount = (subtotal * discount.value) / 100;
        } else {
          discountAmount = discount.value;
        }
      }
    }

    const total = Math.max(0, subtotal - discountAmount);

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(total * 100), // Stripe uses cents
      currency: 'usd',
      receipt_email: customerEmail,
      metadata: {
        discount_code: discountCode || '',
        subtotal: subtotal.toFixed(2),
        discount_amount: discountAmount.toFixed(2)
      }
    });

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: total,
      discountApplied: discountAmount > 0,
      discountAmount
    });
  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({ error: 'Server error creating payment intent' });
  }
};

// Create order after successful payment
exports.createOrder = async (req, res) => {
  try {
    const {
      paymentIntentId,
      customerEmail,
      customerName,
      customerPhone,
      shippingAddress,
      items,
      subtotal,
      discountCode,
      discountAmount,
      total
    } = req.body;

    // Verify payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ error: 'Payment not completed' });
    }

    // Generate order number
    const orderNumber = generateOrderNumber();

    // Create order
    const result = await pool.query(
      `INSERT INTO orders (
        order_number, customer_email, customer_name, customer_phone,
        shipping_address, items, subtotal, discount_code, discount_amount,
        total, status, stripe_payment_intent_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        orderNumber,
        customerEmail,
        customerName,
        customerPhone || null,
        JSON.stringify(shippingAddress),
        JSON.stringify(items),
        subtotal,
        discountCode || null,
        discountAmount || 0,
        total,
        'paid',
        paymentIntentId
      ]
    );

    const order = result.rows[0];

    // Update discount code usage count
    if (discountCode) {
      await pool.query(
        'UPDATE discount_codes SET usage_count = usage_count + 1 WHERE code = $1',
        [discountCode.toUpperCase()]
      );
    }

    // Send order confirmation email
    try {
      await sendOrderConfirmation(order);
    } catch (emailError) {
      console.error('Email error:', emailError);
      // Don't fail the order if email fails
    }

    res.json({
      success: true,
      message: 'Order created successfully',
      order: {
        orderNumber: order.order_number,
        total: order.total,
        status: order.status
      }
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Server error creating order' });
  }
};

// Get all orders (admin)
exports.getAllOrders = async (req, res) => {
  try {
    const { status, discountCode, startDate, endDate, limit = 50, offset = 0 } = req.query;

    let query = 'SELECT * FROM orders WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (status) {
      query += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (discountCode) {
      query += ` AND discount_code = $${paramCount}`;
      params.push(discountCode.toUpperCase());
      paramCount++;
    }

    if (startDate) {
      query += ` AND created_at >= $${paramCount}`;
      params.push(startDate);
      paramCount++;
    }

    if (endDate) {
      query += ` AND created_at <= $${paramCount}`;
      params.push(endDate);
      paramCount++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    const countResult = await pool.query('SELECT COUNT(*) FROM orders');
    const totalCount = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      orders: result.rows,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + result.rows.length) < totalCount
      }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Server error fetching orders' });
  }
};

// Get single order
exports.getOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ success: true, order: result.rows[0] });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Server error fetching order' });
  }
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'paid', 'processing', 'shipped', 'completed', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await pool.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({
      success: true,
      message: 'Order status updated successfully',
      order: result.rows[0]
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Server error updating order status' });
  }
};

// Get order analytics
exports.getAnalytics = async (req, res) => {
  try {
    // Total sales
    const salesResult = await pool.query(`
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(total), 0) as total_revenue,
        COALESCE(AVG(total), 0) as average_order_value
      FROM orders
      WHERE status != 'cancelled'
    `);

    // Sales by status
    const statusResult = await pool.query(`
      SELECT status, COUNT(*) as count, COALESCE(SUM(total), 0) as revenue
      FROM orders
      GROUP BY status
    `);

    // Top discount codes
    const discountResult = await pool.query(`
      SELECT 
        discount_code,
        COUNT(*) as usage_count,
        COALESCE(SUM(total), 0) as total_sales
      FROM orders
      WHERE discount_code IS NOT NULL
      GROUP BY discount_code
      ORDER BY total_sales DESC
      LIMIT 10
    `);

    // Recent orders (last 30 days)
    const recentResult = await pool.query(`
      SELECT DATE(created_at) as date, COUNT(*) as orders, COALESCE(SUM(total), 0) as revenue
      FROM orders
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    res.json({
      success: true,
      analytics: {
        overview: salesResult.rows[0],
        byStatus: statusResult.rows,
        topDiscountCodes: discountResult.rows,
        recentOrders: recentResult.rows
      }
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Server error fetching analytics' });
  }
};

