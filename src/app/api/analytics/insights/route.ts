import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * Helper function to get LIVE exchange rate and convert currency to USD
 * NO FALLBACKS - will throw error if API fails
 */
async function getExchangeRateToUSD(fromCurrency: string): Promise<number> {
  if (fromCurrency === 'USD') {
    return 1.0;
  }

  const response = await fetch(
    `https://api.exchangerate-api.com/v4/latest/${fromCurrency}`
  );
  
  if (!response.ok) {
    throw new Error(`Failed to fetch exchange rate for ${fromCurrency}: HTTP ${response.status}`);
  }
  
  const data = await response.json();
  
  if (!data.rates || !data.rates.USD) {
    throw new Error(`USD rate not available for ${fromCurrency}`);
  }
  
  console.log(`💱 Live rate: 1 ${fromCurrency} = ${data.rates.USD} USD`);
  return data.rates.USD;
}

/**
 * Helper function to convert monetary values to USD
 */
function convertToUSD(value: string | number, rate: number): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return (numValue * rate).toFixed(2);
}

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

    // RATE LIMITING: Check if we fetched data recently (within last 15 minutes)
    const { data: existingCampaign } = await supabase
      .from('running_campaigns')
      .select('logs, updated_at')
      .eq('user_id', user.id)
      .eq('project_id', projectId)
      .single();

    if (existingCampaign && existingCampaign.logs && Array.isArray(existingCampaign.logs)) {
      const lastLog = existingCampaign.logs[existingCampaign.logs.length - 1];
      if (lastLog && lastLog.timestamp) {
        const lastFetchTime = new Date(lastLog.timestamp);
        const now = new Date();
        const minutesSinceLastFetch = (now.getTime() - lastFetchTime.getTime()) / (1000 * 60);
        
        // If fetched within last 15 minutes, return cached data
        if (minutesSinceLastFetch < 15) {
          console.log(`⚡ Using cached insights (fetched ${minutesSinceLastFetch.toFixed(1)} minutes ago)`);
          return NextResponse.json({
            success: true,
            cached: true,
            project_id: projectId,
            campaign_id: campaignId,
            logs_saved_for: lastLog.date,
            adset_count: Object.keys(lastLog.adsets || {}).length,
            logs: lastLog,
            message: `Using cached data from ${minutesSinceLastFetch.toFixed(1)} minutes ago. Refresh after 15 minutes to fetch new data.`
          });
        }
      }
    }

    console.log('🔄 Fetching fresh insights from Meta API...');

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

    // Detect ad account currency and get exchange rate
    let accountCurrency = 'USD';
    let exchangeRate = 1.0;
    
    try {
      // Fetch campaign details to get ad account ID
      const campaignResponse = await fetch(
        `https://graph.facebook.com/v18.0/${campaignId}?fields=account_id&access_token=${accessToken}`
      );
      const campaignData = await campaignResponse.json();
      
      if (campaignData.account_id && metaAccounts[0].ad_accounts) {
        const adAccount = metaAccounts[0].ad_accounts.find((acc: any) => 
          acc.account_id === campaignData.account_id || acc.id === `act_${campaignData.account_id}`
        );
        
        if (adAccount && adAccount.currency) {
          accountCurrency = adAccount.currency;
          console.log(`🌍 Detected ad account currency: ${accountCurrency}`);
          
          // Get exchange rate to USD
          exchangeRate = await getExchangeRateToUSD(accountCurrency);
        }
      }
    } catch (error) {
      console.error('Failed to detect currency, using USD:', error);
    }

    // 1) Fetch campaign-level insights (aggregated across all adsets)
    console.log('🔍 Fetching campaign-level insights...');
    const campaignInsightsResp = await fetch(
      `https://graph.facebook.com/v18.0/${campaignId}/insights?fields=impressions,clicks,spend,reach,ctr,cpc,cpm,cpp,actions,action_values,cost_per_action_type,frequency,unique_clicks&access_token=${accessToken}`
    );
    const campaignInsightsJson = await campaignInsightsResp.json();

    // Check for rate limit error on campaign-level fetch
    if (campaignInsightsJson.error && campaignInsightsJson.error.code === 17) {
      console.error('⚠️ Rate limit reached while fetching campaign insights');
      return NextResponse.json(
        { 
          error: 'Rate limit reached',
          message: 'Meta API rate limit exceeded. Please wait 15-30 minutes before refreshing insights.',
          error_code: 17,
          retry_after_minutes: 15
        },
        { status: 429 }
      );
    }

    let campaignLevelData: any = null;
    if (campaignInsightsResp.ok && campaignInsightsJson.data && campaignInsightsJson.data.length > 0) {
      const cData = campaignInsightsJson.data[0];
      campaignLevelData = {
        currency: 'USD', // All values are converted to USD
        original_currency: accountCurrency,
        exchange_rate: exchangeRate,
        impressions: cData.impressions || '0',
        reach: cData.reach || '0',
        clicks: cData.clicks || '0',
        unique_clicks: cData.unique_clicks || '0',
        spend: convertToUSD(cData.spend || '0', exchangeRate),
        ctr: cData.ctr || '0',
        cpc: convertToUSD(cData.cpc || '0', exchangeRate),
        cpm: convertToUSD(cData.cpm || '0', exchangeRate),
        cpp: cData.cpp ? convertToUSD(cData.cpp, exchangeRate) : '0',
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
          const spendUSD = parseFloat(convertToUSD(cData.spend, exchangeRate));
          return (spendUSD / parseFloat(leadAction.value)).toFixed(2);
        })(),
        leads_per_dollar: (() => {
          if (!cData.actions || !cData.spend) return '0';
          const leadAction = cData.actions.find((a: any) => a.action_type === 'lead');
          if (!leadAction || parseFloat(cData.spend) === 0) return '0';
          const spendUSD = parseFloat(convertToUSD(cData.spend, exchangeRate));
          return (parseFloat(leadAction.value) / spendUSD).toFixed(2);
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

    // Check for rate limit error when fetching adsets
    if (adsetsJson.error && adsetsJson.error.code === 17) {
      console.error('⚠️ Rate limit reached while fetching ad sets');
      return NextResponse.json(
        { 
          error: 'Rate limit reached',
          message: 'Meta API rate limit exceeded. Please wait 15-30 minutes before refreshing insights.',
          error_code: 17,
          retry_after_minutes: 15
        },
        { status: 429 }
      );
    }

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

    // Helper function to add delay between API calls (rate limiting)
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    for (let i = 0; i < adsets.length; i++) {
      const adset = adsets[i];
      
      try {
        // Add 500ms delay between each API call to avoid rate limits
        if (i > 0) {
          await delay(500);
        }

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

        // Handle rate limit errors specifically
        if (json.error && json.error.code === 17) {
          console.error(`⚠️ Rate limit hit for adset ${adset.id}. Stopping further requests.`);
          perAdsetInsights[adset.id] = {
            adset_id: adset.id,
            adset_name: adset.name || 'Unknown',
            adset_status: adset.effective_status || 'UNKNOWN',
            date: dateStr,
            error: 'Rate limit reached - data not available',
            error_code: 17,
            timestamp: new Date().toISOString(),
          };
          // Stop fetching more adsets to avoid further rate limiting
          break;
        }

        if (resp.ok && json?.data && json.data.length > 0) {
          const insightData = json.data[0];
          
          // Store comprehensive insights with adset metadata (all monetary values in USD)
          perAdsetInsights[adset.id] = {
            adset_id: adset.id,
            adset_name: adset.name || 'Unknown',
            adset_status: adset.effective_status || 'UNKNOWN',
            date: dateStr,
            currency: 'USD',
            original_currency: accountCurrency,
            exchange_rate: exchangeRate,
            impressions: insightData.impressions || '0',
            reach: insightData.reach || '0',
            clicks: insightData.clicks || '0',
            unique_clicks: insightData.unique_clicks || '0',
            spend: convertToUSD(insightData.spend || '0', exchangeRate),
            ctr: insightData.ctr || '0',
            cpc: convertToUSD(insightData.cpc || '0', exchangeRate),
            cpm: convertToUSD(insightData.cpm || '0', exchangeRate),
            cpp: insightData.cpp ? convertToUSD(insightData.cpp, exchangeRate) : '0',
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
              const spendUSD = parseFloat(convertToUSD(insightData.spend, exchangeRate));
              return (spendUSD / parseFloat(leadAction.value)).toFixed(2);
            })(),
            leads_per_dollar: (() => {
              if (!insightData.actions || !insightData.spend) return '0';
              const leadAction = insightData.actions.find((a: any) => a.action_type === 'lead');
              if (!leadAction || parseFloat(insightData.spend) === 0) return '0';
              const spendUSD = parseFloat(convertToUSD(insightData.spend, exchangeRate));
              return (parseFloat(leadAction.value) / spendUSD).toFixed(2);
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


