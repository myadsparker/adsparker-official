import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET/POST /api/meta/account-currency
 * Fetches the currency from Meta ad account and stores it in user profile
 */
export async function GET(request: NextRequest) {
  return handleRequest();
}

export async function POST(request: NextRequest) {
  return handleRequest();
}

async function handleRequest() {
  try {
    const supabase = createServerSupabaseClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's Meta accounts
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('meta_accounts, meta_connected, account_currency')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    if (!profile.meta_connected || !profile.meta_accounts) {
      return NextResponse.json(
        { error: 'Meta account not connected' },
        { status: 400 }
      );
    }

    const metaAccounts = Array.isArray(profile.meta_accounts)
      ? profile.meta_accounts
      : [profile.meta_accounts];

    if (metaAccounts.length === 0) {
      return NextResponse.json(
        { error: 'No Meta ad accounts found' },
        { status: 400 }
      );
    }

    const accessToken = metaAccounts[0].access_token;
    const adAccounts = metaAccounts[0].ad_accounts || [];

    if (!accessToken || adAccounts.length === 0) {
      return NextResponse.json(
        { error: 'No ad account access token or ad accounts found' },
        { status: 400 }
      );
    }

    // Get the first ad account's currency
    const firstAdAccount = adAccounts[0];
    const adAccountId = firstAdAccount.id;

    console.log(`🌍 Fetching currency for ad account: ${adAccountId}`);

    // Fetch ad account details including currency
    const accountResponse = await fetch(
      `https://graph.facebook.com/v18.0/${adAccountId}?fields=currency,name,account_status&access_token=${accessToken}`
    );

    const accountData = await accountResponse.json();

    if (!accountResponse.ok || accountData.error) {
      console.error('Failed to fetch account currency:', accountData.error);
      return NextResponse.json(
        { 
          error: 'Failed to fetch account currency',
          details: accountData.error 
        },
        { status: 400 }
      );
    }

    const currency = accountData.currency || 'USD';
    console.log(`✅ Account currency: ${currency}`);

    // Store currency in user profile
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        account_currency: currency,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Failed to update currency in profile:', updateError);
    }

    return NextResponse.json({
      success: true,
      currency,
      account_name: accountData.name,
      account_id: adAccountId,
    });
  } catch (error: any) {
    console.error('Error fetching account currency:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

