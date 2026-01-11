import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * API endpoint to create a Meta (Facebook) campaign
 * POST /api/meta/publish-campaign
 * 
 * Body: {
 *   projectId: string,
 *   campaignName: string,
 *   objective: string (default: 'OUTCOME_TRAFFIC'),
 *   adAccountId: string
 * }
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

    const body = await request.json();
    const { 
      projectId, 
      campaignName, 
      objective = 'OUTCOME_TRAFFIC', 
      adAccountId,
      specialAdCategories = []
    } = body;

    if (!projectId || !campaignName || !adAccountId) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId, campaignName, adAccountId' },
        { status: 400 }
      );
    }

    // Get user's Meta access token from user_profiles
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

    if (!userProfile.meta_connected || !userProfile.meta_accounts || userProfile.meta_accounts.length === 0) {
      return NextResponse.json(
        { error: 'Meta account not connected. Please connect your Meta account first.' },
        { status: 400 }
      );
    }

    // Get the access token from the first Meta account (you can enhance this to select specific account)
    const metaAccount = Array.isArray(userProfile.meta_accounts) 
      ? userProfile.meta_accounts[0] 
      : userProfile.meta_accounts;
    
    const accessToken = metaAccount.access_token;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Meta access token not found' },
        { status: 400 }
      );
    }

    // Ensure ad account ID has the 'act_' prefix
    const formattedAdAccountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;

    console.log('🚀 Creating Meta Campaign:', {
      name: campaignName,
      objective,
      adAccountId: formattedAdAccountId,
    });

    // Create campaign using Meta Graph API
    const campaignResponse = await fetch(
      `https://graph.facebook.com/v18.0/${formattedAdAccountId}/campaigns`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: campaignName,
          objective: objective,
          status: 'PAUSED', // Start as PAUSED for safety
          special_ad_categories: specialAdCategories,
          access_token: accessToken,
        }),
      }
    );

    const campaignData = await campaignResponse.json();
    
    if (!campaignResponse.ok || campaignData.error) {
      console.error('❌ Meta Campaign Creation Error:', campaignData);
      return NextResponse.json(
        { 
          error: 'Failed to create Meta campaign', 
          details: campaignData.error?.message || 'Unknown error',
          metaError: campaignData.error 
        },
        { status: 400 }
      );
    }

    console.log('✅ Meta Campaign Created:', campaignData);

    // Update project with campaign ID
    const { error: updateError } = await supabase
      .from('projects')
      .update({
        meta_campaign_id: campaignData.id,
        meta_campaign_name: campaignName,
        updated_at: new Date().toISOString(),
      })
      .eq('project_id', projectId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating project with campaign ID:', updateError);
    }

    return NextResponse.json({
      success: true,
      campaign: {
        id: campaignData.id,
        name: campaignName,
        objective: objective,
        status: 'PAUSED',
      },
      message: 'Campaign created successfully',
    });

  } catch (error: any) {
    console.error('❌ Error creating Meta campaign:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

