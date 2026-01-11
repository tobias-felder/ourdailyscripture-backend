const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

// Controllers
const authController = require('../controllers/authController');
const orderController = require('../controllers/orderController');
const discountController = require('../controllers/discountController');
const productController = require('../controllers/productController');
const themeController = require('../controllers/themeController');
const podcastRoutes = require('./podcast');
const greetingCardRoutes = require('./greetingCard');
const prayerRoutes = require('./prayer');

// ============================================
// PUBLIC ROUTES (No authentication required)
// ============================================

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'OurDailyScripture API is running' });
});

// Auth routes
router.post('/auth/login', authController.login);
router.post('/auth/setup', authController.createAdmin); // Protected by setup key

// Payment routes
router.post('/payment/create-intent', orderController.createPaymentIntent);
router.post('/orders/create', orderController.createOrder);

// Discount validation (public - for checkout)
router.get('/discounts/validate/:code', discountController.validateDiscount);

// Theme routes (public - for frontend)
router.get('/theme/current', themeController.getCurrentTheme);

// Migration endpoint (one-time setup)
router.get('/run-prayer-migration', async (req, res) => {
  try {
    const { Pool } = require('pg');
    const fs = require('fs');
    const path = require('path');
    
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    // Read and execute migration SQL
    const sqlPath = path.join(__dirname, '..', 'migrations', 'add-prayers-table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await pool.query(sql);
    
    // Verify table was created
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'prayers'
      ORDER BY ordinal_position
    `);
    
    res.json({
      success: true,
      message: 'Prayer table migration completed successfully!',
      table_structure: result.rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Migration failed',
      details: error.message
    });
  }
});

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

// Podcast routes (VIP system)
router.use('/podcast', podcastRoutes);

// Greeting card routes (public - AI image generation)
router.use('/greeting-card', greetingCardRoutes);

// Prayer routes (public - AI prayer generation)
router.use('/prayers', prayerRoutes);

module.exports = router;

