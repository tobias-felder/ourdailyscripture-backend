const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// ============================================
// BIBLE VERSIONS
// ============================================

// Get all available Bible versions
exports.getAllVersions = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM bible_versions WHERE is_active = true ORDER BY code'
    );

    res.json({ success: true, versions: result.rows });
  } catch (error) {
    console.error('Get Bible versions error:', error);
    res.status(500).json({ error: 'Server error fetching Bible versions' });
  }
};

// Get single version
exports.getVersion = async (req, res) => {
  try {
    const { code } = req.params;
    const result = await pool.query(
      'SELECT * FROM bible_versions WHERE code = $1',
      [code.toUpperCase()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bible version not found' });
    }

    res.json({ success: true, version: result.rows[0] });
  } catch (error) {
    console.error('Get version error:', error);
    res.status(500).json({ error: 'Server error fetching version' });
  }
};

// ============================================
// BIBLE BOOKS
// ============================================

// Get all books
exports.getAllBooks = async (req, res) => {
  try {
    const { testament } = req.query;
    
    let query = 'SELECT * FROM bible_books';
    const params = [];
    
    if (testament && (testament === 'OT' || testament === 'NT')) {
      query += ' WHERE testament = $1';
      params.push(testament);
    }
    
    query += ' ORDER BY book_number';
    
    const result = await pool.query(query, params);

    res.json({ success: true, books: result.rows });
  } catch (error) {
    console.error('Get books error:', error);
    res.status(500).json({ error: 'Server error fetching books' });
  }
};

// Get single book
exports.getBook = async (req, res) => {
  try {
    const { code } = req.params;
    const result = await pool.query(
      'SELECT * FROM bible_books WHERE code = $1',
      [code.toUpperCase()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    res.json({ success: true, book: result.rows[0] });
  } catch (error) {
    console.error('Get book error:', error);
    res.status(500).json({ error: 'Server error fetching book' });
  }
};

// ============================================
// BIBLE VERSES
// ============================================

// Get verse by reference (e.g., "John 3:16")
exports.getVerse = async (req, res) => {
  try {
    const { reference } = req.params;
    const { version = 'PCM' } = req.query;
    
    // Parse reference (e.g., "John 3:16" or "1 John 3:16")
    const match = reference.match(/^(\d?\s?\w+)\s+(\d+):(\d+)$/i);
    
    if (!match) {
      return res.status(400).json({ error: 'Invalid reference format. Use format like "John 3:16"' });
    }
    
    const bookName = match[1].trim();
    const chapter = parseInt(match[2]);
    const verse = parseInt(match[3]);
    
    // Find book by name (case-insensitive)
    const bookResult = await pool.query(
      `SELECT * FROM bible_books 
       WHERE LOWER(name) = LOWER($1) OR LOWER(code) = LOWER($1)`,
      [bookName]
    );
    
    if (bookResult.rows.length === 0) {
      return res.status(404).json({ error: `Book "${bookName}" not found` });
    }
    
    const book = bookResult.rows[0];
    
    // Get version
    const versionResult = await pool.query(
      'SELECT * FROM bible_versions WHERE code = $1',
      [version.toUpperCase()]
    );
    
    if (versionResult.rows.length === 0) {
      return res.status(404).json({ error: `Version "${version}" not found` });
    }
    
    const versionData = versionResult.rows[0];
    
    // Get verse
    const verseResult = await pool.query(
      `SELECT v.*, b.name as book_name, b.code as book_code
       FROM bible_verses v
       JOIN bible_books b ON v.book_id = b.id
       WHERE v.version_id = $1 AND v.book_id = $2 AND v.chapter = $3 AND v.verse = $4`,
      [versionData.id, book.id, chapter, verse]
    );
    
    if (verseResult.rows.length === 0) {
      return res.status(404).json({ 
        error: `Verse not found: ${book.name} ${chapter}:${verse} in ${version}` 
      });
    }
    
    const verseData = verseResult.rows[0];
    
    res.json({
      success: true,
      reference: `${book.name} ${chapter}:${verse}`,
      version: version.toUpperCase(),
      verse: {
        book: book.name,
        book_code: book.code,
        chapter: chapter,
        verse: verse,
        text: verseData.text
      }
    });
  } catch (error) {
    console.error('Get verse error:', error);
    res.status(500).json({ error: 'Server error fetching verse' });
  }
};

// Get chapter
exports.getChapter = async (req, res) => {
  try {
    const { book, chapter } = req.params;
    const { version = 'PCM' } = req.query;
    
    // Find book
    const bookResult = await pool.query(
      `SELECT * FROM bible_books 
       WHERE LOWER(name) = LOWER($1) OR LOWER(code) = LOWER($1)`,
      [book]
    );
    
    if (bookResult.rows.length === 0) {
      return res.status(404).json({ error: `Book "${book}" not found` });
    }
    
    const bookData = bookResult.rows[0];
    
    // Get version
    const versionResult = await pool.query(
      'SELECT * FROM bible_versions WHERE code = $1',
      [version.toUpperCase()]
    );
    
    if (versionResult.rows.length === 0) {
      return res.status(404).json({ error: `Version "${version}" not found` });
    }
    
    const versionData = versionResult.rows[0];
    
    // Get all verses in chapter
    const versesResult = await pool.query(
      `SELECT v.verse, v.text
       FROM bible_verses v
       WHERE v.version_id = $1 AND v.book_id = $2 AND v.chapter = $3
       ORDER BY v.verse`,
      [versionData.id, bookData.id, parseInt(chapter)]
    );
    
    if (versesResult.rows.length === 0) {
      return res.status(404).json({ 
        error: `Chapter not found: ${bookData.name} ${chapter} in ${version}` 
      });
    }
    
    res.json({
      success: true,
      reference: `${bookData.name} ${chapter}`,
      version: version.toUpperCase(),
      book: bookData.name,
      book_code: bookData.code,
      chapter: parseInt(chapter),
      verses: versesResult.rows
    });
  } catch (error) {
    console.error('Get chapter error:', error);
    res.status(500).json({ error: 'Server error fetching chapter' });
  }
};

// Get passage (range of verses)
exports.getPassage = async (req, res) => {
  try {
    const { reference } = req.params;
    const { version = 'PCM' } = req.query;
    
    // Parse reference (e.g., "John 3:16-18" or "John 3:16-4:2")
    const match = reference.match(/^(\d?\s?\w+)\s+(\d+):(\d+)-(\d+):?(\d+)?$/i);
    
    if (!match) {
      return res.status(400).json({ 
        error: 'Invalid passage format. Use format like "John 3:16-18" or "John 3:16-4:2"' 
      });
    }
    
    const bookName = match[1].trim();
    const startChapter = parseInt(match[2]);
    const startVerse = parseInt(match[3]);
    const endChapter = match[5] ? parseInt(match[4]) : startChapter;
    const endVerse = match[5] ? parseInt(match[5]) : parseInt(match[4]);
    
    // Find book
    const bookResult = await pool.query(
      `SELECT * FROM bible_books 
       WHERE LOWER(name) = LOWER($1) OR LOWER(code) = LOWER($1)`,
      [bookName]
    );
    
    if (bookResult.rows.length === 0) {
      return res.status(404).json({ error: `Book "${bookName}" not found` });
    }
    
    const book = bookResult.rows[0];
    
    // Get version
    const versionResult = await pool.query(
      'SELECT * FROM bible_versions WHERE code = $1',
      [version.toUpperCase()]
    );
    
    if (versionResult.rows.length === 0) {
      return res.status(404).json({ error: `Version "${version}" not found` });
    }
    
    const versionData = versionResult.rows[0];
    
    // Get verses in range
    const versesResult = await pool.query(
      `SELECT v.chapter, v.verse, v.text
       FROM bible_verses v
       WHERE v.version_id = $1 AND v.book_id = $2
         AND ((v.chapter = $3 AND v.verse >= $4) OR v.chapter > $3)
         AND ((v.chapter = $5 AND v.verse <= $6) OR v.chapter < $5)
       ORDER BY v.chapter, v.verse`,
      [versionData.id, book.id, startChapter, startVerse, endChapter, endVerse]
    );
    
    if (versesResult.rows.length === 0) {
      return res.status(404).json({ error: 'Passage not found' });
    }
    
    res.json({
      success: true,
      reference: reference,
      version: version.toUpperCase(),
      book: book.name,
      book_code: book.code,
      verses: versesResult.rows
    });
  } catch (error) {
    console.error('Get passage error:', error);
    res.status(500).json({ error: 'Server error fetching passage' });
  }
};

// Search verses
exports.searchVerses = async (req, res) => {
  try {
    const { query, version = 'PCM', testament, book, limit = 50 } = req.query;
    
    if (!query || query.trim().length < 3) {
      return res.status(400).json({ error: 'Search query must be at least 3 characters' });
    }
    
    // Get version
    const versionResult = await pool.query(
      'SELECT * FROM bible_versions WHERE code = $1',
      [version.toUpperCase()]
    );
    
    if (versionResult.rows.length === 0) {
      return res.status(404).json({ error: `Version "${version}" not found` });
    }
    
    const versionData = versionResult.rows[0];
    
    // Build search query
    let sql = `
      SELECT v.chapter, v.verse, v.text, b.name as book_name, b.code as book_code, b.testament
      FROM bible_verses v
      JOIN bible_books b ON v.book_id = b.id
      WHERE v.version_id = $1 AND v.text ILIKE $2
    `;
    
    const params = [versionData.id, `%${query}%`];
    let paramCount = 2;
    
    if (testament && (testament === 'OT' || testament === 'NT')) {
      paramCount++;
      sql += ` AND b.testament = $${paramCount}`;
      params.push(testament);
    }
    
    if (book) {
      paramCount++;
      sql += ` AND (LOWER(b.name) = LOWER($${paramCount}) OR LOWER(b.code) = LOWER($${paramCount}))`;
      params.push(book);
    }
    
    sql += ` ORDER BY b.book_number, v.chapter, v.verse LIMIT $${paramCount + 1}`;
    params.push(parseInt(limit));
    
    const result = await pool.query(sql, params);
    
    res.json({
      success: true,
      query: query,
      version: version.toUpperCase(),
      count: result.rows.length,
      verses: result.rows
    });
  } catch (error) {
    console.error('Search verses error:', error);
    res.status(500).json({ error: 'Server error searching verses' });
  }
};

// Get random verse
exports.getRandomVerse = async (req, res) => {
  try {
    const { version = 'PCM', testament } = req.query;
    
    // Get version
    const versionResult = await pool.query(
      'SELECT * FROM bible_versions WHERE code = $1',
      [version.toUpperCase()]
    );
    
    if (versionResult.rows.length === 0) {
      return res.status(404).json({ error: `Version "${version}" not found` });
    }
    
    const versionData = versionResult.rows[0];
    
    // Build query
    let sql = `
      SELECT v.chapter, v.verse, v.text, b.name as book_name, b.code as book_code
      FROM bible_verses v
      JOIN bible_books b ON v.book_id = b.id
      WHERE v.version_id = $1
    `;
    
    const params = [versionData.id];
    
    if (testament && (testament === 'OT' || testament === 'NT')) {
      sql += ` AND b.testament = $2`;
      params.push(testament);
    }
    
    sql += ` ORDER BY RANDOM() LIMIT 1`;
    
    const result = await pool.query(sql, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No verses found' });
    }
    
    const verse = result.rows[0];
    
    res.json({
      success: true,
      reference: `${verse.book_name} ${verse.chapter}:${verse.verse}`,
      version: version.toUpperCase(),
      verse: {
        book: verse.book_name,
        book_code: verse.book_code,
        chapter: verse.chapter,
        verse: verse.verse,
        text: verse.text
      }
    });
  } catch (error) {
    console.error('Get random verse error:', error);
    res.status(500).json({ error: 'Server error fetching random verse' });
  }
};
