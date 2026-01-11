-- Create prayers table for storing generated prayers
CREATE TABLE IF NOT EXISTS prayers (
  id SERIAL PRIMARY KEY,
  category VARCHAR(255) NOT NULL,
  subcategory VARCHAR(255),
  title VARCHAR(500) NOT NULL,
  prayer_text TEXT NOT NULL,
  style VARCHAR(100),
  verses_used JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_prayers_category ON prayers(category);
CREATE INDEX IF NOT EXISTS idx_prayers_subcategory ON prayers(subcategory);
CREATE INDEX IF NOT EXISTS idx_prayers_style ON prayers(style);
CREATE INDEX IF NOT EXISTS idx_prayers_created_at ON prayers(created_at DESC);

-- Create unique constraint to avoid duplicate prayers
CREATE UNIQUE INDEX IF NOT EXISTS idx_prayers_unique 
ON prayers(category, subcategory, title, prayer_text);

-- Add comment
COMMENT ON TABLE prayers IS 'Stores AI-generated and curated prayers based on Bible verses and topics';
