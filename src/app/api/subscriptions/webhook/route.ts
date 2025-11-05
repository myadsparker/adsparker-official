import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerSupabaseClient } from '@/lib/supabase-server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

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

    const supabase = createServerSupabaseClient();

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
    }

    if (session.payment_status === 'paid') {
      updateData.status = 'active';
      updateData.card_added = true;
    }

    await supabase
      .from('subscriptions')
      .update(updateData)
      .eq('id', subscriptionId);

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

    // Update subscription to active if it was expired
    if (existingSubscription.status === 'expired') {
      await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingSubscription.id);
    }

    // Update end date based on invoice period
    if (invoice.period_end) {
      await supabase
        .from('subscriptions')
        .update({
          end_date: new Date(invoice.period_end * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingSubscription.id);
    }

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

