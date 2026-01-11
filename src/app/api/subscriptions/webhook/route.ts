import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerSupabaseClient } from '@/lib/supabase-server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Helper function to check if subscription is active/trialing
async function checkSubscriptionStatus(subscriptionId: string | Stripe.Subscription): Promise<boolean> {
  try {
    const subscription = typeof subscriptionId === 'string'
      ? await stripe.subscriptions.retrieve(subscriptionId)
      : subscriptionId;
    return subscription.status === 'active' || subscription.status === 'trialing';
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return false;
  }
}

/**
 * Stripe Webhook Handler
 * Handles billing events from Stripe:
 * - checkout.session.completed: When checkout is successful
 * - customer.subscription.created: When subscription is created
 * - customer.subscription.updated: When subscription status changes
 * - customer.subscription.deleted: When subscription is cancelled
 * - invoice.payment_succeeded: When payment succeeds
 * - invoice.payment_failed: When payment fails
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('No Stripe signature found');
      return NextResponse.json(
        { error: 'No signature' },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      // Verify webhook signature if secret is provided
      if (webhookSecret) {
        event = stripe.webhooks.constructEvent(
          body,
          signature,
          webhookSecret
        );
      } else {
        // For local development without webhook secret, parse event directly
        // WARNING: This is not secure for production!
        console.warn('⚠️ STRIPE_WEBHOOK_SECRET not set - skipping signature verification (not secure for production!)');
        event = JSON.parse(body) as Stripe.Event;
      }
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json(
        { error: `Webhook Error: ${err.message}` },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session, supabase);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription, supabase);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription, supabase);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(invoice, supabase);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice, supabase);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: error.message || 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle checkout session completed
 */
async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  supabase: any
) {
  try {
    const subscriptionId = session.metadata?.subscription_id;
    const userId = session.metadata?.user_id || session.client_reference_id;

    if (!subscriptionId || !userId) {
      console.error('Missing subscription_id or user_id in checkout session');
      return;
    }

    // Update subscription with payment information
    const updateData: any = {
      card_added: true,
      card_required: true,
      updated_at: new Date().toISOString(),
    };

    if (session.customer) {
      updateData.payment_provider_customer_id =
        typeof session.customer === 'string' ? session.customer : session.customer.id;
    }

    if (session.subscription) {
      updateData.payment_provider_subscription_id =
        typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription.id;
      
      // Get the actual subscription from Stripe to get the real price
      try {
        const subscriptionObj = typeof session.subscription === 'string'
          ? await stripe.subscriptions.retrieve(session.subscription)
          : session.subscription;
        
        if (subscriptionObj.items.data.length > 0) {
          const price = subscriptionObj.items.data[0].price;
          if (price.unit_amount) {
            // Convert from cents to currency unit (e.g., rupees or dollars)
            updateData.amount = price.unit_amount / 100;
          }
        }
      } catch (error) {
        console.error('Error retrieving subscription for amount:', error);
      }
    }

    if (session.payment_status === 'paid') {
      updateData.status = 'active';
      updateData.card_added = true;
    }

    await supabase
      .from('subscriptions')
      .update(updateData)
      .eq('id', subscriptionId);

    // Only update user_profiles if payment was successful or trial was started
    // Check if this is a successful checkout (paid or trial started)
    const hasTrial = session.metadata?.has_trial === 'true';
    const planType = session.metadata?.plan_type || 'monthly';
    
    const isSuccessful = session.payment_status === 'paid' || 
                        hasTrial ||
                        (session.subscription && await checkSubscriptionStatus(session.subscription));

    if (isSuccessful) {
      const priceId = session.metadata?.price_id || null;
      
      // Determine subscription type and expiry
      let subscriptionType = hasTrial ? planType : (priceId || planType);
      let expiryDate: string | null = null;
      
      if (session.subscription) {
        const subscriptionObj = typeof session.subscription === 'string'
          ? await stripe.subscriptions.retrieve(session.subscription)
          : session.subscription;
        
        const periodEnd = (subscriptionObj as any).currentPeriodEnd || (subscriptionObj as any).current_period_end;
        if (periodEnd) {
          expiryDate = new Date(periodEnd * 1000).toISOString();
        }
        
        // Check if subscription has trial period
        if ((subscriptionObj as any).trial_end && hasTrial) {
          // Update trial end date
          await supabase
            .from('subscriptions')
            .update({
              trial_end_date: new Date((subscriptionObj as any).trial_end * 1000).toISOString(),
              is_trial: true,
            })
            .eq('id', subscriptionId);
        }
      } else if (hasTrial) {
        // Trial expires in 7 days
        expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      }

      const updateProfileData: any = {
        is_subscribed: true,
        subscription_type: subscriptionType,
        expiry_subscription: expiryDate,
      };

      // If this has a trial period, mark has_used_trial as true
      if (hasTrial) {
        updateProfileData.has_used_trial = true;
      }

      await supabase
        .from('user_profiles')
        .update(updateProfileData)
        .eq('user_id', userId);
      
      console.log('✅ User profile updated with subscription info for user:', userId);
    }

    console.log('✅ Checkout completed - subscription updated:', subscriptionId);
  } catch (error) {
    console.error('Error handling checkout completed:', error);
  }
}

