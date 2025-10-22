import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/meta/status
 * Check if current user has a connected Meta account
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile with meta connection status
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('meta_connected, meta_accounts')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500 }
      );
    }

    // Parse meta accounts
    let metaAccounts = [];
    if (profile.meta_accounts) {
      metaAccounts = Array.isArray(profile.meta_accounts)
        ? profile.meta_accounts
        : [];
    }

    return NextResponse.json({
      connected: profile.meta_connected || false,
      accountsCount: metaAccounts.length,
      accounts: metaAccounts.map((acc: any) => ({
        name: acc.profile?.name,
        email: acc.profile?.email,
        adAccountsCount: acc.ad_accounts?.length || 0,
        connectedAt: acc.connected_at,
      })),
    });
  } catch (error) {
    console.error('Meta status check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
