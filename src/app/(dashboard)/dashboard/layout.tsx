'use client';

import Link from 'next/link';
import './dashboard.css';

import LogoutButton from '@/components/dashboard/LogoutButton';
import Stepper from '@/components/dashboard/Stepper';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ChevronDown, User, Settings, LogOut, Menu, X, CreditCard, Megaphone, FolderOpen } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [userProfile, setUserProfile] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showMetaModal, setShowMetaModal] = useState(false);
  const [connectedAccounts, setConnectedAccounts] = useState<any[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const supabase = getSupabaseClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          // Fetch user profile
          const { data: profile, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();

          if (profile) {
            setUserProfile(profile);
          }

          // Fetch subscription status
          const subscriptionResponse = await fetch('/api/subscriptions');
          if (subscriptionResponse.ok) {
            const subscriptionData = await subscriptionResponse.json();
            setSubscription(subscriptionData.subscription);
            
            const sub = subscriptionData.subscription;
            
            // Check if user is subscribed or has active trial
            if (!sub) {
              setIsSubscribed(false);
            } else {
              // Check if subscription is active (not expired or cancelled)
              const isActive = sub.status === 'active' || sub.status === 'trialing';
              
              // Check if trial is still active (not expired)
              const hasActiveTrial = sub.is_trial && 
                sub.trial_end_date &&
                new Date(sub.trial_end_date) > new Date();
              
              // User is subscribed if they have an active subscription or active trial
              // Also check profile.is_subscribed as a fallback
              const subscribed = profile?.is_subscribed || isActive || hasActiveTrial;
              setIsSubscribed(!!subscribed);
            }
          } else {
            // If API call fails, check profile.is_subscribed as fallback
            setIsSubscribed(!!profile?.is_subscribed);
          }
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    fetchUserProfile();
  }, []);

  // Fetch connected Meta accounts
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle mobile menu body scroll lock
  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  // Handle escape key for mobile menu
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isMobileMenuOpen]);

  const handleLogout = async () => {
    try {
      setIsMobileMenuOpen(false);
      
      // Clear localStorage
      localStorage.removeItem('sparkr_user');
      localStorage.removeItem('budget-storage');
      
      // Clear sessionStorage
      sessionStorage.clear();
      
      // Call logout API
      await fetch('/api/logout', {
        method: 'POST',
      });
      
      // Force a hard refresh to clear all cached data and redirect to login
      // This ensures Google OAuth will ask for account selection again
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
      // Even if API fails, clear local data and redirect
      localStorage.removeItem('sparkr_user');
      localStorage.removeItem('budget-storage');
      sessionStorage.clear();
      window.location.href = '/login';
    }
  };

  const handleUpdateProfile = () => {
    setIsDropdownOpen(false);
    setIsMobileMenuOpen(false);
    router.push('/dashboard/profile');
  };

  const handleSettings = () => {
    setIsDropdownOpen(false);
    setIsMobileMenuOpen(false);
    router.push('/dashboard/settings');
  };

  const handleProjects = () => {
    setIsDropdownOpen(false);
    setIsMobileMenuOpen(false);
    router.push('/dashboard/projects');
  };

  const handleSubscription = () => {
    setIsDropdownOpen(false);
    setIsMobileMenuOpen(false);
    // Navigate to subscription management page
    router.push('/dashboard/subscription');
  };

  const handleMetaAccounts = async () => {
    setIsDropdownOpen(false);
    setIsMobileMenuOpen(false);
    setShowMetaModal(true);
    
    // Fetch connected accounts when modal opens
    await fetchConnectedAccounts();
  };

  const fetchConnectedAccounts = async () => {
    try {
      setLoadingAccounts(true);
      const supabase = getSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('meta_accounts')
          .eq('user_id', user.id)
          .single();

        if (profile?.meta_accounts) {
          const accounts = Array.isArray(profile.meta_accounts)
            ? profile.meta_accounts
            : [profile.meta_accounts];
          setConnectedAccounts(accounts);
        } else {
          setConnectedAccounts([]);
        }
      }
    } catch (error) {
      console.error('Error fetching connected accounts:', error);
      setConnectedAccounts([]);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleRemoveMetaAccount = async () => {
    try {
      const confirmRemove = confirm(
        'Are you sure you want to remove your Meta account connection? This will disconnect all linked ad accounts and pages.'
      );

      if (!confirmRemove) return;

      setLoadingAccounts(true);

      // Call API to remove Meta account from user profile
      const response = await fetch('/api/meta-auth/remove', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove Meta account');
      }

      // Refresh connected accounts
      await fetchConnectedAccounts();

      toast.success('Meta account removed successfully', {
        duration: 3000,
        style: {
          background: '#10b981',
          color: '#fff',
          padding: '16px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '500',
        },
      });
    } catch (error) {
      console.error('Error removing Meta account:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to remove Meta account',
        {
          duration: 3000,
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
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleConnectMetaAccount = async () => {
    try {
      // Use a temporary project ID for OAuth flow
      const tempProjectId = 'temp_' + Date.now();
      const response = await fetch(
        `/api/meta-auth?action=connect&projectId=${tempProjectId}`
      );
      const data = await response.json();

      if (data.success && data.oauthUrl) {
        // Redirect to Meta OAuth
        window.location.href = data.oauthUrl;
      } else {
        toast.error(`Failed to connect Meta account: ${data.error || 'Unknown error'}`, {
          duration: 3000,
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
    } catch (error) {
      console.error('Error connecting Meta account:', error);
      toast.error('An error occurred while connecting Meta account.', {
        duration: 3000,
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

  const getAllAdAccounts = (accounts: any[]) => {
    const adAccounts: any[] = [];
    accounts.forEach((account) => {
      if (account?.ad_accounts && Array.isArray(account.ad_accounts)) {
        account.ad_accounts.forEach((adAccount: any) => {
          adAccounts.push({
            id: adAccount.id || adAccount.account_id,
            name: adAccount.name || 'Unnamed Account',
          });
        });
      }
    });
    return adAccounts;
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className='min-h-screen text-white'>
      <div className='dashboard_header'>
        <Image
          src='/images/adsparker-logo.png'
          height={40}
          width={194}
          alt='Adsparker Logo'
        />
        <div className='menu_right'>
          <Link href='/dashboard/projects/new' className='create_button'>
            <svg
              width='16'
              height='16'
              viewBox='0 0 20 20'
              fill='none'
              xmlns='http://www.w3.org/2000/svg'
            >
              <path
                d='M4.16699 10H15.8337'
                stroke='white'
                strokeWidth='1.5'
                strokeLinecap='round'
              />
              <path
                d='M10 4.16675V15.8334'
                stroke='white'
                strokeWidth='1.5'
                strokeLinecap='round'
              />
            </svg>
            New Project
          </Link>
          <div>
            <svg
              width='24'
              height='24'
              viewBox='0 0 24 24'
              fill='none'
              xmlns='http://www.w3.org/2000/svg'
            >
              <path
                d='M12.0196 2.90991C8.7096 2.90991 6.0196 5.59991 6.0196 8.90991V11.7999C6.0196 12.4099 5.7596 13.3399 5.4496 13.8599L4.2996 15.7699C3.5896 16.9499 4.0796 18.2599 5.3796 18.6999C9.6896 20.1399 14.3396 20.1399 18.6496 18.6999C19.8596 18.2999 20.3896 16.8699 19.7296 15.7699L18.5796 13.8599C18.2796 13.3399 18.0196 12.4099 18.0196 11.7999V8.90991C18.0196 5.60991 15.3196 2.90991 12.0196 2.90991Z'
                stroke='#0D0D0D'
                strokeWidth='1.57123'
                strokeMiterlimit='10'
                strokeLinecap='round'
              />
              <path
                d='M13.8699 3.19994C13.5599 3.10994 13.2399 3.03994 12.9099 2.99994C11.9499 2.87994 11.0299 2.94994 10.1699 3.19994C10.4599 2.45994 11.1799 1.93994 12.0199 1.93994C12.8599 1.93994 13.5799 2.45994 13.8699 3.19994Z'
                stroke='#0D0D0D'
                strokeWidth='1.57123'
                strokeMiterlimit='10'
                strokeLinecap='round'
              />
              <path
                d='M15.0205 19.0601C15.0205 20.7101 13.6705 22.0601 12.0205 22.0601C11.2005 22.0601 10.4405 21.7201 9.90051 21.1801C9.36051 20.6401 9.02051 19.8801 9.02051 19.0601'
                stroke='#0D0D0D'
                strokeWidth='1.57123'
                strokeMiterlimit='10'
              />
            </svg>
          </div>

          <div className='profile_right profile_dropdown' ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className='profile_dropdown_trigger'
            >
              <span>{userProfile?.full_name || 'Loading...'}</span>
              <ChevronDown
                size={16}
                className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
              />
              <Image
                height={24}
                width={24}
                src='/images/sample-user.png'
                alt='User'
              />
            </button>

            {isDropdownOpen && (
              <div className='profile_dropdown_menu'>
                <button onClick={handleUpdateProfile} className='dropdown_item'>
                  <User size={16} />
                  Update Profile
                </button>
                <button onClick={handleProjects} className='dropdown_item'>
                  <FolderOpen size={16} />
                  Projects
                </button>
                <button onClick={handleSettings} className='dropdown_item'>
                  <Settings size={16} />
                  Settings
                </button>
                <button onClick={handleSubscription} className='dropdown_item'>
                  <CreditCard size={16} />
                  Subscription
                </button>
                <button onClick={handleMetaAccounts} className='dropdown_item'>
                  <Megaphone size={16} />
                  Meta Accounts
                </button>
                <button
                  onClick={handleLogout}
                  className='dropdown_item logout_item'
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className='dashboard_header_mobile'>
        <button
          type='button'
          className='mobile_menu_button'
          aria-label='Toggle navigation'
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? (
            <X size={24} strokeWidth={2} />
          ) : (
            <Menu size={24} strokeWidth={2} />
          )}
        </button>
        <div className='mobile_brand'>
          <Image
            src='/images/adsparker-logo.png'
            height={28}
            width={126}
            alt='Adsparker Logo'
            priority
          />
        </div>
        <div className='mobile_actions'>
          <button
            type='button'
            className='mobile_notification_button'
            aria-label='Notifications'
          >
            <span className='notification_icon_wrap'>
              <svg
                width='24'
                height='24'
                viewBox='0 0 24 24'
                fill='none'
                xmlns='http://www.w3.org/2000/svg'
              >
                <path
                  d='M12.0196 2.90991C8.7096 2.90991 6.0196 5.59991 6.0196 8.90991V11.7999C6.0196 12.4099 5.7596 13.3399 5.4496 13.8599L4.2996 15.7699C3.5896 16.9499 4.0796 18.2599 5.3796 18.6999C9.6896 20.1399 14.3396 20.1399 18.6496 18.6999C19.8596 18.2999 20.3896 16.8699 19.7296 15.7699L18.5796 13.8599C18.2796 13.3399 18.0196 12.4099 18.0196 11.7999V8.90991C18.0196 5.60991 15.3196 2.90991 12.0196 2.90991Z'
                  stroke='#0D0D0D'
                  strokeWidth='1.57123'
                  strokeMiterlimit='10'
                  strokeLinecap='round'
                />
                <path
                  d='M13.8699 3.19994C13.5599 3.10994 13.2399 3.03994 12.9099 2.99994C11.9499 2.87994 11.0299 2.94994 10.1699 3.19994C10.4599 2.45994 11.1799 1.93994 12.0199 1.93994C12.8599 1.93994 13.5799 2.45994 13.8699 3.19994Z'
                  stroke='#0D0D0D'
                  strokeWidth='1.57123'
                  strokeMiterlimit='10'
                  strokeLinecap='round'
                />
                <path
                  d='M15.0205 19.0601C15.0205 20.7101 13.6705 22.0601 12.0205 22.0601C11.2005 22.0601 10.4405 21.7201 9.90051 21.1801C9.36051 20.6401 9.02051 19.8801 9.02051 19.0601'
                  stroke='#0D0D0D'
                  strokeWidth='1.57123'
                  strokeMiterlimit='10'
                />
              </svg>
              <span className='mobile_notification_dot' />
            </span>
          </button>
          <Link
            href='/dashboard/projects/new'
            className='create_button mobile_create_button'
          >
            <svg
              width='16'
              height='16'
              viewBox='0 0 20 20'
              fill='none'
              xmlns='http://www.w3.org/2000/svg'
            >
              <path
                d='M4.16699 10H15.8337'
                stroke='white'
                strokeWidth='1.5'
                strokeLinecap='round'
              />
              <path
                d='M10 4.16675V15.8334'
                stroke='white'
                strokeWidth='1.5'
                strokeLinecap='round'
              />
            </svg>
            New Project
          </Link>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      <div
        className={`mobile-menu ${isMobileMenuOpen ? 'open' : ''}`}
        onClick={(e) => {
          // Close menu when clicking on the overlay (not the panel)
          if (e.target === e.currentTarget) {
            closeMobileMenu();
          }
        }}
      >
        <div className='mobile-menu__panel' onClick={(e) => e.stopPropagation()}>
          <div className='mobile-menu__panel-header'>
            <Link href='/dashboard' className='logo-link' onClick={closeMobileMenu}>
              <Image
                src='/images/adsparker-logo.png'
                alt='Adsparker Logo'
                width={150}
                height={40}
                priority
              />
            </Link>
            <button
              type='button'
              className='mobile-menu__close-button'
              aria-label='Close navigation menu'
              onClick={closeMobileMenu}
            >
              <X size={24} strokeWidth={2} />
            </button>
          </div>

          <div className='mobile-menu__panel-content'>
            <nav className='mobile-menu__links'>
              <button
                onClick={handleUpdateProfile}
                className='mobile-menu__link-button'
              >
                <User size={20} />
                Update Profile
              </button>
              <button
                onClick={handleProjects}
                className='mobile-menu__link-button'
              >
                <FolderOpen size={20} />
                Projects
              </button>
              <button
                onClick={handleSettings}
                className='mobile-menu__link-button'
              >
                <Settings size={20} />
                Settings
              </button>
              <button
                onClick={handleSubscription}
                className='mobile-menu__link-button'
              >
                <CreditCard size={20} />
                Subscription
              </button>
              <button
                onClick={handleMetaAccounts}
                className='mobile-menu__link-button'
              >
                <Megaphone size={20} />
                Meta Accounts
              </button>
              <button
                onClick={handleLogout}
                className='mobile-menu__link-button mobile-menu__link-button--logout'
              >
                <LogOut size={20} />
                Logout
              </button>
            </nav>
          </div>
        </div>
      </div>
      {children}

      {/* Meta Accounts Modal */}
      {showMetaModal && (
        <div className='modal-overlay' onClick={() => setShowMetaModal(false)}>
          <div className='modal-content' onClick={(e) => e.stopPropagation()}>
            <button
              className='modal-close'
              onClick={() => setShowMetaModal(false)}
            >
              <svg
                xmlns='http://www.w3.org/2000/svg'
                width='24'
                height='24'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                strokeLinecap='round'
                strokeLinejoin='round'
              >
                <path d='M18 6 6 18' />
                <path d='m6 6 12 12' />
              </svg>
            </button>
            <div className='modal-body'>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
              <div className='meta-accounts-section'>
                <div className='meta-accounts-header'>
                  <div className='meta-accounts-left'>
                    <span className='meta-accounts-title'>Meta Accounts</span>
                    <span
                      className={`meta-status-badge ${
                        connectedAccounts.length > 0 ? 'connected' : 'pending'
                      }`}
                    >
                      {connectedAccounts.length > 0 ? 'Connected' : 'Pending'}
                    </span>
                  </div>
                  <div className='meta-accounts-right'>
                    {connectedAccounts.length > 0 ? (
                      <button
                        className='meta-action-button remove'
                        onClick={handleRemoveMetaAccount}
                        disabled={loadingAccounts}
                      >
                        <svg width='20' height='20' viewBox='0 0 20 20' fill='none'>
                          <path
                            d='M4 10h12'
                            stroke='currentColor'
                            strokeWidth='2'
                            strokeLinecap='round'
                          />
                        </svg>
                        {loadingAccounts ? 'Removing...' : 'Remove'}
                      </button>
                    ) : (
                      <button
                        className='meta-action-button connect'
                        onClick={handleConnectMetaAccount}
                        disabled={loadingAccounts}
                      >
                        <svg width='20' height='20' viewBox='0 0 20 20' fill='none'>
                          <path
                            d='M4 10h12M10 4v12'
                            stroke='currentColor'
                            strokeWidth='2'
                            strokeLinecap='round'
                          />
                        </svg>
                        {loadingAccounts ? 'Connecting...' : 'Connect Ad Account'}
                      </button>
                    )}
                  </div>
                </div>
                <p className='meta-accounts-count'>
                  Connected: {connectedAccounts.length} accounts
                </p>
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
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  />
                  <path
                    d='M12 16V12'
                    stroke='#343438'
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  />
                  <path
                    d='M12 8H12.01'
                    stroke='#343438'
                    strokeWidth='2'
                    strokeLinecap='round'
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
