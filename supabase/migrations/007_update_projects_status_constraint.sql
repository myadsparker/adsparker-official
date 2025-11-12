-- Update projects table status check constraint to include all valid statuses
-- First, drop the existing constraint if it exists
ALTER TABLE IF EXISTS public.projects 
DROP CONSTRAINT IF EXISTS projects_status_check;

-- Add the new constraint with all valid status values
ALTER TABLE IF EXISTS public.projects
ADD CONSTRAINT projects_status_check 
CHECK (status IS NULL OR status IN (
  'PENDING',
  'DRAFT',
  'draft',
  'RUNNING',
  'ACTIVE',
  'FINISHED',
  'COMPLETED',
  'finished',
  'FAILED',
  'CANCELLED'
));

-- Add comment to document the constraint
COMMENT ON CONSTRAINT projects_status_check ON public.projects IS 
'Allows status values: PENDING, DRAFT, RUNNING, ACTIVE, FINISHED, COMPLETED, FAILED, CANCELLED';

