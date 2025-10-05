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
  const [generatingImage, setGeneratingImage] = useState<string | null>(null);
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

  // Handle image generation
  const handleImageClick = async (adSetId: string) => {
    // Check if image already exists
    const currentAdSet = adSets.find(adSet => adSet.ad_set_id === adSetId);
    if (currentAdSet?.adsparker_gen_creative_asset) {
      console.log('Image already exists for this ad set');
      return; // Don't regenerate if image already exists
    }

    try {
      setGeneratingImage(adSetId);
      const response = await fetch(
        `/api/projects/${projectId}/generate-images`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ad_set_id: adSetId,
            projectId: projectId,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate image');
      }

      const data = await response.json();
      if (data.success && data.imageUrl) {
        // Update the ad set with the generated image
        setAdSets(prevAdSets =>
          prevAdSets.map(adSet =>
            adSet.ad_set_id === adSetId
              ? { ...adSet, adsparker_gen_creative_asset: data.imageUrl }
              : adSet
          )
        );

        // Update selected ad set if it's the one being generated
        if (selectedAdSet?.ad_set_id === adSetId) {
          setSelectedAdSet(prev =>
            prev
              ? { ...prev, adsparker_gen_creative_asset: data.imageUrl }
              : null
          );
        }
      }
    } catch (error) {
      console.error('Error generating image:', error);
    } finally {
      setGeneratingImage(null);
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
          <button>
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
                <div
                  style={{
                    cursor: selectedAdSet.adsparker_gen_creative_asset
                      ? 'default'
                      : 'pointer',
                    position: 'relative',
                  }}
                  onClick={() => handleImageClick(selectedAdSet.ad_set_id)}
                  title={
                    selectedAdSet.adsparker_gen_creative_asset
                      ? 'Image already generated'
                      : 'Click to generate image'
                  }
                >
                  {selectedAdSet.adsparker_gen_creative_asset ? (
                    <div style={{ position: 'relative' }}>
                      <Image
                        src={selectedAdSet.adsparker_gen_creative_asset}
                        height={295}
                        width={380}
                        alt='Generated Ad Creative'
                      />
                      <div
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          backgroundColor: 'rgba(0, 0, 0, 0.7)',
                          color: 'white',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '500',
                        }}
                      >
                        ✓
                      </div>
                    </div>
                  ) : generatingImage === selectedAdSet.ad_set_id ? (
                    <div
                      style={{
                        height: '295px',
                        width: '380px',
                        backgroundColor: '#f0f0f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '8px',
                      }}
                    >
                      <div>Generating image...</div>
                    </div>
                  ) : (
                    <Image
                      src={'/images/preview_ad_creative.png'}
                      height={295}
                      width={380}
                      alt='Ad Image Creative'
                    />
                  )}
                </div>
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
    </div>
  );
}
