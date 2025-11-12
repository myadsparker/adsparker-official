'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import toast from 'react-hot-toast';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleAuth = async () => {
      const supabase = createClientComponentClient();

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session) {
        toast.error('Login failed. Try again.');
        router.replace('/login');
        return;
      }

      const redirectedFrom =
        searchParams.get('redirectedFrom') ||
        searchParams.get('redirect') ||
        '/dashboard/projects/new';
      router.replace(redirectedFrom);
    };

    handleAuth();
  }, [router, searchParams]);

  return (
    <div className='text-white text-center min-h-screen flex items-center justify-center'>
      Redirecting...
    </div>
  );
}

// Loading component for Suspense fallback
function AuthCallbackLoading() {
  return (
    <div className='text-white text-center min-h-screen flex items-center justify-center'>
      Loading...
    </div>
  );
}

// Main export with Suspense wrapper
export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<AuthCallbackLoading />}>
      <AuthCallbackContent />
    </Suspense>
  );
}
