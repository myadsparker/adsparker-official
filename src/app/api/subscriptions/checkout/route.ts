import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// Initialize Stripe with environment key (with safe checks)
let stripe: Stripe | null = null;
try {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('STRIPE_SECRET_KEY is not set in environment variables');
  } else {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-08-27.basil',
    });
  }
} catch (error) {
  console.error('Failed to initialize Stripe:', error);
}

// Stripe Price IDs - prefer server-side secrets, but fallback to public env if necessary
const STRIPE_PRICE_IDS = {
  monthly:
    process.env.STRIPE_MONTHLY_PRICE_ID ||
    process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID ||
    null,
  annual:
    process.env.STRIPE_ANNUAL_PRICE_ID ||
    process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID ||
    null,
};

// Helper: find a matching price on Stripe if env not provided
async function getOrCreatePriceId(planType: 'monthly' | 'annual'): Promise<string> {
  if (planType === 'monthly' && STRIPE_PRICE_IDS.monthly && STRIPE_PRICE_IDS.monthly !== 'price_monthly') {
    return STRIPE_PRICE_IDS.monthly;
  }
  if (planType === 'annual' && STRIPE_PRICE_IDS.annual && STRIPE_PRICE_IDS.annual !== 'price_annual') {
    return STRIPE_PRICE_IDS.annual;
  }

  if (!stripe) throw new Error('Stripe is not initialized');

  const prices = await stripe.prices.list({ limit: 100, active: true });

  // NOTE: We don't hardcode values here. We attempt to find a reasonable price by interval.
  // This is a heuristic: find first price that matches the billing interval.
  if (planType === 'monthly') {
    const monthlyPrice = prices.data.find((p) => p.recurring?.interval === 'month');
    if (monthlyPrice) return monthlyPrice.id;
  } else {
    const annualPrice = prices.data.find((p) => p.recurring?.interval === 'year');
    if (annualPrice) return annualPrice.id;
  }

  throw new Error(`${planType} price ID not found. Please set STRIPE_${planType.toUpperCase()}_PRICE_ID or run setup.`);
}

