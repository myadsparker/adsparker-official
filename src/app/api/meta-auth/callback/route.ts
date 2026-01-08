import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    // Build base URL from request if NEXT_PUBLIC_SITE_URL is not set
    let baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
      `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host') || 'localhost:3000'}`;
    
    // Normalize base URL (remove trailing slash, ensure proper protocol)
    baseUrl = baseUrl.trim().replace(/\/+$/, '');
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = `https://${baseUrl}`;
    }
    
    // Log for debugging
    console.log('🔗 Callback - Base URL:', baseUrl);
    console.log('🔗 Callback - NEXT_PUBLIC_SITE_URL:', process.env.NEXT_PUBLIC_SITE_URL || 'Not set');
    console.log('🔗 Callback - Host header:', request.headers.get('host'));
    console.log('🔗 Callback - X-Forwarded-Proto:', request.headers.get('x-forwarded-proto'));
    
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // contains projectId + userId
    const error = searchParams.get('error');

    if (error) {
      console.error('Facebook OAuth Error:', error);
      const errorDescription = searchParams.get('error_description') || '';
      const errorReason = searchParams.get('error_reason') || '';
      
      // Extract projectId from state if available
      let projectId = 'unknown';
      try {
        const state = searchParams.get('state');
        if (state) {
          const parsedState = JSON.parse(state);
          projectId = parsedState.projectId || 'unknown';
        }
      } catch (e) {
        // Ignore parse errors
      }

      // Check for specific "updating additional details" error (app configuration issue)
      if (errorDescription.toLowerCase().includes('updating additional details') ||
          errorDescription.toLowerCase().includes('unavailable for this app')) {
        console.error('⚠️ Facebook app configuration error:', errorDescription);
        return NextResponse.redirect(
          `${baseUrl}/dashboard/projects/${projectId}/plan?meta_error=app_config_error&error_description=${encodeURIComponent(errorDescription)}`
        );
      }

      // Check if this is a manual authentication requirement
      if (error === 'access_denied' || 
          errorDescription.toLowerCase().includes('authentication') ||
          errorDescription.toLowerCase().includes('confirm') ||
          errorReason === 'user_denied') {
        return NextResponse.redirect(
          `${baseUrl}/dashboard/projects/${projectId}/plan?meta_error=manual_auth_required&error=${error}`
        );
      }
      
      return NextResponse.redirect(
        `${baseUrl}/dashboard/projects/${projectId}/plan?meta_error=oauth_failed&error=${error}&error_description=${encodeURIComponent(errorDescription)}`
      );
    }

    if (!code || !state) {
      console.error('❌ Missing code or state in callback:', { code: !!code, state: !!state });
      // Try to extract projectId from URL or default redirect
      const urlParams = new URL(request.url);
      const projectId = urlParams.searchParams.get('projectId') || 'unknown';
      
      return NextResponse.redirect(
        `${baseUrl}/dashboard/projects/${projectId}/plan?meta_error=missing_params`
      );
    }

    let parsedState;
    let projectId;
    let userId;
    
    try {
      parsedState = JSON.parse(state);
      projectId = parsedState.projectId;
      userId = parsedState.userId;
      
      if (!projectId || !userId) {
        throw new Error('Missing projectId or userId in state');
      }
    } catch (parseError) {
      console.error('❌ Failed to parse state:', parseError, 'State:', state);
      return NextResponse.redirect(
        `${baseUrl}/dashboard/projects/unknown/plan?meta_error=invalid_state`
      );
    }

    // 1️⃣ Exchange code for access token
    // Use our own callback route (must match the redirect_uri used in initial OAuth request)
    let normalizedBaseUrl = baseUrl.trim().replace(/\/+$/, '');
    if (!normalizedBaseUrl.startsWith('http://') && !normalizedBaseUrl.startsWith('https://')) {
      normalizedBaseUrl = `https://${normalizedBaseUrl}`;
    }
    const redirectUri = `${normalizedBaseUrl}/api/meta-auth/callback`;
    
    // Log redirect URI for debugging
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔗 Callback Redirect URI:', redirectUri);
      console.log('🔗 Base URL:', normalizedBaseUrl);
    }
    
    const tokenResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?` +
      new URLSearchParams({
        client_id: process.env.META_APP_ID!,
        client_secret: process.env.META_APP_SECRET!,
        redirect_uri: redirectUri,
        code,
      }),
      { method: 'GET' }
    );

    const tokenData = await tokenResponse.json();
    console.log('🔑 Facebook Token Response:', tokenData);

    // Check for manual authentication requirement (common error codes)
    if (tokenData.error) {
      const errorCode = tokenData.error.code;
      const errorMessage = tokenData.error.message || '';
      
      // Error codes that indicate manual authentication needed
      if ([190, 200, 102, 10].includes(errorCode) || 
          errorMessage.toLowerCase().includes('authentication') ||
          errorMessage.toLowerCase().includes('confirm') ||
          errorMessage.toLowerCase().includes('verify')) {
        console.error('⚠️ Manual authentication required:', tokenData.error);
        return NextResponse.redirect(
          `${baseUrl}/dashboard/projects/${projectId}/plan?meta_error=manual_auth_required&error_code=${errorCode}`
        );
      }
      
      return NextResponse.redirect(
        `${baseUrl}/dashboard/projects/${projectId}/plan?meta_error=oauth_failed&error_code=${errorCode}`
      );
    }

    if (!tokenData.access_token) {
      return NextResponse.redirect(
        `${baseUrl}/dashboard/projects/${projectId}/plan?meta_error=no_token`
      );
    }

    // 1.5️⃣ Exchange short-lived token for long-lived token (60 days)
    let longLivedToken = tokenData.access_token;
    let tokenExpiresAt: number | null = null;
    
    try {
      console.log('🔄 Exchanging for long-lived token...');
      const longLivedResponse = await fetch(
        `https://graph.facebook.com/v18.0/oauth/access_token?` +
        new URLSearchParams({
          grant_type: 'fb_exchange_token',
          client_id: process.env.META_APP_ID!,
          client_secret: process.env.META_APP_SECRET!,
          fb_exchange_token: tokenData.access_token,
        }),
        { method: 'GET' }
      );

      const longLivedData = await longLivedResponse.json();
      
      if (longLivedData.access_token && !longLivedData.error) {
        longLivedToken = longLivedData.access_token;
        // Calculate expiration timestamp (expires_in is in seconds)
        if (longLivedData.expires_in) {
          tokenExpiresAt = Date.now() + (longLivedData.expires_in * 1000);
        }
        console.log('✅ Long-lived token obtained (expires in ~60 days)');
      } else {
        console.warn('⚠️ Long-lived token exchange failed, using short-lived token:', longLivedData.error?.message || 'Unknown error');
        // Continue with short-lived token as fallback
      }
    } catch (tokenExchangeError) {
      console.error('❌ Error exchanging for long-lived token:', tokenExchangeError);
      // Continue with short-lived token as fallback
    }

    // 2️⃣ Get user profile & ad accounts
    const profileRes = await fetch(
      `https://graph.facebook.com/me?fields=id,name,email&access_token=${longLivedToken}`
    );
    const profile = await profileRes.json();
    console.log('👤 Facebook Profile:', profile);

    // Check for errors in profile fetch (manual auth requirement)
    if (profile.error) {
      const errorCode = profile.error.code;
      if ([190, 200, 102, 10].includes(errorCode)) {
        return NextResponse.redirect(
          `${baseUrl}/dashboard/projects/${projectId}/plan?meta_error=manual_auth_required&error_code=${errorCode}`
        );
      }
    }

    const fetchAdAccounts = async () => {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/me/adaccounts?fields=id,account_id,name,account_status,currency,timezone_id,disable_reason&access_token=${longLivedToken}`
      );
      const json = await response.json();
      if (!response.ok || json.error) {
        // Check for manual authentication requirement
        const errorCode = json.error?.code;
        if ([190, 200, 102, 10].includes(errorCode)) {
          throw new Error('MANUAL_AUTH_REQUIRED');
        }
        throw new Error(
          json?.error?.message || 'Failed to fetch Meta ad accounts'
        );
      }
      return json;
    };

    // Verify permissions are granted
    const verifyPermissions = async () => {
      try {
        const permissionsResponse = await fetch(
          `https://graph.facebook.com/v18.0/me/permissions?access_token=${longLivedToken}`
        );
        const permissionsData = await permissionsResponse.json();
        
        if (permissionsData.error) {
          console.warn('⚠️ Could not verify permissions:', permissionsData.error);
          return { verified: false, missing: [] };
        }

        const permissionsArray = Array.isArray(permissionsData.data) 
          ? permissionsData.data 
          : [];
        
        const requiredPermissions = [
          'ads_management',
          'ads_read',
          'business_management',
          'pages_read_engagement',
          'read_insights'
        ];

        const grantedPermissions = permissionsArray
          .filter((p: any) => p.status === 'granted')
          .map((p: any) => p.permission);

        const missingPermissions = requiredPermissions.filter(
          perm => !grantedPermissions.includes(perm)
        );

        if (missingPermissions.length > 0) {
          console.warn('⚠️ Missing permissions:', missingPermissions);
        }

        return {
          verified: missingPermissions.length === 0,
          missing: missingPermissions,
          granted: grantedPermissions
        };
      } catch (error) {
        console.warn('⚠️ Error verifying permissions:', error);
        return { verified: false, missing: [] };
      }
    };

    let adAccounts: any = null;
    let permissionsCheck: any = null;

    try {
      // Verify permissions first
      permissionsCheck = await verifyPermissions();
      
      // Fetch ad accounts
      adAccounts = await fetchAdAccounts();
    } catch (firstError: any) {
      if (firstError.message === 'MANUAL_AUTH_REQUIRED') {
        return NextResponse.redirect(
          `${baseUrl}/dashboard/projects/${projectId}/plan?meta_error=manual_auth_required`
        );
      }
      
      console.warn('First ad account fetch failed, retrying once...', firstError);
      await new Promise(resolve => setTimeout(resolve, 1500));
      try {
        adAccounts = await fetchAdAccounts();
      } catch (secondError: any) {
        if (secondError.message === 'MANUAL_AUTH_REQUIRED') {
          return NextResponse.redirect(
            `${baseUrl}/dashboard/projects/${projectId}/plan?meta_error=manual_auth_required`
          );
        }
        console.error('Failed to fetch ad accounts after retry:', secondError);
        adAccounts = { data: [] };
      }
    }

    console.log('📊 Facebook Ad Accounts:', adAccounts);

    // 2.3️⃣ Fetch pixels associated with ad accounts
    let pixels: any[] = [];
    if (adAccounts?.data && adAccounts.data.length > 0) {
      console.log('📊 Fetching pixels for ad accounts...');
      const pixelPromises = adAccounts.data.map(async (account: any) => {
        try {
          const accountId = account.id || account.account_id;
          if (!accountId) return null;

          const pixelsResponse = await fetch(
            `https://graph.facebook.com/v18.0/${accountId}/adaccountspixels?fields=id,name,last_fired_time,creation_time&access_token=${longLivedToken}`
          );
          const pixelsData = await pixelsResponse.json();

          if (pixelsData.error) {
            console.warn(`⚠️ Could not fetch pixels for account ${accountId}:`, pixelsData.error);
            return null;
          }

          return {
            account_id: accountId,
            pixels: pixelsData.data || []
          };
        } catch (error) {
          console.warn(`⚠️ Error fetching pixels for account ${account.id}:`, error);
          return null;
        }
      });

      const pixelResults = await Promise.all(pixelPromises);
      pixels = pixelResults.filter((result): result is { account_id: string; pixels: any[] } => result !== null);
      console.log(`✅ Fetched pixels for ${pixels.length} ad accounts`);
    }

    // 2.5️⃣ Verify app assignment to ad accounts
    if (adAccounts?.data && adAccounts.data.length > 0) {
      console.log('🔍 Verifying app assignment to ad accounts...');
      const appId = process.env.META_APP_ID;
      
      for (const account of adAccounts.data) {
        try {
          // Check if app has access to this ad account
          const accountId = account.id || account.account_id;
          if (!accountId) continue;

          const assignmentCheck = await fetch(
            `https://graph.facebook.com/v18.0/${accountId}?fields=id,name&access_token=${longLivedToken}`
          );
          const accountData = await assignmentCheck.json();

          if (accountData.error) {
            const errorCode = accountData.error.code;
            // Error 200 means app doesn't have access to this account
            if (errorCode === 200 || errorCode === 10) {
              console.warn(`⚠️ App not assigned to ad account ${accountId}. User may need to assign app in Business Manager.`);
              // Continue - don't block, but log warning
            }
          } else {
            console.log(`✅ App has access to ad account: ${accountId}`);
          }
        } catch (assignmentError) {
          console.warn(`⚠️ Could not verify app assignment for account ${account.id}:`, assignmentError);
          // Continue - don't block the flow
        }
      }
    }

    // 3️⃣ Save Meta authentication data to user_profiles table
    const supabase = await createServerSupabaseClient();

    // Get current user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('meta_accounts')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      console.error('User profile fetch error:', profileError);
      return NextResponse.redirect(
        `${baseUrl}/dashboard/projects/${projectId}/plan?meta_error=user_profile_not_found`
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
      access_token: longLivedToken, // Store long-lived token
      token_expires_at: tokenExpiresAt, // Store expiration timestamp
      profile: {
        id: profile.id,
        name: profile.name,
        email: profile.email,
      },
      ad_accounts: normalizedAdAccounts,
      pixels: pixels, // Store pixels associated with ad accounts
      permissions: permissionsCheck || { verified: false, missing: [] },
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
        `${baseUrl}/dashboard/projects/${projectId}/plan?meta_error=save_failed`
      );
    }

    console.log('💾 Meta data saved successfully to user_profiles');

    // 4️⃣ Redirect back to plan page with success indicator
    return NextResponse.redirect(
      `${baseUrl}/dashboard/projects/${projectId}/plan?meta_connected=true`
    );
  } catch (err) {
    console.error('Callback error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
