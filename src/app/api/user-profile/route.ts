import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

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
      .select('is_subscribed, subscription_type, expiry_subscription, meta_connected, meta_accounts')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.error('❌ Error fetching user profile in /api/user-profile:', {
        error: profileError,
        message: profileError.message,
        code: profileError.code,
        details: profileError.details,
        hint: profileError.hint,
      });
      return NextResponse.json(
        { 
          error: 'Failed to fetch profile',
          details: profileError.message,
        },
        { status: 500 }
      );
    }

    console.log('✅ User profile fetched successfully');

    return NextResponse.json({
      profile: {
        is_subscribed: profile?.is_subscribed || false,
        subscription_type: profile?.subscription_type || null,
        expiry_subscription: profile?.expiry_subscription || null,
        meta_connected: profile?.meta_connected || false,
        meta_accounts: profile?.meta_accounts || [],
      },
    });
  } catch (error: any) {
    console.error('❌ CRITICAL ERROR in /api/user-profile:', {
      error: error.message,
      stack: error.stack,
      fullError: error,
    });
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

