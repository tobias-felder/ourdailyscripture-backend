const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Mapping of file book codes to database book codes
const bookCodeMap = {
  'GEN': 'GEN', 'EXO': 'EXO', 'LEV': 'LEV', 'NUM': 'NUM', 'DEU': 'DEU',
  'JOS': 'JOS', 'JDG': 'JDG', 'RUT': 'RUT', '1SA': '1SA', '2SA': '2SA',
  '1KI': '1KI', '2KI': '2KI', '1CH': '1CH', '2CH': '2CH', 'EZR': 'EZR',
  'NEH': 'NEH', 'EST': 'EST', 'JOB': 'JOB', 'PSA': 'PSA', 'PRO': 'PRO',
  'ECC': 'ECC', 'SNG': 'SNG', 'ISA': 'ISA', 'JER': 'JER', 'LAM': 'LAM',
  'EZK': 'EZK', 'DAN': 'DAN', 'HOS': 'HOS', 'JOL': 'JOL', 'AMO': 'AMO',
  'OBA': 'OBA', 'JON': 'JON', 'MIC': 'MIC', 'NAM': 'NAM', 'HAB': 'HAB',
  'ZEP': 'ZEP', 'HAG': 'HAG', 'ZEC': 'ZEC', 'MAL': 'MAL',
  'MAT': 'MAT', 'MRK': 'MRK', 'LUK': 'LUK', 'JHN': 'JHN', 'ACT': 'ACT',
  'ROM': 'ROM', '1CO': '1CO', '2CO': '2CO', 'GAL': 'GAL', 'EPH': 'EPH',
  'PHP': 'PHP', 'COL': 'COL', '1TH': '1TH', '2TH': '2TH', '1TI': '1TI',
  '2TI': '2TI', 'TIT': 'TIT', 'PHM': 'PHM', 'HEB': 'HEB', 'JAS': 'JAS',
  '1PE': '1PE', '2PE': '2PE', '1JN': '1JN', '2JN': '2JN', '3JN': '3JN',
  'JUD': 'JUD', 'REV': 'REV'
};

async function importPCMBible() {
  try {
    console.log('🔄 Starting Nigerian Pidgin Bible import...\n');
    
    // Get version ID
    const versionResult = await pool.query(
      "SELECT id FROM bible_versions WHERE code = 'PCM'"
    );
    
    if (versionResult.rows.length === 0) {
      throw new Error('PCM version not found in database. Run migration first.');
    }
    
    const versionId = versionResult.rows[0].id;
    console.log(`✅ Found PCM version (ID: ${versionId})\n`);
    
    // Get all book IDs
    const booksResult = await pool.query(
      'SELECT id, code FROM bible_books ORDER BY book_number'
    );
    
    const bookIds = {};
    booksResult.rows.forEach(row => {
      bookIds[row.code] = row.id;
    });
    
    console.log(`✅ Found ${booksResult.rows.length} books in database\n`);
    
    // Read all PCM files
    const pcmDir = '/home/ubuntu/pcm_bible';
    const files = fs.readdirSync(pcmDir).filter(f => f.endsWith('_read.txt') && f.includes('_'));
    
    console.log(`📖 Found ${files.length} chapter files to import\n`);
    
    let totalVerses = 0;
    let processedFiles = 0;
    
    for (const file of files) {
      // Parse filename: pcm_002_GEN_01_read.txt
      const parts = file.split('_');
      if (parts.length < 4) continue;
      
      const bookCode = parts[2];
      const chapterNum = parseInt(parts[3]);
      
      if (!bookCodeMap[bookCode] || !bookIds[bookCodeMap[bookCode]]) {
        console.log(`⚠️  Skipping unknown book: ${bookCode}`);
        continue;
      }
      
      const bookId = bookIds[bookCodeMap[bookCode]];
      const filePath = path.join(pcmDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Parse verses from content
      const lines = content.split('\n').filter(l => l.trim());
      let verseNum = 0;
      let verseText = '';
      
      for (const line of lines) {
        const trimmed = line.trim();
        
        // Skip book name and chapter number lines
        if (trimmed.endsWith('.') && trimmed.length < 20) continue;
        
        // Check if line starts with a number (verse number)
        const match = trimmed.match(/^(\d+)\.\s*(.+)$/);
        
        if (match) {
          // Save previous verse if exists
          if (verseNum > 0 && verseText) {
            try {
              await pool.query(
                `INSERT INTO bible_verses (version_id, book_id, chapter, verse, text)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (version_id, book_id, chapter, verse) DO UPDATE
                 SET text = EXCLUDED.text`,
                [versionId, bookId, chapterNum, verseNum, verseText.trim()]
              );
              totalVerses++;
            } catch (err) {
              console.error(`Error inserting ${bookCode} ${chapterNum}:${verseNum}:`, err.message);
            }
          }
          
          // Start new verse
          verseNum = parseInt(match[1]);
          verseText = match[2];
        } else if (verseNum > 0) {
          // Continue previous verse
          verseText += ' ' + trimmed;
        }
      }
      
      // Save last verse
      if (verseNum > 0 && verseText) {
        try {
          await pool.query(
            `INSERT INTO bible_verses (version_id, book_id, chapter, verse, text)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (version_id, book_id, chapter, verse) DO UPDATE
             SET text = EXCLUDED.text`,
            [versionId, bookId, chapterNum, verseNum, verseText.trim()]
          );
          totalVerses++;
        } catch (err) {
          console.error(`Error inserting ${bookCode} ${chapterNum}:${verseNum}:`, err.message);
        }
      }
      
      processedFiles++;
      if (processedFiles % 100 === 0) {
        console.log(`📊 Progress: ${processedFiles}/${files.length} files, ${totalVerses} verses imported`);
      }
    }
    
    console.log(`\n✅ Import complete!`);
    console.log(`📖 Total files processed: ${processedFiles}`);
    console.log(`📝 Total verses imported: ${totalVerses}`);
    
    // Verify import
    const countResult = await pool.query(
      `SELECT COUNT(*) as count FROM bible_verses WHERE version_id = $1`,
      [versionId]
    );
    
    console.log(`\n🔍 Verification: ${countResult.rows[0].count} verses in database`);
    
    // Show sample verses
    const sampleResult = await pool.query(
      `SELECT b.name, v.chapter, v.verse, v.text
       FROM bible_verses v
       JOIN bible_books b ON v.book_id = b.id
       WHERE v.version_id = $1
       ORDER BY b.book_number, v.chapter, v.verse
       LIMIT 5`,
      [versionId]
    );
    
    console.log(`\n📚 Sample verses:`);
    sampleResult.rows.forEach(row => {
      console.log(`\n${row.name} ${row.chapter}:${row.verse}`);
      console.log(`"${row.text}"`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

importPCMBible();
