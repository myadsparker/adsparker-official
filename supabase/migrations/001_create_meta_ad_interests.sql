-- Create meta_ad_interests table
CREATE TABLE IF NOT EXISTS meta_ad_interests (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on name for faster searches
CREATE INDEX IF NOT EXISTS idx_meta_ad_interests_name ON meta_ad_interests(name);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_meta_ad_interests_created_at ON meta_ad_interests(created_at);

-- Add comment to table
COMMENT ON TABLE meta_ad_interests IS 'Stores Meta ad interests with their IDs and names for targeting purposes';
