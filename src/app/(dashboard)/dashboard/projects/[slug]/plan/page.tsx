'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import './plan.css';
import Stepper from '@/components/dashboard/Stepper';
import { Slider } from 'antd';
import Image from 'next/image';
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
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Fetch project data including campaign proposal
  const fetchProjectData = async () => {
    try {
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
      }
    } catch (error) {
      console.error('Error fetching project data:', error);
    }
  };

  // Fetch connected Meta accounts
  const fetchConnectedAccounts = async () => {
    try {
      setLoadingAccounts(true);
      const response = await fetch(`/api/projects/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        if (data?.meta_accounts) {
          const accounts =
            typeof data.meta_accounts === 'string'
              ? JSON.parse(data.meta_accounts)
              : data.meta_accounts;
          setConnectedAccounts(accounts);
        }
      }
    } catch (error) {
      console.error('Error fetching connected accounts:', error);
    } finally {
      setLoadingAccounts(false);
    }
  };

  // Fetch ad sets on component mount
  useEffect(() => {
    const fetchAdSets = async () => {
      try {
        setLoading(true);

        // Step 1: Call audience-tag-gen API first
        console.log('📋 Step 1: Calling audience-tag-gen API...');
        try {
          const audienceTagResponse = await fetch('/api/audience-tag-gen', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ project_id: projectId }),
          });

          if (!audienceTagResponse.ok) {
            console.warn(
              '⚠️ Audience tag generation failed with status:',
              audienceTagResponse.status
            );
            // Continue with ad sets generation even if audience tags fail
          } else {
            const audienceTagResult = await audienceTagResponse.json();
            if (audienceTagResult.success) {
              console.log('✅ Audience tag generation completed successfully');
              console.log('📊 Audience tag data received:', audienceTagResult);
            } else {
              console.warn(
                '⚠️ Audience tag generation returned unsuccessful result'
              );
            }
          }
        } catch (audienceError) {
          console.warn('⚠️ Audience tag generation error:', audienceError);
          // Continue with ad sets generation even if audience tags fail
        }

        // Step 2: Call generate-adsets API after audience-tag-gen completes
        console.log('📋 Step 2: Calling generate-adsets API...');
        const response = await fetch(
          `/api/projects/${projectId}/generate-adsets`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch ad sets');
        }

        const data = await response.json();
        if (data.adsets && Array.isArray(data.adsets)) {
          setAdSets(data.adsets.slice(0, 10)); // Take first 10 ad sets
          if (data.adsets.length > 0) {
            setSelectedAdSet(data.adsets[0]); // Select first ad set by default
          }
        }
        console.log('✅ Ad sets generation completed successfully');
      } catch (error) {
        console.error('Error fetching ad sets:', error);
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      fetchAdSets();
      fetchConnectedAccounts(); // Fetch connected accounts
      fetchProjectData(); // Fetch campaign proposal data
      // Fetch initial performance data with default budget
      fetchPerformanceData(75);
    }
  }, [projectId]);

  // Handle OAuth success message
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const metaConnected = urlParams.get('meta_connected');

    if (metaConnected === 'true') {
      // Refresh connected accounts
      fetchConnectedAccounts();
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
      // Show success message
      alert('Meta account connected successfully!');
    }
  }, []);

  // Handle ad set selection
  const handleAdSetClick = (adSet: AdSet) => {
    setSelectedAdSet(adSet);
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

  // Handle AI image generation
  const handleGenerateAiImage = async () => {
    if (aiImages.length >= 2) {
      alert('Maximum 2 AI images allowed per project');
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
      }
    } catch (error) {
      console.error('Error generating AI image:', error);
      alert('Failed to generate AI image');
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
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file');
    } finally {
      setUploadingFile(false);
    }
  };

  // Handle saving thumbnail image
  const handleSaveThumbnail = async () => {
    if (!selectedThumbnailImage) {
      alert('Please select an image first');
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
        alert('Thumbnail image saved successfully!');
        setThumbnailImage(selectedThumbnailImage);
        setShowImageModal(false);
        setSelectedThumbnailImage(null);
      }
    } catch (error) {
      console.error('Error saving thumbnail:', error);
      alert('Failed to save thumbnail image');
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

  const handleNext = async () => {
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
        alert(
          `Failed to connect Meta account: ${data.error || 'Unknown error'}`
        );
      }
    } catch (error) {
      console.error('Error connecting Meta account:', error);
      alert('An error occurred while connecting Meta account.');
    }
  };

  const handlePrev = () => {
    router.push(`/dashboard/projects/${projectId}/confirming`);
  };

  return (
    <div className='plan_container'>
      <Stepper currentStepKey='step5' />
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
                  key={adSet.ad_set_id}
                  className={
                    selectedAdSet?.ad_set_id === adSet.ad_set_id ? 'active' : ''
                  }
                  onClick={() => handleAdSetClick(adSet)}
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
                <p className='link'>https://www.tcs.com/</p>
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
        <button onClick={handleNext} className='next'>
          Next
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
                  <button onClick={handleConnectMetaAccount}>
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
                Images (PNG, JPG, JPEG) 20 MB max. Videos (MP4, MOV) 200 MB max
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
                  {aiImages.length < 2 && (
                    <div className='image-item add-image'>
                      <button
                        className='generate-btn'
                        onClick={handleGenerateAiImage}
                        disabled={generatingAiImage}
                      >
                        {generatingAiImage
                          ? 'Generating...'
                          : 'Generate AI Image'}
                      </button>
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
    </div>
  );
}
