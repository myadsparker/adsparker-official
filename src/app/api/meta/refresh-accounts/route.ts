import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * POST /api/meta/refresh-accounts
 * 
 * Fetches fresh ad accounts from Meta Graph API using stored access token
 * and updates the ad_accounts array in user_profiles.meta_accounts
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile with stored Meta accounts
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('meta_accounts, meta_connected')
      .eq('user_id', user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    if (!userProfile.meta_connected) {
      return NextResponse.json(
        { error: 'Meta account not connected' },
        { status: 400 }
      );
    }

    // Parse existing meta accounts
    let metaAccounts: any[] = [];
    if (userProfile.meta_accounts) {
      if (Array.isArray(userProfile.meta_accounts)) {
        metaAccounts = userProfile.meta_accounts;
      } else if (typeof userProfile.meta_accounts === 'string') {
        try {
          metaAccounts = JSON.parse(userProfile.meta_accounts);
        } catch {
          metaAccounts = [];
        }
      } else {
        metaAccounts = [userProfile.meta_accounts];
      }
    }

    if (metaAccounts.length === 0) {
      return NextResponse.json(
        { error: 'No Meta account found. Please reconnect your Meta account.' },
        { status: 400 }
      );
    }

    // Get the first Meta account with access token
    const primaryAccount = metaAccounts.find(
      (account: any) =>
        account?.access_token && typeof account.access_token === 'string'
    );

    if (!primaryAccount?.access_token) {
      return NextResponse.json(
        { error: 'Meta access token not found' },
        { status: 400 }
      );
    }

    const accessToken = primaryAccount.access_token;

    // Fetch fresh ad accounts from Meta Graph API
    console.log('🔄 Fetching fresh ad accounts from Meta Graph API...');
    const adAccountsResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/adaccounts?fields=id,account_id,name,account_status,currency,timezone_id,disable_reason&access_token=${accessToken}`
    );

    const adAccountsData = await adAccountsResponse.json();

    if (!adAccountsResponse.ok || adAccountsData.error) {
      console.error('❌ Meta Graph API Error:', adAccountsData.error);
      return NextResponse.json(
        {
          error: 'Failed to fetch ad accounts from Meta',
          details: adAccountsData.error?.message || 'Unknown error',
          metaError: adAccountsData.error,
        },
        { status: 400 }
      );
    }

    // Normalize ad accounts data
    const normalizedAdAccounts = Array.isArray(adAccountsData.data)
      ? adAccountsData.data.map((account: any) => ({
          id: account.id || null,
          account_id:
            account.account_id ||
            (typeof account.id === 'string'
              ? account.id.replace(/^act_/, '')
              : null),
          name: account.name || null,
          account_status: account.account_status ?? null,
          currency: account.currency || null,
          timezone_id: account.timezone_id ?? null,
          disable_reason: account.disable_reason ?? null,
        }))
      : [];

    console.log(
      `✅ Fetched ${normalizedAdAccounts.length} ad accounts from Meta`
    );

    // Update the primary account's ad_accounts array
    const updatedMetaAccounts = metaAccounts.map((account: any) => {
      if (
        account.profile?.id === primaryAccount.profile?.id ||
        account.access_token === primaryAccount.access_token
      ) {
        return {
          ...account,
          ad_accounts: normalizedAdAccounts,
          updated_at: new Date().toISOString(),
        };
      }
      return account;
    });

    // Update user_profiles in Supabase
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        meta_accounts: updatedMetaAccounts,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('❌ Database update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update ad accounts in database', details: updateError.message },
        { status: 500 }
      );
    }

    console.log('💾 Ad accounts updated successfully in Supabase');

    return NextResponse.json({
      success: true,
      accounts: normalizedAdAccounts,
      message: `Successfully refreshed ${normalizedAdAccounts.length} ad account(s)`,
    });
  } catch (error: any) {
    console.error('❌ Error refreshing ad accounts:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

