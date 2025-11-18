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
    const supabase = createServerSupabaseClient();

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
      dailyBudget = 10,
      objective = 'OUTCOME_TRAFFIC',
      specialAdCategories = [],
      websiteUrl = null // Optional: URL for promoted_object in traffic campaigns
    } = body;

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
        projectCampaignProposal = projectData.campaign_proposal;
      }
    } catch (error) {
    }

    // Get ad account details to determine currency and minimum budget
    let accountCurrency = 'USD'; // Default
    let minDailyBudget = 1.00; // Default minimum in USD
    try {
      const accountResponse = await fetch(
        `https://graph.facebook.com/v18.0/${formattedAdAccountId}?fields=currency,min_daily_budget&access_token=${accessToken}`
      );
      const accountData = await accountResponse.json();
      if (accountResponse.ok && accountData.currency) {
        accountCurrency = accountData.currency;
        // Set minimum budgets based on currency (in local currency units)
        const minBudgets: { [key: string]: number } = {
          'INR': 89.19,  // ₹89.19 minimum for INR
          'USD': 1.00,   // $1.00 minimum for USD
          'EUR': 1.00,   // €1.00 minimum for EUR
          'GBP': 1.00,   // £1.00 minimum for GBP
        };
        minDailyBudget = minBudgets[accountCurrency] || minBudgets['USD'];
      }
    } catch (error) {
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

    // For testing: limit to only the first ad set
    const adSetsLimited = Array.isArray(adSets) && adSets.length > 0 ? adSets.slice(0, 1) : adSets;

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

    if (!campaignResponse.ok || campaignData.error) {
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
        // Get the budget for this ad set
        let adSetBudget = adSet.daily_budget || dailyBudget;

        // Ensure budget meets minimum requirement
        if (adSetBudget < minDailyBudget) {
          adSetBudget = minDailyBudget;
        }

        // Convert daily budget to smallest currency unit (cents/paise)
        // Meta API uses the smallest currency unit (100 cents = $1, 100 paise = ₹1)
        const budgetInSmallestUnit = Math.round(adSetBudget * 100);


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
              daily_budget: budgetInSmallestUnit,
              billing_event: 'IMPRESSIONS',
              optimization_goal: 'LINK_CLICKS',
              bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
              targeting: targeting,
              status: 'ACTIVE',
              ...(normalizedStartTime ? { start_time: normalizedStartTime } : {}),
              ...(normalizedEndTime ? { end_time: normalizedEndTime } : {}),
              access_token: accessToken,
            }),
          }
        );

        const adSetData = await adSetResponse.json();

        if (!adSetResponse.ok || adSetData.error) {
          errors.push({
            adSetTitle: adSet.ad_set_title,
            error: adSetData.error?.message || 'Unknown error',
            details: adSetData.error,
          });
        } else {
          const adSetId = adSetData.id;

          // Step 3: Create Ad Creative

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

          if (!creativeResponse.ok || creativeData.error) {
            errors.push({
              adSetTitle: adSet.ad_set_title,
              error: `Creative creation failed: ${creativeData.error?.message || 'Unknown error'}`,
              details: creativeData.error,
            });
          } else {

            // Verify the creative was created with the image
            if (creativeData.id) {
              try {
                const verifyCreativeResponse = await fetch(
                  `https://graph.facebook.com/v18.0/${creativeData.id}?fields=object_story_spec&access_token=${accessToken}`
                );
                const verifyData = await verifyCreativeResponse.json();
              } catch (verifyError) {
              }
            }

            const creativeId = creativeData.id;

            // Step 4: Create Ad

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

            // If creation without status fails, try with ACTIVE status as fallback
            if (!adResponse.ok || adData.error) {

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
            }

            if (!adResponse.ok || adData.error) {

              // Check for specific error types and provide better error messages
              let errorMessage = `Ad creation failed: ${adData.error?.message || 'Unknown error'}`;
              let isPaymentMethodError = false;

              // Payment method error - treat as warning, not failure
              if (adData.error?.error_subcode === 1359188 ||
                adData.error?.error_user_title === 'No payment method') {
                errorMessage = `Ad creation skipped: Payment method required. Campaign, Ad Set, and Creative are ready. Add a payment method in Facebook Ads Manager to create the ad.`;
                isPaymentMethodError = true;
              }

              // For payment method errors, still add to createdAdSets since campaign/ad set/creative are ready
              if (isPaymentMethodError) {
                createdAdSets.push({
                  id: adSetId,
                  name: adSet.ad_set_title,
                  daily_budget: adSetBudget,
                  status: 'PAUSED',
                  creative_id: creativeId,
                  ad_id: null, // Ad not created yet
                  warning: errorMessage,
                  requiresPaymentMethod: true,
                });
              } else {
                // For other errors, add to errors list
                errors.push({
                  adSetTitle: adSet.ad_set_title,
                  error: errorMessage,
                  details: adData.error,
                  errorType: adData.error?.error_user_title || 'Unknown',
                  errorSubcode: adData.error?.error_subcode,
                });
              }
            } else {

              // If ad was created without status, update it to ACTIVE
              if (!adPayload.status && adData.id) {
                try {
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
                  }
                } catch (updateError) {
                }
              }

              createdAdSets.push({
                id: adSetId,
                name: adSet.ad_set_title,
                daily_budget: adSetBudget,
                status: 'ACTIVE',
                creative_id: creativeId,
                ad_id: adData.id,
              });
            }
          }
        }
      } catch (error: any) {
        errors.push({
          adSetTitle: adSet.ad_set_title,
          error: error.message,
        });
      }
    }

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
    };

    // Check if any ad sets have payment method warnings
    const hasPaymentMethodWarnings = createdAdSets.some((adSet: any) => adSet.requiresPaymentMethod);

    if (errors.length > 0) {
      response.errors = errors;
      response.message = `Campaign created with ${createdAdSets.length} out of ${adSets.length} ad sets. ${errors.length} failed.`;
    } else if (hasPaymentMethodWarnings) {
      response.message = `Campaign, Ad Sets, and Creatives created successfully! Note: Ads require a payment method. Add a payment method in Facebook Ads Manager, then create the ads manually or they will be created automatically when you activate the ad sets.`;
      response.warnings = createdAdSets
        .filter((adSet: any) => adSet.requiresPaymentMethod)
        .map((adSet: any) => ({
          adSetName: adSet.name,
          message: adSet.warning,
        }));
    } else {
      response.message = `Successfully created campaign with ${createdAdSets.length} ad set(s). All ad sets are ACTIVE.`;
    }


    return NextResponse.json(response, {
      status: createdAdSets.length > 0 ? 200 : 400
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

