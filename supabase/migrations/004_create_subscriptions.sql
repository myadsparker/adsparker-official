-- Create subscriptions table for tracking user plans and trials
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('free_trial', 'monthly', 'annual', 'enterprise')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'trial_expired')),
  
  -- Trial information
  trial_start_date TIMESTAMP WITH TIME ZONE,
  trial_end_date TIMESTAMP WITH TIME ZONE,
  is_trial BOOLEAN DEFAULT FALSE,
  
  -- Billing information
  card_required BOOLEAN DEFAULT FALSE,
  card_added BOOLEAN DEFAULT FALSE,
  billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'annual')),
  amount DECIMAL(10, 2),
  currency TEXT DEFAULT 'USD',
  
  -- Subscription dates
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  auto_renew BOOLEAN DEFAULT TRUE,
  
  -- Payment provider information
  payment_provider TEXT, -- 'stripe', 'paypal', etc.
  payment_provider_subscription_id TEXT,
  payment_provider_customer_id TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, plan_type, status) -- One active subscription per plan type per user
);

-- Create subscription_usage table for tracking usage limits
CREATE TABLE IF NOT EXISTS public.subscription_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  
  -- Usage tracking
  projects_count INTEGER DEFAULT 0,
  campaigns_count INTEGER DEFAULT 0,
  ads_published_count INTEGER DEFAULT 0,
  
  -- Limits based on plan
  max_projects INTEGER,
  max_campaigns INTEGER,
  max_ads_per_day INTEGER,
  max_facebook_accounts INTEGER DEFAULT 1,
  daily_budget_cap DECIMAL(10, 2) DEFAULT 150.00,
  
  -- Reset period
  usage_period_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  usage_period_end TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, subscription_id)
);

-- Create published_ads table for tracking published ads
CREATE TABLE IF NOT EXISTS public.published_ads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  
  -- Ad information
  campaign_name TEXT,
  ad_set_id TEXT,
  ad_account_id TEXT,
  daily_budget DECIMAL(10, 2),
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'failed', 'cancelled')),
  published_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.published_ads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON public.subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
  ON public.subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions"
  ON public.subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for subscription_usage
CREATE POLICY "Users can view own usage"
  ON public.subscription_usage
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own usage"
  ON public.subscription_usage
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage"
  ON public.subscription_usage
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for published_ads
CREATE POLICY "Users can view own published ads"
  ON public.published_ads
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own published ads"
  ON public.published_ads
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own published ads"
  ON public.published_ads
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_type ON public.subscriptions(plan_type);
CREATE INDEX IF NOT EXISTS idx_subscriptions_active ON public.subscriptions(user_id, status) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_subscription_usage_user_id ON public.subscription_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_usage_subscription_id ON public.subscription_usage(subscription_id);

CREATE INDEX IF NOT EXISTS idx_published_ads_user_id ON public.published_ads(user_id);
CREATE INDEX IF NOT EXISTS idx_published_ads_project_id ON public.published_ads(project_id);
CREATE INDEX IF NOT EXISTS idx_published_ads_status ON public.published_ads(status);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update updated_at
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_subscription_updated_at();

CREATE TRIGGER update_subscription_usage_updated_at
  BEFORE UPDATE ON public.subscription_usage
  FOR EACH ROW
  EXECUTE FUNCTION public.update_subscription_updated_at();

CREATE TRIGGER update_published_ads_updated_at
  BEFORE UPDATE ON public.published_ads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_subscription_updated_at();

