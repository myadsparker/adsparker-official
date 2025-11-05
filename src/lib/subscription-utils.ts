// Utility functions for subscription management and checks

export type PlanType = 'free_trial' | 'monthly' | 'annual' | 'enterprise';
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'trial_expired';

export interface Subscription {
  id: string;
  user_id: string;
  plan_type: PlanType;
  status: SubscriptionStatus;
  trial_start_date?: string;
  trial_end_date?: string;
  is_trial: boolean;
  card_required: boolean;
  card_added: boolean;
  billing_cycle?: 'monthly' | 'annual';
  amount?: number;
  currency: string;
  start_date: string;
  end_date?: string;
  cancelled_at?: string;
  auto_renew: boolean;
  payment_provider?: string;
  payment_provider_subscription_id?: string;
  payment_provider_customer_id?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionUsage {
  id: string;
  user_id: string;
  subscription_id: string;
  projects_count: number;
  campaigns_count: number;
  ads_published_count: number;
  max_projects?: number;
  max_campaigns?: number;
  max_ads_per_day?: number;
  max_facebook_accounts?: number;
  daily_budget_cap?: number;
  usage_period_start: string;
  usage_period_end?: string;
  created_at: string;
  updated_at: string;
}

// Plan limits configuration
export const PLAN_LIMITS = {
  free_trial: {
    max_projects: 5,
    max_campaigns: 5,
    max_ads_per_day: 5,
    max_facebook_accounts: 1,
    daily_budget_cap: 150,
    card_required: true,
    trial_days: 7,
    price: 199, // Price after trial
  },
  monthly: {
    max_projects: null, // Unlimited
    max_campaigns: null, // Unlimited
    max_ads_per_day: null, // Unlimited
    max_facebook_accounts: 1,
    daily_budget_cap: 150,
    card_required: true,
    price: 199,
  },
  annual: {
    max_projects: null, // Unlimited
    max_campaigns: null, // Unlimited
    max_ads_per_day: null, // Unlimited
    max_facebook_accounts: 1,
    daily_budget_cap: 150,
    card_required: true,
    price: 1308, // $109/month * 12
    monthly_equivalent: 109,
  },
  enterprise: {
    max_projects: null, // Unlimited
    max_campaigns: null, // Unlimited
    max_ads_per_day: null, // Unlimited
    max_facebook_accounts: null, // Unlimited
    daily_budget_cap: null, // No cap
    card_required: true,
    price: null, // Custom pricing
  },
};

/**
 * Check if a subscription is active
 */
export function isSubscriptionActive(subscription: Subscription | null): boolean {
  if (!subscription) return false;
  return subscription.status === 'active';
}

/**
 * Check if a trial is expired
 */
export function isTrialExpired(subscription: Subscription | null): boolean {
  if (!subscription || subscription.plan_type !== 'free_trial') return false;
  if (!subscription.trial_end_date) return false;
  return new Date(subscription.trial_end_date) < new Date();
}

/**
 * Check if user can create more projects
 */
export function canCreateProject(
  subscription: Subscription | null,
  usage: SubscriptionUsage | null
): { can: boolean; reason?: string; message?: string } {
  if (!subscription || !isSubscriptionActive(subscription)) {
    return {
      can: false,
      reason: 'no_subscription',
      message: 'No active subscription found. Please subscribe to continue.',
    };
  }

  if (isTrialExpired(subscription)) {
    return {
      can: false,
      reason: 'trial_expired',
      message: 'Your free trial has expired. Please upgrade to continue.',
    };
  }

  if (!usage) {
    return { can: true };
  }

  if (usage.max_projects !== null && usage.projects_count >= usage.max_projects) {
    return {
      can: false,
      reason: 'project_limit_reached',
      message: `You've reached the limit of ${usage.max_projects} projects. Upgrade to continue.`,
    };
  }

  return { can: true };
}

/**
 * Check if user can publish more ads today
 */
export function canPublishAdsToday(
  subscription: Subscription | null,
  usage: SubscriptionUsage | null,
  adsToday: number
): { can: boolean; reason?: string; message?: string } {
  if (!subscription || !isSubscriptionActive(subscription)) {
    return {
      can: false,
      reason: 'no_subscription',
      message: 'No active subscription found. Please subscribe to continue.',
    };
  }

  if (isTrialExpired(subscription)) {
    return {
      can: false,
      reason: 'trial_expired',
      message: 'Your free trial has expired. Please upgrade to continue.',
    };
  }

  if (!usage) {
    return { can: true };
  }

  if (usage.max_ads_per_day !== null && adsToday >= usage.max_ads_per_day) {
    return {
      can: false,
      reason: 'daily_ads_limit_reached',
      message: `You've reached the daily limit of ${usage.max_ads_per_day} ads. Upgrade to continue.`,
    };
  }

  return { can: true };
}

/**
 * Check if daily budget is within limits
 */
export function isBudgetWithinLimit(
  subscription: Subscription | null,
  usage: SubscriptionUsage | null,
  dailyBudget: number
): { can: boolean; reason?: string; message?: string } {
  if (!subscription || !isSubscriptionActive(subscription)) {
    return {
      can: false,
      reason: 'no_subscription',
      message: 'No active subscription found. Please subscribe to continue.',
    };
  }

  if (isTrialExpired(subscription)) {
    return {
      can: false,
      reason: 'trial_expired',
      message: 'Your free trial has expired. Please upgrade to continue.',
    };
  }

  if (!usage) {
    return { can: true };
  }

  if (usage.daily_budget_cap !== null && dailyBudget > usage.daily_budget_cap) {
    return {
      can: false,
      reason: 'budget_limit_exceeded',
      message: `Daily budget cannot exceed $${usage.daily_budget_cap}. Upgrade to Enterprise for unlimited budget.`,
    };
  }

  return { can: true };
}

/**
 * Get plan display name
 */
export function getPlanDisplayName(planType: PlanType): string {
  switch (planType) {
    case 'free_trial':
      return 'Free Trial (7 Days)';
    case 'monthly':
      return 'Monthly Plan';
    case 'annual':
      return 'Annual Plan';
    case 'enterprise':
      return 'Enterprise Plan';
    default:
      return planType;
  }
}

/**
 * Get plan price display
 */
export function getPlanPriceDisplay(planType: PlanType): string {
  const plan = PLAN_LIMITS[planType];
  if (planType === 'annual') {
    return `$${plan.monthly_equivalent}/month (billed annually at $${plan.price})`;
  }
  if (planType === 'enterprise') {
    return 'Custom pricing';
  }
  return `$${plan.price}/month`;
}

/**
 * Get remaining trial days
 */
export function getRemainingTrialDays(subscription: Subscription | null): number | null {
  if (!subscription || subscription.plan_type !== 'free_trial' || !subscription.trial_end_date) {
    return null;
  }

  const endDate = new Date(subscription.trial_end_date);
  const now = new Date();
  const diffTime = endDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays > 0 ? diffDays : 0;
}

