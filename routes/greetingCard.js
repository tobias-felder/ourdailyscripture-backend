const express = require('express');
const router = express.Router();
const greetingCardController = require('../controllers/greetingCardController');

/**
 * POST /api/greeting-card/generate
 * Generate AI greeting card image
 */
router.post('/generate', greetingCardController.generateGreetingCard);

module.exports = router;
