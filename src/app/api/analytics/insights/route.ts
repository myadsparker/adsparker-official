import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * POST /api/analytics/insights
 * Body: { project_id: string }
 *
 * - Gets Meta insights for running ads (by campaign's ad sets)
 * - Saves into table 'runinh_ads' with columns:
 *   - user_id
 *   - project_id
 *   - campaign_id
 *   - logs (array of per-day objects; each object has adset ids as keys with their insights data)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const projectId: string | undefined = body?.project_id;

    if (!projectId) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      );
    }

    // Fetch project to get campaign id
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('project_id, meta_campaign_id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const campaignId: string | undefined = project.meta_campaign_id;
    if (!campaignId) {
      return NextResponse.json(
        { error: 'No campaign linked to this project' },
        { status: 400 }
      );
    }

    // Get user's Meta access token
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('meta_accounts, meta_connected')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile?.meta_connected) {
      return NextResponse.json(
        { error: 'Meta account not connected' },
        { status: 400 }
      );
    }

    const metaAccounts = Array.isArray(profile.meta_accounts)
      ? profile.meta_accounts
      : [];
    if (metaAccounts.length === 0) {
      return NextResponse.json(
        { error: 'No Meta accounts found' },
        { status: 400 }
      );
    }

    const accessToken = metaAccounts[0].access_token;
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Meta access token not found' },
        { status: 400 }
      );
    }

    // 1) Get ad sets under the campaign
    const adsetsResp = await fetch(
      `https://graph.facebook.com/v18.0/${campaignId}/adsets?fields=id,name,effective_status&access_token=${accessToken}`
    );
    const adsetsJson = await adsetsResp.json();

    if (!adsetsResp.ok || adsetsJson.error) {
      return NextResponse.json(
        { error: 'Failed to fetch ad sets', details: adsetsJson.error || adsetsJson },
        { status: 400 }
      );
    }

    const adsets: Array<{ id: string; name?: string; effective_status?: string }> =
      Array.isArray(adsetsJson.data) ? adsetsJson.data : [];

    // 2) For each ad set, get daily insights (today)
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const timeRange = { since: dateStr, until: dateStr };

    const perAdsetInsights: Record<string, any> = {};

    for (const adset of adsets) {
      try {
        const insightsUrl =
          `https://graph.facebook.com/v18.0/${adset.id}/insights?` +
          new URLSearchParams({
            fields:
              'impressions,reach,clicks,spend,ctr,cpc,cpm,actions,action_values,unique_clicks,frequency',
            time_range: JSON.stringify(timeRange),
            time_increment: '1',
            access_token: accessToken,
          });

        const resp = await fetch(insightsUrl);
        const json = await resp.json();

        if (resp.ok && json?.data && json.data.length > 0) {
          // Store the first (daily) record
          perAdsetInsights[adset.id] = json.data[0];
        } else {
          perAdsetInsights[adset.id] = { data: [], error: json?.error || null };
        }
      } catch (e: any) {
        perAdsetInsights[adset.id] = { data: [], error: e?.message || 'fetch_error' };
      }
    }

    // 3) Build logs array entry for today
    const todayLogEntry = {
      date: dateStr,
      ...perAdsetInsights, // keys are adset ids with their data
    };

    // 4) Upsert into running_campaigns (append to logs array)
    // Try fetch existing
    const { data: existing, error: existingError } = await supabase
      .from('running_campaigns')
      .select('user_id, project_id, campaign_id, logs')
      .eq('user_id', user.id)
      .eq('project_id', projectId)
      .single();

    let newLogs: any[] = [];
    if (existing && Array.isArray(existing.logs)) {
      // Replace log for same date if exists, else append
      const filtered = existing.logs.filter((entry: any) => entry?.date !== dateStr);
      newLogs = [...filtered, todayLogEntry];
    } else {
      newLogs = [todayLogEntry];
    }

    const upsertPayload = {
      user_id: user.id,
      project_id: projectId,
      campaign_id: campaignId,
      logs: newLogs,
    };

    const { error: upsertError } = await supabase
      .from('running_campaigns')
      .upsert(upsertPayload, { onConflict: 'user_id,project_id' });

    if (upsertError) {
      return NextResponse.json(
        { error: 'Failed to save insights logs', details: upsertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      project_id: projectId,
      campaign_id: campaignId,
      logs_saved_for: dateStr,
      adset_count: adsets.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}


