import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * POST /api/analytics/insights
 * Body: { project_id: string }
 *
 * - Gets Meta insights for running ads (by campaign's ad sets)
 * - Saves into table 'running_campaigns' with structured logs for each adset
 * - Each log entry contains:
 *   - date: YYYY-MM-DD
 *   - timestamp: ISO timestamp
 *   - campaign_id: Meta campaign ID
 *   - adsets: Object with adset_id as keys, containing:
 *     - adset_id, adset_name, adset_status
 *     - impressions, reach, clicks, unique_clicks, spend
 *     - ctr, cpc, cpm, cpp, frequency
 *     - actions, action_values, cost_per_action_type
 *     - results (leads), cost_per_result, roas
 *   - summary: Aggregated totals across all adsets
 *
 * Database Schema Required:
 * CREATE TABLE running_campaigns (
 *   user_id UUID NOT NULL,
 *   project_id TEXT NOT NULL,
 *   campaign_id TEXT NOT NULL,
 *   logs JSONB DEFAULT '[]'::jsonb,
 *   created_at TIMESTAMPTZ DEFAULT NOW(),
 *   updated_at TIMESTAMPTZ DEFAULT NOW(),
 *   PRIMARY KEY (user_id, project_id)
 * );
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

    console.log(`📊 Starting insights fetch for campaign: ${campaignId}`);

    // 1) Fetch campaign-level insights (aggregated across all adsets)
    console.log('🔍 Fetching campaign-level insights...');
    const campaignInsightsResp = await fetch(
      `https://graph.facebook.com/v18.0/${campaignId}/insights?fields=impressions,clicks,spend,reach,ctr,cpc,cpm,cpp,actions,action_values,cost_per_action_type,frequency,unique_clicks&access_token=${accessToken}`
    );
    const campaignInsightsJson = await campaignInsightsResp.json();

    let campaignLevelData: any = null;
    if (campaignInsightsResp.ok && campaignInsightsJson.data && campaignInsightsJson.data.length > 0) {
      const cData = campaignInsightsJson.data[0];
      campaignLevelData = {
        impressions: cData.impressions || '0',
        reach: cData.reach || '0',
        clicks: cData.clicks || '0',
        unique_clicks: cData.unique_clicks || '0',
        spend: cData.spend || '0',
        ctr: cData.ctr || '0',
        cpc: cData.cpc || '0',
        cpm: cData.cpm || '0',
        cpp: cData.cpp || '0',
        frequency: cData.frequency || '0',
        actions: cData.actions || [],
        action_values: cData.action_values || [],
        cost_per_action_type: cData.cost_per_action_type || [],
        results: (() => {
          if (!cData.actions) return '0';
          const leadAction = cData.actions.find((a: any) => a.action_type === 'lead');
          return leadAction ? leadAction.value : '0';
        })(),
        cost_per_result: (() => {
          if (!cData.actions || !cData.spend) return '0';
          const leadAction = cData.actions.find((a: any) => a.action_type === 'lead');
          if (!leadAction || parseFloat(leadAction.value) === 0) return '0';
          return (parseFloat(cData.spend) / parseFloat(leadAction.value)).toFixed(2);
        })(),
        roas: (() => {
          if (!cData.actions || !cData.spend) return '0';
          const leadAction = cData.actions.find((a: any) => a.action_type === 'lead');
          if (!leadAction || parseFloat(cData.spend) === 0) return '0';
          return (parseFloat(leadAction.value) / parseFloat(cData.spend)).toFixed(2);
        })(),
        timestamp: new Date().toISOString(),
      };
      console.log(`✅ Campaign-level data:`, {
        impressions: campaignLevelData.impressions,
        clicks: campaignLevelData.clicks,
        spend: campaignLevelData.spend,
        ctr: campaignLevelData.ctr,
      });
    } else {
      console.log('⚠️ No campaign-level insights available yet');
      campaignLevelData = {
        error: 'No campaign data available',
        timestamp: new Date().toISOString(),
      };
    }

    // 2) Get ad sets under the campaign
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

    // 2) For each ad set, get daily insights (today) and comprehensive metrics
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const timeRange = { since: dateStr, until: dateStr };

    const perAdsetInsights: Record<string, any> = {};

    console.log(`📊 Fetching insights for ${adsets.length} ad sets...`);

    for (const adset of adsets) {
      try {
        const insightsUrl =
          `https://graph.facebook.com/v18.0/${adset.id}/insights?` +
          new URLSearchParams({
            fields:
              'impressions,reach,clicks,spend,ctr,cpc,cpm,cpp,actions,action_values,unique_clicks,frequency,cost_per_action_type,unique_actions,video_play_actions,video_avg_time_watched_actions',
            time_range: JSON.stringify(timeRange),
            time_increment: '1',
            access_token: accessToken,
          });

        const resp = await fetch(insightsUrl);
        const json = await resp.json();

        if (resp.ok && json?.data && json.data.length > 0) {
          const insightData = json.data[0];
          
          // Store comprehensive insights with adset metadata
          perAdsetInsights[adset.id] = {
            adset_id: adset.id,
            adset_name: adset.name || 'Unknown',
            adset_status: adset.effective_status || 'UNKNOWN',
            date: dateStr,
            impressions: insightData.impressions || '0',
            reach: insightData.reach || '0',
            clicks: insightData.clicks || '0',
            unique_clicks: insightData.unique_clicks || '0',
            spend: insightData.spend || '0',
            ctr: insightData.ctr || '0',
            cpc: insightData.cpc || '0',
            cpm: insightData.cpm || '0',
            cpp: insightData.cpp || '0',
            frequency: insightData.frequency || '0',
            actions: insightData.actions || [],
            action_values: insightData.action_values || [],
            unique_actions: insightData.unique_actions || [],
            cost_per_action_type: insightData.cost_per_action_type || [],
            video_play_actions: insightData.video_play_actions || [],
            video_avg_time_watched_actions: insightData.video_avg_time_watched_actions || [],
            // Calculate derived metrics
            results: (() => {
              if (!insightData.actions) return '0';
              const leadAction = insightData.actions.find((a: any) => a.action_type === 'lead');
              return leadAction ? leadAction.value : '0';
            })(),
            cost_per_result: (() => {
              if (!insightData.actions || !insightData.spend) return '0';
              const leadAction = insightData.actions.find((a: any) => a.action_type === 'lead');
              if (!leadAction || parseFloat(leadAction.value) === 0) return '0';
              return (parseFloat(insightData.spend) / parseFloat(leadAction.value)).toFixed(2);
            })(),
            roas: (() => {
              if (!insightData.actions || !insightData.spend) return '0';
              const leadAction = insightData.actions.find((a: any) => a.action_type === 'lead');
              if (!leadAction || parseFloat(insightData.spend) === 0) return '0';
              return (parseFloat(leadAction.value) / parseFloat(insightData.spend)).toFixed(2);
            })(),
            timestamp: new Date().toISOString(),
          };
          console.log(`✅ Adset ${adset.id} (${adset.name}): ${insightData.impressions} impressions, ${insightData.clicks} clicks`);
        } else {
          perAdsetInsights[adset.id] = {
            adset_id: adset.id,
            adset_name: adset.name || 'Unknown',
            adset_status: adset.effective_status || 'UNKNOWN',
            date: dateStr,
            error: json?.error || 'No data available',
            timestamp: new Date().toISOString(),
          };
          console.log(`⚠️ Adset ${adset.id} (${adset.name}): No data available`);
        }
      } catch (e: any) {
        perAdsetInsights[adset.id] = {
          adset_id: adset.id,
          adset_name: adset.name || 'Unknown',
          adset_status: adset.effective_status || 'UNKNOWN',
          date: dateStr,
          error: e?.message || 'fetch_error',
          timestamp: new Date().toISOString(),
        };
        console.error(`❌ Error fetching insights for adset ${adset.id}:`, e);
      }
    }

    // 3) Build logs array entry for today with structured data
    const todayLogEntry = {
      date: dateStr,
      timestamp: new Date().toISOString(),
      campaign_id: campaignId,
      campaign_data: campaignLevelData, // Campaign-level aggregated insights
      adsets: perAdsetInsights, // Structured with adset IDs as keys
      summary: {
        total_adsets: adsets.length,
        total_impressions: Object.values(perAdsetInsights).reduce((sum: number, adset: any) => 
          sum + (parseFloat(adset.impressions || '0')), 0),
        total_clicks: Object.values(perAdsetInsights).reduce((sum: number, adset: any) => 
          sum + (parseFloat(adset.clicks || '0')), 0),
        total_spend: Object.values(perAdsetInsights).reduce((sum: number, adset: any) => 
          sum + (parseFloat(adset.spend || '0')), 0).toFixed(2),
      },
    };

    console.log(`📈 Summary for ${dateStr}:`);
    console.log(`   - Campaign Level: ${campaignLevelData.impressions || '0'} impressions, ${campaignLevelData.clicks || '0'} clicks, $${campaignLevelData.spend || '0'} spent`);
    console.log(`   - Adsets Total: ${todayLogEntry.summary.total_impressions} impressions, ${todayLogEntry.summary.total_clicks} clicks, $${todayLogEntry.summary.total_spend} spent`);

    // 4) Upsert into running_campaigns (append to logs array)
    // Try fetch existing
    const { data: existing, error: existingError } = await supabase
      .from('running_campaigns')
      .select('user_id, project_id, campaign_id, logs, created_at')
      .eq('user_id', user.id)
      .eq('project_id', projectId)
      .single();

    let newLogs: any[] = [];
    if (existing && Array.isArray(existing.logs)) {
      // Replace log for same date if exists (to update with latest data), else append
      const filtered = existing.logs.filter((entry: any) => entry?.date !== dateStr);
      newLogs = [...filtered, todayLogEntry];
      
      // Keep only last 30 days of logs to prevent database bloat
      if (newLogs.length > 30) {
        newLogs = newLogs.slice(-30);
      }
      
      console.log(`📝 Updating existing campaign logs (${newLogs.length} days of data)`);
    } else {
      newLogs = [todayLogEntry];
      console.log(`📝 Creating new campaign log entry`);
    }

    const upsertPayload = {
      user_id: user.id,
      project_id: projectId,
      campaign_id: campaignId,
      logs: newLogs,
      updated_at: new Date().toISOString(),
    };

    const { error: upsertError } = await supabase
      .from('running_campaigns')
      .upsert(upsertPayload, { onConflict: 'user_id,project_id' });

    if (upsertError) {
      console.error('❌ Failed to save insights logs:', upsertError);
      return NextResponse.json(
        { error: 'Failed to save insights logs', details: upsertError.message },
        { status: 500 }
      );
    }

    console.log(`✅ Successfully saved insights for ${dateStr} with ${adsets.length} adsets`);

    return NextResponse.json({
      success: true,
      project_id: projectId,
      campaign_id: campaignId,
      logs_saved_for: dateStr,
      adset_count: adsets.length,
      total_logs: newLogs.length,
      summary: todayLogEntry.summary,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}


