import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/meta/campaigns?ad_account_id=act_xxx
 * Fetch campaigns and ads from a specific Meta ad account
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

    // Get ad account ID from query params
    const { searchParams } = new URL(request.url);
    const adAccountId = searchParams.get('ad_account_id');

    if (!adAccountId) {
      return NextResponse.json(
        { error: 'ad_account_id is required' },
        { status: 400 }
      );
    }

    // Get user profile with meta accounts
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('meta_accounts, meta_connected')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile.meta_connected) {
      return NextResponse.json(
        { error: 'Meta account not connected' },
        { status: 403 }
      );
    }

    // Get access token from meta accounts
    const metaAccounts = Array.isArray(profile.meta_accounts)
      ? profile.meta_accounts
      : [];

    if (metaAccounts.length === 0) {
      return NextResponse.json(
        { error: 'No Meta accounts found' },
        { status: 404 }
      );
    }

    const accessToken = metaAccounts[0].access_token;

    // Fetch campaigns from Meta API
    const campaignsResponse = await fetch(
      `https://graph.facebook.com/v18.0/${adAccountId}/campaigns?` +
        new URLSearchParams({
          fields:
            'id,name,status,objective,daily_budget,lifetime_budget,created_time,updated_time,start_time,stop_time',
          access_token: accessToken,
        }),
      { method: 'GET' }
    );

    if (!campaignsResponse.ok) {
      const errorData = await campaignsResponse.json();
      console.error('Meta API error:', errorData);
      return NextResponse.json(
        { error: 'Failed to fetch campaigns from Meta', details: errorData },
        { status: campaignsResponse.status }
      );
    }

    const campaignsData = await campaignsResponse.json();

    // Fetch ads for each campaign
    const campaignsWithAds = await Promise.all(
      (campaignsData.data || []).map(async (campaign: any) => {
        try {
          // Fetch ads for this campaign
          const adsResponse = await fetch(
            `https://graph.facebook.com/v18.0/${campaign.id}/ads?` +
              new URLSearchParams({
                fields:
                  'id,name,status,created_time,updated_time,creative{id,name,title,body,image_url,object_story_spec}',
                access_token: accessToken,
              }),
            { method: 'GET' }
          );

          const adsData = await adsResponse.json();

          // Fetch insights (metrics) for the campaign
          const insightsResponse = await fetch(
            `https://graph.facebook.com/v18.0/${campaign.id}/insights?` +
              new URLSearchParams({
                fields:
                  'impressions,clicks,spend,reach,ctr,cpc,cpm,cost_per_action_type',
                access_token: accessToken,
              }),
            { method: 'GET' }
          );

          const insightsData = await insightsResponse.json();

          return {
            ...campaign,
            ads: adsData.data || [],
            insights: insightsData.data?.[0] || null,
          };
        } catch (err) {
          console.error(
            `Error fetching data for campaign ${campaign.id}:`,
            err
          );
          return {
            ...campaign,
            ads: [],
            insights: null,
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      campaigns: campaignsWithAds,
      total: campaignsWithAds.length,
    });
  } catch (error) {
    console.error('Campaigns fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
