-- Add has_used_trial column to user_profiles table
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS has_used_trial BOOLEAN DEFAULT false;

-- Update existing users who have had a trial subscription
UPDATE user_profiles
SET has_used_trial = true
WHERE user_id IN (
  SELECT DISTINCT user_id
  FROM subscriptions
  WHERE plan_type = 'free_trial'
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_has_used_trial 
ON user_profiles(has_used_trial);

