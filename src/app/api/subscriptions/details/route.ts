import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerSupabaseClient } from '@/lib/supabase-server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

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

    // Get user profile with subscription info
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('is_subscribed, subscription_type, expiry_subscription')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500 }
      );
    }

    // Get active subscription from subscriptions table
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // If no subscription found, that's okay - user might not have one yet
    if (subscriptionError && subscriptionError.code !== 'PGRST116') {
      console.error('Error fetching subscription:', subscriptionError);
    }

    // Determine plan details
    let planName = 'No Plan';
    let planPrice = null;
    let billingCycle = null;

    if (profile?.subscription_type) {
      const subType = profile.subscription_type;
      
      if (subType === 'trial') {
        planName = 'Free Trial';
        planPrice = '$0';
        billingCycle = '7 days';
      } else if (subType.includes('month') || subscription?.billing_cycle === 'monthly') {
        planName = 'Basic Plan';
        planPrice = '$199';
        billingCycle = 'per month';
      } else if (subType.includes('year') || subscription?.billing_cycle === 'annual') {
        planName = 'Annual Plan';
        planPrice = '$1,308';
        billingCycle = 'per year';
      } else {
        // Try to get price from Stripe if it's a price ID
        try {
          const price = await stripe.prices.retrieve(subType);
          if (price.recurring?.interval === 'month') {
            planName = 'Basic Plan';
            planPrice = `$${(price.unit_amount || 0) / 100}`;
            billingCycle = 'per month';
          } else if (price.recurring?.interval === 'year') {
            planName = 'Annual Plan';
            planPrice = `$${(price.unit_amount || 0) / 100}`;
            billingCycle = 'per year';
          }
        } catch (e) {
          // If price ID doesn't work, use defaults
          planName = 'Basic Plan';
          planPrice = '$199';
          billingCycle = 'per month';
        }
      }
    }

    // Format renewal date
    let renewalDate = null;
    if (profile?.expiry_subscription) {
      const expiry = new Date(profile.expiry_subscription);
      renewalDate = expiry.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    }

    // Get payment method from Stripe if customer ID exists
    let paymentMethod = null;
    if (subscription?.payment_provider_customer_id) {
      try {
        // First, try to get from customer's default payment method
        const customer = await stripe.customers.retrieve(
          subscription.payment_provider_customer_id,
          { expand: ['invoice_settings.default_payment_method'] }
        );

        // Check if customer is not deleted and has invoice_settings
        if (
          typeof customer !== 'string' &&
          !customer.deleted &&
          'invoice_settings' in customer &&
          customer.invoice_settings?.default_payment_method
        ) {
          const pmId = typeof customer.invoice_settings.default_payment_method === 'string'
            ? customer.invoice_settings.default_payment_method
            : customer.invoice_settings.default_payment_method.id;

          const pm = await stripe.paymentMethods.retrieve(pmId);

          if (pm.card) {
            paymentMethod = {
              brand: pm.card.brand,
              last4: pm.card.last4,
              exp_month: pm.card.exp_month,
              exp_year: pm.card.exp_year,
            };
          }
        } else if (subscription?.payment_provider_subscription_id) {
          // Fallback: try to get from subscription's default payment method
          try {
            const stripeSubscription = await stripe.subscriptions.retrieve(
              subscription.payment_provider_subscription_id,
              { expand: ['default_payment_method'] }
            );

            if (stripeSubscription.default_payment_method) {
              const pmId = typeof stripeSubscription.default_payment_method === 'string'
                ? stripeSubscription.default_payment_method
                : stripeSubscription.default_payment_method.id;

              const pm = await stripe.paymentMethods.retrieve(pmId);

              if (pm.card) {
                paymentMethod = {
                  brand: pm.card.brand,
                  last4: pm.card.last4,
                  exp_month: pm.card.exp_month,
                  exp_year: pm.card.exp_year,
                };
              }
            }
          } catch (subError) {
            console.error('Error fetching payment method from subscription:', subError);
          }
        }
      } catch (error) {
        console.error('Error fetching payment method:', error);
        // Continue without payment method
      }
    }

    return NextResponse.json({
      subscription: {
        planName,
        planPrice,
        billingCycle,
        renewalDate,
        isSubscribed: profile?.is_subscribed || false,
        subscriptionType: profile?.subscription_type || null,
        expiryDate: profile?.expiry_subscription || null,
        status: subscription?.status || null,
      },
      paymentMethod,
    });
  } catch (error: any) {
    console.error('Error fetching subscription details:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

