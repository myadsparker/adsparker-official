// components/LogoutButton.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

export default function LogoutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleLogout = async () => {
    try {
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

  return (
    <button
      onClick={handleLogout}
      disabled={isPending}
      className='text-sm text-red-400 hover:underline'
      style={{
        color: '#fff',
        height: '28px',
        paddingInline: '20px',
        display: 'flex',
        alignItems: 'center',
        borderRadius: '4px',
      }}
    >
      {isPending ? 'Logging out...' : 'Logout'}
    </button>
  );
}
