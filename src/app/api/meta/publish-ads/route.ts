import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * API endpoint to publish complete ad campaign to Meta (Facebook)
 * This creates both the campaign and all ad sets in one go
 * 
 * POST /api/meta/publish-ads
 * 
 * Body: {
 *   projectId: string,
 *   campaignName: string,
 *   adSets: Array<AdSet>,
 *   adAccountId: string,
 *   dailyBudget: number,
 *   objective?: string
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
      adSets,
      adAccountId,
      pageId = null, // Optional: Facebook Page ID from user selection
      pixelId = null, // Pixel ID for promoted_object
      dailyBudget = 10, // Budget in USD from frontend                                                                                                  
      objective = 'OUTCOME_TRAFFIC',
      specialAdCategories = [],
      websiteUrl = null // Optional: URL for promoted_object in traffic campaigns
    } = body;

    // Log received budget information
    console.log('📊 API received budget data:', {
      dailyBudgetUSD: `$${dailyBudget} USD`,
      numberOfAdSets: adSets?.length || 0,
      firstAdSetBudget: adSets?.[0]?.daily_budget || 'not set',
      note: 'Budget in USD - will be converted to ad account currency',
      allAdSetBudgets: adSets?.map((a: any, i: number) => ({ 
        index: i, 
        budget: a.daily_budget || 'not set' 
      })) || []
    });

    if (!projectId || !campaignName || !adSets || !Array.isArray(adSets) || adSets.length === 0 || !adAccountId) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId, campaignName, adSets (array), adAccountId' },
        { status: 400 }
      );
    }

    // Subscription check temporarily disabled for testing
    // const { data: subscription } = await supabase
    //   .from('subscriptions')
    //   .select('*')
    //   .eq('user_id', user.id)
    //   .eq('status', 'active')
    //   .single();

    // if (!subscription) {
    //   return NextResponse.json(
    //     { error: 'Active subscription required to publish ads' },
    //     { status: 403 }
    //   );
    // }

    // Get user's Meta access token and subscription info from user_profiles
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('meta_accounts, meta_connected, is_subscribed, expiry_subscription')
      .eq('user_id', user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // SUBSCRIPTION CHECK DISABLED FOR TESTING
    // TODO: Re-enable for production
    /*
    // Check subscription status (including expiry date)
    const isSubscribedRaw = userProfile.is_subscribed || false;
    const expiryDate = userProfile.expiry_subscription;
    
    // If subscription has expiry date, check if it's still valid
    let isSubscribed = isSubscribedRaw;
    if (isSubscribedRaw && expiryDate) {
      const expiry = new Date(expiryDate);
      const now = new Date();
      if (now > expiry) {
        // Subscription has expired
        isSubscribed = false;
      }
    }

    // Check if user has active subscription
    if (!isSubscribed) {
      return NextResponse.json(
        { 
          error: 'Active subscription required to publish ads',
          message: 'Your subscription has expired. Please renew your subscription to continue publishing ads.',
          expired: expiryDate ? new Date(expiryDate) < new Date() : false
        },
        { status: 403 }
      );
    }
    */

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

    // Fetch project data to get thumbnail images (object) and campaign proposal (for end_date)
    let projectThumbnailImages: Record<string, string> = {};
    let projectCampaignProposal: any = null;
    try {
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('adset_thumbnail_image, campaign_proposal')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .single();

      if (!projectError && projectData?.adset_thumbnail_image) {
        try {
          // Parse thumbnail object
          const thumbnails = typeof projectData.adset_thumbnail_image === 'string'
            ? JSON.parse(projectData.adset_thumbnail_image)
            : projectData.adset_thumbnail_image;
          
          if (typeof thumbnails === 'object' && thumbnails !== null && !Array.isArray(thumbnails)) {
            projectThumbnailImages = thumbnails;
          } else if (typeof thumbnails === 'string') {
            // Old format: single string, use as default for backward compatibility
            projectThumbnailImages = { default: thumbnails };
          }
        } catch (e) {
          // If parsing fails, treat as old format string
          if (typeof projectData.adset_thumbnail_image === 'string') {
            projectThumbnailImages = { default: projectData.adset_thumbnail_image };
          }
        }
      } else {
      }

      if (!projectError && projectData?.campaign_proposal) {
        // Parse campaign_proposal if it's a string
        projectCampaignProposal = typeof projectData.campaign_proposal === 'string'
          ? JSON.parse(projectData.campaign_proposal)
          : projectData.campaign_proposal;
      }
    } catch (error) {
    }

    // Get currency from selected ad account (from meta_accounts data in user profile)
    let accountCurrency = 'USD'; // Default
    let minDailyBudget = 1.00; // Default minimum in USD
    
    console.log(`🔍 Looking for currency in ad account: ${formattedAdAccountId}`);
    
    // Get currency from meta_accounts.ad_accounts array
    if (userProfile.meta_accounts && Array.isArray(userProfile.meta_accounts)) {
      const metaAccount = userProfile.meta_accounts[0]; // First meta account
      if (metaAccount.ad_accounts && Array.isArray(metaAccount.ad_accounts)) {
        // Find the selected ad account
        const selectedAccount = metaAccount.ad_accounts.find((acc: any) => 
          acc.id === formattedAdAccountId || acc.account_id === adAccountId.replace('act_', '')
        );
        
        if (selectedAccount && selectedAccount.currency) {
          accountCurrency = selectedAccount.currency;
          console.log(`✅ Found currency in meta_accounts: ${accountCurrency}`);
        } else {
          console.log(`⚠️ Selected ad account not found in meta_accounts, fetching from Meta API...`);
          
          // Fallback: Fetch from Meta API
          try {
            const accountResponse = await fetch(
              `https://graph.facebook.com/v18.0/${formattedAdAccountId}?fields=currency&access_token=${accessToken}`
            );
            const accountData = await accountResponse.json();
            if (accountResponse.ok && accountData.currency) {
              accountCurrency = accountData.currency;
              console.log(`✅ Fetched currency from Meta API: ${accountCurrency}`);
            }
          } catch (error) {
            console.log('⚠️ Failed to fetch currency from Meta API, using USD');
          }
        }
      }
    }
    
    console.log(`🌍 Ad Account Currency: ${accountCurrency}`);
    
    // Set minimum budgets based on currency
    const minBudgets: { [key: string]: number } = {
      'INR': 40.00,  // ₹40 minimum for INR
      'USD': 1.00,   // $1.00 minimum for USD
      'EUR': 1.00,   // €1.00 minimum for EUR
      'GBP': 1.00,   // £1.00 minimum for GBP
      'AUD': 1.50,   // A$1.50 minimum for AUD
      'CAD': 1.50,   // C$1.50 minimum for CAD
    };
    minDailyBudget = minBudgets[accountCurrency] || minBudgets['USD'];
    console.log(`💰 Minimum daily budget for ${accountCurrency}: ${minDailyBudget}`);
    
    // Convert USD budget to account currency using live exchange rates
    let exchangeRate = 1.0; // Default for USD to USD
    
    if (accountCurrency !== 'USD') {
      try {
        console.log(`💱 Fetching live exchange rate: USD → ${accountCurrency}`);
        
        // Using free ExchangeRate-API (no API key needed for basic usage)
        const exchangeResponse = await fetch(
          `https://api.exchangerate-api.com/v4/latest/USD`
        );
        
        const exchangeData = await exchangeResponse.json();
        
        if (exchangeResponse.ok && exchangeData.rates && exchangeData.rates[accountCurrency]) {
          exchangeRate = exchangeData.rates[accountCurrency];
          console.log(`✅ Live exchange rate: 1 USD = ${exchangeRate} ${accountCurrency}`);
        } else {
          console.log(`⚠️ Could not fetch live rate, using fallback rates`);
          // Fallback exchange rates
          const fallbackRates: { [key: string]: number } = {
            'INR': 83.00,
            'EUR': 0.92,
            'GBP': 0.79,
            'AUD': 1.53,
            'CAD': 1.36,
            'SGD': 1.35,
          };
          exchangeRate = fallbackRates[accountCurrency] || 1.0;
          console.log(`📊 Using fallback rate: 1 USD = ${exchangeRate} ${accountCurrency}`);
        }
      } catch (error) {
        console.log(`⚠️ Exchange rate API error, using fallback rates`);
        // Fallback exchange rates
        const fallbackRates: { [key: string]: number } = {
          'INR': 83.00,
          'EUR': 0.92,
          'GBP': 0.79,
          'AUD': 1.53,
          'CAD': 1.36,
          'SGD': 1.35,
        };
        exchangeRate = fallbackRates[accountCurrency] || 1.0;
        console.log(`📊 Using fallback rate: 1 USD = ${exchangeRate} ${accountCurrency}`);
      }
    }

    // Get user's Facebook page (required for link ads)
    // Use pageId from request body if provided, otherwise try to fetch automatically
    let finalPageId: string | null = pageId;

    if (!finalPageId) {
      try {
        // Method 1: Try to get pages from user's accounts
        const pagesResponse = await fetch(
          `https://graph.facebook.com/v18.0/me/accounts?fields=id,name&access_token=${accessToken}`
        );
        const pagesData = await pagesResponse.json();
        if (pagesResponse.ok && pagesData.data && pagesData.data.length > 0) {
          finalPageId = pagesData.data[0].id;
        } else {
          // Method 2: Try to get pages from ad account
          const adAccountPagesResponse = await fetch(
            `https://graph.facebook.com/v18.0/${formattedAdAccountId}/promote_pages?access_token=${accessToken}`
          );
          const adAccountPagesData = await adAccountPagesResponse.json();
          if (adAccountPagesResponse.ok && adAccountPagesData.data && adAccountPagesData.data.length > 0) {
            finalPageId = adAccountPagesData.data[0].id;
          } else {
            // Method 3: Try to get pages the user manages
            const managedPagesResponse = await fetch(
              `https://graph.facebook.com/v18.0/me?fields=accounts{id,name}&access_token=${accessToken}`
            );
            const managedPagesData = await managedPagesResponse.json();
            if (managedPagesResponse.ok && managedPagesData.accounts && managedPagesData.accounts.data && managedPagesData.accounts.data.length > 0) {
              finalPageId = managedPagesData.accounts.data[0].id;
            }
          }
        }

        if (!finalPageId) {
          return NextResponse.json(
            {
              error: 'Facebook Page is required',
              message: 'To create link ads, you need to connect a Facebook Page to your account. Please create or connect a Facebook Page and try again.',
              details: 'Link ads require a page_id. Please ensure you have a Facebook Page associated with your account.'
            },
            { status: 400 }
          );
        }
      } catch (error) {
        return NextResponse.json(
          {
            error: 'Failed to fetch Facebook pages',
            message: 'Could not retrieve Facebook pages. Please ensure you have a Facebook Page connected to your account.',
            details: error instanceof Error ? error.message : 'Unknown error'
          },
          { status: 400 }
        );
      }
    } else {
      }

    // Publish ALL ad sets (no limit)
    const adSetsLimited = Array.isArray(adSets) && adSets.length > 0 ? adSets : [];

    // Normalize scheduling fields
    // Start immediately (no start_time)
    const normalizedStartTime: string | null = null;

    // Get end date from project's campaign_proposal.end_date (if present)
    const projectEndDate: string | null =
      projectCampaignProposal && typeof projectCampaignProposal === 'object'
        ? (projectCampaignProposal.end_date || null)
        : null;

    // If end date provided on project:
    // - If it's ISO with time, use as-is
    // - If it's date-only, set to end of day UTC
    let normalizedEndTime: string | null = null;
    if (projectEndDate) {
      const looksIso = typeof projectEndDate === 'string' && projectEndDate.includes('T');
      normalizedEndTime = looksIso
        ? new Date(projectEndDate).toISOString()
        : new Date(`${projectEndDate}T23:59:59Z`).toISOString();
    }

    // Step 1: Create Campaign
    console.log(`🚀 Step 1: Creating Campaign...`, {
      campaignName: campaignName,
      objective: objective,
      adAccountId: formattedAdAccountId,
      status: 'ACTIVE',
      specialAdCategories: specialAdCategories,
    });

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
          status: 'ACTIVE',
          special_ad_categories: specialAdCategories,
          // Required field: Must specify True or False when using ad set budgets (not campaign budget)
          is_adset_budget_sharing_enabled: false, // Set to true to enable 20% budget sharing optimization
          access_token: accessToken,
        }),
      }
    );

    const campaignData = await campaignResponse.json();

    console.log(`📥 Campaign creation response:`, {
      status: campaignResponse.status,
      statusText: campaignResponse.statusText,
      ok: campaignResponse.ok,
      hasError: !!campaignData.error,
      campaignId: campaignData.id,
      error: campaignData.error ? {
        message: campaignData.error.message,
        type: campaignData.error.type,
        code: campaignData.error.code,
        error_subcode: campaignData.error.error_subcode,
        error_user_title: campaignData.error.error_user_title,
        error_user_msg: campaignData.error.error_user_msg,
        fbtrace_id: campaignData.error.fbtrace_id,
      } : null,
    });

    if (!campaignResponse.ok || campaignData.error) {
      console.error(`❌ Campaign creation FAILED:`, {
        campaignName: campaignName,
        errorDetails: {
          message: campaignData.error?.message,
          type: campaignData.error?.type,
          code: campaignData.error?.code,
          error_subcode: campaignData.error?.error_subcode,
          error_user_title: campaignData.error?.error_user_title,
          error_user_msg: campaignData.error?.error_user_msg,
          fbtrace_id: campaignData.error?.fbtrace_id,
          fullError: campaignData.error,
        },
        httpStatus: campaignResponse.status,
        httpStatusText: campaignResponse.statusText,
        responseBody: campaignData,
      });

      return NextResponse.json(
        {
          error: 'Failed to create Meta campaign',
          details: campaignData.error?.message || 'Unknown error',
          metaError: campaignData.error
        },
        { status: 400 }
      );
    }

    const campaignId = campaignData.id;
    console.log(`✅ Campaign created successfully:`, {
      campaignId: campaignId,
      campaignName: campaignName,
    });

    // Helper function to upload image and get hash
    const uploadImageToMeta = async (imageUrl: string): Promise<string> => {
      // Verify the image URL is accessible before uploading
      try { 
        const imageCheckResponse = await fetch(imageUrl, { method: 'HEAD' });
        if (!imageCheckResponse.ok) {
          }
      } catch (checkError) {
        // Continue anyway
      }

      // Method 1: Try URL method first (faster if it works)
      let imageUploadData: any = null;
      let uploadMethod = 'URL';

      try {
        const uploadParams: URLSearchParams = new URLSearchParams({
          url: imageUrl,
          access_token: accessToken,
        });

        const urlUploadResponse: Response = await fetch(
          `https://graph.facebook.com/v18.0/${formattedAdAccountId}/adimages?${uploadParams.toString()}`,
          {
            method: 'GET',
          }
        );
        imageUploadData = await urlUploadResponse.json();

        if (urlUploadResponse.ok && imageUploadData.data && imageUploadData.data.length > 0) {
          // Success with URL method
          const imageHash = imageUploadData.data[0].hash;
          return imageHash;
        } else {
          // URL method failed, try binary upload
          uploadMethod = 'BINARY';
          throw new Error('URL method failed, trying binary');
        }
      } catch (urlError) {
        // If URL method fails, download image and upload as binary
        if (uploadMethod === 'BINARY' || !imageUploadData?.data?.length) {

          // Download the image
          const imageResponse = await fetch(imageUrl, {
            method: 'GET',
            headers: {
              'Accept': 'image/*',
            },
          });

          if (!imageResponse.ok) {
            throw new Error(`Failed to download image: ${imageResponse.status} ${imageResponse.statusText}`);
          }

          // Get content type from response
          const contentType = imageResponse.headers.get('content-type') || 'image/png';

          // Convert response to buffer
          const imageBuffer = await imageResponse.arrayBuffer();

          if (imageBuffer.byteLength === 0) {
            throw new Error('Downloaded image is empty (0 bytes)');
          }

          if (imageBuffer.byteLength < 100) {
            const text = new TextDecoder().decode(imageBuffer);
            throw new Error('Downloaded content is not a valid image');
          }


          // Convert to Node.js Buffer
          const Buffer = require('buffer').Buffer;
          const nodeBuffer = Buffer.from(imageBuffer);

          // Use form-data package for proper multipart/form-data upload
          const FormData = require('form-data');
          const formData = new FormData();

          formData.append('bytes', nodeBuffer, {
            filename: 'ad-image.png',
            contentType: contentType,
          });

          // Upload using POST with multipart/form-data
          const multipartUploadResponse = await fetch(
            `https://graph.facebook.com/v18.0/${formattedAdAccountId}/adimages?access_token=${accessToken}`,
            {
              method: 'POST',
              body: formData as any,
              headers: {
                ...formData.getHeaders(),
              },
            }
          );

          imageUploadData = await multipartUploadResponse.json();

          if (imageUploadData.data && imageUploadData.data.length > 0) {
            const imageHash = imageUploadData.data[0].hash;
            return imageHash;
          } else {
            throw new Error(`Binary upload failed: ${JSON.stringify(imageUploadData)}`);
          }
        }
      }

      throw new Error('Failed to upload image with both methods');
    };

    // Cache for uploaded images (URL -> hash) to avoid re-uploading same image
    const imageHashCache: Record<string, string> = {};

    // Step 2: Create Ad Sets
    const createdAdSets = [];
    const errors = [];

    for (let i = 0; i < adSetsLimited.length; i++) {

      const adSet: any = adSetsLimited[i];

      try {
        // Get the budget for this ad set (in USD from frontend)
        let budgetInUSD = adSet.daily_budget || dailyBudget;
        
        // Convert USD to account currency using live exchange rate
        let budgetInAccountCurrency = budgetInUSD * exchangeRate;

        console.log(`💱 Ad Set ${i + 1} conversion:`, {
          inputUSD: `$${budgetInUSD.toFixed(2)}`,
          exchangeRate: `1 USD = ${exchangeRate} ${accountCurrency}`,
          converted: `${budgetInAccountCurrency.toFixed(2)} ${accountCurrency}`
        });

        // Ensure budget meets minimum requirement for this currency
        if (budgetInAccountCurrency < minDailyBudget) {
          console.log(`⚠️ Ad Set ${i + 1}: Budget ${budgetInAccountCurrency.toFixed(2)} ${accountCurrency} is below minimum ${minDailyBudget} ${accountCurrency}, adjusting to minimum`);
          budgetInAccountCurrency = minDailyBudget;
        }

        // Convert daily budget to smallest currency unit (cents/paise)
        // Meta API uses the smallest currency unit (100 cents = $1, 100 paise = ₹1)
        const budgetInSmallestUnit = Math.round(budgetInAccountCurrency * 100);

        console.log(`💵 Ad Set ${i + 1} (${adSet.ad_set_title}):`, {
          originalUSD: `$${budgetInUSD.toFixed(2)}`,
          convertedTo: `${budgetInAccountCurrency.toFixed(2)} ${accountCurrency}`,
          budgetInSmallestUnit: budgetInSmallestUnit,
          calculation: `${budgetInAccountCurrency.toFixed(2)} ${accountCurrency} × 100 = ${budgetInSmallestUnit} ${accountCurrency === 'INR' ? 'paise' : accountCurrency === 'USD' ? 'cents' : 'smallest unit'}`
        });


        // Build targeting object for Meta API
        let ageMin = adSet.age_range?.min || 18;
        let ageMax = adSet.age_range?.max || 65;

        // When advantage_audience is enabled:
        // - age_min cannot be higher than 25
        // - age_max cannot be lower than 65
        const willEnableAdvantageAudience = true; // We're enabling it below
        if (willEnableAdvantageAudience) {
          if (ageMin > 25) {
            ageMin = 25;
          }
          if (ageMax < 65) {
            ageMax = 65;
          }
        }

        const targeting: any = {
          age_min: ageMin,
          age_max: ageMax,
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

        // Add targeting_automation with advantage_audience flag (required by Meta)
        targeting.targeting_automation = {
          advantage_audience: 1, // 1 = enabled, 0 = disabled
        };

        // Build promoted_object based on campaign goal
        // Get goal from campaign_proposal (saved from confirming page)
        const campaignGoal = projectCampaignProposal?.ad_goal || 'Traffic'; // Default to Traffic
        const isTrafficGoal = campaignGoal === 'Traffic' || objective === 'OUTCOME_TRAFFIC';
        const isLeadsGoal = campaignGoal === 'Leads' || objective === 'OUTCOME_LEADS';
        const isEngagementGoal = campaignGoal === 'Engagement' || objective === 'OUTCOME_ENGAGEMENT';

        let promotedObject: any = null;
        
        if (isEngagementGoal) {
          // For Engagement campaigns: use page_id (Meta's recommended approach for Page engagement)
          // This optimizes for likes, comments, shares, and other page interactions
          if (finalPageId) {
            promotedObject = {
              page_id: finalPageId,
            };
          }
        } else if (pixelId) {
          if (isTrafficGoal) {
            // For Traffic campaigns: use pixel_id with PAGE_VIEW event
            promotedObject = {
              pixel_id: pixelId,
              custom_event_type: 'PAGE_VIEW',
            };
          } else if (isLeadsGoal) {
            // For Leads campaigns: use pixel_id with LEAD event and page_id
            promotedObject = {
              pixel_id: pixelId,
              custom_event_type: 'LEAD',
              ...(finalPageId ? { object_id: finalPageId } : {}),
            };
          }
        }

        // Set optimization_goal based on campaign objective
        // For engagement campaigns, use POST_ENGAGEMENT to optimize for likes, comments, shares
        // For traffic/leads campaigns, use LINK_CLICKS
        let optimizationGoal = 'LINK_CLICKS';
        if (isEngagementGoal) {
          optimizationGoal = 'POST_ENGAGEMENT'; // Optimizes for post interactions (likes, comments, shares)
        }

        // Create ad set using Meta Graph API
        const adSetPayload: any = {
          name: adSet.ad_set_title || `Ad Set ${i + 1}`,
          campaign_id: campaignId,
          daily_budget: budgetInSmallestUnit,
          billing_event: 'IMPRESSIONS',
          optimization_goal: optimizationGoal,
          bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
          targeting: targeting,
          status: 'ACTIVE',
          ...(normalizedStartTime ? { start_time: normalizedStartTime } : {}),
          ...(normalizedEndTime ? { end_time: normalizedEndTime } : {}),
          ...(promotedObject ? { promoted_object: promotedObject } : {}),
          access_token: accessToken,
        };

        console.log(`📤 Creating Ad Set ${i + 1}/${adSetsLimited.length} for "${adSet.ad_set_title}"...`, {
          campaignId: campaignId,
          budgetInSmallestUnit: budgetInSmallestUnit,
          budgetInAccountCurrency: `${budgetInAccountCurrency.toFixed(2)} ${accountCurrency}`,
          optimizationGoal: optimizationGoal,
        });

        const adSetResponse = await fetch(
          `https://graph.facebook.com/v18.0/${formattedAdAccountId}/adsets`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(adSetPayload),
          }
        );

        const adSetData = await adSetResponse.json();

        console.log(`📥 Ad Set creation response for "${adSet.ad_set_title}":`, {
          status: adSetResponse.status,
          statusText: adSetResponse.statusText,
          ok: adSetResponse.ok,
          hasError: !!adSetData.error,
          adSetId: adSetData.id,
          error: adSetData.error ? {
            message: adSetData.error.message,
            type: adSetData.error.type,
            code: adSetData.error.code,
            error_subcode: adSetData.error.error_subcode,
            error_user_title: adSetData.error.error_user_title,
            error_user_msg: adSetData.error.error_user_msg,
            fbtrace_id: adSetData.error.fbtrace_id,
          } : null,
        });

        if (!adSetResponse.ok || adSetData.error) {
          console.error(`❌ Ad Set creation FAILED for "${adSet.ad_set_title}":`, {
            errorDetails: {
              message: adSetData.error?.message,
              type: adSetData.error?.type,
              code: adSetData.error?.code,
              error_subcode: adSetData.error?.error_subcode,
              error_user_title: adSetData.error?.error_user_title,
              error_user_msg: adSetData.error?.error_user_msg,
              fbtrace_id: adSetData.error?.fbtrace_id,
              fullError: adSetData.error,
            },
            httpStatus: adSetResponse.status,
            httpStatusText: adSetResponse.statusText,
            responseBody: adSetData,
          });

          errors.push({
            adSetTitle: adSet.ad_set_title,
            error: adSetData.error?.message || 'Unknown error',
            details: adSetData.error,
            errorType: adSetData.error?.error_user_title || 'Unknown',
            errorSubcode: adSetData.error?.error_subcode,
            errorCode: adSetData.error?.code,
            errorMessage: adSetData.error?.error_user_msg || adSetData.error?.message,
            fbtraceId: adSetData.error?.fbtrace_id,
          });
        } else {
          const adSetId = adSetData.id;
          console.log(`✅ Ad Set created successfully for "${adSet.ad_set_title}":`, {
            adSetId: adSetId,
            campaignId: campaignId,
          });

          // Step 3: Create Ad Creative
          console.log(`🚀 Step 3: Creating Ad Creative for "${adSet.ad_set_title}"...`, {
            adSetId: adSetId,
            pageId: finalPageId,
          });

          // Get ad copy
          const headline = adSet.ad_copywriting_title || campaignName;
          const primaryText = adSet.ad_copywriting_body || '';
          const description = adSet.audience_description || '';

          // Create ad creative with link data
          // page_id is required for link ads - we've already validated it exists above
          if (!finalPageId) {
            throw new Error('Facebook Page ID is required but not found. This should not happen.');
          }

          // Get thumbnail image for this specific adset
          const adSetThumbnailUrl = projectThumbnailImages[adSet.ad_set_id] || 
                                    projectThumbnailImages['default'] || 
                                    Object.values(projectThumbnailImages)[0];

          if (!adSetThumbnailUrl) {
            errors.push({
              adSetTitle: adSet.ad_set_title,
              error: 'No thumbnail image found for this ad set',
              details: 'Please set a thumbnail image for this ad set',
            });
            continue;
          }

          // Upload image (use cache if already uploaded)
          let imageHash: string;
          if (imageHashCache[adSetThumbnailUrl]) {
            imageHash = imageHashCache[adSetThumbnailUrl];
          } else {
            try {
              imageHash = await uploadImageToMeta(adSetThumbnailUrl);
              imageHashCache[adSetThumbnailUrl] = imageHash;
            } catch (uploadError: any) {
              errors.push({
                adSetTitle: adSet.ad_set_title,
                error: `Failed to upload thumbnail image: ${uploadError.message}`,
                details: uploadError,
              });
              continue;
            }
          }

          const creativePayload: any = {
            name: `${adSet.ad_set_title} - Creative`,
            object_story_spec: {
              page_id: finalPageId, // Required for link ads
              link_data: {
                link: websiteUrl || 'https://www.example.com',
                message: primaryText || headline,
                name: headline,
                description: description,
                call_to_action: {
                  type: 'LEARN_MORE',
                },
                image_hash: imageHash, // Always use the uploaded image from adset_thumbnail_image
              },
            },
            access_token: accessToken,
          };

          console.log(`📤 Creating creative for "${adSet.ad_set_title}"...`, {
            pageId: finalPageId,
            imageHash: imageHash,
            headline: headline.substring(0, 50) + '...',
          });

          const creativeResponse = await fetch(
            `https://graph.facebook.com/v18.0/${formattedAdAccountId}/adcreatives`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(creativePayload),
            }
          );

          const creativeData = await creativeResponse.json();

          console.log(`📥 Creative creation response for "${adSet.ad_set_title}":`, {
            status: creativeResponse.status,
            statusText: creativeResponse.statusText,
            ok: creativeResponse.ok,
            hasError: !!creativeData.error,
            creativeId: creativeData.id,
            error: creativeData.error ? {
              message: creativeData.error.message,
              type: creativeData.error.type,
              code: creativeData.error.code,
              error_subcode: creativeData.error.error_subcode,
              error_user_title: creativeData.error.error_user_title,
              error_user_msg: creativeData.error.error_user_msg,
              fbtrace_id: creativeData.error.fbtrace_id,
            } : null,
          });

          if (!creativeResponse.ok || creativeData.error) {
            console.error(`❌ Creative creation FAILED for "${adSet.ad_set_title}":`, {
              adSetId: adSetId,
              errorDetails: {
                message: creativeData.error?.message,
                type: creativeData.error?.type,
                code: creativeData.error?.code,
                error_subcode: creativeData.error?.error_subcode,
                error_user_title: creativeData.error?.error_user_title,
                error_user_msg: creativeData.error?.error_user_msg,
                fbtrace_id: creativeData.error?.fbtrace_id,
                fullError: creativeData.error,
              },
              httpStatus: creativeResponse.status,
              httpStatusText: creativeResponse.statusText,
              responseBody: creativeData,
            });

            errors.push({
              adSetTitle: adSet.ad_set_title,
              error: `Creative creation failed: ${creativeData.error?.message || 'Unknown error'}`,
              details: creativeData.error,
              errorType: creativeData.error?.error_user_title || 'Unknown',
              errorSubcode: creativeData.error?.error_subcode,
              errorCode: creativeData.error?.code,
              errorMessage: creativeData.error?.error_user_msg || creativeData.error?.message,
              fbtraceId: creativeData.error?.fbtrace_id,
            });
          } else {
            console.log(`✅ Creative created successfully for "${adSet.ad_set_title}":`, {
              creativeId: creativeData.id,
              adSetId: adSetId,
            });

            // Verify the creative was created with the image
            if (creativeData.id) {
              try {
                const verifyCreativeResponse = await fetch(
                  `https://graph.facebook.com/v18.0/${creativeData.id}?fields=object_story_spec&access_token=${accessToken}`
                );
                const verifyData = await verifyCreativeResponse.json();
                if (verifyCreativeResponse.ok) {
                  console.log(`✅ Creative verified for "${adSet.ad_set_title}"`);
                } else {
                  console.warn(`⚠️ Creative verification failed for "${adSet.ad_set_title}":`, verifyData);
                }
              } catch (verifyError) {
                console.warn(`⚠️ Error verifying creative for "${adSet.ad_set_title}":`, verifyError);
              }
            }

            const creativeId = creativeData.id;

            console.log(`✅ Creative created for "${adSet.ad_set_title}":`, {
              creativeId: creativeId,
              adSetId: adSetId,
            });

            // Step 4: Create Ad
            console.log(`🚀 Step 4: Creating Ad for "${adSet.ad_set_title}"...`, {
              adSetId: adSetId,
              creativeId: creativeId,
              adAccountId: formattedAdAccountId,
            });

            // Try creating ad without status first (Facebook may allow this without payment method)
            // Then update status to ACTIVE after creation
            let adPayload: any = {
              name: `${adSet.ad_set_title} - Ad`,
              adset_id: adSetId,
              creative: {
                creative_id: creativeId,
              },
              access_token: accessToken,
            };

            console.log(`📤 Attempting ad creation (without status) for "${adSet.ad_set_title}":`, {
              payload: {
                name: adPayload.name,
                adset_id: adPayload.adset_id,
                creative_id: adPayload.creative.creative_id,
              },
            });

            let adResponse = await fetch(
              `https://graph.facebook.com/v18.0/${formattedAdAccountId}/ads`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(adPayload),
              }
            );

            let adData = await adResponse.json();

            console.log(`📥 Ad creation response (attempt 1) for "${adSet.ad_set_title}":`, {
              status: adResponse.status,
              statusText: adResponse.statusText,
              ok: adResponse.ok,
              hasError: !!adData.error,
              adId: adData.id,
              error: adData.error ? {
                message: adData.error.message,
                type: adData.error.type,
                code: adData.error.code,
                error_subcode: adData.error.error_subcode,
                error_user_title: adData.error.error_user_title,
                error_user_msg: adData.error.error_user_msg,
                fbtrace_id: adData.error.fbtrace_id,
              } : null,
            });

            // If creation without status fails, try with ACTIVE status as fallback
            if (!adResponse.ok || adData.error) {
              console.log(`⚠️ First ad creation attempt failed, retrying with ACTIVE status for "${adSet.ad_set_title}"...`);

              adPayload.status = 'ACTIVE';
              adResponse = await fetch(
                `https://graph.facebook.com/v18.0/${formattedAdAccountId}/ads`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(adPayload),
                }
              );
              adData = await adResponse.json();

              console.log(`📥 Ad creation response (attempt 2 with ACTIVE status) for "${adSet.ad_set_title}":`, {
                status: adResponse.status,
                statusText: adResponse.statusText,
                ok: adResponse.ok,
                hasError: !!adData.error,
                adId: adData.id,
                error: adData.error ? {
                  message: adData.error.message,
                  type: adData.error.type,
                  code: adData.error.code,
                  error_subcode: adData.error.error_subcode,
                  error_user_title: adData.error.error_user_title,
                  error_user_msg: adData.error.error_user_msg,
                  fbtrace_id: adData.error.fbtrace_id,
                } : null,
              });
            }

            if (!adResponse.ok || adData.error) {
              console.error(`❌ Ad creation FAILED for "${adSet.ad_set_title}":`, {
                adSetId: adSetId,
                creativeId: creativeId,
                errorDetails: {
                  message: adData.error?.message,
                  type: adData.error?.type,
                  code: adData.error?.code,
                  error_subcode: adData.error?.error_subcode,
                  error_user_title: adData.error?.error_user_title,
                  error_user_msg: adData.error?.error_user_msg,
                  fbtrace_id: adData.error?.fbtrace_id,
                  fullError: adData.error,
                },
                httpStatus: adResponse.status,
                httpStatusText: adResponse.statusText,
                responseBody: adData,
              });

              // Check for specific error types and provide better error messages
              let errorMessage = `Ad creation failed: ${adData.error?.message || 'Unknown error'}`;
              let isPaymentMethodError = false;

              // Payment method error - treat as warning, not failure
              if (adData.error?.error_subcode === 1359188 ||
                adData.error?.error_user_title === 'No payment method') {
                errorMessage = `Ad creation skipped: Payment method required. Campaign, Ad Set, and Creative are ready. Add a payment method in Facebook Ads Manager to create the ad.`;
                isPaymentMethodError = true;
                console.log(`💳 Payment method error detected for "${adSet.ad_set_title}" - treating as warning`);
              }

              // For payment method errors, still add to createdAdSets since campaign/ad set/creative are ready
              if (isPaymentMethodError) {
                createdAdSets.push({
                  id: adSetId,
                  name: adSet.ad_set_title,
                  daily_budget: budgetInAccountCurrency,
                  status: 'PAUSED',
                  creative_id: creativeId,
                  ad_id: null, // Ad not created yet
                  warning: errorMessage,
                  requiresPaymentMethod: true,
                });
                console.log(`⚠️ Added "${adSet.ad_set_title}" to createdAdSets with payment method warning`);
              } else {
                // For other errors, add to errors list
                errors.push({
                  adSetTitle: adSet.ad_set_title,
                  error: errorMessage,
                  details: adData.error,
                  errorType: adData.error?.error_user_title || 'Unknown',
                  errorSubcode: adData.error?.error_subcode,
                  errorCode: adData.error?.code,
                  errorMessage: adData.error?.error_user_msg || adData.error?.message,
                  fbtraceId: adData.error?.fbtrace_id,
                });
                console.log(`❌ Added "${adSet.ad_set_title}" to errors list`);
              }
            } else {
              console.log(`✅ Ad created successfully for "${adSet.ad_set_title}":`, {
                adId: adData.id,
                adSetId: adSetId,
                creativeId: creativeId,
                status: adPayload.status || 'no status set',
              });

              // If ad was created without status, update it to ACTIVE
              if (!adPayload.status && adData.id) {
                try {
                  console.log(`🔄 Updating ad status to ACTIVE for "${adSet.ad_set_title}" (ad ID: ${adData.id})...`);
                  const updateResponse = await fetch(
                    `https://graph.facebook.com/v18.0/${adData.id}`,
                    {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        status: 'ACTIVE',
                        access_token: accessToken,
                      }),
                    }
                  );
                  const updateData = await updateResponse.json();
                  if (updateResponse.ok) {
                    console.log(`✅ Ad status updated to ACTIVE for "${adSet.ad_set_title}"`);
                  } else {
                    console.error(`⚠️ Failed to update ad status for "${adSet.ad_set_title}":`, updateData);
                  }
                } catch (updateError) {
                  console.error(`❌ Error updating ad status for "${adSet.ad_set_title}":`, updateError);
                }
              }

              createdAdSets.push({
                id: adSetId,
                name: adSet.ad_set_title,
                daily_budget: budgetInAccountCurrency,
                status: 'ACTIVE',
                creative_id: creativeId,
                ad_id: adData.id,
              });
              console.log(`✅ Added "${adSet.ad_set_title}" to createdAdSets with ad ID: ${adData.id}`);
            }
          }
        }
      } catch (error: any) {
        console.error(`❌ Unexpected error processing ad set "${adSet.ad_set_title}":`, {
          error: error.message,
          stack: error.stack,
          fullError: error,
        });

        errors.push({
          adSetTitle: adSet.ad_set_title,
          error: error.message,
          errorType: 'UnexpectedError',
          details: {
            message: error.message,
            stack: error.stack,
          },
        });
      }
    }

    // Log summary
    console.log(`📊 Publishing Summary:`, {
      totalRequested: adSetsLimited.length,
      totalCreated: createdAdSets.length,
      totalFailed: errors.length,
      campaignId: campaignId,
      campaignName: campaignName,
      createdAdSets: createdAdSets.map((as: any) => ({
        name: as.name,
        id: as.id,
        adId: as.ad_id,
        hasAd: !!as.ad_id,
        requiresPaymentMethod: as.requiresPaymentMethod || false,
      })),
      errors: errors.map((e: any) => ({
        adSetTitle: e.adSetTitle,
        error: e.error,
        errorType: e.errorType,
        errorSubcode: e.errorSubcode,
      })),
    });

    // Update project with campaign info - only if campaign was created AND at least one ad set was created
    if (campaignId && createdAdSets.length > 0) {
      const updateData = {
        meta_campaign_id: campaignId,
        meta_campaign_name: campaignName,
        status: 'RUNNING', // Update status to RUNNING after successful publishing
        updated_at: new Date().toISOString(),
      };



      const { data: updateData_result, error: updateError } = await supabase
        .from('projects')
        .update(updateData)
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .select();

      if (updateError) {
      } else {
        // Verify the update by fetching the project
        const { data: verifyData, error: verifyError } = await supabase
          .from('projects')
          .select('meta_campaign_id, meta_campaign_name, status')
          .eq('project_id', projectId)
          .eq('user_id', user.id)
          .single();

        
      }
    } else if (campaignId && createdAdSets.length === 0) {
      // Campaign created but no ad sets - just save campaign info, don't change status
      
      const { error: updateError } = await supabase
        .from('projects')
        .update({
          meta_campaign_id: campaignId,
          meta_campaign_name: campaignName,
          updated_at: new Date().toISOString(),
        })
        .eq('project_id', projectId)
        .eq('user_id', user.id);

      if (updateError) {
      }
    } else {
    }

    // Save published ad sets
    if (createdAdSets.length > 0) {
      for (const adSet of createdAdSets) {
        await supabase.from('published_ads').insert({
          user_id: user.id,
          project_id: projectId,
          campaign_name: campaignName,
          ad_set_id: adSet.id,
          ad_account_id: formattedAdAccountId,
          daily_budget: adSet.daily_budget,
          status: 'published',
          published_at: new Date().toISOString(),
          metadata: {
            ad_set_name: adSet.name,
            campaign_id: campaignId,
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
            campaigns_count: (usage.campaigns_count || 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);
      }
    }


    // Count how many ads were actually created (have ad_id)
    const adsCreated = createdAdSets.filter((as: any) => as.ad_id).length;
    const adsNotCreated = createdAdSets.length - adsCreated;

    const response: any = {
      success: createdAdSets.length > 0,
      campaign: {
        id: campaignId,
        name: campaignName,
        status: 'ACTIVE',
      },
      adSets: createdAdSets,
      totalRequested: adSets.length,
      totalCreated: createdAdSets.length,
      totalFailed: errors.length,
      adsCreated: adsCreated,
      adsNotCreated: adsNotCreated,
    };

    // Check if any ad sets have payment method warnings
    const hasPaymentMethodWarnings = createdAdSets.some((adSet: any) => adSet.requiresPaymentMethod);

    if (errors.length > 0) {
      response.errors = errors;
      response.message = `Campaign created with ${createdAdSets.length} out of ${adSets.length} ad sets. ${errors.length} failed.`;
      console.log(`⚠️ Response includes ${errors.length} errors`);
    } else if (hasPaymentMethodWarnings) {
      response.message = `Campaign, Ad Sets, and Creatives created successfully! Note: Ads require a payment method. Add a payment method in Facebook Ads Manager, then create the ads manually or they will be created automatically when you activate the ad sets.`;
      response.warnings = createdAdSets
        .filter((adSet: any) => adSet.requiresPaymentMethod)
        .map((adSet: any) => ({
          adSetName: adSet.name,
          message: adSet.warning,
        }));
      console.log(`⚠️ Response includes payment method warnings`);
    } else {
      response.message = `Successfully created campaign with ${createdAdSets.length} ad set(s). ${adsCreated} ad(s) created. All ad sets are ACTIVE.`;
      console.log(`✅ All ads created successfully`);
    }

    console.log(`📤 Sending response:`, {
      success: response.success,
      campaignId: response.campaign.id,
      totalCreated: response.totalCreated,
      adsCreated: response.adsCreated,
      adsNotCreated: response.adsNotCreated,
      totalFailed: response.totalFailed,
      hasErrors: errors.length > 0,
      hasWarnings: hasPaymentMethodWarnings,
    });

    return NextResponse.json(response, {
      status: createdAdSets.length > 0 ? 200 : 400
    });

  } catch (error: any) {
    console.error(`❌ CRITICAL ERROR in publish-ads API:`, {
      error: error.message,
      stack: error.stack,
      fullError: error,
    });

    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

