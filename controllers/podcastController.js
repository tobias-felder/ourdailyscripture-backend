const pool = require('../config/database');
const OpenAI = require('openai');

// ============================================
// PODCAST CATEGORIES
// ============================================

// Get all podcast categories
exports.getAllCategories = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM podcast_categories WHERE is_active = true ORDER BY display_order ASC, created_at DESC'
    );

    res.json({ success: true, categories: result.rows });
  } catch (error) {
    console.error('Get podcast categories error:', error);
    res.status(500).json({ error: 'Server error fetching podcast categories' });
  }
};

// Get single category
exports.getCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM podcast_categories WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ success: true, category: result.rows[0] });
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({ error: 'Server error fetching category' });
  }
};

// Create category
exports.createCategory = async (req, res) => {
  try {
    const { name, color_code, description, display_order } = req.body;

    if (!name || !color_code) {
      return res.status(400).json({ error: 'Name and color code are required' });
    }

    const result = await pool.query(
      `INSERT INTO podcast_categories (name, color_code, description, display_order) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [name, color_code, description || null, display_order || 0]
    );

    res.json({
      success: true,
      message: 'Category created successfully',
      category: result.rows[0]
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Server error creating category' });
  }
};

// Update category
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color_code, description, display_order, is_active } = req.body;

    const result = await pool.query(
      `UPDATE podcast_categories 
       SET name = COALESCE($1, name),
           color_code = COALESCE($2, color_code),
           description = COALESCE($3, description),
           display_order = COALESCE($4, display_order),
           is_active = COALESCE($5, is_active)
       WHERE id = $6
       RETURNING *`,
      [name, color_code, description, display_order, is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({
      success: true,
      message: 'Category updated successfully',
      category: result.rows[0]
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Server error updating category' });
  }
};

// Delete category
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category has articles
    const articlesCheck = await pool.query(
      'SELECT COUNT(*) FROM podcast_articles WHERE category_id = $1',
      [id]
    );

    if (parseInt(articlesCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete category with existing articles. Delete articles first.' 
      });
    }

    const result = await pool.query(
      'DELETE FROM podcast_categories WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Server error deleting category' });
  }
};

// ============================================
// PODCAST ARTICLES
// ============================================

// Get all articles (optionally filtered by category)
exports.getAllArticles = async (req, res) => {
  try {
    const { category_id } = req.query;
    
    let query = `
      SELECT pa.*, pc.name as category_name, pc.color_code as category_color
      FROM podcast_articles pa
      LEFT JOIN podcast_categories pc ON pa.category_id = pc.id
      WHERE pa.is_active = true
    `;
    const params = [];

    if (category_id) {
      query += ' AND pa.category_id = $1';
      params.push(category_id);
    }

    query += ' ORDER BY pa.created_at DESC';

    const result = await pool.query(query, params);

    res.json({ success: true, articles: result.rows });
  } catch (error) {
    console.error('Get articles error:', error);
    res.status(500).json({ error: 'Server error fetching articles' });
  }
};

// Get single article with segments
exports.getArticle = async (req, res) => {
  try {
    const { id } = req.params;

    // Get article
    const articleResult = await pool.query(
      `SELECT pa.*, pc.name as category_name, pc.color_code as category_color
       FROM podcast_articles pa
       LEFT JOIN podcast_categories pc ON pa.category_id = pc.id
       WHERE pa.id = $1`,
      [id]
    );

    if (articleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Get segments
    const segmentsResult = await pool.query(
      'SELECT * FROM podcast_segments WHERE article_id = $1 ORDER BY segment_order ASC',
      [id]
    );

    const article = articleResult.rows[0];
    article.segments = segmentsResult.rows;

    res.json({ success: true, article });
  } catch (error) {
    console.error('Get article error:', error);
    res.status(500).json({ error: 'Server error fetching article' });
  }
};

// Create article
exports.createArticle = async (req, res) => {
  try {
    const { category_id, title, description, pdf_url, pdf_filename } = req.body;

    if (!category_id || !title) {
      return res.status(400).json({ error: 'Category ID and title are required' });
    }

    const result = await pool.query(
      `INSERT INTO podcast_articles (category_id, title, description, pdf_url, pdf_filename) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [category_id, title, description || null, pdf_url || null, pdf_filename || null]
    );

    res.json({
      success: true,
      message: 'Article created successfully',
      article: result.rows[0]
    });
  } catch (error) {
    console.error('Create article error:', error);
    res.status(500).json({ error: 'Server error creating article' });
  }
};

// Update article
exports.updateArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const { category_id, title, description, pdf_url, pdf_filename, is_active } = req.body;

    const result = await pool.query(
      `UPDATE podcast_articles 
       SET category_id = COALESCE($1, category_id),
           title = COALESCE($2, title),
           description = COALESCE($3, description),
           pdf_url = COALESCE($4, pdf_url),
           pdf_filename = COALESCE($5, pdf_filename),
           is_active = COALESCE($6, is_active)
       WHERE id = $7
       RETURNING *`,
      [category_id, title, description, pdf_url, pdf_filename, is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Article not found' });
    }

    res.json({
      success: true,
      message: 'Article updated successfully',
      article: result.rows[0]
    });
  } catch (error) {
    console.error('Update article error:', error);
    res.status(500).json({ error: 'Server error updating article' });
  }
};

// Delete article
exports.deleteArticle = async (req, res) => {
  try {
    const { id } = req.params;

    // Segments will be deleted automatically due to CASCADE
    const result = await pool.query(
      'DELETE FROM podcast_articles WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Article not found' });
    }

    res.json({
      success: true,
      message: 'Article and associated segments deleted successfully'
    });
  } catch (error) {
    console.error('Delete article error:', error);
    res.status(500).json({ error: 'Server error deleting article' });
  }
};

