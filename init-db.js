const pool = require('./config/database');

async function initDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Creating VIP Podcast database tables...');
    
    // Create podcast_categories table
    await client.query(`
      CREATE TABLE IF NOT EXISTS podcast_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        color_code VARCHAR(7) NOT NULL,
        description TEXT,
        display_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ podcast_categories table created');
    
    // Create podcast_articles table
    await client.query(`
      CREATE TABLE IF NOT EXISTS podcast_articles (
        id SERIAL PRIMARY KEY,
        category_id INTEGER NOT NULL REFERENCES podcast_categories(id) ON DELETE CASCADE,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        pdf_url TEXT,
        pdf_filename VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ podcast_articles table created');
    
    // Create podcast_segments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS podcast_segments (
        id SERIAL PRIMARY KEY,
        article_id INTEGER NOT NULL REFERENCES podcast_articles(id) ON DELETE CASCADE,
        host_number INTEGER NOT NULL CHECK (host_number IN (1, 2)),
        segment_order INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(article_id, segment_order)
      );
    `);
    console.log('✅ podcast_segments table created');
    
    console.log('🎉 Database initialization complete!');
    return { success: true, message: '✅ Database tables created successfully! VIP Podcast system is ready.' };
    
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { initDatabase };
