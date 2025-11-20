import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// Track ad publication and update usage
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      project_id,
      campaign_name,
      ad_set_id,
      ad_account_id,
      daily_budget,
      metadata = {},
    } = body;

    if (!project_id) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

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
      return NextResponse.json(
        {
          error: 'No active subscription found',
          message: 'Please subscribe to publish ads.',
        },
        { status: 403 }
      );
    }

    // Create published ad record
    const { data: publishedAd, error: publishError } = await supabase
      .from('published_ads')
      .insert({
        user_id: user.id,
        project_id,
        subscription_id: activeSubscription.id,
        campaign_name: campaign_name || null,
        ad_set_id: ad_set_id || null,
        ad_account_id: ad_account_id || null,
        daily_budget: daily_budget ? parseFloat(daily_budget) : null,
        status: 'published',
        published_at: new Date().toISOString(),
        metadata,
      })
      .select()
      .single();

    if (publishError) {
      console.error('Error publishing ad:', publishError);
      return NextResponse.json(
        { error: 'Failed to track ad publication' },
        { status: 500 }
      );
    }

    // Update usage counts
    const { data: usage } = await supabase
      .from('subscription_usage')
      .select('*')
      .eq('user_id', user.id)
      .eq('subscription_id', activeSubscription.id)
      .single();

    if (usage) {
      // Increment ads published count
      await supabase
        .from('subscription_usage')
        .update({
          ads_published_count: (usage.ads_published_count || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', usage.id);
    }

    return NextResponse.json({
      success: true,
      published_ad: publishedAd,
      subscription: activeSubscription,
    });
  } catch (error) {
    console.error('Error publishing ad:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

