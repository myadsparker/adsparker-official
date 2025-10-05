import { NextRequest, NextResponse } from 'next/server';

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

    // You can now redirect to frontend with success message
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/meta-success?projectId=${projectId}`
    );
  } catch (err) {
    console.error('Callback error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
