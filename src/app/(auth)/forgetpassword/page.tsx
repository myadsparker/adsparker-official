'use client';

import { useState, FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const res = await fetch('/api/check-email-provider', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const result = await res.json();

    if (!result.exists) {
      toast.error('No account found with this email.');
      setIsSubmitting(false);
      return;
    }

    console.log(result);

    if (result.provider !== 'email') {
      const providerName =
        result.provider.charAt(0).toUpperCase() + result.provider.slice(1);
      toast.error(
        `It looks like you signed up with ${providerName}. Please log in via ${providerName}.`
      );
      setIsSubmitting(false);
      return;
    }

    // Send reset email
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/updatepassword`,
    });

    setIsSubmitting(false);

    if (error) {
      console.error('Supabase reset error:', error.message, error);
      toast.error(error.message || 'Failed to send reset link.');
      return;
    }

    setStep(2);
  };

  return (
    <div className='min-h-screen bg-gray-900 flex items-center justify-center p-4'>
      <div className='w-full max-w-md space-y-6'>
        {step === 1 && (
          <>
            <div className='text-center'>
              <h1 className='text-3xl font-bold text-white'>
                Forgot Password?
              </h1>
              <p className='text-gray-400 mt-2'>
                Enter your email to receive a reset link.
              </p>
            </div>

            <form onSubmit={handleEmailSubmit} className='space-y-4'>
              <Input
                type='email'
                placeholder='Your email'
                value={email}
                onChange={e => setEmail(e.target.value)}
                className='h-12 bg-white/5 border-gray-600 text-white placeholder:text-gray-400'
                required
              />
              <Button
                type='submit'
                disabled={isSubmitting}
                className='w-full h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold text-lg'
              >
                {isSubmitting ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </form>
          </>
        )}

        {step === 2 && (
          <div className='text-center text-white space-y-4'>
            <h2 className='text-2xl font-semibold'>Check Your Email</h2>
            <p className='text-gray-400'>
              If an account with <strong>{email}</strong> exists, a reset link
              has been sent.
            </p>
            <p className='text-sm text-gray-500'>
              Didn’t receive the email? Check your spam folder or try again
              later.
            </p>
            <Button
              variant='outline'
              onClick={() => setStep(1)}
              className='mt-4'
            >
              Back
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