// ============================================
// PODCAST SEGMENTS
// ============================================

// Get segments for an article
exports.getSegments = async (req, res) => {
  try {
    const { article_id } = req.params;

    const result = await pool.query(
      'SELECT * FROM podcast_segments WHERE article_id = $1 ORDER BY segment_order ASC',
      [article_id]
    );

    res.json({ success: true, segments: result.rows });
  } catch (error) {
    console.error('Get segments error:', error);
    res.status(500).json({ error: 'Server error fetching segments' });
  }
};

// Create segment
exports.createSegment = async (req, res) => {
  try {
    const { article_id, host_number, segment_order, content } = req.body;

    if (!article_id || !host_number || segment_order === undefined || !content) {
      return res.status(400).json({ 
        error: 'Article ID, host number, segment order, and content are required' 
      });
    }

    if (host_number !== 1 && host_number !== 2) {
      return res.status(400).json({ error: 'Host number must be 1 or 2' });
    }

    const result = await pool.query(
      `INSERT INTO podcast_segments (article_id, host_number, segment_order, content) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [article_id, host_number, segment_order, content]
    );

    res.json({
      success: true,
      message: 'Segment created successfully',
      segment: result.rows[0]
    });
  } catch (error) {
    console.error('Create segment error:', error);
    res.status(500).json({ error: 'Server error creating segment' });
  }
};

// Update segment
exports.updateSegment = async (req, res) => {
  try {
    const { id } = req.params;
    const { host_number, segment_order, content } = req.body;

    if (host_number && host_number !== 1 && host_number !== 2) {
      return res.status(400).json({ error: 'Host number must be 1 or 2' });
    }

    const result = await pool.query(
      `UPDATE podcast_segments 
       SET host_number = COALESCE($1, host_number),
           segment_order = COALESCE($2, segment_order),
           content = COALESCE($3, content)
       WHERE id = $4
       RETURNING *`,
      [host_number, segment_order, content, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Segment not found' });
    }

    res.json({
      success: true,
      message: 'Segment updated successfully',
      segment: result.rows[0]
    });
  } catch (error) {
    console.error('Update segment error:', error);
    res.status(500).json({ error: 'Server error updating segment' });
  }
};

// Delete segment
exports.deleteSegment = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM podcast_segments WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Segment not found' });
    }

    res.json({
      success: true,
      message: 'Segment deleted successfully'
    });
  } catch (error) {
    console.error('Delete segment error:', error);
    res.status(500).json({ error: 'Server error deleting segment' });
  }
};

// Bulk create/update segments for an article
exports.bulkUpdateSegments = async (req, res) => {
  try {
    const { article_id } = req.params;
    const { segments } = req.body;

    if (!segments || !Array.isArray(segments)) {
      return res.status(400).json({ error: 'Segments array is required' });
    }

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Delete existing segments for this article
      await client.query('DELETE FROM podcast_segments WHERE article_id = $1', [article_id]);

      // Insert new segments
      for (const segment of segments) {
        const { host_number, segment_order, content } = segment;
        
        if (!host_number || segment_order === undefined || !content) {
          throw new Error('Each segment must have host_number, segment_order, and content');
        }

        if (host_number !== 1 && host_number !== 2) {
          throw new Error('Host number must be 1 or 2');
        }

        await client.query(
          `INSERT INTO podcast_segments (article_id, host_number, segment_order, content) 
           VALUES ($1, $2, $3, $4)`,
          [article_id, host_number, segment_order, content]
        );
      }

      await client.query('COMMIT');

      // Fetch updated segments
      const result = await pool.query(
        'SELECT * FROM podcast_segments WHERE article_id = $1 ORDER BY segment_order ASC',
        [article_id]
      );

      res.json({
        success: true,
        message: 'Segments updated successfully',
        segments: result.rows
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Bulk update segments error:', error);
    res.status(500).json({ error: error.message || 'Server error updating segments' });
  }
};

// ============================================
// AI INTERACTION
// ============================================

// Generate AI response for voice interaction
exports.generateAIResponse = async (req, res) => {
  try {
    const { article_id, user_question, conversation_history } = req.body;

    if (!article_id || !user_question) {
      return res.status(400).json({ error: 'Article ID and user question are required' });
    }

    // Get article and segments for context
    const articleResult = await pool.query(
      'SELECT * FROM podcast_articles WHERE id = $1',
      [article_id]
    );

    if (articleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Article not found' });
    }

    const segmentsResult = await pool.query(
      'SELECT * FROM podcast_segments WHERE article_id = $1 ORDER BY segment_order ASC',
      [article_id]
    );

    const article = articleResult.rows[0];
    const segments = segmentsResult.rows;

    // Build context for AI
    const context = {
      article_title: article.title,
      article_description: article.description,
      conversation_segments: segments.map(s => ({
        host: s.host_number,
        content: s.content
      })),
      conversation_history: conversation_history || []
    };

    // Initialize OpenAI

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    // Build conversation context for OpenAI
    const systemPrompt = `You are a knowledgeable and friendly AI assistant discussing the article "${context.article_title}". 

Article Description: ${context.article_description}

Conversation so far:
${context.conversation_segments.map(s => `Host ${s.host}: ${s.content}`).join('\n')}

Provide thoughtful, concise responses that continue the discussion naturally. Keep responses under 100 words.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...context.conversation_history,
      { role: 'user', content: user_question }
    ];

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: messages,
      max_tokens: 150,
      temperature: 0.7
    });

    const aiResponse = completion.choices[0].message.content;

    res.json({
      success: true,
      ai_response: aiResponse
    });
  } catch (error) {
    console.error('Generate AI response error:', error);
    res.status(500).json({ error: 'Server error generating AI response' });
  }
};
