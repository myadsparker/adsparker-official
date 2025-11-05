import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerSupabaseClient } from '@/lib/supabase-server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

// Verify Stripe checkout session and update subscription
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { session_id } = body;

    if (!session_id) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Retrieve the Stripe session
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['subscription', 'customer'],
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Get subscription ID from metadata
    const subscriptionId = session.metadata?.subscription_id;
    const userId = session.metadata?.user_id || session.client_reference_id;
    const planType = session.metadata?.plan_type;

    if (!subscriptionId || !userId) {
      return NextResponse.json(
        { error: 'Missing subscription information' },
        { status: 400 }
      );
    }

    // Update subscription with payment information
    const updateData: any = {
      card_added: true,
      card_required: true,
      updated_at: new Date().toISOString(),
    };

    // Add payment provider information
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

    // Update subscription status based on payment status
    if (session.payment_status === 'paid') {
      updateData.status = 'active';
      updateData.card_added = true;
    }

    // Update subscription
    const { data: updatedSubscription, error: updateError } = await supabase
      .from('subscriptions')
      .update(updateData)
      .eq('id', subscriptionId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating subscription:', updateError);
      return NextResponse.json(
        { error: 'Failed to update subscription' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      subscription: updatedSubscription,
      session: {
        id: session.id,
        payment_status: session.payment_status,
        status: session.status,
      },
    });
  } catch (error: any) {
    console.error('Error verifying session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify session' },
      { status: 500 }
    );
  }
}