-- Function to automatically create subscription usage when subscription is created
CREATE OR REPLACE FUNCTION public.create_subscription_usage()
RETURNS TRIGGER AS $$
DECLARE
  max_projects_val INTEGER;
  max_campaigns_val INTEGER;
  max_ads_per_day_val INTEGER;
  max_facebook_accounts_val INTEGER;
  daily_budget_cap_val DECIMAL(10, 2);
  period_end TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Set limits based on plan type
  CASE NEW.plan_type
    WHEN 'free_trial' THEN
      max_projects_val := 5;
      max_campaigns_val := 5;
      max_ads_per_day_val := 5;
      max_facebook_accounts_val := 1;
      daily_budget_cap_val := 150.00;
    WHEN 'monthly' THEN
      max_projects_val := NULL; -- Unlimited
      max_campaigns_val := NULL; -- Unlimited
      max_ads_per_day_val := NULL; -- Unlimited
      max_facebook_accounts_val := 1;
      daily_budget_cap_val := 150.00;
    WHEN 'annual' THEN
      max_projects_val := NULL; -- Unlimited
      max_campaigns_val := NULL; -- Unlimited
      max_ads_per_day_val := NULL; -- Unlimited
      max_facebook_accounts_val := 1;
      daily_budget_cap_val := 150.00;
    WHEN 'enterprise' THEN
      max_projects_val := NULL; -- Unlimited
      max_campaigns_val := NULL; -- Unlimited
      max_ads_per_day_val := NULL; -- Unlimited
      max_facebook_accounts_val := NULL; -- Unlimited
      daily_budget_cap_val := NULL; -- No cap
    ELSE
      max_projects_val := 5;
      max_campaigns_val := 5;
      max_ads_per_day_val := 5;
      max_facebook_accounts_val := 1;
      daily_budget_cap_val := 150.00;
  END CASE;

  -- Set usage period end date
  IF NEW.plan_type = 'free_trial' AND NEW.trial_end_date IS NOT NULL THEN
    period_end := NEW.trial_end_date;
  ELSIF NEW.billing_cycle = 'annual' AND NEW.end_date IS NOT NULL THEN
    period_end := NEW.end_date;
  ELSE
    period_end := (NOW() + INTERVAL '1 month');
  END IF;

  INSERT INTO public.subscription_usage (
    user_id,
    subscription_id,
    max_projects,
    max_campaigns,
    max_ads_per_day,
    max_facebook_accounts,
    daily_budget_cap,
    usage_period_start,
    usage_period_end
  ) VALUES (
    NEW.user_id,
    NEW.id,
    max_projects_val,
    max_campaigns_val,
    max_ads_per_day_val,
    max_facebook_accounts_val,
    daily_budget_cap_val,
    NOW(),
    period_end
  ) ON CONFLICT (user_id, subscription_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create usage tracking when subscription is created
CREATE TRIGGER create_subscription_usage_trigger
  AFTER INSERT ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.create_subscription_usage();

-- Function to check if user has reached usage limits
CREATE OR REPLACE FUNCTION public.check_usage_limits(
  p_user_id UUID,
  p_limit_type TEXT -- 'projects', 'campaigns', 'ads_per_day'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_subscription RECORD;
  v_usage RECORD;
  v_count INTEGER;
  v_limit INTEGER;
BEGIN
  -- Get active subscription
  SELECT * INTO v_subscription
  FROM public.subscriptions
  WHERE user_id = p_user_id
    AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    -- No active subscription, check for free trial
    SELECT * INTO v_subscription
    FROM public.subscriptions
    WHERE user_id = p_user_id
      AND plan_type = 'free_trial'
      AND status IN ('active', 'trial_expired')
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  IF NOT FOUND THEN
    RETURN FALSE; -- No subscription, deny access
  END IF;

  -- Get usage
  SELECT * INTO v_usage
  FROM public.subscription_usage
  WHERE user_id = p_user_id
    AND subscription_id = v_subscription.id;

  IF NOT FOUND THEN
    RETURN TRUE; -- No usage tracking, allow
  END IF;

  -- Check specific limit
  CASE p_limit_type
    WHEN 'projects' THEN
      v_count := v_usage.projects_count;
      v_limit := v_usage.max_projects;
    WHEN 'campaigns' THEN
      v_count := v_usage.campaigns_count;
      v_limit := v_usage.max_campaigns;
    WHEN 'ads_per_day' THEN
      SELECT COUNT(*) INTO v_count
      FROM public.published_ads
      WHERE user_id = p_user_id
        AND DATE(created_at) = CURRENT_DATE;
      v_limit := v_usage.max_ads_per_day;
    ELSE
      RETURN TRUE;
  END CASE;

  -- If limit is NULL, it means unlimited
  IF v_limit IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Check if count exceeds limit
  IF v_count >= v_limit THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

