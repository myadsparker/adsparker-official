import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// Check if user can perform an action based on usage limits
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { limit_type, project_id, daily_budget } = body;

    if (!limit_type) {
      return NextResponse.json(
        { error: 'Limit type is required' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get active subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // If no active subscription, check for active subscriptions (including monthly with trial)
    let activeSubscription = subscription;
    if (!subscription) {
      const { data: trial } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .or('plan_type.eq.free_trial,is_trial.eq.true,status.eq.active')
        .in('status', ['active', 'trial_expired', 'trialing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      activeSubscription = trial || null;
    }

    if (!activeSubscription) {
      return NextResponse.json({
        can_proceed: false,
        reason: 'no_subscription',
        message: 'No active subscription found. Please subscribe to continue.',
      });
    }

    // Check if trial is expired (for both free_trial plan and monthly plan with trial)
    if (
      activeSubscription.is_trial &&
      activeSubscription.trial_end_date &&
      new Date(activeSubscription.trial_end_date) < new Date()
    ) {
      // Update subscription status
      await supabase
        .from('subscriptions')
        .update({ status: 'trial_expired' })
        .eq('id', activeSubscription.id);

      return NextResponse.json({
        can_proceed: false,
        reason: 'trial_expired',
        message: 'Your free trial has expired. Please upgrade to continue.',
      });
    }

    // Get usage
    const { data: usage } = await supabase
      .from('subscription_usage')
      .select('*')
      .eq('user_id', user.id)
      .eq('subscription_id', activeSubscription.id)
      .single();

    if (!usage) {
      return NextResponse.json({
        can_proceed: true,
        subscription: activeSubscription,
        usage: null,
      });
    }

    let canProceed = true;
    let reason = '';
    let message = '';

    // Check specific limits
    switch (limit_type) {
      case 'projects':
        if (usage.max_projects !== null && usage.projects_count >= usage.max_projects) {
          canProceed = false;
          reason = 'project_limit_reached';
          message = `You've reached the limit of ${usage.max_projects} projects. Upgrade to continue.`;
        }
        break;

      case 'campaigns':
        if (usage.max_campaigns !== null && usage.campaigns_count >= usage.max_campaigns) {
          canProceed = false;
          reason = 'campaign_limit_reached';
          message = `You've reached the limit of ${usage.max_campaigns} campaigns. Upgrade to continue.`;
        }
        break;

      case 'ads_per_day':
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayISO = today.toISOString();
        const { count: adsToday } = await supabase
          .from('published_ads')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', todayISO);

        if (
          usage.max_ads_per_day !== null &&
          adsToday !== null &&
          adsToday >= usage.max_ads_per_day
        ) {
          canProceed = false;
          reason = 'daily_ads_limit_reached';
          message = `You've reached the daily limit of ${usage.max_ads_per_day} ads. Upgrade to continue.`;
        }
        break;

      case 'daily_budget':
        if (daily_budget && usage.daily_budget_cap !== null) {
          if (parseFloat(daily_budget) > parseFloat(usage.daily_budget_cap.toString())) {
            canProceed = false;
            reason = 'budget_limit_exceeded';
            message = `Daily budget cannot exceed $${usage.daily_budget_cap}. Upgrade to Enterprise for unlimited budget.`;
          }
        }
        break;

      case 'facebook_accounts':
        // Get user's connected Meta accounts count
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('meta_accounts')
          .eq('user_id', user.id)
          .single();

        const metaAccountsCount = profile?.meta_accounts?.length || 0;

        if (
          usage.max_facebook_accounts !== null &&
          metaAccountsCount >= usage.max_facebook_accounts
        ) {
          canProceed = false;
          reason = 'facebook_accounts_limit_reached';
          message = `You've reached the limit of ${usage.max_facebook_accounts} Facebook account(s). Upgrade to Enterprise for unlimited accounts.`;
        }
        break;
    }

    return NextResponse.json({
      can_proceed: canProceed,
      reason: reason || null,
      message: message || null,
      subscription: activeSubscription,
      usage: usage,
    });
  } catch (error) {
    console.error('Error checking usage:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

