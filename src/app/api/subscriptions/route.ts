import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// Get user's active subscription
export async function GET(request: NextRequest) {
  try {
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
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // If no active subscription, check for free trial
    if (!subscription || subError) {
      const { data: trial, error: trialError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .or('plan_type.eq.free_trial,is_trial.eq.true,status.eq.active')
        .in('status', ['active', 'trial_expired', 'trialing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (trial && !trialError) {
        // Get usage
        const { data: usage } = await supabase
          .from('subscription_usage')
          .select('*')
          .eq('user_id', user.id)
          .eq('subscription_id', trial.id)
          .single();

        return NextResponse.json({
          subscription: trial,
          usage: usage || null,
        });
      }

      return NextResponse.json({
        subscription: null,
        usage: null,
      });
    }

    // Get usage
    const { data: usage } = await supabase
      .from('subscription_usage')
      .select('*')
      .eq('user_id', user.id)
      .eq('subscription_id', subscription.id)
      .single();

    return NextResponse.json({
      subscription,
      usage: usage || null,
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create or update subscription
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      plan_type,
      card_required = false,
      card_added = false,
      trial_days = 7,
      amount,
      billing_cycle,
      payment_provider,
      payment_provider_subscription_id,
      payment_provider_customer_id,
    } = body;

    if (!plan_type) {
      return NextResponse.json(
        { error: 'Plan type is required' },
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

    // Check if user already has an active subscription of this type
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('plan_type', plan_type)
      .eq('status', 'active')
      .single();

    let subscription;

    if (existing) {
      // Update existing subscription
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (card_added !== undefined) updateData.card_added = card_added;
      if (amount !== undefined) updateData.amount = amount;
      if (billing_cycle) updateData.billing_cycle = billing_cycle;
      if (payment_provider) updateData.payment_provider = payment_provider;
      if (payment_provider_subscription_id) {
        updateData.payment_provider_subscription_id = payment_provider_subscription_id;
      }
      if (payment_provider_customer_id) {
        updateData.payment_provider_customer_id = payment_provider_customer_id;
      }

      const { data: updated, error: updateError } = await supabase
        .from('subscriptions')
        .update(updateData)
        .eq('id', existing.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      subscription = updated;
    } else {
      // Create new subscription
      const subscriptionData: any = {
        user_id: user.id,
        plan_type,
        status: 'active',
        card_required,
        card_added,
        auto_renew: true,
      };

      // Set trial information if free_trial
      if (plan_type === 'free_trial') {
        subscriptionData.is_trial = true;
        subscriptionData.trial_start_date = new Date().toISOString();
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + trial_days);
        subscriptionData.trial_end_date = trialEndDate.toISOString();
        subscriptionData.end_date = trialEndDate.toISOString();
      } else {
        // Set billing cycle and end date
        if (billing_cycle === 'annual') {
          const endDate = new Date();
          endDate.setFullYear(endDate.getFullYear() + 1);
          subscriptionData.end_date = endDate.toISOString();
          subscriptionData.amount = amount || (plan_type === 'annual' ? 1308 : null);
        } else {
          const endDate = new Date();
          endDate.setMonth(endDate.getMonth() + 1);
          subscriptionData.end_date = endDate.toISOString();
          subscriptionData.amount = amount || (plan_type === 'monthly' ? 199 : null);
        }
        subscriptionData.billing_cycle = billing_cycle || 'monthly';
      }

      if (amount) subscriptionData.amount = amount;
      if (payment_provider) subscriptionData.payment_provider = payment_provider;
      if (payment_provider_subscription_id) {
        subscriptionData.payment_provider_subscription_id = payment_provider_subscription_id;
      }
      if (payment_provider_customer_id) {
        subscriptionData.payment_provider_customer_id = payment_provider_customer_id;
      }

      const { data: created, error: createError } = await supabase
        .from('subscriptions')
        .insert(subscriptionData)
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      subscription = created;
    }

    // Get usage
    const { data: usage } = await supabase
      .from('subscription_usage')
      .select('*')
      .eq('user_id', user.id)
      .eq('subscription_id', subscription.id)
      .single();

    return NextResponse.json({
      success: true,
      subscription,
      usage: usage || null,
    });
  } catch (error) {
    console.error('Error creating/updating subscription:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

