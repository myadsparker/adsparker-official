import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * API endpoint to create Meta (Facebook) ad sets
 * POST /api/meta/publish-adsets
 * 
 * Body: {
 *   projectId: string,
 *   campaignId: string,
 *   adSets: Array<{
 *     ad_set_title: string,
 *     age_range: { min: number, max: number },
 *     genders: string[],
 *     audience_tags: string[],
 *     targeting: object,
 *     daily_budget?: number
 *   }>,
 *   adAccountId: string,
 *   dailyBudget: number
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
      campaignId, 
      adSets,
      adAccountId,
      dailyBudget = 10 // Default $10/day in dollars
    } = body;

    if (!projectId || !campaignId || !adSets || !Array.isArray(adSets) || adSets.length === 0 || !adAccountId) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId, campaignId, adSets (array), adAccountId' },
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

    // Get the access token from the first Meta account
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

    console.log('🚀 Creating Meta Ad Sets:', {
      campaignId,
      count: adSets.length,
      adAccountId: formattedAdAccountId,
    });

    // Create ad sets
    const createdAdSets = [];
    const errors = [];

    for (let i = 0; i < adSets.length; i++) {
      const adSet = adSets[i];
      
      try {
        // Convert daily budget from dollars to cents (Meta API uses cents)
        const budgetInCents = Math.round((adSet.daily_budget || dailyBudget) * 100);

        // Build targeting object for Meta API
        const targeting: any = {
          age_min: adSet.age_range?.min || 18,
          age_max: adSet.age_range?.max || 65,
          geo_locations: {
            countries: adSet.targeting?.GeoLocations?.Countries || ['US'],
          },
        };

        // Handle genders: Meta API uses 0 (All), 1 (Male), 2 (Female)
        if (adSet.genders && adSet.genders.length > 0) {
          const gender = adSet.genders[0].toLowerCase();
          if (gender === 'male') {
            targeting.genders = [1];
          } else if (gender === 'female') {
            targeting.genders = [2];
          } else {
            targeting.genders = [0]; // All
          }
        }

        // Add interests if available from targeting
        if (adSet.targeting?.FlexibleSpec && adSet.targeting.FlexibleSpec.length > 0) {
          const flexibleSpec = adSet.targeting.FlexibleSpec[0];
          if (flexibleSpec.interests && flexibleSpec.interests.length > 0) {
            targeting.flexible_spec = [
              {
                interests: flexibleSpec.interests.map((interest: any) => ({
                  id: interest.id,
                  name: interest.name,
                })),
              },
            ];
          }
        }

        // Create ad set using Meta Graph API
        const adSetResponse = await fetch(
          `https://graph.facebook.com/v18.0/${formattedAdAccountId}/adsets`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: adSet.ad_set_title || `Ad Set ${i + 1}`,
              campaign_id: campaignId,
              daily_budget: budgetInCents,
              billing_event: 'IMPRESSIONS',
              optimization_goal: 'LINK_CLICKS',
              bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
              targeting: targeting,
              status: 'PAUSED', // Start as PAUSED for safety
              access_token: accessToken,
            }),
          }
        );

        const adSetData = await adSetResponse.json();
        
        if (!adSetResponse.ok || adSetData.error) {
          console.error(`❌ Meta Ad Set ${i + 1} Creation Error:`, adSetData);
          errors.push({
            adSetTitle: adSet.ad_set_title,
            error: adSetData.error?.message || 'Unknown error',
            details: adSetData.error,
          });
        } else {
          console.log(`✅ Meta Ad Set ${i + 1} Created:`, adSetData);
          createdAdSets.push({
            id: adSetData.id,
            name: adSet.ad_set_title,
            daily_budget: budgetInCents / 100, // Convert back to dollars for display
            status: 'PAUSED',
          });
        }
      } catch (error: any) {
        console.error(`❌ Error creating ad set ${i + 1}:`, error);
        errors.push({
          adSetTitle: adSet.ad_set_title,
          error: error.message,
        });
      }
    }

    // Save published ad sets to database
    if (createdAdSets.length > 0) {
      for (const adSet of createdAdSets) {
        await supabase.from('published_ads').insert({
          user_id: user.id,
          project_id: projectId,
          campaign_name: campaignId,
          ad_set_id: adSet.id,
          ad_account_id: formattedAdAccountId,
          daily_budget: adSet.daily_budget,
          status: 'published',
          published_at: new Date().toISOString(),
          metadata: {
            ad_set_name: adSet.name,
          },
        });
      }

      // Update subscription usage
      const { data: usage } = await supabase
        .from('subscription_usage')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (usage) {
        await supabase
          .from('subscription_usage')
          .update({
            ads_published_count: (usage.ads_published_count || 0) + createdAdSets.length,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);
      }
    }

    const response: any = {
      success: createdAdSets.length > 0,
      createdAdSets,
      totalRequested: adSets.length,
      totalCreated: createdAdSets.length,
      totalFailed: errors.length,
    };

    if (errors.length > 0) {
      response.errors = errors;
      response.message = `Created ${createdAdSets.length} out of ${adSets.length} ad sets. ${errors.length} failed.`;
    } else {
      response.message = `Successfully created ${createdAdSets.length} ad sets`;
    }

    return NextResponse.json(response, { 
      status: createdAdSets.length > 0 ? 200 : 400 
    });

  } catch (error: any) {
    console.error('❌ Error creating Meta ad sets:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