export async function POST(request: NextRequest) {
  try {
    if (!stripe) {
      console.error('Stripe is not initialized. Please check STRIPE_SECRET_KEY environment variable.');
      return NextResponse.json(
        {
          error: 'Payment service not configured',
          details: 'STRIPE_SECRET_KEY is missing',
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { planType, projectId, immediatePayment } = body;

    if (!planType) {
      return NextResponse.json({ error: 'Plan type is required' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Free trial checks remain the same
    if (planType === 'free_trial') {
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('has_used_trial')
        .eq('user_id', user.id)
        .single();

      const { data: previousTrial } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .eq('plan_type', 'free_trial')
        .limit(1)
        .maybeSingle();

      if (userProfile?.has_used_trial || previousTrial) {
        return NextResponse.json(
          {
            error: 'Free trial already used',
            message: 'You have already used your free trial. Please choose a paid plan to continue.',
          },
          { status: 400 }
        );
      }
    }

    // Determine price id using Stripe - DO NOT hardcode amount
    let priceId: string;
    let billingCycle: 'monthly' | 'annual' = 'monthly';

    try {
      if (planType === 'free_trial') {
        priceId = await getOrCreatePriceId('monthly'); // trial uses monthly price by your prior code
      } else if (planType === 'monthly') {
        priceId = await getOrCreatePriceId('monthly');
        billingCycle = 'monthly';
      } else if (planType === 'annual') {
        priceId = await getOrCreatePriceId('annual');
        billingCycle = 'annual';
      } else {
        return NextResponse.json({ error: 'Invalid plan type' }, { status: 400 });
      }
    } catch (priceError: any) {
      console.error('Error getting price ID:', priceError);
      return NextResponse.json(
        {
          error: 'Price ID not found. Please run setup first.',
          details: priceError.message,
          setupEndpoint: '/api/subscriptions/setup-stripe',
        },
        { status: 500 }
      );
    }

    // Deactivate previous active subscriptions for this user (keeps your logic)
    await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        auto_renew: false,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing']);

    // Reuse existing subscription record or create a new one (same as your logic)
    let subscriptionId: string | null = null;
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('plan_type', planType)
      .maybeSingle();

    if (existingSubscription) {
      subscriptionId = existingSubscription.id;
      if (existingSubscription.status === 'cancelled' || existingSubscription.status === 'expired') {
        await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            auto_renew: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingSubscription.id);
      }
    } else {
      const subscriptionData: any = {
        user_id: user.id,
        plan_type: planType,
        status: 'active',
        card_required: true,
        card_added: false,
        auto_renew: true,
        billing_cycle: billingCycle,
        payment_provider: 'stripe',
      };

      if (planType === 'free_trial') {
        subscriptionData.is_trial = true;
        subscriptionData.trial_start_date = new Date().toISOString();
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 7);
        subscriptionData.trial_end_date = trialEndDate.toISOString();
        subscriptionData.end_date = trialEndDate.toISOString();
      } else {
        const endDate = new Date();
        if (billingCycle === 'annual') {
          endDate.setFullYear(endDate.getFullYear() + 1);
        } else {
          endDate.setMonth(endDate.getMonth() + 1);
        }
        subscriptionData.end_date = endDate.toISOString();
      }

      const { data: newSubscription, error: createError } = await supabase
        .from('subscriptions')
        .insert(subscriptionData)
        .select()
        .single();

      if (createError) {
        console.error('Error creating subscription:', createError);
        return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 });
      }

      subscriptionId = newSubscription.id;

      if (planType === 'free_trial') {
        await supabase
          .from('user_profiles')
          .update({ has_used_trial: true })
          .eq('user_id', user.id);
      }
    }

    // Detect app URL (same as your code)
    let appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL;
    if (!appUrl) {
      const host = request.headers.get('host');
      const protocol = request.headers.get('x-forwarded-proto') || 'https';
      if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
        appUrl = `${protocol}://${host}`;
      } else {
        appUrl = 'http://localhost:3000';
      }
    }

    // Build Checkout Session params.
    // Key difference: for paid plans (monthly/annual) we intentionally do not set a trial,
    // so Stripe will attempt to invoice and collect payment for the first billing cycle.
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/dashboard/projects/${projectId || ''}/plan?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/dashboard/projects/${projectId || ''}/plan?checkout=cancelled`,
      client_reference_id: user.id,
      metadata: {
        user_id: user.id,
        subscription_id: subscriptionId || '',
        plan_type: planType,
        project_id: projectId || '',
        immediate_payment: immediatePayment ? 'true' : 'false',
        price_id: priceId || '',
      },
      allow_promotion_codes: true,
      // collect payment method at checkout for safety. For free trial we will keep always,
      // for paid plans this also ensures a payment method is present for charging.
      payment_method_collection: planType === 'free_trial' ? 'always' : 'if_required',
    };

    // Add subscription_data for different plan types:
    if (planType === 'free_trial') {
      // keep the 7-day trial behavior identical to your previous code
      sessionParams.subscription_data = {
        trial_period_days: 7,
        metadata: {
          plan_type: 'free_trial',
          project_id: projectId || '',
        },
      };
    } else {
      // For monthly/annual (paid) - no trial, so Checkout will create a subscription and attempt to collect payment.
      // We attach metadata so webhooks and later reconciliation have context.
      sessionParams.subscription_data = {
        metadata: {
          plan_type: planType,
          project_id: projectId || '',
          immediate_payment: immediatePayment ? 'true' : 'false',
        },
      };

      // NOTE: In most Stripe setups, creating a Checkout Session in subscription mode
      // for a non-trial price causes Checkout to create an invoice and attempt to collect
      // the first payment on-session. If your Stripe price object or product has other
      // configuration (e.g., 0 amount, or a trial defined directly on the Price), Checkout
      // may still show an authentication step with ₹0. If that happens, check the Price object in the Stripe Dashboard.
    }

    // Create the Checkout Session
    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({
      url: session.url,
      session_id: session.id,
    });
  } catch (error: any) {
    console.error('Stripe checkout error:', error);

    let errorMessage = 'Failed to create checkout session';
    let errorDetails = error.message || 'Unknown error';

    if (error.type === 'StripeInvalidRequestError') {
      errorMessage = 'Invalid payment configuration';
      errorDetails = error.message;
    } else if (error.code === 'parameter_invalid_empty') {
      errorMessage = 'Payment configuration is incomplete';
      errorDetails = 'Missing required Stripe configuration';
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: errorDetails,
        type: error.type || 'unknown',
      },
      { status: 500 }
    );
  }
}
