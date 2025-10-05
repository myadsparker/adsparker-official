-- Add workflow_name column to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS workflow_name TEXT;

-- Add comment to the column
COMMENT ON COLUMN projects.workflow_name IS 'Stores comma-separated persona names for the project workflow';
