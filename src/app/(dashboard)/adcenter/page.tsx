'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { UserProfile, MetaAccount } from '@/types/user-profile';

interface Campaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  daily_budget?: string;
  lifetime_budget?: string;
  created_time: string;
  ads: any[];
  insights: any;
}

interface Ad {
  id: string;
  name: string;
  status: string;
  created_time: string;
  creative: any;
  insights: any;
}

function AdCenterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');

  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [selectedAdAccount, setSelectedAdAccount] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'overview' | 'campaigns' | 'ads'>(
    'overview'
  );
  const [fetchingData, setFetchingData] = useState(false);

  useEffect(() => {
    checkMetaConnection();
  }, []);

  async function checkMetaConnection() {
    try {
      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push('/login');
        return;
      }

      // Get user profile with meta accounts
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        setError('Failed to load user profile');
        setLoading(false);
        return;
      }

      // Check if meta account is connected
      if (
        !profile.meta_connected ||
        !profile.meta_accounts ||
        profile.meta_accounts.length === 0
      ) {
        // Redirect to connect meta account
        router.push(
          `/dashboard?error=meta_not_connected&projectId=${projectId || ''}`
        );
        return;
      }

      setUserProfile(profile);

      // Auto-select first ad account if available
      if (profile.meta_accounts[0]?.ad_accounts?.length > 0) {
        const firstAdAccountId = profile.meta_accounts[0].ad_accounts[0].id;
        setSelectedAdAccount(firstAdAccountId);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error checking meta connection:', err);
      setError('An unexpected error occurred');
      setLoading(false);
    }
  }

  async function fetchCampaigns(adAccountId: string) {
    setFetchingData(true);
    try {
      const response = await fetch(
        `/api/meta/campaigns?ad_account_id=${adAccountId}`
      );
      const data = await response.json();

      if (data.success) {
        setCampaigns(data.campaigns);
      } else {
        console.error('Failed to fetch campaigns:', data.error);
        setError(data.error);
      }
    } catch (err) {
      console.error('Error fetching campaigns:', err);
      setError('Failed to fetch campaigns');
    } finally {
      setFetchingData(false);
    }
  }

  async function fetchAds(adAccountId: string) {
    setFetchingData(true);
    try {
      const response = await fetch(
        `/api/meta/ads?ad_account_id=${adAccountId}`
      );
      const data = await response.json();

      if (data.success) {
        setAds(data.ads);
      } else {
        console.error('Failed to fetch ads:', data.error);
        setError(data.error);
      }
    } catch (err) {
      console.error('Error fetching ads:', err);
      setError('Failed to fetch ads');
    } finally {
      setFetchingData(false);
    }
  }

  function handleAdAccountChange(adAccountId: string) {
    setSelectedAdAccount(adAccountId);
    setCampaigns([]);
    setAds([]);
    setActiveTab('overview');
  }

  function handleTabChange(tab: 'overview' | 'campaigns' | 'ads') {
    setActiveTab(tab);

    if (tab === 'campaigns' && campaigns.length === 0 && selectedAdAccount) {
      fetchCampaigns(selectedAdAccount);
    } else if (tab === 'ads' && ads.length === 0 && selectedAdAccount) {
      fetchAds(selectedAdAccount);
    }
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto'></div>
          <p className='mt-4 text-gray-600'>Loading Ad Center...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <div className='text-red-600 text-xl mb-4'>⚠️ Error</div>
          <p className='text-gray-600'>{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className='mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700'
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return null;
  }

  const metaAccount = userProfile.meta_accounts[0];
  const selectedAccount = metaAccount.ad_accounts.find(
    acc => acc.id === selectedAdAccount
  );

  return (
    <div className='min-h-screen bg-gray-50 py-8'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        {/* Header */}
        <div className='bg-white rounded-lg shadow-sm p-6 mb-6'>
          <div className='flex items-center justify-between'>
            <div>
              <h1 className='text-3xl font-bold text-gray-900'>Ad Center</h1>
              <p className='text-gray-600 mt-1'>
                Manage your Meta advertising campaigns
              </p>
            </div>
            <div className='flex items-center gap-2'>
              <div className='h-3 w-3 bg-green-500 rounded-full animate-pulse'></div>
              <span className='text-sm text-gray-600'>
                Connected as {metaAccount.profile.name}
              </span>
            </div>
          </div>
        </div>

        {/* Ad Account Selector */}
        {metaAccount.ad_accounts.length > 0 && (
          <div className='bg-white rounded-lg shadow-sm p-4 mb-6'>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              Select Ad Account
            </label>
            <select
              value={selectedAdAccount}
              onChange={e => handleAdAccountChange(e.target.value)}
              className='w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
            >
              {metaAccount.ad_accounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.id})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Tabs */}
        <div className='bg-white rounded-lg shadow-sm mb-6'>
          <div className='border-b border-gray-200'>
            <nav className='flex -mb-px'>
              <button
                onClick={() => handleTabChange('overview')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => handleTabChange('campaigns')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'campaigns'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Campaigns ({campaigns.length})
              </button>
              <button
                onClick={() => handleTabChange('ads')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'ads'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Ads ({ads.length})
              </button>
            </nav>
          </div>

          <div className='p-6'>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className='space-y-6'>
                <div>
                  <h3 className='text-lg font-semibold text-gray-900 mb-3'>
                    Account Information
                  </h3>
                  {selectedAccount ? (
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                      <div className='border border-gray-200 rounded-lg p-4'>
                        <p className='text-sm text-gray-500'>Account Name</p>
                        <p className='text-lg font-semibold text-gray-900'>
                          {selectedAccount.name}
                        </p>
                      </div>
                      <div className='border border-gray-200 rounded-lg p-4'>
                        <p className='text-sm text-gray-500'>Account ID</p>
                        <p className='text-lg font-semibold text-gray-900'>
                          {selectedAccount.id}
                        </p>
                      </div>
                      <div className='border border-gray-200 rounded-lg p-4'>
                        <p className='text-sm text-gray-500'>Status</p>
                        <span
                          className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-medium ${
                            selectedAccount.account_status === 1
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {selectedAccount.account_status === 1
                            ? 'Active'
                            : 'Inactive'}
                        </span>
                      </div>
                      <div className='border border-gray-200 rounded-lg p-4'>
                        <p className='text-sm text-gray-500'>Total Campaigns</p>
                        <p className='text-lg font-semibold text-gray-900'>
                          {campaigns.length > 0
                            ? campaigns.length
                            : 'Load to see'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className='text-gray-500'>No ad account selected</p>
                  )}
                </div>

                <div className='flex gap-4'>
                  <button
                    onClick={() =>
                      selectedAdAccount && fetchCampaigns(selectedAdAccount)
                    }
                    disabled={!selectedAdAccount || fetchingData}
                    className='px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed'
                  >
                    {fetchingData ? 'Loading...' : 'Load Campaigns'}
                  </button>
                  <button
                    onClick={() =>
                      selectedAdAccount && fetchAds(selectedAdAccount)
                    }
                    disabled={!selectedAdAccount || fetchingData}
                    className='px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed'
                  >
                    {fetchingData ? 'Loading...' : 'Load All Ads'}
                  </button>
                </div>
              </div>
            )}

            {/* Campaigns Tab */}
            {activeTab === 'campaigns' && (
              <div>
                {fetchingData ? (
                  <div className='text-center py-8'>
                    <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto'></div>
                    <p className='mt-4 text-gray-600'>Loading campaigns...</p>
                  </div>
                ) : campaigns.length === 0 ? (
                  <div className='text-center py-8'>
                    <p className='text-gray-500'>No campaigns found</p>
                    <button
                      onClick={() =>
                        selectedAdAccount && fetchCampaigns(selectedAdAccount)
                      }
                      className='mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700'
                    >
                      Load Campaigns
                    </button>
                  </div>
                ) : (
                  <div className='space-y-4'>
                    {campaigns.map(campaign => (
                      <div
                        key={campaign.id}
                        className='border border-gray-200 rounded-lg p-6 hover:border-blue-500 transition-colors'
                      >
                        <div className='flex items-start justify-between mb-4'>
                          <div className='flex-1'>
                            <h3 className='text-lg font-semibold text-gray-900'>
                              {campaign.name}
                            </h3>
                            <p className='text-sm text-gray-500 mt-1'>
                              ID: {campaign.id}
                            </p>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              campaign.status === 'ACTIVE'
                                ? 'bg-green-100 text-green-800'
                                : campaign.status === 'PAUSED'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {campaign.status}
                          </span>
                        </div>

                        <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-4'>
                          <div>
                            <p className='text-xs text-gray-500'>Objective</p>
                            <p className='text-sm font-medium'>
                              {campaign.objective}
                            </p>
                          </div>
                          <div>
                            <p className='text-xs text-gray-500'>Ads</p>
                            <p className='text-sm font-medium'>
                              {campaign.ads.length}
                            </p>
                          </div>
                          {campaign.insights && (
                            <>
                              <div>
                                <p className='text-xs text-gray-500'>
                                  Impressions
                                </p>
                                <p className='text-sm font-medium'>
                                  {Number(
                                    campaign.insights.impressions || 0
                                  ).toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <p className='text-xs text-gray-500'>Spend</p>
                                <p className='text-sm font-medium'>
                                  $
                                  {Number(campaign.insights.spend || 0).toFixed(
                                    2
                                  )}
                                </p>
                              </div>
                            </>
                          )}
                        </div>

                        {campaign.insights && (
                          <div className='grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200'>
                            <div>
                              <p className='text-xs text-gray-500'>Clicks</p>
                              <p className='text-sm font-medium'>
                                {Number(
                                  campaign.insights.clicks || 0
                                ).toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className='text-xs text-gray-500'>CTR</p>
                              <p className='text-sm font-medium'>
                                {Number(campaign.insights.ctr || 0).toFixed(2)}%
                              </p>
                            </div>
                            <div>
                              <p className='text-xs text-gray-500'>CPC</p>
                              <p className='text-sm font-medium'>
                                ${Number(campaign.insights.cpc || 0).toFixed(2)}
                              </p>
                            </div>
                            <div>
                              <p className='text-xs text-gray-500'>Reach</p>
                              <p className='text-sm font-medium'>
                                {Number(
                                  campaign.insights.reach || 0
                                ).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Ads Tab */}
            {activeTab === 'ads' && (
              <div>
                {fetchingData ? (
                  <div className='text-center py-8'>
                    <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto'></div>
                    <p className='mt-4 text-gray-600'>Loading ads...</p>
                  </div>
                ) : ads.length === 0 ? (
                  <div className='text-center py-8'>
                    <p className='text-gray-500'>No ads found</p>
                    <button
                      onClick={() =>
                        selectedAdAccount && fetchAds(selectedAdAccount)
                      }
                      className='mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700'
                    >
                      Load Ads
                    </button>
                  </div>
                ) : (
                  <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                    {ads.map(ad => (
                      <div
                        key={ad.id}
                        className='border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-colors'
                      >
                        <div className='mb-3'>
                          <div className='flex items-start justify-between mb-2'>
                            <h4 className='font-semibold text-gray-900 text-sm'>
                              {ad.name}
                            </h4>
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                ad.status === 'ACTIVE'
                                  ? 'bg-green-100 text-green-800'
                                  : ad.status === 'PAUSED'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {ad.status}
                            </span>
                          </div>
                          <p className='text-xs text-gray-500'>ID: {ad.id}</p>
                        </div>

                        {ad.creative?.image_url && (
                          <div className='mb-3'>
                            <img
                              src={ad.creative.image_url}
                              alt={ad.name}
                              className='w-full h-40 object-cover rounded-lg'
                            />
                          </div>
                        )}

                        {ad.creative && (
                          <div className='mb-3 space-y-1'>
                            {ad.creative.title && (
                              <p className='text-sm font-medium text-gray-900'>
                                {ad.creative.title}
                              </p>
                            )}
                            {ad.creative.body && (
                              <p className='text-xs text-gray-600 line-clamp-2'>
                                {ad.creative.body}
                              </p>
                            )}
                          </div>
                        )}

                        {ad.insights && (
                          <div className='grid grid-cols-2 gap-2 pt-3 border-t border-gray-200'>
                            <div>
                              <p className='text-xs text-gray-500'>
                                Impressions
                              </p>
                              <p className='text-sm font-medium'>
                                {Number(
                                  ad.insights.impressions || 0
                                ).toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className='text-xs text-gray-500'>Clicks</p>
                              <p className='text-sm font-medium'>
                                {Number(
                                  ad.insights.clicks || 0
                                ).toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className='text-xs text-gray-500'>Spend</p>
                              <p className='text-sm font-medium'>
                                ${Number(ad.insights.spend || 0).toFixed(2)}
                              </p>
                            </div>
                            <div>
                              <p className='text-xs text-gray-500'>CTR</p>
                              <p className='text-sm font-medium'>
                                {Number(ad.insights.ctr || 0).toFixed(2)}%
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className='flex gap-4'>
          <button
            onClick={() =>
              router.push(`/dashboard?projectId=${projectId || ''}`)
            }
            className='px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors'
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

// Loading component for Suspense fallback
function AdCenterLoading() {
  return (
    <div className='flex items-center justify-center min-h-screen'>
      <div className='text-center'>
        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto'></div>
        <p className='mt-4 text-gray-600'>Loading Ad Center...</p>
      </div>
    </div>
  );
}

// Main export with Suspense wrapper
export default function AdCenterPage() {
  return (
    <Suspense fallback={<AdCenterLoading />}>
      <AdCenterContent />
    </Suspense>
  );
}