/**
 * Handle subscription created/updated
 */
async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  supabase: any
) {
  try {
    // Find subscription by Stripe subscription ID
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('payment_provider_subscription_id', subscription.id)
      .single();

    if (!existingSubscription) {
      console.log('Subscription not found in database:', subscription.id);
      return;
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    // Update amount from Stripe subscription price
    if (subscription.items.data.length > 0) {
      const price = subscription.items.data[0].price;
      if (price.unit_amount) {
        // Convert from cents to currency unit (e.g., rupees or dollars)
        updateData.amount = price.unit_amount / 100;
      }
    }

    // Update status based on Stripe subscription status
    const stripeStatus = subscription.status as string;
    switch (stripeStatus) {
      case 'active':
        updateData.status = 'active';
        break;
      case 'canceled':
      case 'cancelled':
        updateData.status = 'cancelled';
        updateData.cancelled_at = new Date().toISOString();
        break;
      case 'past_due':
        updateData.status = 'expired';
        break;
      case 'unpaid':
        updateData.status = 'expired';
        break;
      case 'trialing':
        updateData.status = 'active';
        updateData.is_trial = true;
        break;
    }

    // Update trial dates if applicable
    if (subscription.trial_end) {
      updateData.trial_end_date = new Date(
        subscription.trial_end * 1000
      ).toISOString();
    }

    // Update end date - using type assertion for Stripe subscription
    const subscriptionAny = subscription as any;
    if (subscriptionAny.currentPeriodEnd || subscriptionAny.current_period_end) {
      const periodEnd = subscriptionAny.currentPeriodEnd || subscriptionAny.current_period_end;
      updateData.end_date = new Date(periodEnd * 1000).toISOString();
    }

    // Update cancel_at if subscription is set to cancel
    if (subscription.cancel_at) {
      updateData.cancelled_at = new Date(
        subscription.cancel_at * 1000
      ).toISOString();
    }

    await supabase
      .from('subscriptions')
      .update(updateData)
      .eq('id', existingSubscription.id);

    // Also update user_profiles - only if subscription is active/trialing
    if (existingSubscription.user_id && (subscription.status === 'active' || subscription.status === 'trialing')) {
      const priceId = subscription.items.data[0]?.price?.id || null;
      const subscriptionType = priceId || existingSubscription.plan_type || 'monthly';
      const periodEnd = (subscription as any).currentPeriodEnd || (subscription as any).current_period_end;
      const expiryDate = periodEnd
        ? new Date(periodEnd * 1000).toISOString()
        : null;

      await supabase
        .from('user_profiles')
        .update({
          is_subscribed: subscription.status === 'active' || subscription.status === 'trialing',
          subscription_type: subscriptionType,
          expiry_subscription: expiryDate,
        })
        .eq('user_id', existingSubscription.user_id);
    }

    console.log('✅ Subscription updated:', subscription.id);
  } catch (error) {
    console.error('Error handling subscription updated:', error);
  }
}

/**
 * Handle subscription deleted/cancelled
 */
async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  supabase: any
) {
  try {
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('payment_provider_subscription_id', subscription.id)
      .single();

    if (!existingSubscription) {
      console.log('Subscription not found in database:', subscription.id);
      return;
    }

    await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        auto_renew: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingSubscription.id);

    // Also update user_profiles - set is_subscribed to false
    if (existingSubscription.user_id) {
      await supabase
        .from('user_profiles')
        .update({
          is_subscribed: false,
          subscription_type: null,
          expiry_subscription: null,
        })
        .eq('user_id', existingSubscription.user_id);
    }

    console.log('✅ Subscription cancelled:', subscription.id);
  } catch (error) {
    console.error('Error handling subscription deleted:', error);
  }
}

/**
 * Handle payment succeeded
 */
