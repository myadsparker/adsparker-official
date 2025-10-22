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

    const adAccountsRes = await fetch(
      `https://graph.facebook.com/me/adaccounts?fields=id,name,account_status&access_token=${tokenData.access_token}`
    );
    const adAccounts = await adAccountsRes.json();
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
    let existingAccounts = [];
    if (userProfile.meta_accounts) {
      try {
        existingAccounts = Array.isArray(userProfile.meta_accounts)
          ? userProfile.meta_accounts
          : JSON.parse(userProfile.meta_accounts);
      } catch (e) {
        console.error('Error parsing existing accounts:', e);
        existingAccounts = [];
      }
    }

    // Prepare new meta account data
    const newMetaData = {
      access_token: tokenData.access_token,
      profile: {
        id: profile.id,
        name: profile.name,
        email: profile.email,
      },
      ad_accounts: adAccounts.data || [],
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

    // 4️⃣ Redirect to adcenter
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/adcenter?projectId=${projectId}`
    );
  } catch (err) {
    console.error('Callback error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
