const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Book code mapping (PCM file number to standard book code)
const bookMapping = {
  '002': 'GEN', '003': 'EXO', '004': 'LEV', '005': 'NUM', '006': 'DEU',
  '007': 'JOS', '008': 'JDG', '009': 'RUT', '010': '1SA', '011': '2SA',
  '012': '1KI', '013': '2KI', '014': '1CH', '015': '2CH', '016': 'EZR',
  '017': 'NEH', '018': 'EST', '019': 'JOB', '020': 'PSA', '021': 'PRO',
  '022': 'ECC', '023': 'SNG', '024': 'ISA', '025': 'JER', '026': 'LAM',
  '027': 'EZK', '028': 'DAN', '029': 'HOS', '030': 'JOL', '031': 'AMO',
  '032': 'OBA', '033': 'JON', '034': 'MIC', '035': 'NAM', '036': 'HAB',
  '037': 'ZEP', '038': 'HAG', '039': 'ZEC', '040': 'MAL',
  '064': 'MAT', '065': 'MRK', '066': 'LUK', '073': 'JHN', '074': 'ACT',
  '075': 'ROM', '076': '1CO', '077': '2CO', '078': 'GAL', '079': 'EPH',
  '080': 'PHP', '081': 'COL', '082': '1TH', '083': '2TH', '084': '1TI',
  '085': '2TI', '086': 'TIT', '087': 'PHM', '088': 'HEB', '089': 'JAS',
  '090': '1PE', '091': '2PE', '092': '1JN', '093': '2JN', '094': '3JN',
  '095': 'JUD', '096': 'REV'
};

async function importPCMChapters() {
  try {
    console.log('Starting PCM Bible chapter import...');
    
    // Get version ID for PCM
    const versionResult = await pool.query(
      "SELECT id FROM bible_versions WHERE code = 'PCM'"
    );
    
    if (versionResult.rows.length === 0) {
      throw new Error('PCM version not found in database');
    }
    
    const versionId = versionResult.rows[0].id;
    console.log('PCM Version ID:', versionId);
    
    // Get book IDs
    const booksResult = await pool.query('SELECT id, code FROM bible_books ORDER BY book_number');
    const bookIds = {};
    booksResult.rows.forEach(row => { bookIds[row.code] = row.id; });
    
    // Find PCM Bible directory
    const pcmDir = path.join(__dirname, 'pcm_bible');
    if (!fs.existsSync(pcmDir)) {
      throw new Error('PCM Bible directory not found');
    }
    
    const files = fs.readdirSync(pcmDir).filter(f => f.endsWith('_read.txt') && f.includes('_'));
    console.log(`Found ${files.length} PCM chapter files`);
    
    let chaptersImported = 0;
    
    for (const file of files) {
      const parts = file.split('_');
      if (parts.length < 4) continue;
      
      const bookNum = parts[1];
      const bookCode = bookMapping[bookNum];
      const chapterNum = parseInt(parts[3].replace('.txt', '').replace('read', ''));
      
      if (!bookCode || !bookIds[bookCode] || isNaN(chapterNum)) {
        console.log(`Skipping ${file} - invalid format`);
        continue;
      }
      
      const bookId = bookIds[bookCode];
      const filePath = path.join(pcmDir, file);
      let content = fs.readFileSync(filePath, 'utf-8');
      
      // Clean up content
      content = content.trim();
      if (!content) continue;
      
      // Split into paragraphs (each paragraph is roughly a verse or group of verses)
      const paragraphs = content.split('\n').filter(p => p.trim().length > 0);
      
      // Store each paragraph as a "verse" (we'll use paragraph index as verse number)
      for (let i = 0; i < paragraphs.length; i++) {
        const verseNum = i + 1;
        const verseText = paragraphs[i].trim();
        
        if (!verseText) continue;
        
        try {
          await pool.query(
            `INSERT INTO bible_verses (version_id, book_id, chapter, verse, text)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (version_id, book_id, chapter, verse) DO UPDATE
             SET text = EXCLUDED.text`,
            [versionId, bookId, chapterNum, verseNum, verseText]
          );
        } catch (err) {
          console.error(`Error inserting ${bookCode} ${chapterNum}:${verseNum}:`, err.message);
        }
      }
      
      chaptersImported++;
      if (chaptersImported % 100 === 0) {
        console.log(`Imported ${chaptersImported} chapters...`);
      }
    }
    
    console.log(`✅ Import complete! ${chaptersImported} chapters imported.`);
    
    // Get sample verses
    const sampleResult = await pool.query(
      `SELECT bv.chapter, bv.verse, bv.text, bb.code as book_code
       FROM bible_verses bv
       JOIN bible_books bb ON bv.book_id = bb.id
       WHERE bv.version_id = $1 AND bb.code = 'JHN' AND bv.chapter = 3
       ORDER BY bv.verse
       LIMIT 5`,
      [versionId]
    );
    
    console.log('\nSample verses from John 3:');
    sampleResult.rows.forEach(row => {
      console.log(`${row.book_code} ${row.chapter}:${row.verse} - ${row.text.substring(0, 100)}...`);
    });
    
    return {
      success: true,
      chaptersImported,
      sampleVerses: sampleResult.rows
    };
    
  } catch (error) {
    console.error('Import error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  importPCMChapters()
    .then(result => {
      console.log('\n✅ Success!', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Error:', error);
      process.exit(1);
    });
}

module.exports = { importPCMChapters };
