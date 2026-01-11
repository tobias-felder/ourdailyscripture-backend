const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  try {
    console.log('🔄 Running Bible tables migration...\n');
    
    const sql = fs.readFileSync('./migrations/add-bible-tables.sql', 'utf8');
    
    await pool.query(sql);
    
    console.log('✅ Migration completed successfully!\n');
    
    // Verify tables
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('bible_versions', 'bible_books', 'bible_verses')
      ORDER BY table_name
    `);
    
    console.log('📊 Created tables:');
    result.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });
    
    // Check if PCM version was inserted
    const versionCheck = await pool.query(
      "SELECT * FROM bible_versions WHERE code = 'PCM'"
    );
    
    if (versionCheck.rows.length > 0) {
      console.log('\n✅ Nigerian Pidgin (PCM) version added:');
      console.log(`  Name: ${versionCheck.rows[0].name}`);
      console.log(`  Language: ${versionCheck.rows[0].language}`);
    }
    
    // Check books
    const booksCount = await pool.query('SELECT COUNT(*) as count FROM bible_books');
    console.log(`\n✅ ${booksCount.rows[0].count} Bible books added`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
