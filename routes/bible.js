const express = require('express');
const router = express.Router();
const bibleController = require('../controllers/bibleController');

// ============================================
// BIBLE VERSIONS
// ============================================

// Get all Bible versions
router.get('/versions', bibleController.getAllVersions);

// Get single version
router.get('/versions/:code', bibleController.getVersion);

// ============================================
// BIBLE BOOKS
// ============================================

// Get all books (optional query: testament=OT or testament=NT)
router.get('/books', bibleController.getAllBooks);

// Get single book
router.get('/books/:code', bibleController.getBook);

// ============================================
// BIBLE VERSES
// ============================================

// Get verse by reference (e.g., /verse/John%203:16?version=PCM)
router.get('/verse/:reference', bibleController.getVerse);

// Get chapter (e.g., /chapter/John/3?version=PCM)
router.get('/chapter/:book/:chapter', bibleController.getChapter);

// Get passage (e.g., /passage/John%203:16-18?version=PCM)
router.get('/passage/:reference', bibleController.getPassage);

// Search verses (e.g., /search?query=love&version=PCM&testament=NT&limit=10)
router.get('/search', bibleController.searchVerses);

// Get random verse (e.g., /random?version=PCM&testament=NT)
router.get('/random', bibleController.getRandomVerse);

module.exports = router;
