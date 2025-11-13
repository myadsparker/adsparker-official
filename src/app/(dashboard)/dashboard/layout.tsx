'use client';

import Link from 'next/link';
import './dashboard.css';

import LogoutButton from '@/components/dashboard/LogoutButton';
import Stepper from '@/components/dashboard/Stepper';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ChevronDown, User, Settings, LogOut, Menu, X } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: profile, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();

          if (profile) {
            setUserProfile(profile);
          }
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    fetchUserProfile();
  }, []);

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
                <button onClick={handleSettings} className='dropdown_item'>
                  <Settings size={16} />
                  Settings
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
                onClick={handleSettings}
                className='mobile-menu__link-button'
              >
                <Settings size={20} />
                Settings
              </button>
              <button
                onClick={handleUpdateProfile}
                className='mobile-menu__link-button'
              >
                <User size={20} />
                Update Profile
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
    </div>
  );
}
