import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/analytics?campaign_id=xxx&access_token=xxx
 * Fetch analytics for a Meta campaign
 * For testing in Postman - pass access_token as query parameter
 */
export async function GET(request: NextRequest) {
  try {
    // Get campaign_id and access_token from query params
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaign_id');
    const accessToken = searchParams.get('access_token');
    const datePreset = searchParams.get('date_preset') || 'last_7d'; // Allow custom date preset

    if (!campaignId) {
      return NextResponse.json(
        { error: 'campaign_id is required' },
        { status: 400 }
      );
    }

    if (!accessToken) {
      return NextResponse.json(
        { error: 'access_token is required' },
        { status: 400 }
      );
    }

    // Fetch insights from Meta API
    const insightsUrl = `https://graph.facebook.com/v18.0/${campaignId}/insights`;
    const params = new URLSearchParams({
      fields: [
        'impressions',
        'reach',
        'clicks',
        'spend',
        'ctr',
        'cpc',
        'cpm',
        'frequency',
        'actions',
        'cost_per_action_type',
        'date_start',
        'date_stop',
      ].join(','),
      date_preset: datePreset,
      access_token: accessToken,
    });

    const fullUrl = `${insightsUrl}?${params.toString()}`;
    const insightsResponse = await fetch(fullUrl);

    if (!insightsResponse.ok) {
      const errorData = await insightsResponse.json();
      return NextResponse.json(errorData, { status: insightsResponse.status });
    }

    const insightsData = await insightsResponse.json();
    return NextResponse.json(insightsData);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

