const pool = require('./config/database');

async function populateSampleData() {
  const client = await pool.connect();
  
  try {
    console.log('📦 Populating sample podcast data...');
    
    // Clear existing data
    await client.query('DELETE FROM podcast_segments');
    await client.query('DELETE FROM podcast_articles');
    await client.query('DELETE FROM podcast_categories');
    await client.query('ALTER SEQUENCE podcast_categories_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE podcast_articles_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE podcast_segments_id_seq RESTART WITH 1');
    
    // Insert categories
    const categoriesResult = await client.query(`
      INSERT INTO podcast_categories (name, color_code, description, display_order) VALUES
      ('Faith & Spirituality', '#8B5CF6', 'Exploring the depths of faith and spiritual growth', 1),
      ('Bible Study', '#3B82F6', 'In-depth analysis of scripture and biblical teachings', 2),
      ('Prayer & Worship', '#EC4899', 'Guidance on prayer life and worship practices', 3)
      RETURNING id;
    `);
    console.log(`✅ Created ${categoriesResult.rowCount} categories`);
    
    const categoryIds = categoriesResult.rows.map(r => r.id);
    
    // Insert articles
    const articlesResult = await client.query(`
      INSERT INTO podcast_articles (category_id, title, description) VALUES
      ($1, 'Walking with God in Daily Life', 'Discover practical ways to maintain a close relationship with God throughout your everyday activities'),
      ($2, 'Understanding the Sermon on the Mount', 'A deep dive into Jesus'' teachings on the mountain and their relevance today'),
      ($1, 'The Power of Faith in Difficult Times', 'How faith sustains us through life''s greatest challenges'),
      ($3, 'Developing a Meaningful Prayer Life', 'Transform your prayer practice from routine to relationship')
      RETURNING id;
    `, [categoryIds[0], categoryIds[1], categoryIds[0], categoryIds[2]]);
    console.log(`✅ Created ${articlesResult.rowCount} articles`);
    
    const articleIds = articlesResult.rows.map(r => r.id);
    
    // Insert segments for first article
    await client.query(`
      INSERT INTO podcast_segments (article_id, host_number, segment_order, content) VALUES
      ($1, 1, 1, 'Welcome everyone! Today we''re exploring something incredibly practical - how to walk with God in our daily lives. You know, it''s easy to feel spiritual on Sunday morning, but what about Monday afternoon?'),
      ($1, 2, 2, 'That''s such an important question! I think many believers struggle with this disconnect. We have these mountaintop experiences, but then everyday life feels so... ordinary. How do we bridge that gap?'),
      ($1, 1, 3, 'Great point! I believe it starts with recognizing that God is present in the ordinary. Brother Lawrence, in "The Practice of the Presence of God," talked about finding God while washing dishes. It''s about cultivating awareness.'),
      ($1, 2, 4, 'Yes! And scripture supports this beautifully. In 1 Thessalonians 5:17, Paul tells us to "pray without ceasing." That doesn''t mean we''re on our knees all day - it means maintaining an ongoing conversation with God throughout our activities.')
    `, [articleIds[0]]);
    
    // Insert segments for second article
    await client.query(`
      INSERT INTO podcast_segments (article_id, host_number, segment_order, content) VALUES
      ($1, 1, 1, 'Today we''re diving into one of the most powerful teachings in all of scripture - the Sermon on the Mount. Found in Matthew chapters 5 through 7, this sermon represents the core of Jesus'' ethical teachings.'),
      ($1, 2, 2, 'It''s remarkable how revolutionary these teachings were - and still are! The Beatitudes alone turn worldly values completely upside down. "Blessed are the meek, for they shall inherit the earth." That''s not what the Roman Empire was teaching!'),
      ($1, 1, 3, 'Absolutely! And what strikes me is how practical Jesus makes it. He''s not just giving abstract theology - he''s telling us how to actually live. How to handle anger, how to pray, how to deal with worry.'),
      ($1, 2, 4, 'The Lord''s Prayer is right there in this sermon! It''s become so familiar that we sometimes forget how radical it was. Jesus is teaching us to approach God as "Our Father" - intimate, personal, accessible.')
    `, [articleIds[1]]);
    
    // Insert segments for third article
    await client.query(`
      INSERT INTO podcast_segments (article_id, host_number, segment_order, content) VALUES
      ($1, 1, 1, 'We''re talking today about something we all face - difficult times. And specifically, how our faith sustains us through those valleys. Because let''s be honest, life can be really hard sometimes.'),
      ($1, 2, 2, 'It really can. And I think it''s important to acknowledge that having faith doesn''t mean we won''t face difficulties. Jesus himself said, "In this world you will have trouble." But he didn''t stop there - he said "But take heart! I have overcome the world."'),
      ($1, 1, 3, 'That''s the key, isn''t it? Our faith isn''t about avoiding storms - it''s about having an anchor in the storm. Hebrews 6:19 calls hope "an anchor for the soul, firm and secure."'),
      ($1, 2, 4, 'And we see this throughout scripture. Think of Job, who lost everything but held onto God. Or Joseph, who was betrayed and imprisoned but trusted God''s plan. Their stories teach us that faith isn''t the absence of suffering - it''s the presence of God in our suffering.')
    `, [articleIds[2]]);
    
    // Insert segments for fourth article
    await client.query(`
      INSERT INTO podcast_segments (article_id, host_number, segment_order, content) VALUES
      ($1, 1, 1, 'Prayer is one of those things that every Christian knows is important, but many of us struggle with. Today we''re exploring how to move from prayer as a duty to prayer as a relationship.'),
      ($1, 2, 2, 'That''s such a crucial distinction! I think many people approach prayer like it''s a cosmic vending machine - insert request, receive blessing. But prayer is so much more than that.'),
      ($1, 1, 3, 'Exactly! Prayer is conversation with God. It''s relationship. And like any relationship, it requires time, honesty, and consistency. The disciples recognized this - they asked Jesus, "Lord, teach us to pray."')
    `, [articleIds[3]]);
    
    console.log('✅ Created sample podcast segments');
    
    // Get counts
    const categoriesCount = await client.query('SELECT COUNT(*) FROM podcast_categories');
    const articlesCount = await client.query('SELECT COUNT(*) FROM podcast_articles');
    const segmentsCount = await client.query('SELECT COUNT(*) FROM podcast_segments');
    
    console.log('🎉 Sample data population complete!');
    
    return {
      success: true,
      message: '✅ Sample data populated successfully!',
      counts: {
        categories: parseInt(categoriesCount.rows[0].count),
        articles: parseInt(articlesCount.rows[0].count),
        segments: parseInt(segmentsCount.rows[0].count)
      }
    };
    
  } catch (error) {
    console.error('❌ Sample data population error:', error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { populateSampleData };
