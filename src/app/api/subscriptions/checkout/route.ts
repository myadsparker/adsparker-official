import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// Initialize Stripe with error handling
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

// Stripe Price IDs - these should be set in your environment variables
// Or will be fetched dynamically if not set
const STRIPE_PRICE_IDS = {
  monthly: process.env.STRIPE_MONTHLY_PRICE_ID || process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID || null,
  annual: process.env.STRIPE_ANNUAL_PRICE_ID || process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID || null,
};

// Helper function to get or create price ID
async function getOrCreatePriceId(planType: 'monthly' | 'annual'): Promise<string> {
  // If price ID is set in environment, use it
  if (planType === 'monthly' && STRIPE_PRICE_IDS.monthly && STRIPE_PRICE_IDS.monthly !== 'price_monthly') {
    return STRIPE_PRICE_IDS.monthly;
  }
  if (planType === 'annual' && STRIPE_PRICE_IDS.annual && STRIPE_PRICE_IDS.annual !== 'price_annual') {
    return STRIPE_PRICE_IDS.annual;
  }

  // If not set, fetch from Stripe API
  if (!stripe) {
    throw new Error('Stripe is not initialized');
  }

  // Get all prices
  const prices = await stripe.prices.list({
    limit: 100,
    active: true,
  });

  if (planType === 'monthly') {
    const monthlyPrice = prices.data.find(
      (p) => p.recurring?.interval === 'month' && p.unit_amount === 19900
    );
    if (monthlyPrice) {
      return monthlyPrice.id;
    }
  } else {
    const annualPrice = prices.data.find(
      (p) => p.recurring?.interval === 'year' && p.unit_amount === 130800
    );
    if (annualPrice) {
      return annualPrice.id;
    }
  }

  throw new Error(`${planType} price ID not found. Please run /api/subscriptions/setup-stripe first.`);
}

export async function POST(request: NextRequest) {
  try {
    // Check if Stripe is initialized
    if (!stripe) {
      console.error('Stripe is not initialized. Please check STRIPE_SECRET_KEY environment variable.');
      return NextResponse.json(
        { 
          error: 'Payment service is not configured. Please contact support.',
          details: 'STRIPE_SECRET_KEY is missing'
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { planType, projectId, immediatePayment } = body;

    if (!planType) {
      return NextResponse.json(
        { error: 'Plan type is required' },
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

    // Check if user has used trial before (for free_trial plan type)
    if (planType === 'free_trial') {
      // Check user_profiles for has_used_trial flag
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('has_used_trial')
        .eq('user_id', user.id)
        .single();

      // Also check if user has ever had a free_trial subscription
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

    // Determine price ID based on plan type
    let priceId: string;
    let billingCycle: 'monthly' | 'annual' = 'monthly';
    let subscriptionPeriodDays = 7; // For free trial

    try {
      if (planType === 'free_trial') {
        // For free trial, use monthly price with 7-day trial period
        priceId = await getOrCreatePriceId('monthly');
        subscriptionPeriodDays = 7;
      } else if (planType === 'monthly') {
        priceId = await getOrCreatePriceId('monthly');
        billingCycle = 'monthly';
      } else if (planType === 'annual') {
        priceId = await getOrCreatePriceId('annual');
        billingCycle = 'annual';
      } else {
        return NextResponse.json(
          { error: 'Invalid plan type' },
          { status: 400 }
        );
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

    // Mark all previous active subscriptions as inactive before creating new one
    // This enforces one active subscription at a time
    await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        auto_renew: false,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing']);

    // Get or create subscription
    let subscriptionId: string | null = null;
    
    // Check if user has existing subscription of this type
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('plan_type', planType)
      .maybeSingle();

    if (existingSubscription) {
      subscriptionId = existingSubscription.id;
      
      // Reactivate the subscription if it was cancelled
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
      // Create subscription record
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
          subscriptionData.amount = 1308;
        } else {
          endDate.setMonth(endDate.getMonth() + 1);
          subscriptionData.amount = 199;
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
        return NextResponse.json(
          { error: 'Failed to create subscription' },
          { status: 500 }
        );
      }

      subscriptionId = newSubscription.id;

      // If this is a free trial, mark has_used_trial in user_profiles
      if (planType === 'free_trial') {
        await supabase
          .from('user_profiles')
          .update({ has_used_trial: true })
          .eq('user_id', user.id);
      }
    }

    // Get app URL - try multiple methods
    let appUrl = process.env.NEXT_PUBLIC_APP_URL || 
                 process.env.NEXT_PUBLIC_SITE_URL;
    
    // If not in env, try to get from request headers (production detection)
    if (!appUrl) {
      const host = request.headers.get('host');
      const protocol = request.headers.get('x-forwarded-proto') || 'https';
      
      if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
        appUrl = `${protocol}://${host}`;
      } else {
        // Fallback to localhost only if truly local
        appUrl = 'http://localhost:3000';
      }
    }

    // Create Stripe checkout session
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
      // Allow promotions to be added
      allow_promotion_codes: true,
      // Always collect payment method - for trials it won't charge, for paid plans it will charge immediately
      payment_method_collection: 'always',
    };

    // For free trial, add subscription data with trial period
    if (planType === 'free_trial') {
      sessionParams.subscription_data = {
        trial_period_days: 7,
        metadata: {
          plan_type: 'free_trial',
          project_id: projectId || '',
        },
      };
    } 
    // For monthly/annual plans, explicitly set subscription_data WITHOUT trial period
    // This ensures payment is collected immediately and no trial is applied
    else if (planType === 'monthly' || planType === 'annual') {
      sessionParams.subscription_data = {
        metadata: {
          plan_type: planType,
          project_id: projectId || '',
          immediate_payment: immediatePayment ? 'true' : 'false',
        },
      };
      // Note: payment_method_collection is already set to 'always' above
      // This ensures payment is collected immediately with no trial period
    }

    if (!stripe) {
      throw new Error('Stripe is not initialized');
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({
      url: session.url,
      session_id: session.id,
    });
  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    
    // Provide more detailed error messages
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
        type: error.type || 'unknown'
      },
      { status: 500 }
    );
  }
}

