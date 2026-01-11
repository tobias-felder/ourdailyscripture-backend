const express = require('express');
const router = express.Router();
const prayerController = require('../controllers/prayerController');

/**
 * POST /api/prayers/generate
 * Generate contextual prayers based on verses and topic
 */
router.post('/generate', prayerController.generatePrayers);

/**
 * GET /api/prayers/categories/all
 * Get all prayer categories with counts
 */
router.get('/categories/all', prayerController.getPrayerCategories);

/**
 * GET /api/prayers/:category
 * Get saved prayers by category
 */
router.get('/:category', prayerController.getPrayersByCategory);

/**
 * GET /api/prayers/:category/random
 * Get a random prayer by category
 */
router.get('/:category/random', prayerController.getRandomPrayer);

module.exports = router;