async function handlePaymentSucceeded(
  invoice: Stripe.Invoice,
  supabase: any
) {
  try {
    // Access subscription property with type assertion
    const invoiceAny = invoice as any;
    const subscriptionId = invoiceAny.subscription
      ? typeof invoiceAny.subscription === 'string'
        ? invoiceAny.subscription
        : invoiceAny.subscription.id
      : null;

    if (!subscriptionId) {
      return; // Not a subscription invoice
    }

    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('payment_provider_subscription_id', subscriptionId)
      .single();

    if (!existingSubscription) {
      console.log('Subscription not found for invoice:', subscriptionId);
      return;
    }

    // Get user_id from subscription
    const userId = existingSubscription.user_id;

    // Get the actual subscription from Stripe to get the real price
    let subscriptionAmount = existingSubscription.amount || 0;
    try {
      const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
      if (stripeSubscription.items.data.length > 0) {
        const price = stripeSubscription.items.data[0].price;
        if (price.unit_amount) {
          // Convert from cents to the currency unit (e.g., rupees or dollars)
          subscriptionAmount = price.unit_amount / 100;
        }
      }
    } catch (error) {
      console.error('Error retrieving subscription from Stripe:', error);
    }

    // Use amount_due or total if amount_paid is 0 (for trial periods)
    // amount_due shows what should be charged, total shows the full invoice amount
    const invoiceAmount = invoice.amount_paid > 0 
      ? invoice.amount_paid 
      : (invoice.amount_due > 0 ? invoice.amount_due : invoice.total);

    // Save invoice to database
    const invoiceData = {
      user_id: userId,
      subscription_id: existingSubscription.id,
      stripe_invoice_id: invoice.id,
      invoice_number: invoice.number || null,
      amount_paid: (invoiceAmount || 0) / 100, // Convert from cents to currency unit
      currency: invoice.currency || 'usd',
      status: invoice.status || 'paid',
      invoice_pdf_url: invoice.invoice_pdf || null,
      hosted_invoice_url: invoice.hosted_invoice_url || null,
      period_start: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
      period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
      paid_at: invoice.status_transitions?.paid_at ? new Date(invoice.status_transitions.paid_at * 1000).toISOString() : new Date().toISOString(),
    };

    // Upsert invoice (insert or update if exists)
    const { error: invoiceError } = await supabase
      .from('invoices')
      .upsert(invoiceData, {
        onConflict: 'stripe_invoice_id',
        ignoreDuplicates: false,
      });

    if (invoiceError) {
      console.error('Error saving invoice:', invoiceError);
    } else {
      console.log('✅ Invoice saved:', invoice.id, 'Amount:', invoiceData.amount_paid);
    }

    // Update subscription with amount and status
    const subscriptionUpdate: any = {
      updated_at: new Date().toISOString(),
    };

    // Update amount from Stripe subscription if we got it
    if (subscriptionAmount > 0) {
      subscriptionUpdate.amount = subscriptionAmount;
    }

    // Update subscription to active if it was expired
    if (existingSubscription.status === 'expired') {
      subscriptionUpdate.status = 'active';
    }

    // Update end date based on invoice period
    if (invoice.period_end) {
      subscriptionUpdate.end_date = new Date(invoice.period_end * 1000).toISOString();

      // Also update user_profiles expiry_subscription
      await supabase
        .from('user_profiles')
        .update({
          expiry_subscription: new Date(invoice.period_end * 1000).toISOString(),
        })
        .eq('user_id', userId);
    }

    // Update subscription
    await supabase
      .from('subscriptions')
      .update(subscriptionUpdate)
      .eq('id', existingSubscription.id);

    console.log('✅ Payment succeeded for subscription:', subscriptionId);
  } catch (error) {
    console.error('Error handling payment succeeded:', error);
  }
}

/**
 * Handle payment failed
 */
async function handlePaymentFailed(
  invoice: Stripe.Invoice,
  supabase: any
) {
  try {
    // Access subscription property with type assertion
    const invoiceAny = invoice as any;
    const subscriptionId = invoiceAny.subscription
      ? typeof invoiceAny.subscription === 'string'
        ? invoiceAny.subscription
        : invoiceAny.subscription.id
      : null;

    if (!subscriptionId) {
      return; // Not a subscription invoice
    }

    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('payment_provider_subscription_id', subscriptionId)
      .single();

    if (!existingSubscription) {
      console.log('Subscription not found for invoice:', subscriptionId);
      return;
    }

    // Update subscription status to expired if payment failed
    await supabase
      .from('subscriptions')
      .update({
        status: 'expired',
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingSubscription.id);

    console.log('⚠️ Payment failed for subscription:', subscriptionId);
  } catch (error) {
    console.error('Error handling payment failed:', error);
  }
}

