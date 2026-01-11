-- Create Bible versions table
CREATE TABLE IF NOT EXISTS bible_versions (
  id SERIAL PRIMARY KEY,
  code VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  language VARCHAR(100) NOT NULL,
  description TEXT,
  copyright TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Bible books table
CREATE TABLE IF NOT EXISTS bible_books (
  id SERIAL PRIMARY KEY,
  code VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  testament VARCHAR(2) NOT NULL CHECK (testament IN ('OT', 'NT')),
  book_number INTEGER NOT NULL,
  chapter_count INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Bible verses table
CREATE TABLE IF NOT EXISTS bible_verses (
  id SERIAL PRIMARY KEY,
  version_id INTEGER NOT NULL REFERENCES bible_versions(id) ON DELETE CASCADE,
  book_id INTEGER NOT NULL REFERENCES bible_books(id) ON DELETE CASCADE,
  chapter INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(version_id, book_id, chapter, verse)
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_bible_verses_version ON bible_verses(version_id);
CREATE INDEX IF NOT EXISTS idx_bible_verses_book ON bible_verses(book_id);
CREATE INDEX IF NOT EXISTS idx_bible_verses_chapter ON bible_verses(chapter);
CREATE INDEX IF NOT EXISTS idx_bible_verses_verse ON bible_verses(verse);
CREATE INDEX IF NOT EXISTS idx_bible_verses_lookup ON bible_verses(version_id, book_id, chapter, verse);
CREATE INDEX IF NOT EXISTS idx_bible_books_code ON bible_books(code);
CREATE INDEX IF NOT EXISTS idx_bible_versions_code ON bible_versions(code);

-- Full text search index for verse content
CREATE INDEX IF NOT EXISTS idx_bible_verses_text_search ON bible_verses USING gin(to_tsvector('english', text));

-- Insert Nigerian Pidgin version
INSERT INTO bible_versions (code, name, language, description, copyright, is_active)
VALUES (
  'PCM',
  'Holy Bible Nigerian Pidgin English',
  'Nigerian Pidgin',
  'The Holy Bible in Nigerian Pidgin English, making Scripture accessible to millions of Nigerian Pidgin speakers.',
  '© 2019 Wycliffe Bible Translators, Inc. in cooperation with The Nigerian Pidgin Translation Committee',
  true
) ON CONFLICT (code) DO NOTHING;

-- Insert Bible books (Old Testament)
INSERT INTO bible_books (code, name, testament, book_number, chapter_count) VALUES
('GEN', 'Genesis', 'OT', 1, 50),
('EXO', 'Exodus', 'OT', 2, 40),
('LEV', 'Leviticus', 'OT', 3, 27),
('NUM', 'Numbers', 'OT', 4, 36),
('DEU', 'Deuteronomy', 'OT', 5, 34),
('JOS', 'Joshua', 'OT', 6, 24),
('JDG', 'Judges', 'OT', 7, 21),
('RUT', 'Ruth', 'OT', 8, 4),
('1SA', '1 Samuel', 'OT', 9, 31),
('2SA', '2 Samuel', 'OT', 10, 24),
('1KI', '1 Kings', 'OT', 11, 22),
('2KI', '2 Kings', 'OT', 12, 25),
('1CH', '1 Chronicles', 'OT', 13, 29),
('2CH', '2 Chronicles', 'OT', 14, 36),
('EZR', 'Ezra', 'OT', 15, 10),
('NEH', 'Nehemiah', 'OT', 16, 13),
('EST', 'Esther', 'OT', 17, 10),
('JOB', 'Job', 'OT', 18, 42),
('PSA', 'Psalms', 'OT', 19, 150),
('PRO', 'Proverbs', 'OT', 20, 31),
('ECC', 'Ecclesiastes', 'OT', 21, 12),
('SNG', 'Song of Solomon', 'OT', 22, 8),
('ISA', 'Isaiah', 'OT', 23, 66),
('JER', 'Jeremiah', 'OT', 24, 52),
('LAM', 'Lamentations', 'OT', 25, 5),
('EZK', 'Ezekiel', 'OT', 26, 48),
('DAN', 'Daniel', 'OT', 27, 12),
('HOS', 'Hosea', 'OT', 28, 14),
('JOL', 'Joel', 'OT', 29, 3),
('AMO', 'Amos', 'OT', 30, 9),
('OBA', 'Obadiah', 'OT', 31, 1),
('JON', 'Jonah', 'OT', 32, 4),
('MIC', 'Micah', 'OT', 33, 7),
('NAM', 'Nahum', 'OT', 34, 3),
('HAB', 'Habakkuk', 'OT', 35, 3),
('ZEP', 'Zephaniah', 'OT', 36, 3),
('HAG', 'Haggai', 'OT', 37, 2),
('ZEC', 'Zechariah', 'OT', 38, 14),
('MAL', 'Malachi', 'OT', 39, 4)
ON CONFLICT (code) DO NOTHING;

-- Insert Bible books (New Testament)
INSERT INTO bible_books (code, name, testament, book_number, chapter_count) VALUES
('MAT', 'Matthew', 'NT', 40, 28),
('MRK', 'Mark', 'NT', 41, 16),
('LUK', 'Luke', 'NT', 42, 24),
('JHN', 'John', 'NT', 43, 21),
('ACT', 'Acts', 'NT', 44, 28),
('ROM', 'Romans', 'NT', 45, 16),
('1CO', '1 Corinthians', 'NT', 46, 16),
('2CO', '2 Corinthians', 'NT', 47, 13),
('GAL', 'Galatians', 'NT', 48, 6),
('EPH', 'Ephesians', 'NT', 49, 6),
('PHP', 'Philippians', 'NT', 50, 4),
('COL', 'Colossians', 'NT', 51, 4),
('1TH', '1 Thessalonians', 'NT', 52, 5),
('2TH', '2 Thessalonians', 'NT', 53, 3),
('1TI', '1 Timothy', 'NT', 54, 6),
('2TI', '2 Timothy', 'NT', 55, 4),
('TIT', 'Titus', 'NT', 56, 3),
('PHM', 'Philemon', 'NT', 57, 1),
('HEB', 'Hebrews', 'NT', 58, 13),
('JAS', 'James', 'NT', 59, 5),
('1PE', '1 Peter', 'NT', 60, 5),
('2PE', '2 Peter', 'NT', 61, 3),
('1JN', '1 John', 'NT', 62, 5),
('2JN', '2 John', 'NT', 63, 1),
('3JN', '3 John', 'NT', 64, 1),
('JUD', 'Jude', 'NT', 65, 1),
('REV', 'Revelation', 'NT', 66, 22)
ON CONFLICT (code) DO NOTHING;

-- Add comments
COMMENT ON TABLE bible_versions IS 'Stores different Bible translations (KJV, NIV, ESV, PCM, etc.)';
COMMENT ON TABLE bible_books IS 'Stores the 66 books of the Bible with metadata';
COMMENT ON TABLE bible_verses IS 'Stores all Bible verses for all versions';
