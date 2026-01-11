const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const podcastController = require('../controllers/podcastController');

// PUBLIC ROUTES

// Get all categories
router.get('/categories', podcastController.getAllCategories);

// Get all articles
router.get('/articles', podcastController.getAllArticles);

// Get single article with segments
router.get('/articles/:id', podcastController.getArticle);

// Generate AI response for voice interaction
router.post('/ai/response', podcastController.generateAIResponse);

// Generate AI response with Text-to-Speech
router.post('/ai/response-voice', podcastController.generateAIResponseWithVoice);

// PROTECTED ROUTES

// Category management
router.get('/admin/categories', authMiddleware, podcastController.getAllCategories);
router.get('/admin/categories/:id', authMiddleware, podcastController.getCategory);
router.post('/admin/categories', authMiddleware, podcastController.createCategory);
router.patch('/admin/categories/:id', authMiddleware, podcastController.updateCategory);
router.delete('/admin/categories/:id', authMiddleware, podcastController.deleteCategory);

// Article management
router.get('/admin/articles', authMiddleware, podcastController.getAllArticles);
router.get('/admin/articles/:id', authMiddleware, podcastController.getArticle);
router.post('/admin/articles', authMiddleware, podcastController.createArticle);
router.patch('/admin/articles/:id', authMiddleware, podcastController.updateArticle);
router.delete('/admin/articles/:id', authMiddleware, podcastController.deleteArticle);

// Segment management
router.get('/admin/articles/:article_id/segments', authMiddleware, podcastController.getSegments);
router.post('/admin/segments', authMiddleware, podcastController.createSegment);
router.patch('/admin/segments/:id', authMiddleware, podcastController.updateSegment);
router.delete('/admin/segments/:id', authMiddleware, podcastController.deleteSegment);
router.post('/admin/articles/:article_id/segments/bulk', authMiddleware, podcastController.bulkUpdateSegments);

module.exports = router;
