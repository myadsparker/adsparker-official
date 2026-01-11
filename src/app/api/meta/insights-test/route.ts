import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/meta/insights-test
 * 
 * Test endpoint to fetch ad-level insights from Meta
 * 
 * Query Parameters (choose one):
 * - adset_id: Meta ad set ID - Get insights for a specific ad set (most granular)
 *   OR
 * - campaign_id: Meta campaign ID - Get insights for a specific campaign (recommended)
 *   OR
 * - ad_account_id: Meta ad account ID (with or without 'act_' prefix) - Get insights for entire account
 * 
 * - access_token: Meta access token - REQUIRED (pass directly or will use logged-in user's token)
 * - since: Start date (YYYY-MM-DD) - optional, defaults to 30 days ago
 * - until: End date (YYYY-MM-DD) - optional, defaults to today
 * - level: Insight level (ad, adset, campaign) - optional, defaults to 'ad'
 * 
 * Examples:
 * GET /api/meta/insights-test?adset_id=120238432701110628&access_token=YOUR_TOKEN&level=ad
 * GET /api/meta/insights-test?campaign_id=120238432700750628&access_token=YOUR_TOKEN&level=ad
 * GET /api/meta/insights-test?ad_account_id=3903853616572664&access_token=YOUR_TOKEN&level=ad
 */
export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const campaignId = searchParams.get('campaign_id');
    const adAccountId = searchParams.get('ad_account_id');
    const adsetId = searchParams.get('adset_id');
    const accessTokenParam = searchParams.get('access_token');
    const since = searchParams.get('since');
    const until = searchParams.get('until');
    const level = searchParams.get('level') || 'ad';

    // Either campaign_id, ad_account_id, or adset_id is required
    if (!campaignId && !adAccountId && !adsetId) {
      return NextResponse.json(
        { 
          error: 'Either adset_id, campaign_id, or ad_account_id parameter is required',
          examples: {
            by_adset: '/api/meta/insights-test?adset_id=120238432701110628&access_token=YOUR_TOKEN&level=ad',
            by_campaign: '/api/meta/insights-test?campaign_id=120238432700750628&access_token=YOUR_TOKEN&level=ad',
            by_account: '/api/meta/insights-test?ad_account_id=3903853616572664&access_token=YOUR_TOKEN&level=ad'
          }
        },
        { status: 400 }
      );
    }

    // Get access token - either from parameter or from logged-in user
    let accessToken = accessTokenParam;

    if (!accessToken) {
      // Try to get from logged-in user
      const supabase = await createServerSupabaseClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        return NextResponse.json({ 
          error: 'access_token parameter is required or you must be logged in',
          example: '?ad_account_id=3903853616572664&access_token=YOUR_TOKEN'
        }, { status: 401 });
      }

      // Get user's Meta access token
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('meta_accounts')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile?.meta_accounts) {
        return NextResponse.json(
          { error: 'Meta account not connected or access_token parameter required' },
          { status: 400 }
        );
      }

      const metaAccount = Array.isArray(profile.meta_accounts)
        ? profile.meta_accounts[0]
        : profile.meta_accounts;

      accessToken = metaAccount.access_token;
      if (!accessToken) {
        return NextResponse.json(
          { error: 'Meta access token not found. Please provide access_token parameter.' },
          { status: 400 }
        );
      }
    }

    // Set default date range if not provided (last 30 days)
    const endDate = until || new Date().toISOString().split('T')[0];
    const startDate = since || (() => {
      const date = new Date();
      date.setDate(date.getDate() - 30);
      return date.toISOString().split('T')[0];
    })();

    const timeRange = {
      since: startDate,
      until: endDate,
    };

    // Build the Meta API URL based on adset_id, campaign_id, or ad_account_id
    let apiUrl: string;
    let queryType: string;
    let queryId: string;

    if (adsetId) {
      // Query by ad set ID (most granular)
      queryType = 'adset';
      queryId = adsetId;

      console.log('📊 Fetching insights by ad set:', {
        adset_id: adsetId,
        level,
        time_range: timeRange,
      });

      const params = new URLSearchParams({
        fields: 'ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,impressions,clicks,spend,reach,ctr,cpc,cpm,actions,date_start,date_stop',
        time_range: JSON.stringify(timeRange),
        level: level,
        access_token: accessToken,
        breakdowns: '',
      });

      apiUrl = `https://graph.facebook.com/v18.0/${adsetId}/insights?${params}`;
    } else if (campaignId) {
      // Query by campaign ID
      queryType = 'campaign';
      queryId = campaignId;

      console.log('📊 Fetching insights by campaign:', {
        campaign_id: campaignId,
        level,
        time_range: timeRange,
      });

      const params = new URLSearchParams({
        fields: 'ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,impressions,clicks,spend,reach,ctr,cpc,cpm,actions,date_start,date_stop',
        time_range: JSON.stringify(timeRange),
        level: level,
        access_token: accessToken,
        breakdowns: '',
      });

      apiUrl = `https://graph.facebook.com/v18.0/${campaignId}/insights?${params}`;
    } else {
      // Query by ad account ID
      const formattedAdAccountId = adAccountId!.startsWith('act_')
        ? adAccountId!
        : `act_${adAccountId}`;

      queryType = 'ad_account';
      queryId = formattedAdAccountId;

      console.log('📊 Fetching insights by ad account:', {
        ad_account_id: formattedAdAccountId,
        level,
        time_range: timeRange,
      });

      const params = new URLSearchParams({
        fields: 'ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,impressions,clicks,spend,reach,ctr,cpc,cpm,actions,date_start,date_stop',
        time_range: JSON.stringify(timeRange),
        level: level,
        access_token: accessToken,
        breakdowns: '',
      });

      apiUrl = `https://graph.facebook.com/v18.0/${formattedAdAccountId}/insights?${params}`;
    }

    console.log('🔗 API URL:', apiUrl.replace(accessToken, 'ACCESS_TOKEN_HIDDEN'));

    // Fetch insights from Meta
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!response.ok || data.error) {
      console.error('❌ Meta API Error:', data.error);
      return NextResponse.json(
        {
          error: 'Meta API Error',
          details: data.error,
          status: response.status,
        },
        { status: response.status || 400 }
      );
    }

    console.log(`✅ Successfully fetched ${data.data?.length || 0} insights`);

    // Return the insights data
    return NextResponse.json({
      success: true,
      query_type: queryType,
      [queryType === 'campaign' ? 'campaign_id' : 'ad_account_id']: queryId,
      level,
      time_range: timeRange,
      total_results: data.data?.length || 0,
      data: data.data || [],
      paging: data.paging || null,
      summary: data.data?.length > 0 ? {
        total_impressions: data.data.reduce((sum: number, item: any) => sum + parseInt(item.impressions || '0'), 0),
        total_clicks: data.data.reduce((sum: number, item: any) => sum + parseInt(item.clicks || '0'), 0),
        total_spend: data.data.reduce((sum: number, item: any) => sum + parseFloat(item.spend || '0'), 0).toFixed(2),
      } : null,
    });
  } catch (error: any) {
    console.error('❌ Error fetching insights:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/meta/insights-test
 * 
 * Same as GET but accepts body parameters
 * 
 * Body: {
 *   adset_id?: string - Use this to get insights for a specific ad set (most granular)
 *   campaign_id?: string - Use this to get insights for a specific campaign (recommended)
 *   ad_account_id?: string - Use this to get insights for entire account
 *   access_token: string - REQUIRED (or use logged-in user's token),
 *   since?: string,
 *   until?: string,
 *   level?: 'ad' | 'adset' | 'campaign'
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Get body parameters
    const body = await request.json();
    const { adset_id, campaign_id, ad_account_id, access_token: accessTokenParam, since, until, level = 'ad' } = body;

    // Either adset_id, campaign_id, or ad_account_id is required
    if (!adset_id && !campaign_id && !ad_account_id) {
      return NextResponse.json(
        { 
          error: 'Either adset_id, campaign_id, or ad_account_id in body is required',
          examples: {
            by_adset: {
              adset_id: '120238432701110628',
              access_token: 'YOUR_META_ACCESS_TOKEN',
              level: 'ad'
            },
            by_campaign: {
              campaign_id: '120238432700750628',
              access_token: 'YOUR_META_ACCESS_TOKEN',
              level: 'ad'
            },
            by_account: {
              ad_account_id: '3903853616572664',
              access_token: 'YOUR_META_ACCESS_TOKEN',
              level: 'ad'
            }
          }
        },
        { status: 400 }
      );
    }

    // Get access token - either from body or from logged-in user
    let accessToken = accessTokenParam;

    if (!accessToken) {
      // Try to get from logged-in user
      const supabase = await createServerSupabaseClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        return NextResponse.json({ 
          error: 'access_token in body is required or you must be logged in',
          example: {
            ad_account_id: '3903853616572664',
            access_token: 'YOUR_META_ACCESS_TOKEN'
          }
        }, { status: 401 });
      }

      // Get user's Meta access token
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('meta_accounts')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile?.meta_accounts) {
        return NextResponse.json(
          { error: 'Meta account not connected or access_token in body required' },
          { status: 400 }
        );
      }

      const metaAccount = Array.isArray(profile.meta_accounts)
        ? profile.meta_accounts[0]
        : profile.meta_accounts;

      accessToken = metaAccount.access_token;
      if (!accessToken) {
        return NextResponse.json(
          { error: 'Meta access token not found. Please provide access_token in body.' },
          { status: 400 }
        );
      }
    }

    // Set default date range if not provided (last 30 days)
    const endDate = until || new Date().toISOString().split('T')[0];
    const startDate = since || (() => {
      const date = new Date();
      date.setDate(date.getDate() - 30);
      return date.toISOString().split('T')[0];
    })();

    const timeRange = {
      since: startDate,
      until: endDate,
    };

    // Build the Meta API URL based on adset_id, campaign_id, or ad_account_id
    let apiUrl: string;
    let queryType: string;
    let queryId: string;

    if (adset_id) {
      // Query by ad set ID (most granular)
      queryType = 'adset';
      queryId = adset_id;

      console.log('📊 Fetching insights by ad set:', {
        adset_id: adset_id,
        level,
        time_range: timeRange,
      });

      const params = new URLSearchParams({
        fields: 'ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,impressions,clicks,spend,reach,ctr,cpc,cpm,actions,date_start,date_stop',
        time_range: JSON.stringify(timeRange),
        level: level,
        access_token: accessToken,
        breakdowns: '',
      });

      apiUrl = `https://graph.facebook.com/v18.0/${adset_id}/insights?${params}`;
    } else if (campaign_id) {
      // Query by campaign ID
      queryType = 'campaign';
      queryId = campaign_id;

      console.log('📊 Fetching insights by campaign:', {
        campaign_id: campaign_id,
        level,
        time_range: timeRange,
      });

      const params = new URLSearchParams({
        fields: 'ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,impressions,clicks,spend,reach,ctr,cpc,cpm,actions,date_start,date_stop',
        time_range: JSON.stringify(timeRange),
        level: level,
        access_token: accessToken,
        breakdowns: '',
      });

      apiUrl = `https://graph.facebook.com/v18.0/${campaign_id}/insights?${params}`;
    } else {
      // Query by ad account ID
      const formattedAdAccountId = ad_account_id!.startsWith('act_')
        ? ad_account_id!
        : `act_${ad_account_id}`;

      queryType = 'ad_account';
      queryId = formattedAdAccountId;

      console.log('📊 Fetching insights by ad account:', {
        ad_account_id: formattedAdAccountId,
        level,
        time_range: timeRange,
      });

      const params = new URLSearchParams({
        fields: 'ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,impressions,clicks,spend,reach,ctr,cpc,cpm,actions,date_start,date_stop',
        time_range: JSON.stringify(timeRange),
        level: level,
        access_token: accessToken,
        breakdowns: '',
      });

      apiUrl = `https://graph.facebook.com/v18.0/${formattedAdAccountId}/insights?${params}`;
    }

    console.log('🔗 API URL:', apiUrl.replace(accessToken, 'ACCESS_TOKEN_HIDDEN'));

    // Fetch insights from Meta
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!response.ok || data.error) {
      console.error('❌ Meta API Error:', data.error);
      return NextResponse.json(
        {
          error: 'Meta API Error',
          details: data.error,
          status: response.status,
        },
        { status: response.status || 400 }
      );
    }

    console.log(`✅ Successfully fetched ${data.data?.length || 0} insights`);

    // Return the insights data
    return NextResponse.json({
      success: true,
      query_type: queryType,
      [queryType === 'campaign' ? 'campaign_id' : 'ad_account_id']: queryId,
      level,
      time_range: timeRange,
      total_results: data.data?.length || 0,
      data: data.data || [],
      paging: data.paging || null,
      summary: data.data?.length > 0 ? {
        total_impressions: data.data.reduce((sum: number, item: any) => sum + parseInt(item.impressions || '0'), 0),
        total_clicks: data.data.reduce((sum: number, item: any) => sum + parseInt(item.clicks || '0'), 0),
        total_spend: data.data.reduce((sum: number, item: any) => sum + parseFloat(item.spend || '0'), 0).toFixed(2),
      } : null,
    });
  } catch (error: any) {
    console.error('❌ Error fetching insights:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

