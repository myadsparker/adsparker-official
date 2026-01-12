import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const action = searchParams.get('action');
    const returnUrl = searchParams.get('returnUrl'); // Get return URL from query params

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    if (action === 'connect') {
      // Generate OAuth URL for Meta/Facebook
      // Use our own callback route - Supabase callback doesn't work for custom OAuth flows
      let baseUrl =
        process.env.NEXT_PUBLIC_SITE_URL ||
        `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host') || 'localhost:3000'}`;
      
      // Normalize base URL (remove trailing slash, ensure proper protocol)
      baseUrl = baseUrl.trim().replace(/\/+$/, '');
      if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
        baseUrl = `https://${baseUrl}`;
      }
      
      const redirectUri = `${baseUrl}/api/meta-auth/callback`;
      
      // Log redirect URI for debugging (always log to help debug production issues)
      console.log('🔗 OAuth Redirect URI:', redirectUri);
      console.log('🔗 Base URL:', baseUrl);
      console.log('🔗 Return URL:', returnUrl || 'Not provided (will default to plan page)');
      console.log('🔗 NEXT_PUBLIC_SITE_URL:', process.env.NEXT_PUBLIC_SITE_URL || 'Not set');
      console.log('🔗 Host header:', request.headers.get('host'));
      console.log('🔗 X-Forwarded-Proto:', request.headers.get('x-forwarded-proto'));
      console.log('🔗 META_APP_ID:', process.env.META_APP_ID ? 'Set' : 'Missing');

      // Meta OAuth parameters with essential permissions only
      // Removed redundant: pages_manage_ads (covered by ads_management), manage_pages (not needed for ad management)
      const stateData = JSON.stringify({
        projectId,
        userId: user.id,
        action: 'connect',
        returnUrl: returnUrl || null, // Store return URL in state
      });
      
      const oauthParams = new URLSearchParams({
        client_id: process.env.META_APP_ID!,
        redirect_uri: redirectUri,
        scope:
          'email,public_profile,ads_management,business_management,ads_read,pages_show_list,pages_read_engagement,read_insights',
        response_type: 'code',
        state: stateData, // State will be automatically URL-encoded by URLSearchParams
      });

      const oauthUrl = `https://www.facebook.com/v18.0/dialog/oauth?${oauthParams.toString()}`;
      
      // Log OAuth URL (sanitized for security)
      console.log('🔗 Generated OAuth URL (sanitized):', oauthUrl.replace(/access_token=[^&]*/g, 'access_token=***').substring(0, 200) + '...');

      return NextResponse.json({
        success: true,
        oauthUrl,
        message: 'Redirect to Meta OAuth',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Meta auth error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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

    const body = await request.json();
    const { projectId, metaAccountData } = body;

    if (!projectId || !metaAccountData) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get current project data
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('meta_accounts')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Parse existing meta accounts or initialize empty array
    let existingAccounts = [];
    if (project.meta_accounts) {
      try {
        existingAccounts =
          typeof project.meta_accounts === 'string'
            ? JSON.parse(project.meta_accounts)
            : project.meta_accounts;
      } catch (e) {
        existingAccounts = [];
      }
    }

    // Check if account already exists
    const existingAccountIndex = existingAccounts.findIndex(
      (account: any) => account.account_id === metaAccountData.account_id
    );

    if (existingAccountIndex >= 0) {
      // Update existing account
      existingAccounts[existingAccountIndex] = {
        ...existingAccounts[existingAccountIndex],
        ...metaAccountData,
        updated_at: new Date().toISOString(),
      };
    } else {
      // Add new account
      existingAccounts.push({
        ...metaAccountData,
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    // Update project with new meta accounts data
    const { error: updateError } = await supabase
      .from('projects')
      .update({
        meta_accounts: JSON.stringify(existingAccounts),
        updated_at: new Date().toISOString(),
      })
      .eq('project_id', projectId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update project' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Meta account connected successfully',
      accounts: existingAccounts,
    });
  } catch (error) {
    console.error('Meta account save error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
