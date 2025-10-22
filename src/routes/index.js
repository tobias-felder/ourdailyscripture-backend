const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

// Controllers
const authController = require('../controllers/authController');
const orderController = require('../controllers/orderController');
const discountController = require('../controllers/discountController');
const productController = require('../controllers/productController');
const themeController = require('../controllers/themeController');

// ============================================
// PUBLIC ROUTES (No authentication required)
// ============================================

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'OurDailyScripture API is running' });
});

// Database initialization endpoint (one-time use)
router.get('/init-database', async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const { Pool } = require('pg');

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });

    // Read schema.sql
    const schemaPath = path.join(__dirname, '../../schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Execute schema
    await pool.query(schema);

    await pool.end();

    res.json({
      success: true,
      message: '✅ Database initialized successfully!',
      tables: ['admins', 'discount_codes', 'orders', 'products'],
      note: 'All tables and indexes have been created.'
    });
  } catch (error) {
    console.error('Database initialization error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      note: 'If tables already exist, this is normal. Check Railway logs for details.'
    });
  }
});

// Auth routes
router.post('/auth/login', authController.login);
router.post('/auth/setup', authController.createAdmin); // Protected by setup key

// Temporary admin creation endpoint (remove after use)
router.post('/auth/create-admin-now', async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    const pool = require('../config/database');
    
    const email = 'tobias.felder@gmail.com';
    const password = 'Admin2024!';
    const name = 'Tobias Felder';
    
    // Check if admin already exists
    const existing = await pool.query('SELECT * FROM admins WHERE email = $1', [email]);
    
    if (existing.rows.length > 0) {
      return res.json({ 
        success: false, 
        message: 'Admin already exists',
        admin: { email: existing.rows[0].email, name: existing.rows[0].name }
      });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    // Create admin
    const result = await pool.query(
      'INSERT INTO admins (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name',
      [email, passwordHash, name]
    );
    
    res.json({
      success: true,
      message: '✅ Admin created successfully!',
      admin: result.rows[0]
    });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      details: error.stack
    });
  }
});

// Payment routes
router.post('/payment/create-intent', orderController.createPaymentIntent);
router.post('/orders/create', orderController.createOrder);

// Discount validation (public - for checkout)
router.get('/discounts/validate/:code', discountController.validateDiscount);

// Theme routes (public - for frontend)
router.get('/theme/current', themeController.getCurrentTheme);

// ============================================
// PROTECTED ROUTES (Authentication required)
// ============================================

// Auth
router.get('/auth/me', authMiddleware, authController.getMe);

// Orders
router.get('/orders', authMiddleware, orderController.getAllOrders);
router.get('/orders/:id', authMiddleware, orderController.getOrder);
router.patch('/orders/:id/status', authMiddleware, orderController.updateOrderStatus);
router.get('/analytics', authMiddleware, orderController.getAnalytics);

// Discount codes
router.get('/discounts', authMiddleware, discountController.getAllDiscounts);
router.post('/discounts', authMiddleware, discountController.createDiscount);
router.patch('/discounts/:id', authMiddleware, discountController.updateDiscount);
router.delete('/discounts/:id', authMiddleware, discountController.deleteDiscount);
router.get('/discounts/stats', authMiddleware, discountController.getDiscountStats);

// Products
router.get('/products', authMiddleware, productController.getAllProducts);
router.get('/products/:id', authMiddleware, productController.getProduct);
router.post('/products', authMiddleware, productController.createProduct);
router.patch('/products/:id', authMiddleware, productController.updateProduct);
router.delete('/products/:id', authMiddleware, productController.deleteProduct);
router.post('/products/sync', authMiddleware, productController.syncProducts);

// Theme management
router.get('/theme/presets', authMiddleware, themeController.getThemePresets);
router.post('/theme/apply', authMiddleware, themeController.applyTheme);
router.post('/theme/custom', authMiddleware, themeController.applyCustomTheme);

module.exports = router;

