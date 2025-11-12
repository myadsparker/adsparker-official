'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import './plan.css';
import Stepper from '@/components/dashboard/Stepper';
import { Slider, Dropdown } from 'antd';
import Image from 'next/image';
import toast from 'react-hot-toast';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface AdSet {
  ad_set_id: string;
  status: string;
  ad_set_title: string;
  audience_description: string;
  audience_explanation: string;
  age_range: { min: number; max: number };
  genders: string[];
  audience_tags: string[];
  audience_size_range: { min: number; max: number };
  ad_copywriting_title: string;
  ad_copywriting_body: string;
  targeting: any;
  creative_meta_data_1x1: any;
  creative_meta_data_9x16: any;
  adsparker_gen_creative_asset?: string;
}

export default function BudgetPage() {
  const params = useParams();
  const projectId = params.slug as string;
  const [adSets, setAdSets] = useState<AdSet[]>([]);
  const [selectedAdSet, setSelectedAdSet] = useState<AdSet | null>(null);
  const [selectedAdSetIndex, setSelectedAdSetIndex] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [dailyBudget, setDailyBudget] = useState(75);
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [loadingPerformance, setLoadingPerformance] = useState(false);
  const [collapsedStates, setCollapsedStates] = useState<{
    [key: string]: boolean;
  }>({
    audience: true,
    copywriting: false,
    tags: false,
  });
  const [showModal, setShowModal] = useState(false);
  const [connectedAccounts, setConnectedAccounts] = useState<any[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [campaignProposal, setCampaignProposal] = useState<any>(null);
  const [aiImages, setAiImages] = useState<string[]>([]);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [showImageModal, setShowImageModal] = useState(false);
  const [generatingAiImage, setGeneratingAiImage] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedThumbnailImage, setSelectedThumbnailImage] = useState<
    string | null
  >(null);
  const [savingThumbnail, setSavingThumbnail] = useState(false);
  const [thumbnailImage, setThumbnailImage] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [analyzingPoints, setAnalyzingPoints] = useState<any>(null);
  const [isMainProduct, setIsMainProduct] = useState<boolean | null>(null);
  const [autoGeneratingImage, setAutoGeneratingImage] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState<string>('');
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const hasAttemptedImageGen = useRef<boolean>(false);
  const isPublishingAdsRef = useRef<boolean>(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [publishingAds, setPublishingAds] = useState(false);
  const [selectedAdAccountId, setSelectedAdAccountId] = useState<string | null>(null);
  const [pages, setPages] = useState<any[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [loadingPages, setLoadingPages] = useState(false);

  // Fetch project data including campaign proposal
  const fetchProjectData = async () => {
    try {
      setLoading(true); // Start loading
      const response = await fetch(`/api/projects/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        if (data?.campaignproposal) {
          const proposal =
            typeof data.campaignproposal === 'string'
              ? JSON.parse(data.campaignproposal)
              : data.campaignproposal;
          setCampaignProposal(proposal);
        }

        // Set AI images
        if (data?.ai_images) {
          const images =
            typeof data.ai_images === 'string'
              ? JSON.parse(data.ai_images)
              : data.ai_images;
          setAiImages(images || []);
        }

        // Set uploaded files
        if (data?.files) {
          const files =
            typeof data.files === 'string'
              ? JSON.parse(data.files)
              : data.files;
          setUploadedImages(files || []);
        }

        // Set thumbnail image
        if (data?.adset_thumbnail_image) {
          setThumbnailImage(data.adset_thumbnail_image);
        }

        // Set analyzing points and check isMainProduct
        if (data?.analysing_points) {
          const analyzingPointsData =
            typeof data.analysing_points === 'string'
              ? JSON.parse(data.analysing_points)
              : data.analysing_points;
          setAnalyzingPoints(analyzingPointsData);
          setIsMainProduct(analyzingPointsData?.isMainProduct || false);
        }

        // Set website URL from url_analysis or campaignproposal
        let foundWebsiteUrl = '';
        if (data?.url_analysis) {
          const urlAnalysis =
            typeof data.url_analysis === 'string'
              ? JSON.parse(data.url_analysis)
              : data.url_analysis;
          if (urlAnalysis?.website_url) {
            foundWebsiteUrl = urlAnalysis.website_url;
          }
        }
        // Fallback to campaignproposal website_url if not found in url_analysis
        if (!foundWebsiteUrl && data?.campaignproposal) {
          const proposal =
            typeof data.campaignproposal === 'string'
              ? JSON.parse(data.campaignproposal)
              : data.campaignproposal;
          if (proposal?.website_url) {
            foundWebsiteUrl = proposal.website_url;
          }
        }
        if (foundWebsiteUrl) {
          setWebsiteUrl(foundWebsiteUrl);
        }

        // Set adsets from ad_set_proposals column
        if (data?.ad_set_proposals) {
          const adsets = Array.isArray(data.ad_set_proposals)
            ? data.ad_set_proposals
            : typeof data.ad_set_proposals === 'string'
              ? JSON.parse(data.ad_set_proposals)
              : [];

          if (adsets.length > 0) {
            const trimmedAdSets = adsets.slice(0, 10);
            setAdSets(trimmedAdSets); // Take first 10 ad sets
            setSelectedAdSet(trimmedAdSets[0]); // Select first ad set by default
            setSelectedAdSetIndex(0);
            console.log('✅ Loaded adsets from database:', adsets.length);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching project data:', error);
    } finally {
      setLoading(false); // End loading
    }
  };

  // Helper function to get all ad accounts from connected accounts
  const getAllAdAccounts = (accounts: any[]) => {
    const adAccounts: any[] = [];
    accounts.forEach((account) => {
      if (account?.ad_accounts && Array.isArray(account.ad_accounts)) {
        account.ad_accounts.forEach((adAccount: any) => {
          adAccounts.push({
            id: adAccount.id || adAccount.account_id,
            account_id: adAccount.account_id || (adAccount.id ? adAccount.id.replace(/^act_/, '') : null),
            name: adAccount.name || 'Unnamed Account',
            account_status: adAccount.account_status,
            currency: adAccount.currency,
            timezone_id: adAccount.timezone_id,
            disable_reason: adAccount.disable_reason,
          });
        });
      }
    });
    return adAccounts;
  };

  // Fetch connected Meta accounts
  const fetchConnectedAccounts = async () => {
    try {
      setLoadingAccounts(true);
      const response = await fetch('/api/meta/accounts');
      if (response.ok) {
        const data = await response.json();
        const accounts = Array.isArray(data?.accounts)
          ? data.accounts
          : [];
        setConnectedAccounts(accounts);

        // Auto-select first ad account if available
        const allAdAccounts = getAllAdAccounts(accounts);
        if (allAdAccounts.length > 0 && !selectedAdAccountId) {
          setSelectedAdAccountId(allAdAccounts[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching connected accounts:', error);
    } finally {
      setLoadingAccounts(false);
    }
  };

  // Fetch Facebook Pages
  const fetchPages = async () => {
    try {
      setLoadingPages(true);
      const response = await fetch('/api/meta/pages');
      if (response.ok) {
        const data = await response.json();
        const pagesList = Array.isArray(data?.pages) ? data.pages : [];
        setPages(pagesList);

        // Auto-select first page if available
        if (pagesList.length > 0 && !selectedPageId) {
          setSelectedPageId(pagesList[0].id);
        }
      } else {
        console.error('Failed to fetch pages:', await response.json());
        setPages([]);
      }
    } catch (error) {
      console.error('Error fetching pages:', error);
      setPages([]);
    } finally {
      setLoadingPages(false);
    }
  };

  // Fetch subscription status
  const fetchSubscription = async () => {
    try {
      setSubscriptionLoading(true);
      const response = await fetch('/api/subscriptions');
      if (response.ok) {
        const data = await response.json();
        setSubscription(data.subscription);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setSubscriptionLoading(false);
    }
  };

  // Fetch ad sets on component mount
  useEffect(() => {
    if (projectId) {
      // Reset attempt flag when project changes
      hasAttemptedImageGen.current = false;
      fetchConnectedAccounts(); // Fetch connected accounts
      fetchPages(); // Fetch Facebook pages
      fetchProjectData(); // Fetch campaign proposal data and adsets
      // Fetch initial performance data with default budget
      fetchPerformanceData(75);
      fetchSubscription(); // Fetch subscription status
    }
  }, [projectId]);

  // Handle OAuth success message and checkout success
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const metaConnected = urlParams.get('meta_connected');
    const checkout = urlParams.get('checkout');

    if (metaConnected === 'true') {
      // Refresh connected accounts
      fetchConnectedAccounts();
      // Also fetch pages
      fetchPages();
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
      // Show success message
      toast.success('Meta account connected successfully!', {
        duration: 4000,
        style: {
          background: '#10b981',
          color: '#fff',
          padding: '16px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '500',
        },
      });
    }

    if (checkout === 'success') {
      // Get session ID from URL
      const sessionId = urlParams.get('session_id');

      if (sessionId) {
        // Verify session and update subscription
        fetch('/api/subscriptions/verify-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ session_id: sessionId }),
        })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              // Refresh subscription status
              fetchSubscription();
              // Show success message
              toast.success('Subscription activated successfully! You can now publish ads.', {
                duration: 4000,
                style: {
                  background: '#10b981',
                  color: '#fff',
                  padding: '16px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                },
              });
            } else {
              toast.error('Failed to verify subscription. Please contact support.', {
                duration: 5000,
                style: {
                  background: '#dc2626',
                  color: '#fff',
                  padding: '16px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                },
              });
            }
          })
          .catch(error => {
            console.error('Error verifying session:', error);
            toast.error('Error verifying subscription. Please contact support.', {
              duration: 5000,
              style: {
                background: '#dc2626',
                color: '#fff',
                padding: '16px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
              },
            });
          });
      }

      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }

    if (checkout === 'cancelled') {
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
      // Show message
      toast.error('Checkout was cancelled. You can try again when ready.', {
        duration: 4000,
        style: {
          background: '#dc2626',
          color: '#fff',
          padding: '16px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '500',
        },
      });
    }
  }, []);

  // Handle ad set selection
  const handleAdSetClick = (adSet: AdSet, index: number) => {
    setSelectedAdSet(adSet);
    setSelectedAdSetIndex(index);
  };

  // Handle collapsible toggle
  const toggleCollapsible = (key: string) => {
    setCollapsedStates(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Handle performance API call
  const fetchPerformanceData = async (budget: number) => {
    try {
      setLoadingPerformance(true);
      const response = await fetch(`/api/projects/${projectId}/performance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dailyBudget: budget,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch performance data');
      }

      const data = await response.json();
      setPerformanceData(data);
    } catch (error) {
      console.error('Error fetching performance data:', error);
    } finally {
      setLoadingPerformance(false);
    }
  };

  // Handle slider change with debouncing
  const handleSliderChange = (value: number) => {
    setDailyBudget(value);

    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new timer to call API after user stops moving slider
    debounceTimer.current = setTimeout(() => {
      fetchPerformanceData(value);
    }, 500); // 500ms delay
  };

  // Handle automatic image generation based on page type
  const handleAutoGenerateImage = useCallback(async () => {
    if (
      aiImages.length > 0 ||
      autoGeneratingImage ||
      hasAttemptedImageGen.current
    ) {
      // Already have images, generation in progress, or already attempted
      return;
    }

    try {
      hasAttemptedImageGen.current = true;
      setAutoGeneratingImage(true);

      // Determine which API to call based on isMainProduct
      const apiEndpoint = isMainProduct
        ? '/api/image-gen-product-seedream'
        : '/api/image-gen-service';
      console.log(`🚀 Calling ${apiEndpoint} for automatic image generation`);

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_id: projectId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate image');
      }

      const data = await response.json();
      if (
        data.success &&
        (data.generated_image_url || data.generatedImageUrl)
      ) {
        // Get the generated image URL
        const generatedImageUrl = data.generated_image_url || data.generatedImageUrl;

        // Refresh project data to get updated ai_images
        await fetchProjectData();

        // Set as thumbnail automatically
        if (generatedImageUrl) {
          try {
            const thumbnailResponse = await fetch(
              `/api/projects/${projectId}/save-thumbnail`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  thumbnail_image_url: generatedImageUrl,
                }),
              }
            );

            if (thumbnailResponse.ok) {
              const thumbnailData = await thumbnailResponse.json();
              if (thumbnailData.success) {
                // Update local state
                setThumbnailImage(generatedImageUrl);
                // Show success toast
                toast.success('AI image generated and set as thumbnail!', {
                  duration: 4000,
                  style: {
                    background: '#10b981',
                    color: '#fff',
                    padding: '16px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                  },
                });
              }
            }
          } catch (thumbnailError) {
            console.error('Error setting thumbnail:', thumbnailError);
            // Still show success for image generation
            toast.success('AI image generated successfully!', {
              duration: 4000,
              style: {
                background: '#10b981',
                color: '#fff',
                padding: '16px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
              },
            });
          }
        }
      } else {
        // Reset attempt flag if generation failed, so user can retry manually
        hasAttemptedImageGen.current = false;
      }
    } catch (error) {
      console.error('Error auto-generating image:', error);
      // Reset attempt flag on error so user can retry manually
      hasAttemptedImageGen.current = false;
    } finally {
      setAutoGeneratingImage(false);
    }
  }, [
    aiImages.length,
    autoGeneratingImage,
    isMainProduct,
    projectId,
    fetchProjectData,
  ]);

  // Auto-generate image when analyzing points are loaded
  useEffect(() => {
    if (
      analyzingPoints &&
      isMainProduct !== null &&
      aiImages.length === 0 &&
      !autoGeneratingImage &&
      !hasAttemptedImageGen.current
    ) {
      console.log(
        `🖼️ Auto-generating image for ${isMainProduct ? 'product' : 'service'} page`
      );
      handleAutoGenerateImage();
    }
  }, [
    analyzingPoints,
    isMainProduct,
    aiImages.length,
    autoGeneratingImage,
    handleAutoGenerateImage,
  ]);

  // Handle manual AI image generation (for backward compatibility)
  const handleGenerateAiImage = async () => {
    if (aiImages.length >= 2) {
      toast.error('Maximum 2 AI images allowed per project', {
        duration: 4000,
        style: {
          background: '#dc2626',
          color: '#fff',
          padding: '16px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '500',
        },
      });
      return;
    }

    try {
      setGeneratingAiImage(true);
      const response = await fetch(`/api/freepik-extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_id: projectId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate image');
      }

      const data = await response.json();
      if (data.success && data.generation?.finalImageUrl) {
        // Refresh project data to get updated ai_images
        await fetchProjectData();
        // Show success toast
        toast.success('AI image generated successfully!', {
          duration: 4000,
          style: {
            background: '#10b981',
            color: '#fff',
            padding: '16px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
          },
        });
      }
    } catch (error) {
      console.error('Error generating AI image:', error);
      toast.error('Failed to generate AI image', {
        duration: 5000,
        style: {
          background: '#dc2626',
          color: '#fff',
          padding: '16px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '500',
        },
      });
    } finally {
      setGeneratingAiImage(false);
    }
  };

  // Handle file upload
  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadingFile(true);

      // Create FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('project_id', projectId);

      const response = await fetch('/api/upload-file', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload file');
      }

      const data = await response.json();
      if (data.success) {
        // Refresh project data to get updated files
        await fetchProjectData();
        toast.success('File uploaded successfully!', {
          duration: 4000,
          style: {
            background: '#10b981',
            color: '#fff',
            padding: '16px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
          },
        });
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file', {
        duration: 5000,
        style: {
          background: '#dc2626',
          color: '#fff',
          padding: '16px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '500',
        },
      });
    } finally {
      setUploadingFile(false);
    }
  };

  // Handle saving thumbnail image
  const handleSaveThumbnail = async () => {
    if (!selectedThumbnailImage) {
      toast.error('Please select an image first', {
        duration: 4000,
        style: {
          background: '#dc2626',
          color: '#fff',
          padding: '16px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '500',
        },
      });
      return;
    }

    try {
      setSavingThumbnail(true);

      const response = await fetch(
        `/api/projects/${projectId}/save-thumbnail`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            thumbnail_image_url: selectedThumbnailImage,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to save thumbnail');
      }

      const data = await response.json();
      if (data.success) {
        toast.success('Thumbnail image saved successfully!', {
          duration: 4000,
          style: {
            background: '#10b981',
            color: '#fff',
            padding: '16px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
          },
        });
        setThumbnailImage(selectedThumbnailImage);
        setShowImageModal(false);
        setSelectedThumbnailImage(null);
      }
    } catch (error) {
      console.error('Error saving thumbnail:', error);
      toast.error('Failed to save thumbnail image', {
        duration: 5000,
        style: {
          background: '#dc2626',
          color: '#fff',
          padding: '16px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '500',
        },
      });
    } finally {
      setSavingThumbnail(false);
    }
  };

  // Utility function
  function formatNumber(num: number): string {
    if (num >= 1_000_000) {
      // Millions
      return (num / 1_000_000).toFixed(2).replace(/\.00$/, '') + 'M';
    } else if (num >= 100_000) {
      // Lakhs (Indian term, but US format numbers)
      return (num / 100_000).toFixed(2).replace(/\.00$/, '') + 'L';
    } else if (num >= 1_000) {
      // Thousands (for clarity)
      return (num / 1_000).toFixed(2).replace(/\.00$/, '') + 'K';
    }
    return num.toLocaleString(); // fallback for small numbers
  }

  const router = useRouter();

  // Format performance data for chart
  const formatChartData = (performanceData: any) => {
    if (
      !performanceData?.adsparker_performance ||
      !performanceData?.industry_performance
    ) {
      return [];
    }

    const currentDate = new Date();

    // Ensure we only take the first 10 data points
    const adsparkerData = performanceData.adsparker_performance.slice(0, 10);
    const industryData = performanceData.industry_performance.slice(0, 10);

    return adsparkerData.map((adsparkerValue: number, index: number) => {
      const date = new Date(currentDate);
      date.setDate(currentDate.getDate() + index);

      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');

      return {
        day: `${day}-${month}`,
        AdSparker: adsparkerValue,
        Standard: industryData[index] || 0,
      };
    });
  };

  // Refresh ad accounts from Meta Graph API
  const refreshAdAccounts = async () => {
    try {
      setLoadingAccounts(true);
      console.log('🔄 Refreshing ad accounts from Meta...');

      const response = await fetch('/api/meta/refresh-accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Ad accounts refreshed:', data);

        // Refresh the connected accounts list (this will auto-select first account)
        await fetchConnectedAccounts();
        // Also fetch pages
        await fetchPages();
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to refresh ad accounts:', errorData);
        // Don't show alert here, just log - modal will still open
      }
    } catch (error) {
      console.error('Error refreshing ad accounts:', error);
      // Don't block modal opening if refresh fails
    } finally {
      setLoadingAccounts(false);
    }
  };

  // Handle publish ads - check subscription and redirect to payment if needed
  const handlePublishAdsFromButton = async () => {
    // Refresh ad accounts from Meta before opening modal
    await refreshAdAccounts();
    setShowModal(true);
    return;
    try {
      // Check subscription status first
      const subscriptionResponse = await fetch('/api/subscriptions');
      let subscriptionData = null;

      if (subscriptionResponse.ok) {
        subscriptionData = await subscriptionResponse.json();
      }

      const userSubscription = subscriptionData?.subscription;

      // If no subscription, create free trial and proceed
      if (!userSubscription) {
        // Create free trial subscription
        const createTrialResponse = await fetch('/api/subscriptions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            plan_type: 'free_trial',
            card_required: true,
            card_added: false,
            trial_days: 7,
          }),
        });

        if (createTrialResponse.ok) {
          const trialData = await createTrialResponse.json();
          // Refresh subscription status
          await fetchSubscription();

          // For free trial, we still need card, so redirect to Stripe for card setup
          // Create Stripe checkout session for trial (setup payment method)
          const checkoutResponse = await fetch('/api/subscriptions/checkout', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              planType: 'free_trial',
              projectId: projectId,
            }),
          });

          if (checkoutResponse.ok) {
            const checkoutData = await checkoutResponse.json();
            if (checkoutData.url) {
              window.location.href = checkoutData.url;
            } else {
              toast.error(checkoutData.error || 'Failed to create checkout session. Please try again.', {
                duration: 5000,
                style: {
                  background: '#dc2626',
                  color: '#fff',
                  padding: '16px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                },
              });
            }
          } else {
            const errorData = await checkoutResponse.json().catch(() => ({}));
            const errorMessage = errorData.error || errorData.details || 'Failed to create checkout session. Please try again.';
            toast.error(`${errorMessage}${errorData.details ? `\n\nDetails: ${errorData.details}` : ''}`, {
              duration: 5000,
              style: {
                background: '#dc2626',
                color: '#fff',
                padding: '16px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
              },
            });
            console.error('Checkout error:', errorData);
          }
        } else {
          toast.error('Failed to create free trial. Please try again.', {
            duration: 5000,
            style: {
              background: '#dc2626',
              color: '#fff',
              padding: '16px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
            },
          });
        }
        return;
      }

      // If subscription exists, check if it's expired or needs payment
      if (userSubscription.status === 'trial_expired' || !userSubscription.card_added) {
        // Redirect to Stripe checkout for payment
        const checkoutResponse = await fetch('/api/subscriptions/checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            planType: userSubscription.plan_type === 'trial_expired' ? 'monthly' : userSubscription.plan_type,
            projectId: projectId,
          }),
        });

        if (checkoutResponse.ok) {
          const checkoutData = await checkoutResponse.json();
          if (checkoutData.url) {
            window.location.href = checkoutData.url;
          } else {
            toast.error(checkoutData.error || 'Failed to create checkout session. Please try again.', {
              duration: 5000,
              style: {
                background: '#dc2626',
                color: '#fff',
                padding: '16px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
              },
            });
          }
        } else {
          const errorData = await checkoutResponse.json().catch(() => ({}));
          const errorMessage = errorData.error || errorData.details || 'Failed to create checkout session. Please try again.';
          toast.error(`${errorMessage}${errorData.details ? `\n\nDetails: ${errorData.details}` : ''}`, {
            duration: 5000,
            style: {
              background: '#dc2626',
              color: '#fff',
              padding: '16px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
            },
          });
          console.error('Checkout error:', errorData);
        }
        return;
      }

      // If subscription is active and card is added, proceed to publish ads
      // This will be handled by the existing handlePublishAds function
      // For now, show the modal to connect Meta account if needed
      if (connectedAccounts.length === 0) {
        setShowModal(true);
        return;
      }

      // If Meta is connected and subscription is active, proceed with publishing
      await handlePublishAds();
    } catch (error) {
      console.error('Error in publish ads flow:', error);
      toast.error('An error occurred. Please try again.', {
        duration: 5000,
        style: {
          background: '#dc2626',
          color: '#fff',
          padding: '16px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '500',
        },
      });
    }
  };

  // Keep handleNext for modal access (can be used elsewhere)
  const handleNext = async () => {
    // Refresh ad accounts from Meta before opening modal
    await refreshAdAccounts();
    setShowModal(true);
  };

  const handleConnectMetaAccount = async () => {
    try {
      console.log('Initiating Meta OAuth for project:', projectId);
      const response = await fetch(
        `/api/meta-auth?action=connect&projectId=${projectId}`
      );

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (data.success && data.oauthUrl) {
        console.log('Redirecting to OAuth URL:', data.oauthUrl);
        // Redirect to Meta OAuth
        window.location.href = data.oauthUrl;
      } else {
        console.error('Failed to initiate Meta OAuth:', data.error);
        toast.error(
          `Failed to connect Meta account: ${data.error || 'Unknown error'}`,
          {
            duration: 5000,
            style: {
              background: '#dc2626',
              color: '#fff',
              padding: '16px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
            },
          }
        );
      }
    } catch (error) {
      console.error('Error connecting Meta account:', error);
      toast.error('An error occurred while connecting Meta account.', {
        duration: 5000,
        style: {
          background: '#dc2626',
          color: '#fff',
          padding: '16px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '500',
        },
      });
    }
  };

  // Handle publish ads with subscription tracking
  const handlePublishAds = async () => {
    // Prevent multiple simultaneous calls using ref (synchronous check)
    if (isPublishingAdsRef.current) {
      console.log('⚠️ Publish ads already in progress, ignoring duplicate call');
      return;
    }

    try {
      isPublishingAdsRef.current = true;
      setPublishingAds(true);

      // Check if Meta account is connected
      if (connectedAccounts.length === 0) {
        toast.error('Please connect a Meta account first before publishing ads.', {
          duration: 5000,
          style: {
            background: '#dc2626',
            color: '#fff',
            padding: '16px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
          },
        });
        setPublishingAds(false);
        return;
      }

      // Check subscription and usage limits
      const usageCheckResponse = await fetch('/api/subscriptions/check-usage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          limit_type: 'ads_per_day',
          project_id: projectId,
          daily_budget: dailyBudget,
        }),
      });

      const usageCheck = await usageCheckResponse.json();

      if (!usageCheck.can_proceed) {
        // Handle subscription needed or limits reached
        if (usageCheck.reason === 'no_subscription') {
          // Create free trial subscription
          const createTrialResponse = await fetch('/api/subscriptions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              plan_type: 'free_trial',
              card_required: true,
              card_added: false,
              trial_days: 7,
            }),
          });

          if (createTrialResponse.ok) {
            const trialData = await createTrialResponse.json();
            setSubscription(trialData.subscription);
            toast.success(
              'Free trial started! You have 7 days to try our service. After 7 days, you will be billed $199/month unless cancelled.',
              {
                duration: 6000,
                style: {
                  background: '#10b981',
                  color: '#fff',
                  padding: '16px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                },
              }
            );
            // Continue with publishing after trial creation
          } else {
            toast.error('Failed to create free trial. Please try again.', {
              duration: 5000,
              style: {
                background: '#dc2626',
                color: '#fff',
                padding: '16px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
              },
            });
            setPublishingAds(false);
            return;
          }
        } else {
          // Limits reached or other issues
          toast.error(usageCheck.message || 'Unable to publish ads. Please check your subscription limits.', {
            duration: 5000,
            style: {
              background: '#dc2626',
              color: '#fff',
              padding: '16px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
            },
          });
          setPublishingAds(false);
          return;
        }
      }

      // Check daily budget limit
      const budgetCheckResponse = await fetch('/api/subscriptions/check-usage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          limit_type: 'daily_budget',
          project_id: projectId,
          daily_budget: dailyBudget,
        }),
      });

      const budgetCheck = await budgetCheckResponse.json();
      if (!budgetCheck.can_proceed) {
        toast.error(budgetCheck.message || 'Daily budget exceeds your plan limit.', {
          duration: 5000,
          style: {
            background: '#dc2626',
            color: '#fff',
            padding: '16px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
          },
        });
        setPublishingAds(false);
        return;
      }

      // Get selected ad account
      if (!selectedAdAccountId) {
        toast.error('Please select an ad account to publish ads.', {
          duration: 5000,
          style: {
            background: '#dc2626',
            color: '#fff',
            padding: '16px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
          },
        });
        setPublishingAds(false);
        return;
      }

      // Get selected page
      if (!selectedPageId && pages.length > 0) {
        toast.error('Please select a Facebook Page to publish ads.', {
          duration: 5000,
          style: {
            background: '#dc2626',
            color: '#fff',
            padding: '16px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
          },
        });
        setPublishingAds(false);
        return;
      }

      // Ensure ad account ID has 'act_' prefix if needed
      const adAccountId = selectedAdAccountId.startsWith('act_')
        ? selectedAdAccountId
        : `act_${selectedAdAccountId}`;

      // Step 1: Actually create ads in Meta using Meta Graph API
      console.log('🚀 Publishing ads to Meta...');
      const metaPublishResponse = await fetch('/api/meta/publish-ads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: projectId,
          campaignName: campaignProposal?.campaignName || 'Campaign',
          adSets: adSets.length > 0 ? adSets : (selectedAdSet ? [selectedAdSet] : []),
          adAccountId: adAccountId,
          pageId: selectedPageId || null,
          dailyBudget: dailyBudget,
          objective: campaignProposal?.ad_goal === 'Leads' ? 'OUTCOME_LEADS' : 'OUTCOME_TRAFFIC',
          websiteUrl: websiteUrl || campaignProposal?.website_url || null,
        }),
      });

      if (!metaPublishResponse.ok) {
        const errorData = await metaPublishResponse.json();
        console.error('❌ Meta publish error:', errorData);

        // Check if it's a Facebook page error
        if (errorData.error === 'Facebook Page is required' || errorData.message?.includes('Facebook Page')) {
          toast.error(
            errorData.message || 'Facebook Page is required',
            {
              duration: 5000,
              style: {
                background: '#dc2626',
                color: '#fff',
                padding: '16px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
              },
              iconTheme: {
                primary: '#fff',
                secondary: '#dc2626',
              },
            }
          );
        } else {
          // Show other errors with red toast
          toast.error(
            errorData.error || errorData.details || errorData.message || 'Failed to publish ads to Meta. Please check your ad account and try again.',
            {
              duration: 5000,
              style: {
                background: '#dc2626',
                color: '#fff',
                padding: '16px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
              },
              iconTheme: {
                primary: '#fff',
                secondary: '#dc2626',
              },
            }
          );
        }
        setPublishingAds(false);
        return;
      }

      const metaPublishData = await metaPublishResponse.json();
      console.log('✅ Meta publish response:', metaPublishData);

      if (!metaPublishData.success || !metaPublishData.campaign) {
        toast.error(
          metaPublishData.message || 'Failed to create campaign in Meta. Some ad sets may have failed.',
          {
            duration: 5000,
            style: {
              background: '#dc2626',
              color: '#fff',
              padding: '16px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
            },
            iconTheme: {
              primary: '#fff',
              secondary: '#dc2626',
            },
          }
        );
        setPublishingAds(false);
        return;
      }

      // Step 2: Track ad publication in our database
      const createdAdSets = metaPublishData.adSets || [];
      const campaignId = metaPublishData.campaign?.id;

      // Show errors for failed ad sets
      if (metaPublishData.errors && metaPublishData.errors.length > 0) {
        metaPublishData.errors.forEach((error: any) => {
          const errorMessage = error.error || error.details?.error_user_msg || error.details?.message || 'Failed to create ad set';
          toast.error(
            `${error.adSetTitle || 'Ad Set'}: ${errorMessage}`,
            {
              duration: 6000,
              style: {
                background: '#dc2626',
                color: '#fff',
                padding: '16px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
              },
              iconTheme: {
                primary: '#fff',
                secondary: '#dc2626',
              },
            }
          );
        });
      }

      // Track each created ad set
      for (const createdAdSet of createdAdSets) {
        const trackResponse = await fetch('/api/subscriptions/publish-ad', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            project_id: projectId,
            campaign_name: campaignProposal?.campaignName || 'Campaign',
            ad_set_id: createdAdSet.id,
            ad_account_id: adAccountId,
            daily_budget: createdAdSet.daily_budget || dailyBudget,
            metadata: {
              campaign_id: campaignId,
              ad_set_name: createdAdSet.name,
              meta_campaign_id: campaignId,
            },
          }),
        });

        if (!trackResponse.ok) {
          console.error('Failed to track ad set:', createdAdSet.id);
        }
      }

      // Refresh subscription status
      await fetchSubscription();

      // Show success message
      const successMessage = `Campaign created successfully in Meta! Campaign: ${metaPublishData.campaign.name}, Ad Sets Created: ${createdAdSets.length} out of ${metaPublishData.totalRequested}. All ad sets are PAUSED - activate them in Meta Ads Manager to start running.`;
      const trialMessage = subscription?.plan_type === 'free_trial'
        ? ' Your free trial is active. You will be billed $199/month after 7 days unless cancelled.'
        : '';

      toast.success(successMessage + trialMessage, {
        duration: 6000,
        style: {
          background: '#10b981',
          color: '#fff',
          padding: '16px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '500',
        },
      });

      // Close modal
      setShowModal(false);

      // Redirect to running projects tab after successful publishing
      router.push('/dashboard/projects?tab=running');
    } catch (error) {
      console.error('Error publishing ads:', error);
      toast.error(
        'An error occurred while publishing ads. Please try again.',
        {
          duration: 5000,
          style: {
            background: '#dc2626',
            color: '#fff',
            padding: '16px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
          },
          iconTheme: {
            primary: '#fff',
            secondary: '#dc2626',
          },
        }
      );
    } finally {
      isPublishingAdsRef.current = false;
      setPublishingAds(false);
    }
  };

  const handlePrev = () => {
    router.push(`/dashboard/projects/${projectId}/confirming`);
  };

  return (
    <div className='plan_container'>
      <Stepper currentStepKey='step4' />
      <div className='heading_block'>
        <h2>
          Set Your <span>Campaign Budget</span>
        </h2>
        <p>
          Optimize spend, target the right decision-makers, and preview your ads
          before publishing.
        </p>
      </div>
      <div className='plan_top_row'>
        <div className='budget_row'>
          <div className='header'>
            <div className='heading'>
              <h3>{campaignProposal?.campaignName || 'Campaign Name'}</h3>
              <p>
                Start Date{' '}
                {campaignProposal?.start_date
                  ? new Date(campaignProposal.start_date).toLocaleDateString()
                  : 'N/A'}{' '}
                - End Date{' '}
                {campaignProposal?.end_date
                  ? new Date(campaignProposal.end_date).toLocaleDateString()
                  : 'N/A'}
              </p>
            </div>
            <span>{campaignProposal?.ad_goal || 'Leads'}</span>
          </div>
          <div className='bg_container'>
            <h4>Daily Budget</h4>
            <div className='budget'>
              <p>
                Optimized Budget for Technology Solutions and Consulting, Based
                on thousands of Campaigns in the IN
              </p>
              <span>${dailyBudget}</span>
            </div>
            <Slider
              defaultValue={75}
              min={2}
              max={150}
              value={dailyBudget}
              onChange={handleSliderChange}
            />

            <div className='progress-labels'>
              <div className='label'>
                <span>Limited</span>
              </div>
              <div className='divider'></div>
              <div className='label'>
                <span>Basic Reach</span>
              </div>
              <div className='divider'></div>
              <div className='label'>
                <span className='highlight'>2x + Results</span>
              </div>
            </div>

            <div className='results_title'>
              <span className='icon'>
                <svg
                  width='14'
                  height='10'
                  viewBox='0 0 14 10'
                  fill='none'
                  xmlns='http://www.w3.org/2000/svg'
                >
                  <path
                    d='M12.3337 1L5.00033 8.33333L1.66699 5'
                    stroke='white'
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  />
                </svg>
              </span>
              Your budget works - more budget, better results!
            </div>
          </div>
        </div>
        <div className='chart_row'>
          <div className='header'>
            <h3>Performance Forecast</h3>
            <div className='labels'>
              <div className='adsparker'>
                <span className='icon'></span>
                AdSparker
              </div>
              <div className='standard'>
                <span className='icon'></span>
                Standard
              </div>
            </div>
          </div>
          <div className='chart-container' style={{ height: '240px' }}>
            {loadingPerformance ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  fontSize: '16px',
                  color: '#666',
                }}
              >
                Loading performance data...
              </div>
            ) : performanceData ? (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  color: '#333',
                }}
              >
                {/* Performance Chart */}
                <div style={{ marginTop: '20px', height: '240px' }}>
                  <ResponsiveContainer width='100%' height='100%'>
                    <LineChart
                      data={formatChartData(performanceData)}
                      margin={{ top: 5, right: 30, left: 0, bottom: 25 }}
                    >
                      <CartesianGrid stroke='#F3F2F7' strokeDasharray='0' />
                      <XAxis
                        dataKey='day'
                        fontSize={12}
                        tick={{ fill: '#666', fontSize: 11 }}
                        interval={0}
                        tickLine={false}
                        axisLine={false}
                        height={40}
                        tickMargin={5}
                      />
                      <YAxis hide={true} />
                      <Tooltip
                        formatter={(value: any) => [formatNumber(value), '']}
                        labelFormatter={label => `${label}`}
                      />
                      <Line
                        type='monotone'
                        dataKey='AdSparker'
                        stroke='#7e52e0'
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type='monotone'
                        dataKey='Standard'
                        stroke='#666'
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  fontSize: '16px',
                  color: '#999',
                }}
              >
                Adjust budget slider to see performance forecast
              </div>
            )}
          </div>
        </div>
      </div>

      <div className='adset_row'>
        <div className='header'>
          <h3>Top - Performing Ad Sets</h3>
          <button onClick={() => setShowImageModal(true)}>
            <svg
              width='21'
              height='21'
              viewBox='0 0 21 21'
              fill='none'
              xmlns='http://www.w3.org/2000/svg'
            >
              <path
                d='M16.3333 3H4.66667C3.74619 3 3 3.74619 3 4.66667V16.3333C3 17.2538 3.74619 18 4.66667 18H16.3333C17.2538 18 18 17.2538 18 16.3333V4.66667C18 3.74619 17.2538 3 16.3333 3Z'
                stroke='white'
                strokeWidth='1.5'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
              <path
                d='M7.99967 9.66683C8.92015 9.66683 9.66634 8.92064 9.66634 8.00016C9.66634 7.07969 8.92015 6.3335 7.99967 6.3335C7.0792 6.3335 6.33301 7.07969 6.33301 8.00016C6.33301 8.92064 7.0792 9.66683 7.99967 9.66683Z'
                stroke='white'
                strokeWidth='1.5'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
              <path
                d='M18 13.0001L15.4283 10.4284C15.1158 10.116 14.6919 9.94043 14.25 9.94043C13.8081 9.94043 13.3842 10.116 13.0717 10.4284L5.5 18.0001'
                stroke='white'
                strokeWidth='1.5'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
            </svg>
            Import Media
          </button>
        </div>
        <div className='grid_row'>
          <div className='adset_buttons'>
            {loading ? (
              <div>Loading ad sets...</div>
            ) : (
              adSets.map((adSet, index) => (
                <button
                  key={adSet.ad_set_id ?? `adset-${index}`}
                  className={selectedAdSetIndex === index ? 'active' : ''}
                  onClick={() => handleAdSetClick(adSet, index)}
                >
                  {`Ad Set - ${String(index + 1).padStart(2, '0')}`}
                </button>
              ))
            )}
          </div>
          <div className='ad_details'>
            <h4 className='ad_title'>
              {selectedAdSet ? selectedAdSet.ad_set_title : 'Select an Ad Set'}
            </h4>
            {selectedAdSet && (
              <>
                <div className='basic_details block'>
                  <p>
                    Age
                    <span>
                      {selectedAdSet.age_range.min}-
                      {selectedAdSet.age_range.max}
                    </span>
                  </p>
                  <p>
                    Gender <span>{selectedAdSet.genders.join(', ')}</span>
                  </p>
                  <p>
                    Location
                    <span>
                      {selectedAdSet.targeting?.GeoLocations?.Countries?.join(
                        ', '
                      ) || 'USA'}
                    </span>
                  </p>

                  <p className='description '>
                    Ad Spent:
                    <span>${(dailyBudget / 10).toFixed(2)}</span>
                  </p>
                </div>
                <div className='collapsible'>
                  <button onClick={() => toggleCollapsible('audience')}>
                    Audience Description
                    <svg
                      width='8'
                      height='12'
                      viewBox='0 0 8 12'
                      fill='none'
                      xmlns='http://www.w3.org/2000/svg'
                      style={{
                        transform: collapsedStates.audience
                          ? 'rotate(90deg)'
                          : 'rotate(0deg)',
                        transition: 'transform 0.3s ease',
                      }}
                    >
                      <path
                        d='M1.5 11L6.5 6L1.5 1'
                        stroke='#7E52E0'
                        strokeWidth='2'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                      />
                    </svg>
                  </button>
                  <div>
                    <p
                      style={{
                        maxHeight: collapsedStates.audience ? '200px' : '0px',
                        overflow: 'hidden',
                        transition: 'max-height 0.3s ease',
                        margin: collapsedStates.audience ? '10px 0' : '0',
                      }}
                    >
                      {selectedAdSet.audience_description}
                    </p>
                  </div>
                </div>
                <div className='collapsible'>
                  <button onClick={() => toggleCollapsible('copywriting')}>
                    Ad Copy
                    <svg
                      width='8'
                      height='12'
                      viewBox='0 0 8 12'
                      fill='none'
                      xmlns='http://www.w3.org/2000/svg'
                      style={{
                        transform: collapsedStates.copywriting
                          ? 'rotate(90deg)'
                          : 'rotate(0deg)',
                        transition: 'transform 0.3s ease',
                      }}
                    >
                      <path
                        d='M1.5 11L6.5 6L1.5 1'
                        stroke='#7E52E0'
                        strokeWidth='2'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                      />
                    </svg>
                  </button>
                  <div
                    style={{
                      maxHeight: collapsedStates.copywriting ? '200px' : '0px',
                      overflow: 'hidden',
                      transition: 'max-height 0.3s ease',
                      margin: collapsedStates.copywriting ? '10px 0' : '0',
                    }}
                  >
                    <p>
                      <strong>Title:</strong>{' '}
                      {selectedAdSet.ad_copywriting_title}
                    </p>
                    <p>
                      <strong>Body:</strong> {selectedAdSet.ad_copywriting_body}
                    </p>
                  </div>
                </div>
                <div className='collapsible'>
                  <button onClick={() => toggleCollapsible('tags')}>
                    Audience Tags
                    <svg
                      width='8'
                      height='12'
                      viewBox='0 0 8 12'
                      fill='none'
                      xmlns='http://www.w3.org/2000/svg'
                      style={{
                        transform: collapsedStates.tags
                          ? 'rotate(90deg)'
                          : 'rotate(0deg)',
                        transition: 'transform 0.3s ease',
                      }}
                    >
                      <path
                        d='M1.5 11L6.5 6L1.5 1'
                        stroke='#7E52E0'
                        strokeWidth='2'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                      />
                    </svg>
                  </button>
                  <div
                    style={{
                      maxHeight: collapsedStates.tags ? '200px' : '0px',
                      overflow: 'hidden',
                      transition: 'max-height 0.3s ease',
                      margin: collapsedStates.tags ? '10px 0' : '0',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '8px',
                        padding: '20px',
                        paddingTop: '0px',
                      }}
                    >
                      {selectedAdSet.audience_tags &&
                        Array.isArray(selectedAdSet.audience_tags) ? (
                        selectedAdSet.audience_tags.map(
                          (tag: string, index: number) => (
                            <span
                              key={index}
                              style={{
                                backgroundColor: '#7E52E0',
                                color: 'white',
                                padding: '4px 8px',
                                borderRadius: '12px',
                                fontSize: '12px',
                                fontWeight: '500',
                              }}
                            >
                              {tag}
                            </span>
                          )
                        )
                      ) : (
                        <span style={{ color: '#666', fontSize: '12px' }}>
                          No audience tags available
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          <div className='meta_ad_post'>
            <div className='header'>
              <div className='profile'>
                <svg
                  width='35'
                  height='35'
                  viewBox='0 0 35 35'
                  fill='none'
                  xmlns='http://www.w3.org/2000/svg'
                >
                  <rect width='35' height='35' rx='17.5' fill='#E2D5FF' />
                  <path
                    d='M24 26.5V24.5C24 23.4391 23.5786 22.4217 22.8284 21.6716C22.0783 20.9214 21.0609 20.5 20 20.5H14C12.9391 20.5 11.9217 20.9214 11.1716 21.6716C10.4214 22.4217 10 23.4391 10 24.5V26.5'
                    stroke='#343438'
                    strokeWidth='1.5'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  />
                  <path
                    d='M17 16.5C19.2091 16.5 21 14.7091 21 12.5C21 10.2909 19.2091 8.5 17 8.5C14.7909 8.5 13 10.2909 13 12.5C13 14.7091 14.7909 16.5 17 16.5Z'
                    stroke='#343438'
                    strokeWidth='1.5'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  />
                </svg>
                <div className='details'>
                  <p>Your Name</p>
                  <span>Sponsored</span>
                </div>
              </div>
            </div>
            <div className='body'>
              {selectedAdSet ? (
                <div style={{ position: 'relative' }}>
                  {selectedAdSet.adsparker_gen_creative_asset ? (
                    <Image
                      src={selectedAdSet.adsparker_gen_creative_asset}
                      height={295}
                      width={380}
                      alt='Generated Ad Creative'
                    />
                  ) : thumbnailImage ? (
                    <Image
                      src={thumbnailImage}
                      height={295}
                      width={380}
                      alt='Thumbnail Ad Creative'
                    />
                  ) : (
                    <Image
                      src={'/images/preview_ad_creative.png'}
                      height={295}
                      width={380}
                      alt='Preview Ad Creative'
                    />
                  )}
                </div>
              ) : thumbnailImage ? (
                <Image
                  src={thumbnailImage}
                  height={295}
                  width={380}
                  alt='Thumbnail Ad Creative'
                />
              ) : (
                <Image
                  src={'/images/preview_ad_creative.png'}
                  height={295}
                  width={380}
                  alt='Ad Image Creative'
                />
              )}
            </div>
            <div className='post_details'>
              <div>
                <p className='link'>
                  {websiteUrl || 'https://www.example.com/'}
                </p>
                <p className='link'>
                  {selectedAdSet
                    ? selectedAdSet.ad_copywriting_title
                    : 'Transform Business Decisions with Cutting-Edge Solutions 🌐'}
                </p>
                {selectedAdSet?.ad_copywriting_body && (
                  <p>{selectedAdSet.ad_copywriting_body}</p>
                )}
              </div>
              <div className='cta'>Shop Now</div>
            </div>
            <div
              style={{ padding: '6px 24px', borderBottom: '1px solid #D9D9D9' }}
            >
              <Image
                src={'/images/post_comment.png'}
                height={20}
                width={320}
                alt='Ad Image Creative'
              />
            </div>
            <div style={{ padding: '12px 24px', paddingBottom: '24px' }}>
              <Image
                src={'/images/like_share.png'}
                height={16}
                width={320}
                alt='Ad Image Creative'
              />
            </div>
          </div>
        </div>
      </div>

      {/* nav buttons */}
      <div className='nav_buttons_wrapper'>
        <button onClick={handlePrev}>
          <svg
            width='20'
            height='20'
            viewBox='0 0 20 20'
            fill='none'
            xmlns='http://www.w3.org/2000/svg'
          >
            <path
              d='M5 6.6665L1.66667 9.99984L5 13.3332'
              stroke='#7E52E0'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
            />
            <path
              d='M18.333 10H1.66634'
              stroke='#7E52E0'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
            />
          </svg>
          Back
        </button>
        <button onClick={handlePublishAdsFromButton} className='next'>
          Publish Ads
          <svg
            width='20'
            height='20'
            viewBox='0 0 20 20'
            fill='none'
            xmlns='http://www.w3.org/2000/svg'
          >
            <path
              d='M15 6.6665L18.3333 9.99984L15 13.3332'
              stroke='white'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
            />
            <path
              d='M1.66699 10H18.3337'
              stroke='white'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
            />
          </svg>
        </button>
      </div>

      {/* Ad Design Preview Modal */}
      {showModal && (
        <div className='modal-overlay' onClick={() => setShowModal(false)}>
          <div className='modal-content' onClick={e => e.stopPropagation()}>
            <div className='modal-header'>
              <button
                className='close-button'
                onClick={() => setShowModal(false)}
              >
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  width='24'
                  height='24'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  stroke-width='2'
                  stroke-linecap='round'
                  strokeLinejoin='round'
                >
                  <path d='M18 6 6 18' />
                  <path d='m6 6 12 12' />
                </svg>
              </button>
            </div>
            <div className='modal-body'>
              <h3>
                <Image
                  src='/images/meta.png'
                  height={40}
                  width={40}
                  alt='Meta Logo'
                />
                Connect Meta Ads
              </h3>
              <p className='des'>
                Securely link your Meta Business ad account to manage campaigns
                across brands.
              </p>
              <div className='connections'>
                <div className='left'>
                  <h4>
                    Meta Accounts <span>Connected</span>
                  </h4>
                  <p>Connected: {connectedAccounts.length} accounts</p>
                  {connectedAccounts.length > 0 && (
                    <div className='connected-accounts'>
                      {connectedAccounts.map((account, index) => (
                        <div key={index} className='account-item'>
                          <span className='account-name'>{account.name}</span>
                          <span className='account-email'>{account.email}</span>
                          <span className='account-date'>
                            Connected:{' '}
                            {new Date(
                              account.connected_at
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className='right'>
                  {(() => {
                    const allAdAccounts = getAllAdAccounts(connectedAccounts);
                    const hasAdAccounts = allAdAccounts.length > 0;
                    return (
                      <button
                        onClick={handleConnectMetaAccount}
                        disabled={hasAdAccounts}
                        style={{
                          opacity: hasAdAccounts ? 0.5 : 1,
                          cursor: hasAdAccounts ? 'not-allowed' : 'pointer',
                        }}
                      >
                        <svg
                          xmlns='http://www.w3.org/2000/svg'
                          width='24'
                          height='24'
                          viewBox='0 0 24 24'
                          fill='none'
                          stroke='currentColor'
                          stroke-width='2'
                          stroke-linecap='round'
                          strokeLinejoin='round'
                        >
                          <path d='M5 12h14' />
                          <path d='M12 5v14' />
                        </svg>
                        Connect Ad Account
                      </button>
                    );
                  })()}
                </div>
              </div>
              <div className='note'>
                <svg
                  width='24'
                  height='24'
                  viewBox='0 0 24 24'
                  fill='none'
                  xmlns='http://www.w3.org/2000/svg'
                >
                  <path
                    d='M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z'
                    stroke='#343438'
                    stroke-width='2'
                    stroke-linecap='round'
                    strokeLinejoin='round'
                  />
                  <path
                    d='M12 16V12'
                    stroke='#343438'
                    stroke-width='2'
                    stroke-linecap='round'
                    strokeLinejoin='round'
                  />
                  <path
                    d='M12 8H12.01'
                    stroke='#343438'
                    stroke-width='2'
                    stroke-linecap='round'
                    strokeLinejoin='round'
                  />
                </svg>
                <p>
                  All your brands and projects will connect to the same Facebook
                  account. <span>Upgrade to Enterprise </span> to use multiple
                  Meta accounts.
                </p>
              </div>



              {/* Ad Account Selector */}
              {connectedAccounts.length > 0 && (() => {
                const allAdAccounts = getAllAdAccounts(connectedAccounts);
                return allAdAccounts.length > 0 ? (
                  <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e5e7eb' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: '10px',
                      fontSize: '15px',
                      fontWeight: '600',
                      color: '#343438',
                      letterSpacing: '0.01em'
                    }}>
                      Ad Account
                    </label>
                    <Dropdown
                      menu={{
                        items: allAdAccounts.map((adAccount) => ({
                          key: adAccount.id,
                          label: `${adAccount.name} (${adAccount.id}) ${adAccount.currency ? `- ${adAccount.currency}` : ''}${adAccount.account_status === 1 ? ' ✓' : ' ⚠'}`,
                        })),
                        onClick: (e) => {
                          setSelectedAdAccountId(e.key);
                        },
                        style: {
                          maxHeight: '300px',
                          overflowY: 'auto',
                        },
                      }}
                      placement="bottomLeft"
                      arrow
                      trigger={['click']}
                    >
                      <div className="dropdown_input" style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        height: '48px',
                        borderRadius: '6px',
                        border: '1px solid #d9d9d9',
                        paddingInline: '16px',
                        backgroundColor: 'white',
                        color: '#343438',
                        fontWeight: '400',
                        cursor: 'pointer',
                      }}>
                        <span style={{ color: selectedAdAccountId ? 'inherit' : '#999' }}>
                          {selectedAdAccountId
                            ? (() => {
                              const selected = allAdAccounts.find(acc => acc.id === selectedAdAccountId);
                              return selected
                                ? `${selected.name} (${selected.id}) ${selected.currency ? `- ${selected.currency}` : ''}${selected.account_status === 1 ? ' ✓' : ' ⚠'}`
                                : 'Select Ad Account';
                            })()
                            : 'Select Ad Account'}
                        </span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </div>
                    </Dropdown>
                    {selectedAdAccountId && (() => {
                      const selected = allAdAccounts.find(acc => acc.id === selectedAdAccountId);
                      return selected && selected.account_status !== 1 ? (
                        <p style={{
                          marginTop: '8px',
                          fontSize: '12px',
                          color: '#dc2626'
                        }}>
                          ⚠ This ad account may be disabled or restricted. Please check your Meta Ads Manager.
                        </p>
                      ) : null;
                    })()}
                  </div>
                ) : null;
              })()}

              {/* Facebook Page Selector */}
              {pages.length > 0 && (
                <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e5e7eb' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '10px',
                    fontSize: '15px',
                    fontWeight: '600',
                    color: '#343438',
                    letterSpacing: '0.01em'
                  }}>
                    Facebook Page
                  </label>
                  <Dropdown
                    menu={{
                      items: pages.map((page) => ({
                        key: page.id,
                        label: `${page.name}${page.category ? ` (${page.category})` : ''}`,
                      })),
                      onClick: (e) => {
                        setSelectedPageId(e.key);
                      },
                      style: {
                        maxHeight: '300px',
                        overflowY: 'auto',
                      },
                    }}
                    placement="bottomLeft"
                    arrow
                    trigger={['click']}
                  >
                    <div className="dropdown_input" style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      height: '48px',
                      borderRadius: '6px',
                      border: '1px solid #d9d9d9',
                      paddingInline: '16px',
                      backgroundColor: 'white',
                      color: '#343438',
                      fontWeight: '400',
                      cursor: 'pointer',
                    }}>
                      <span style={{ color: selectedPageId ? 'inherit' : '#999' }}>
                        {selectedPageId
                          ? (() => {
                            const selected = pages.find(p => p.id === selectedPageId);
                            return selected
                              ? `${selected.name}${selected.category ? ` (${selected.category})` : ''}`
                              : 'Select Facebook Page';
                          })()
                          : 'Select Facebook Page'}
                      </span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </div>
                  </Dropdown>
                </div>
              )}

              {/* Publish Ads Button */}
              {connectedAccounts.length > 0 && (
                <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e5e7eb' }}>
                  <button
                    className='publish_modal_btn'
                    onClick={handlePublishAds}
                    disabled={publishingAds || subscriptionLoading || !selectedAdAccountId || (pages.length > 0 && !selectedPageId)}
                    style={{
                      width: '100%',
                      padding: '12px 24px',
                      backgroundColor: '#7e52e0',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: publishingAds || subscriptionLoading ? 'not-allowed' : 'pointer',
                      opacity: publishingAds || subscriptionLoading ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    {publishingAds ? (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M4 11a9 9 0 0 1 9 9" /><path d="M4 4a16 16 0 0 1 16 16" /><circle cx="5" cy="19" r="1" /></svg>
                        Publishing Ads...
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M4 11a9 9 0 0 1 9 9" /><path d="M4 4a16 16 0 0 1 16 16" /><circle cx="5" cy="19" r="1" /></svg>
                        Publish Ads
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image Management Modal */}
      {showImageModal && (
        <div className='modal-overlay'>
          <div className='modal-wrapper'>
            {/* Top Bar */}
            <div className='modal-top-bar'>
              <div className='top-bar-left'>
                <svg
                  width='16'
                  height='16'
                  viewBox='0 0 16 16'
                  fill='none'
                  xmlns='http://www.w3.org/2000/svg'
                  className='top-bar-icon'
                >
                  <path
                    d='M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z'
                    fill='#6366f1'
                  />
                </svg>
                <span className='top-bar-title'>Ad Sets</span>
                <span className='top-bar-count'>10</span>
              </div>
              <button
                className='top-bar-close'
                onClick={() => setShowImageModal(false)}
              >
                <svg width='16' height='16' viewBox='0 0 16 16' fill='none'>
                  <path
                    d='M12 4L4 12M4 4l8 8'
                    stroke='#6366f1'
                    strokeWidth='1.5'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  />
                </svg>
              </button>
            </div>

            <div className='upload-instructions'>
              <p>Maximum 20 files per upload</p>
              <p>
                Images (PNG, JPG, JPEG) 2 MB max. Videos (MP4, MOV) 20MB max
              </p>
            </div>

            <div className='modal-body'>
              {/* AI Generated Images Section */}
              <div className='image-section'>
                <h4>AI Images</h4>
                <div className='image-grid'>
                  {aiImages.map((imageUrl, index) => (
                    <div
                      key={`ai-${index}`}
                      className={`image-item ${selectedThumbnailImage === imageUrl ? 'selected' : ''}`}
                      onClick={() => setSelectedThumbnailImage(imageUrl)}
                    >
                      <Image
                        src={imageUrl}
                        alt={`AI Generated Image ${index + 1}`}
                        width={200}
                        height={200}
                        style={{ objectFit: 'cover', borderRadius: '8px' }}
                      />
                      <div className='image-hover-overlay'>
                        <button
                          className='image-preview-btn'
                          onClick={e => {
                            e.stopPropagation();
                            setPreviewImage(imageUrl);
                          }}
                        >
                          <svg
                            width='20'
                            height='20'
                            viewBox='0 0 24 24'
                            fill='none'
                            xmlns='http://www.w3.org/2000/svg'
                          >
                            <path
                              d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z'
                              stroke='white'
                              strokeWidth='2'
                              strokeLinecap='round'
                              strokeLinejoin='round'
                            />
                            <circle
                              cx='12'
                              cy='12'
                              r='3'
                              stroke='white'
                              strokeWidth='2'
                              strokeLinecap='round'
                              strokeLinejoin='round'
                            />
                          </svg>
                        </button>
                      </div>
                      <div
                        className='image-close-btn'
                        onClick={e => {
                          e.stopPropagation();
                          // Remove AI image functionality can be added here
                        }}
                      >
                        <svg
                          width='12'
                          height='12'
                          viewBox='0 0 12 12'
                          fill='none'
                        >
                          <path
                            d='M9 3L3 9M3 3l6 6'
                            stroke='#6b7280'
                            strokeWidth='1.5'
                            strokeLinecap='round'
                            strokeLinejoin='round'
                          />
                        </svg>
                      </div>
                    </div>
                  ))}
                  {autoGeneratingImage && aiImages.length === 0 && (
                    <div className='image-item loading-image'>
                      <div className='loading-dots'>
                        <div className='dot'></div>
                        <div className='dot'></div>
                        <div className='dot'></div>
                      </div>
                      <p>Generating AI Image...</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Uploaded Images Section */}
              <div className='image-section'>
                <h4>Images</h4>
                <div className='upload-section'>
                  <input
                    type='file'
                    accept='image/*'
                    onChange={handleFileUpload}
                    disabled={uploadingFile}
                    style={{ display: 'none' }}
                    id='file-upload'
                  />
                  <label htmlFor='file-upload' className='upload-btn'>
                    {uploadingFile ? 'Uploading...' : 'Upload Image'}
                  </label>
                </div>
                <div className='image-grid'>
                  {uploadedImages.map((imageUrl, index) => (
                    <div
                      key={`uploaded-${index}`}
                      className={`image-item ${selectedThumbnailImage === imageUrl ? 'selected' : ''}`}
                      onClick={() => setSelectedThumbnailImage(imageUrl)}
                    >
                      <Image
                        src={imageUrl}
                        alt={`Uploaded Image ${index + 1}`}
                        width={200}
                        height={200}
                        style={{ objectFit: 'cover', borderRadius: '8px' }}
                      />
                      <div className='image-hover-overlay'>
                        <button
                          className='image-preview-btn'
                          onClick={e => {
                            e.stopPropagation();
                            setPreviewImage(imageUrl);
                          }}
                        >
                          <svg
                            width='20'
                            height='20'
                            viewBox='0 0 24 24'
                            fill='none'
                            xmlns='http://www.w3.org/2000/svg'
                          >
                            <path
                              d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z'
                              stroke='white'
                              strokeWidth='2'
                              strokeLinecap='round'
                              strokeLinejoin='round'
                            />
                            <circle
                              cx='12'
                              cy='12'
                              r='3'
                              stroke='white'
                              strokeWidth='2'
                              strokeLinecap='round'
                              strokeLinejoin='round'
                            />
                          </svg>
                        </button>
                      </div>
                      <div
                        className='image-close-btn'
                        onClick={e => {
                          e.stopPropagation();
                          // Remove uploaded image functionality can be added here
                        }}
                      >
                        <svg
                          width='12'
                          height='12'
                          viewBox='0 0 12 12'
                          fill='none'
                        >
                          <path
                            d='M9 3L3 9M3 3l6 6'
                            stroke='#6b7280'
                            strokeWidth='1.5'
                            strokeLinecap='round'
                            strokeLinejoin='round'
                          />
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer with Save Button */}
            <div className='modal-footer'>
              <div className='modal-actions'>
                <button
                  className='save-btn'
                  onClick={() => {
                    setShowImageModal(false);
                    setSelectedThumbnailImage(null);
                  }}
                >
                  Save
                </button>
                <button
                  className='save-assign-btn'
                  onClick={handleSaveThumbnail}
                  disabled={!selectedThumbnailImage || savingThumbnail}
                >
                  {savingThumbnail ? 'Saving...' : 'Save and Assign'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className='image-preview-overlay'
          onClick={() => setPreviewImage(null)}
        >
          <div
            className='image-preview-content'
            onClick={e => e.stopPropagation()}
          >
            <button
              className='image-preview-close'
              onClick={() => setPreviewImage(null)}
            >
              <svg
                width='24'
                height='24'
                viewBox='0 0 24 24'
                fill='none'
                xmlns='http://www.w3.org/2000/svg'
              >
                <path
                  d='M18 6L6 18M6 6l12 12'
                  stroke='white'
                  strokeWidth='2'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                />
              </svg>
            </button>
            <Image
              src={previewImage}
              alt='Preview'
              width={1200}
              height={800}
              style={{
                objectFit: 'contain',
                maxWidth: '90vw',
                maxHeight: '90vh',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
