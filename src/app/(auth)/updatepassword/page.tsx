'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function UpdatePasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionValid, setSessionValid] = useState<boolean | null>(null);
  const [linkError, setLinkError] = useState('');

  useEffect(() => {
    const hash = window.location.hash;

    // If there's an error in the hash, show it
    if (hash.includes('error=access_denied') && hash.includes('otp_expired')) {
      setLinkError('This password reset link is invalid or has expired.');
      setSessionValid(false);
      return;
    }

    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (session?.user) {
        setSessionValid(true);
      } else {
        supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'PASSWORD_RECOVERY' && session?.user) {
            setSessionValid(true);
          }
        });

        // Timeout fallback
        setTimeout(() => {
          setSessionValid(false);
        }, 3000);
      }
    };

    checkSession();
  }, []);

  const handlePasswordReset = async (e: FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsSubmitting(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Password updated successfully!');
      router.push('/login');
    }
  };

  if (sessionValid === null) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-900 text-white text-lg'>
        Verifying link...
      </div>
    );
  }

  if (!sessionValid) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-900 text-white text-center p-6'>
        <div>
          <h2 className='text-2xl font-bold'>Reset Link Invalid</h2>
          <p className='mt-2 text-gray-400'>
            {linkError || 'The link has expired or is no longer valid.'}
          </p>
          <Button
            className='mt-4'
            onClick={() => router.push('/forgot-password')}
          >
            Request New Link
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-900 flex items-center justify-center p-4'>
      <div className='w-full max-w-md space-y-6'>
        <div className='text-center'>
          <h1 className='text-3xl font-bold text-white'>Reset Password</h1>
          <p className='text-gray-400 mt-2'>Enter your new password below.</p>
        </div>

        <form onSubmit={handlePasswordReset} className='space-y-4'>
          <Input
            type='password'
            placeholder='New Password'
            value={password}
            onChange={e => setPassword(e.target.value)}
            className='h-12 bg-white/5 border-gray-600 text-white placeholder:text-gray-400'
            required
          />
          <Input
            type='password'
            placeholder='Confirm New Password'
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            className='h-12 bg-white/5 border-gray-600 text-white placeholder:text-gray-400'
            required
          />
          <Button
            type='submit'
            className='w-full h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold text-lg'
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Updating...' : 'Update Password'}
          </Button>
        </form>
      </div>
    </div>
  );
}
