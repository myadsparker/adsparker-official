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

    // Fetch project data to get thumbnail image
    let projectThumbnailImage: string | null = null;
    try {
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('adset_thumbnail_image')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .single();

      if (!projectError && projectData?.adset_thumbnail_image) {
        projectThumbnailImage = projectData.adset_thumbnail_image;
        console.log('📸 Found project thumbnail image:', projectThumbnailImage);
      } else {
        console.log('⚠️ No adset_thumbnail_image found in project');
      }
    } catch (error) {
      console.log('⚠️ Could not fetch project thumbnail:', error);
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
        console.log(`💰 Account currency: ${accountCurrency}, Minimum daily budget: ${minDailyBudget}`);
      }
    } catch (error) {
      console.log('⚠️ Could not fetch ad account details, using defaults:', error);
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
          console.log('📄 Found Facebook page from me/accounts:', finalPageId);
        } else {
          // Method 2: Try to get pages from ad account
          console.log('⚠️ No pages from me/accounts, trying ad account...');
          const adAccountPagesResponse = await fetch(
            `https://graph.facebook.com/v18.0/${formattedAdAccountId}/promote_pages?access_token=${accessToken}`
          );
          const adAccountPagesData = await adAccountPagesResponse.json();
          if (adAccountPagesResponse.ok && adAccountPagesData.data && adAccountPagesData.data.length > 0) {
            finalPageId = adAccountPagesData.data[0].id;
            console.log('📄 Found Facebook page from ad account:', finalPageId);
          } else {
            // Method 3: Try to get pages the user manages
            const managedPagesResponse = await fetch(
              `https://graph.facebook.com/v18.0/me?fields=accounts{id,name}&access_token=${accessToken}`
            );
            const managedPagesData = await managedPagesResponse.json();
            if (managedPagesResponse.ok && managedPagesData.accounts && managedPagesData.accounts.data && managedPagesData.accounts.data.length > 0) {
              finalPageId = managedPagesData.accounts.data[0].id;
              console.log('📄 Found Facebook page from managed accounts:', finalPageId);
            }
          }
        }

        if (!finalPageId) {
          console.error('❌ No Facebook page found. Link ads require a Facebook page.');
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
        console.error('❌ Error fetching Facebook pages:', error);
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
      console.log('📄 Using provided Facebook page ID:', finalPageId);
    }

    console.log('🚀 Starting Meta Ad Publishing Process:', {
      projectId,
      campaignName,
      adSetsCount: adSets.length,
      adAccountId: formattedAdAccountId,
      pageId: finalPageId,
    });

    // Step 1: Create Campaign
    console.log('📢 Creating campaign with name:', campaignName);
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
          status: 'PAUSED', // Start as PAUSED for safety
          special_ad_categories: specialAdCategories,
          // Required field: Must specify True or False when using ad set budgets (not campaign budget)
          is_adset_budget_sharing_enabled: false, // Set to true to enable 20% budget sharing optimization
          access_token: accessToken,
        }),
      }
    );

    const campaignData = await campaignResponse.json();

    if (!campaignResponse.ok || campaignData.error) {
      console.error('❌ Campaign Creation Error:', campaignData);
      return NextResponse.json(
        {
          error: 'Failed to create Meta campaign',
          details: campaignData.error?.message || 'Unknown error',
          metaError: campaignData.error
        },
        { status: 400 }
      );
    }

    console.log('✅ Campaign Created:', campaignData);
    const campaignId = campaignData.id;

    // Step 1.5: Upload image once (same image for all ads)
    // ONLY use adset_thumbnail_image from project - no fallbacks
    let imageUrl: string | null = null;
    let imageHash: string | null = null;

    // ONLY use adset_thumbnail_image from project table - no fallbacks
    if (projectThumbnailImage) {
      imageUrl = projectThumbnailImage;
      console.log('📸 Using adset_thumbnail_image from project:', imageUrl);

      // Verify the image URL is accessible before uploading
      try {
        console.log('🔍 Verifying image URL is accessible...');
        const imageCheckResponse = await fetch(imageUrl, { method: 'HEAD' });
        if (!imageCheckResponse.ok) {
          console.warn(`⚠️ Image URL returned status ${imageCheckResponse.status}, but continuing anyway...`);
        } else {
          console.log('✅ Image URL is accessible');
        }
      } catch (checkError) {
        console.warn('⚠️ Could not verify image URL accessibility, but continuing...', checkError);
      }

      try {
        console.log('📤 Uploading image to Meta (will be used for all ads)...');
        console.log(`🔗 Image URL: ${imageUrl}`);

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
          console.log(`📤 URL upload response:`, JSON.stringify(imageUploadData, null, 2));

          if (urlUploadResponse.ok && imageUploadData.data && imageUploadData.data.length > 0) {
            // Success with URL method
            imageHash = imageUploadData.data[0].hash;
            const imageId = imageUploadData.data[0].id;
            console.log(`✅ Image uploaded successfully using URL method!`);
            console.log(`   - Image Hash: ${imageHash}`);
            console.log(`   - Image ID: ${imageId}`);
          } else {
            // URL method failed, try binary upload
            console.log(`⚠️ URL method failed, trying binary upload method...`);
            uploadMethod = 'BINARY';
            throw new Error('URL method failed, trying binary');
          }
        } catch (urlError) {
          // If URL method fails, download image and upload as binary
          if (uploadMethod === 'BINARY' || !imageUploadData?.data?.length) {
            console.log(`📥 Downloading image from URL for binary upload...`);
            console.log(`🔗 Image URL: ${imageUrl}`);

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
            console.log(`📥 Response status: ${imageResponse.status}, Content-Type: ${contentType}`);

            // Convert response to buffer
            const imageBuffer = await imageResponse.arrayBuffer();
            console.log(`📥 Image downloaded: ${imageBuffer.byteLength} bytes`);

            if (imageBuffer.byteLength === 0) {
              throw new Error('Downloaded image is empty (0 bytes)');
            }

            if (imageBuffer.byteLength < 100) {
              // If file is very small, it might be an error page or redirect
              const text = new TextDecoder().decode(imageBuffer);
              console.error(`⚠️ Downloaded content appears to be text, not image:`, text.substring(0, 200));
              throw new Error('Downloaded content is not a valid image');
            }

            console.log(`📤 Uploading image as binary data to Meta...`);

            // Convert to Node.js Buffer
            const Buffer = require('buffer').Buffer;
            const nodeBuffer = Buffer.from(imageBuffer);

            // Use form-data package for proper multipart/form-data upload
            const FormData = require('form-data');
            const formData = new FormData();

            // Append the buffer as a file stream
            // Facebook expects the field name to be 'bytes' or the file itself
            formData.append('bytes', nodeBuffer, {
              filename: 'ad-image.png',
              contentType: contentType,
            });

            console.log(`📤 Uploading ${nodeBuffer.length} bytes as multipart/form-data...`);

            // Upload using POST with multipart/form-data
            const multipartUploadResponse = await fetch(
              `https://graph.facebook.com/v18.0/${formattedAdAccountId}/adimages?access_token=${accessToken}`,
              {
                method: 'POST',
                body: formData as any, // Type assertion for form-data
                headers: {
                  ...formData.getHeaders(),
                },
              }
            );

            imageUploadData = await multipartUploadResponse.json();
            console.log(`📤 Multipart upload response:`, JSON.stringify(imageUploadData, null, 2));

            if (imageUploadData.data && imageUploadData.data.length > 0) {
              imageHash = imageUploadData.data[0].hash;
              const imageId = imageUploadData.data[0].id;
              console.log(`✅ Image uploaded successfully using binary method!`);
              console.log(`   - Image Hash: ${imageHash}`);
              console.log(`   - Image ID: ${imageId}`);
            } else {
              throw new Error(`Binary upload failed: ${JSON.stringify(imageUploadData)}`);
            }
          }
        }

        if (!imageHash) {
          console.error(`❌ Failed to upload image with both methods:`, imageUploadData);
          return NextResponse.json(
            {
              error: 'Failed to upload image to Meta',
              details: imageUploadData?.error?.message || 'Image upload failed with both URL and binary methods',
              metaError: imageUploadData?.error,
              uploadResponse: imageUploadData
            },
            { status: 400 }
          );
        }
      } catch (error) {
        console.error(`❌ Error uploading image:`, error);
        return NextResponse.json(
          {
            error: 'Failed to upload image to Meta',
            details: error instanceof Error ? error.message : 'Unknown error'
          },
          { status: 400 }
        );
      }
    } else {
      console.error('❌ No adset_thumbnail_image found in project');
      return NextResponse.json(
        {
          error: 'Image is required',
          message: 'adset_thumbnail_image is required in the project to publish ads. Please set a thumbnail image first.',
          details: 'No adset_thumbnail_image found in project table'
        },
        { status: 400 }
      );
    }

    // Step 2: Create Ad Sets
    console.log('📊 Creating ad sets...');
    console.log(`📝 Processing ${adSets.length} ad set(s)`);
    const createdAdSets = [];
    const errors = [];

    for (let i = 0; i < adSets.length; i++) {
      console.log(`✅ Processing ad set ${i + 1}/${adSets.length}: ${adSets[i]?.ad_set_title || 'Untitled'}`);

      const adSet: any = adSets[i];

      try {
        // Get the budget for this ad set
        let adSetBudget = adSet.daily_budget || dailyBudget;

        // Ensure budget meets minimum requirement
        if (adSetBudget < minDailyBudget) {
          console.log(`⚠️ Budget ${adSetBudget} is below minimum ${minDailyBudget} for ${accountCurrency}, using minimum`);
          adSetBudget = minDailyBudget;
        }

        // Convert daily budget to smallest currency unit (cents/paise)
        // Meta API uses the smallest currency unit (100 cents = $1, 100 paise = ₹1)
        const budgetInSmallestUnit = Math.round(adSetBudget * 100);

        console.log(`💰 Ad Set Budget: ${adSetBudget} ${accountCurrency} = ${budgetInSmallestUnit} smallest units`);

        // Build targeting object for Meta API
        let ageMin = adSet.age_range?.min || 18;
        let ageMax = adSet.age_range?.max || 65;

        // When advantage_audience is enabled:
        // - age_min cannot be higher than 25
        // - age_max cannot be lower than 65
        const willEnableAdvantageAudience = true; // We're enabling it below
        if (willEnableAdvantageAudience) {
          if (ageMin > 25) {
            console.log(`⚠️ Age min ${ageMin} is above 25, capping at 25 for Advantage+ audience`);
            ageMin = 25;
          }
          if (ageMax < 65) {
            console.log(`⚠️ Age max ${ageMax} is below 65, setting to 65 for Advantage+ audience`);
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

        console.log(`Creating ad set ${i + 1}/${adSets.length}: ${adSet.ad_set_title}`);

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
              status: 'PAUSED', // Start as PAUSED for safety
              access_token: accessToken,
            }),
          }
        );

        const adSetData = await adSetResponse.json();

        if (!adSetResponse.ok || adSetData.error) {
          console.error(`❌ Ad Set ${i + 1} Creation Error:`, adSetData);
          errors.push({
            adSetTitle: adSet.ad_set_title,
            error: adSetData.error?.message || 'Unknown error',
            details: adSetData.error,
          });
        } else {
          console.log(`✅ Ad Set ${i + 1} Created:`, adSetData.id);
          const adSetId = adSetData.id;

          // Step 3: Create Ad Creative
          console.log(`🎨 Creating ad creative for ad set ${i + 1}...`);

          // Get ad copy
          const headline = adSet.ad_copywriting_title || campaignName;
          const primaryText = adSet.ad_copywriting_body || '';
          const description = adSet.audience_description || '';

          // Create ad creative with link data
          // page_id is required for link ads - we've already validated it exists above
          if (!finalPageId) {
            throw new Error('Facebook Page ID is required but not found. This should not happen.');
          }

          // Use the image hash that was uploaded before the loop (same image for all ads)
          // image_url is not supported in link_data, we must use image_hash instead
          // imageHash is guaranteed to exist at this point since we return error if upload fails

          console.log(`🖼️ Using image hash for creative: ${imageHash}`);
          console.log(`🔗 Image URL used: ${projectThumbnailImage}`);

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

          console.log('📤 Creative payload being sent:', JSON.stringify({
            ...creativePayload,
            access_token: '[REDACTED]'
          }, null, 2));

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

          console.log(`📥 Creative creation response:`, JSON.stringify(creativeData, null, 2));

          if (!creativeResponse.ok || creativeData.error) {
            console.error(`❌ Ad Creative ${i + 1} Creation Error:`, creativeData);
            errors.push({
              adSetTitle: adSet.ad_set_title,
              error: `Creative creation failed: ${creativeData.error?.message || 'Unknown error'}`,
              details: creativeData.error,
            });
          } else {
            console.log(`✅ Ad Creative ${i + 1} Created:`, creativeData.id);
            console.log(`🖼️ Creative ID: ${creativeData.id}, Image hash used: ${imageHash}`);

            // Verify the creative was created with the image
            if (creativeData.id) {
              try {
                const verifyCreativeResponse = await fetch(
                  `https://graph.facebook.com/v18.0/${creativeData.id}?fields=object_story_spec&access_token=${accessToken}`
                );
                const verifyData = await verifyCreativeResponse.json();
                console.log(`🔍 Verified creative object_story_spec:`, JSON.stringify(verifyData, null, 2));
              } catch (verifyError) {
                console.log('⚠️ Could not verify creative:', verifyError);
              }
            }

            const creativeId = creativeData.id;

            // Step 4: Create Ad
            console.log(`📢 Creating ad for ad set ${i + 1}...`);

            // Try creating ad without status first (Facebook may allow this without payment method)
            // Then update status to PAUSED after creation
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

            // If creation without status fails, try with PAUSED status as fallback
            if (!adResponse.ok || adData.error) {
              console.log(`⚠️ Ad creation without status failed, trying with PAUSED status...`);

              adPayload.status = 'PAUSED';
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
              console.error(`❌ Ad ${i + 1} Creation Error:`, adData);

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
                console.log(`⚠️ Ad creation skipped due to payment method, but Ad Set and Creative are ready`);
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
              console.log(`✅ Ad ${i + 1} Created:`, adData.id);

              // If ad was created without status, update it to PAUSED
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
                        status: 'PAUSED',
                        access_token: accessToken,
                      }),
                    }
                  );
                  const updateData = await updateResponse.json();
                  if (updateResponse.ok) {
                    console.log(`✅ Ad ${i + 1} status updated to PAUSED`);
                  }
                } catch (updateError) {
                  console.log(`⚠️ Could not update ad status to PAUSED, but ad was created`);
                }
              }

              createdAdSets.push({
                id: adSetId,
                name: adSet.ad_set_title,
                daily_budget: adSetBudget,
                status: 'PAUSED',
                creative_id: creativeId,
                ad_id: adData.id,
              });
            }
          }
        }
      } catch (error: any) {
        console.error(`❌ Error creating ad set ${i + 1}:`, error);
        errors.push({
          adSetTitle: adSet.ad_set_title,
          error: error.message,
        });
      }
    }

    // Step 5: Save to database
    console.log('💾 Saving to database...');
    console.log('📋 Update details:', {
      projectId,
      userId: user.id,
      campaignId,
      campaignName,
      createdAdSetsCount: createdAdSets.length,
    });

    // Update project with campaign info - only if campaign was created AND at least one ad set was created
    if (campaignId && createdAdSets.length > 0) {
      const updateData = {
        meta_campaign_id: campaignId,
        meta_campaign_name: campaignName,
        status: 'RUNNING', // Update status to RUNNING after successful publishing
        updated_at: new Date().toISOString(),
      };

      console.log('🔄 Updating project with:', updateData);

      const { data: updateData_result, error: updateError } = await supabase
        .from('projects')
        .update(updateData)
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .select();

      if (updateError) {
        console.error('❌ Error updating project status:', updateError);
        console.error('❌ Update error details:', JSON.stringify(updateError, null, 2));
        // Don't fail the whole request, but log the error
      } else {
        console.log('✅ Project status updated successfully');
        console.log('✅ Updated project data:', updateData_result);

        // Verify the update by fetching the project
        const { data: verifyData, error: verifyError } = await supabase
          .from('projects')
          .select('meta_campaign_id, meta_campaign_name, status')
          .eq('project_id', projectId)
          .eq('user_id', user.id)
          .single();

        if (verifyError) {
          console.error('❌ Error verifying update:', verifyError);
        } else {
          console.log('✅ Verification - Project data after update:', verifyData);
          if (verifyData?.status !== 'RUNNING' || !verifyData?.meta_campaign_id) {
            console.error('⚠️ WARNING: Update may not have worked correctly. Expected RUNNING status and meta_campaign_id.');
          }
        }
      }
    } else if (campaignId && createdAdSets.length === 0) {
      // Campaign created but no ad sets - just save campaign info, don't change status
      console.log('⚠️ Campaign created but no ad sets were created. Saving campaign info only.');
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
        console.error('❌ Error updating project with campaign info:', updateError);
      }
    } else {
      console.error('❌ No campaign ID or no ad sets created - cannot update project status');
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

    console.log('✅ Publishing process completed!');

    const response: any = {
      success: createdAdSets.length > 0,
      campaign: {
        id: campaignId,
        name: campaignName,
        status: 'PAUSED',
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
      response.message = `Successfully created campaign with ${createdAdSets.length} ad sets. All ad sets are PAUSED - you can activate them in Meta Ads Manager to start running.`;
    }

    return NextResponse.json(response, {
      status: createdAdSets.length > 0 ? 200 : 400
    });

  } catch (error: any) {
    console.error('❌ Error publishing ads to Meta:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

