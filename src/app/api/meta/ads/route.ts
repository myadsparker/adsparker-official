import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/meta/ads?ad_account_id=act_xxx
 * Fetch all ads from a specific Meta ad account
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

    // Get access token
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

    // Fetch ads from Meta API
    const adsResponse = await fetch(
      `https://graph.facebook.com/v18.0/${adAccountId}/ads?` +
        new URLSearchParams({
          fields:
            'id,name,status,created_time,updated_time,campaign_id,adset_id,creative{id,name,title,body,image_url,video_id,object_story_spec}',
          limit: '100',
          access_token: accessToken,
        }),
      { method: 'GET' }
    );

    if (!adsResponse.ok) {
      const errorData = await adsResponse.json();
      console.error('Meta API error:', errorData);
      return NextResponse.json(
        { error: 'Failed to fetch ads from Meta', details: errorData },
        { status: adsResponse.status }
      );
    }

    const adsData = await adsResponse.json();

    // Fetch insights for each ad
    const adsWithInsights = await Promise.all(
      (adsData.data || []).map(async (ad: any) => {
        try {
          const insightsResponse = await fetch(
            `https://graph.facebook.com/v18.0/${ad.id}/insights?` +
              new URLSearchParams({
                fields:
                  'impressions,clicks,spend,reach,ctr,cpc,cpm,actions,cost_per_action_type',
                access_token: accessToken,
              }),
            { method: 'GET' }
          );

          const insightsData = await insightsResponse.json();

          return {
            ...ad,
            insights: insightsData.data?.[0] || null,
          };
        } catch (err) {
          console.error(`Error fetching insights for ad ${ad.id}:`, err);
          return {
            ...ad,
            insights: null,
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      ads: adsWithInsights,
      total: adsWithInsights.length,
    });
  } catch (error) {
    console.error('Ads fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
