import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json();
    const { isSubscribed, subscriptionType, expirySubscription } = body;

    // Update user profile
    const updateData: any = {};
    
    if (isSubscribed !== undefined) {
      updateData.is_subscribed = isSubscribed;
    }
    
    if (subscriptionType !== undefined) {
      updateData.subscription_type = subscriptionType;
    }
    
    if (expirySubscription !== undefined) {
      updateData.expiry_subscription = expirySubscription;
    }

    const { error: updateError } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating user profile subscription:', updateError);
      return NextResponse.json(
        { error: 'Failed to update subscription' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating subscription:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

