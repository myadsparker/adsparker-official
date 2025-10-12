'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleAuthRedirect = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session) {
        toast.error('Authentication failed.');
        router.push('/login');
        return;
      }

      const user = session.user;

      // Optional: Check if it's a new user or has profile info
      const { data: profile, error: profileError } = await supabase
        .from('profiles') // or whatever your profile table is
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        toast.error('Error loading profile.');
        router.push('/login');
        return;
      }

      // Redirect based on profile status
      if (!profile.username) {
        router.push('/onboarding');
      } else {
        router.push('/dashboard');
      }
    };

    handleAuthRedirect();
  }, [router]);

  return (
    <div className='flex justify-center items-center h-screen text-white'>
      Redirecting...
    </div>
  );
}
