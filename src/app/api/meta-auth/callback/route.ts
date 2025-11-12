import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // contains projectId + userId
    const error = searchParams.get('error');

    if (error) {
      console.error('Facebook OAuth Error:', error);
      return NextResponse.json(
        { error: 'Facebook OAuth failed' },
        { status: 400 }
      );
    }

    if (!code || !state) {
      return NextResponse.json(
        { error: 'Missing code or state' },
        { status: 400 }
      );
    }

    const { projectId, userId } = JSON.parse(state);

    // 1️⃣ Exchange code for access token
    const tokenResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?` +
      new URLSearchParams({
        client_id: process.env.META_APP_ID!,
        client_secret: process.env.META_APP_SECRET!,
        redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/meta-auth/callback`,
        code,
      }),
      { method: 'GET' }
    );

    const tokenData = await tokenResponse.json();
    console.log('🔑 Facebook Token Response:', tokenData);

    if (!tokenData.access_token) {
      return NextResponse.json(
        { error: 'Failed to get access token' },
        { status: 400 }
      );
    }

    // 2️⃣ Get user profile & ad accounts
    const profileRes = await fetch(
      `https://graph.facebook.com/me?fields=id,name,email&access_token=${tokenData.access_token}`
    );
    const profile = await profileRes.json();
    console.log('👤 Facebook Profile:', profile);

    const fetchAdAccounts = async () => {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/me/adaccounts?fields=id,account_id,name,account_status,currency,timezone_id,disable_reason&access_token=${tokenData.access_token}`
      );
      const json = await response.json();
      if (!response.ok || json.error) {
        throw new Error(
          json?.error?.message || 'Failed to fetch Meta ad accounts'
        );
      }
      return json;
    };

    let adAccounts: any = null;

    try {
      adAccounts = await fetchAdAccounts();
    } catch (firstError) {
      console.warn('First ad account fetch failed, retrying once...', firstError);
      await new Promise(resolve => setTimeout(resolve, 1500));
      try {
        adAccounts = await fetchAdAccounts();
      } catch (secondError) {
        console.error('Failed to fetch ad accounts after retry:', secondError);
        adAccounts = { data: [] };
      }
    }

    console.log('📊 Facebook Ad Accounts:', adAccounts);

    // 3️⃣ Save Meta authentication data to user_profiles table
    const supabase = createServerSupabaseClient();

    // Get current user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('meta_accounts')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      console.error('User profile fetch error:', profileError);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/meta-error?error=user_profile_not_found`
      );
    }

    // Parse existing meta accounts or initialize empty array
    let existingAccounts: any[] = [];
    if (userProfile.meta_accounts) {
      try {
        if (Array.isArray(userProfile.meta_accounts)) {
          existingAccounts = userProfile.meta_accounts;
        } else if (typeof userProfile.meta_accounts === 'string') {
          existingAccounts = JSON.parse(userProfile.meta_accounts);
        } else if (
          typeof userProfile.meta_accounts === 'object' &&
          userProfile.meta_accounts !== null
        ) {
          existingAccounts = [userProfile.meta_accounts];
        }
      } catch (e) {
        console.error('Error parsing existing accounts:', e);
        existingAccounts = [];
      }
    }

    const normalizedAdAccounts = Array.isArray(adAccounts?.data)
      ? adAccounts.data.map((account: any) => ({
        id: account.id,
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

    // Prepare new meta account data
    const newMetaData = {
      access_token: tokenData.access_token,
      profile: {
        id: profile.id,
        name: profile.name,
        email: profile.email,
      },
      ad_accounts: normalizedAdAccounts,
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Check if account already exists (by profile id)
    const existingAccountIndex = existingAccounts.findIndex(
      (account: any) => account.profile?.id === profile.id
    );

    if (existingAccountIndex >= 0) {
      // Update existing account
      existingAccounts[existingAccountIndex] = {
        ...existingAccounts[existingAccountIndex],
        ...newMetaData,
      };
      console.log('✅ Updated existing Meta account');
    } else {
      // Add new account
      existingAccounts.push(newMetaData);
      console.log('✅ Added new Meta account');
    }

    // Update user_profiles with meta accounts data
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        meta_accounts: existingAccounts,
        meta_connected: true,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Database update error:', updateError);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/meta-error?error=save_failed`
      );
    }

    console.log('💾 Meta data saved successfully to user_profiles');

    // 4️⃣ Redirect to plan page of the project where we started connecting
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/projects/${projectId}/plan`
    );
  } catch (err) {
    console.error('Callback error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
