'use client';

import type React from 'react';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  email: string;
  name: string;
  isAuthenticated: boolean;
  loginTime: string;
  plan: 'starter' | 'growth' | 'pro';
  campaignCount: number;
}

// Add demo mode configuration
const DEMO_MODE = true; // Set to false in production

// Add plan limits configuration
const PLAN_LIMITS = {
  starter: { maxCampaigns: 3, features: ['basic'] },
  growth: {
    maxCampaigns: 6,
    features: [
      'basic',
      'negative-keywords',
      'landing-page-fixes',
      'weekly-optimization',
    ],
  },
  pro: {
    maxCampaigns: 12,
    features: [
      'basic',
      'negative-keywords',
      'landing-page-fixes',
      'weekly-optimization',
      'budget-reallocation',
      'sparkr-assist',
      'priority-support',
    ],
  },
};

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

export function AuthGuard({ children, requireAuth = true }: AuthGuardProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const checkAuth = () => {
      try {
        const userData = localStorage.getItem('sparkr_user');
        if (userData) {
          const parsedUser = JSON.parse(userData);

          // Add default plan if not exists (for demo)
          if (!parsedUser.plan) {
            parsedUser.plan = DEMO_MODE ? 'pro' : 'starter';
            parsedUser.campaignCount = DEMO_MODE ? 3 : 0;
          }

          // Check if login is still valid (24 hours)
          const loginTime = new Date(parsedUser.loginTime);
          const now = new Date();
          const hoursDiff =
            (now.getTime() - loginTime.getTime()) / (1000 * 60 * 60);

          if (hoursDiff < 24 && parsedUser.isAuthenticated) {
            setUser(parsedUser);
          } else {
            // Session expired
            localStorage.removeItem('sparkr_user');
            if (requireAuth) {
              router.push('/login');
              return;
            }
          }
        } else if (requireAuth) {
          router.push('/login');
          return;
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('sparkr_user');
        if (requireAuth) {
          router.push('/login');
          return;
        }
      }

      setIsLoading(false);
    };

    checkAuth();
  }, [router, requireAuth]);

  if (isLoading) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4'></div>
          <p className='text-gray-600'>Loading...</p>
        </div>
      </div>
    );
  }

  if (requireAuth && !user) {
    return null; // Will redirect to login
  }

  return <>{children}</>;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem('sparkr_user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
      } catch (error) {
        console.error('Failed to parse user data:', error);
        localStorage.removeItem('sparkr_user');
      }
    }
  }, []);

  const logout = () => {
    localStorage.removeItem('sparkr_user');
    setUser(null);
    window.location.href = '/login';
  };

  return { user, logout };
}

// Add helper functions for plan checking
export function usePlanFeatures() {
  const { user } = useAuth();

  const hasFeature = (feature: string) => {
    if (DEMO_MODE) return true;
    if (!user) return false;
    return PLAN_LIMITS[user.plan].features.includes(feature);
  };

  const canCreateCampaign = () => {
    if (DEMO_MODE) return true;
    if (!user) return false;
    return user.campaignCount < PLAN_LIMITS[user.plan].maxCampaigns;
  };

  const getRemainingCampaigns = () => {
    if (DEMO_MODE) return 999;
    if (!user) return 0;
    return PLAN_LIMITS[user.plan].maxCampaigns - user.campaignCount;
  };

  return {
    hasFeature,
    canCreateCampaign,
    getRemainingCampaigns,
    demoMode: DEMO_MODE,
  };
}
