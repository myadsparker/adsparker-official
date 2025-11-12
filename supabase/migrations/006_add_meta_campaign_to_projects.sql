-- Add Meta campaign tracking columns to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS meta_campaign_id TEXT,
ADD COLUMN IF NOT EXISTS meta_campaign_name TEXT;

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_projects_meta_campaign_id ON projects(meta_campaign_id);

-- Add comments to the columns
COMMENT ON COLUMN projects.meta_campaign_id IS 'Stores the Meta (Facebook) campaign ID after publishing';
COMMENT ON COLUMN projects.meta_campaign_name IS 'Stores the Meta (Facebook) campaign name';

