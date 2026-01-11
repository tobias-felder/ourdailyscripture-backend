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
const bibleRoutes = require('./bible');

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

// Bible migration endpoints (one-time setup)
router.get('/run-bible-migration', async (req, res) => {
  try {
    const { Pool } = require('pg');
    const fs = require('fs');
    const path = require('path');
    
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    const sqlPath = path.join(__dirname, '..', 'migrations', 'add-bible-tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await pool.query(sql);
    
    // Verify tables
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('bible_versions', 'bible_books', 'bible_verses')
      ORDER BY table_name
    `);
    
    const versionCheck = await pool.query("SELECT * FROM bible_versions WHERE code = 'PCM'");
    const booksCount = await pool.query('SELECT COUNT(*) as count FROM bible_books');
    
    res.json({
      success: true,
      message: 'Bible tables migration completed successfully!',
      tables: result.rows.map(r => r.table_name),
      pcm_version: versionCheck.rows[0] || null,
      books_count: parseInt(booksCount.rows[0].count)
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Migration failed', details: error.message });
  }
});

router.get('/import-pcm-bible', async (req, res) => {
  try {
    const { Pool } = require('pg');
    const fs = require('fs');
    const path = require('path');
    
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    const versionResult = await pool.query("SELECT id FROM bible_versions WHERE code = 'PCM'");
    if (versionResult.rows.length === 0) {
      return res.status(400).json({ error: 'PCM version not found. Run /api/run-bible-migration first.' });
    }
    const versionId = versionResult.rows[0].id;
    
    const booksResult = await pool.query('SELECT id, code FROM bible_books ORDER BY book_number');
    const bookIds = {};
    booksResult.rows.forEach(row => { bookIds[row.code] = row.id; });
    
    const pcmDir = path.join(__dirname, '../pcm_bible');
    if (!fs.existsSync(pcmDir)) {
      return res.status(400).json({ error: 'PCM Bible files not found on server. Contact admin.' });
    }
    
    const files = fs.readdirSync(pcmDir).filter(f => f.endsWith('_read.txt') && f.includes('_'));
    let totalVerses = 0;
    
    for (const file of files) {
      const parts = file.split('_');
      if (parts.length < 4) continue;
      
      const bookCode = parts[2];
      const chapterNum = parseInt(parts[3]);
      
      if (!bookIds[bookCode]) continue;
      
      const bookId = bookIds[bookCode];
      const filePath = path.join(pcmDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').filter(l => l.trim());
      
      let verseNum = 0;
      let verseText = '';
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.endsWith('.') && trimmed.length < 20) continue;
        
        const match = trimmed.match(/^(\d+)\.\s*(.+)$/);
        
        if (match) {
          if (verseNum > 0 && verseText) {
            await pool.query(
              `INSERT INTO bible_verses (version_id, book_id, chapter, verse, text)
               VALUES ($1, $2, $3, $4, $5)
               ON CONFLICT (version_id, book_id, chapter, verse) DO UPDATE
               SET text = EXCLUDED.text`,
              [versionId, bookId, chapterNum, verseNum, verseText.trim()]
            );
            totalVerses++;
          }
          verseNum = parseInt(match[1]);
          verseText = match[2];
        } else if (verseNum > 0) {
          verseText += ' ' + trimmed;
        }
      }
      
      if (verseNum > 0 && verseText) {
        await pool.query(
          `INSERT INTO bible_verses (version_id, book_id, chapter, verse, text)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (version_id, book_id, chapter, verse) DO UPDATE
           SET text = EXCLUDED.text`,
          [versionId, bookId, chapterNum, verseNum, verseText.trim()]
        );
        totalVerses++;
      }
    }
    
    const sampleResult = await pool.query(
      `SELECT b.name, v.chapter, v.verse, v.text
       FROM bible_verses v
       JOIN bible_books b ON v.book_id = b.id
       WHERE v.version_id = $1
       ORDER BY b.book_number, v.chapter, v.verse
       LIMIT 3`,
      [versionId]
    );
    
    res.json({
      success: true,
      message: 'Nigerian Pidgin Bible imported successfully!',
      verses_imported: totalVerses,
      sample_verses: sampleResult.rows
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Import failed', details: error.message });
  }
});

// Prayer migration endpoint (one-time setup)
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

// Bible routes (public - Bible verse access)
router.use('/bible', bibleRoutes);

module.exports = router;

