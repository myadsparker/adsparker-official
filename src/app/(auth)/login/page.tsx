'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { getSiteUrl } from '@/lib/utils';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setIsLoading(true);

    try {
      // Optional: capture redirect from middleware (/login?redirect=/dashboard/settings)
      const searchParams = new URLSearchParams(window.location.search);
      const redirectTo =
        searchParams.get('redirect') || '/dashboard/projects/new';

      const res = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, redirectTo }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Login failed');
      }

      toast.success('🎉 Welcome Back!', {
        description: 'You have been logged in successfully.',
        duration: 3000,
      });
      router.refresh(); // refresh session state
      router.push(result.redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
      toast.error('Login Failed', {
        description:
          err instanceof Error ? err.message : 'An unexpected error occurred.',
        duration: 4000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const supabase = createClientComponentClient();

    const siteUrl = getSiteUrl();
    const redirectTo = `${siteUrl}/login-callback`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
      },
    });

    if (error) {
      toast.error('Google login failed');
    }
  };

  return (
    <div className='auth_form_container'>
      <Link href='/' className='auth_logo'>
        <img src='/images/adsparker-logo.png' alt='AdSparker Logo' />
      </Link>

      <h1 className='auth_title'>Log In</h1>
      <p className='auth_description'>
        Enter your email and password to access your account.
      </p>

      <form onSubmit={handleSubmit} className='auth_form'>
        {error && <div className='auth_error_message'>{error}</div>}

        <div className='auth_form_group'>
          <label className='auth_form_label'>Email</label>
          <input
            type='email'
            placeholder='chrisjohn@gmail.com'
            value={email}
            onChange={e => setEmail(e.target.value)}
            className='auth_form_input'
            disabled={isLoading}
          />
        </div>

        <div className='auth_form_group'>
          <label className='auth_form_label'>Password</label>
          <div className='auth_password_container'>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder='chrisjohn'
              value={password}
              onChange={e => setPassword(e.target.value)}
              className='auth_form_input'
              disabled={isLoading}
            />
            <button
              type='button'
              onClick={() => setShowPassword(!showPassword)}
              className='auth_password_toggle'
              disabled={isLoading}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        <div className='auth_form_options'>
          <label className='auth_remember_me'>
            <Checkbox
              id='remember-me'
              checked={rememberMe}
              onCheckedChange={checked => setRememberMe(checked === true)}
              className='border-gray-300 data-[state=checked]:bg-[#7c3aed] data-[state=checked]:border-[#7c3aed]'
            />
            <span>Remember Me</span>
          </label>
          <Link href='/forgetpassword' className='auth_forgot_password'>
            Forgot Your Password?
          </Link>
        </div>

        <button
          type='submit'
          disabled={isLoading}
          className='auth_submit_button'
        >
          {isLoading ? (
            <>
              <Loader2 className='w-4 h-4 mr-2 animate-spin' />
              Logging in...
            </>
          ) : (
            'Log In'
          )}
        </button>
      </form>

      <div className='auth_divider'>
        <span>Or Login With</span>
      </div>

      <button
        onClick={handleGoogleLogin}
        disabled={isLoading}
        className='auth_google_button'
      >
        {isLoading ? (
          <>
            <Loader2 className='w-4 h-4 animate-spin' />
            Signing in...
          </>
        ) : (
          <>
            <svg viewBox='0 0 24 24' fill='currentColor'>
              <path d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z' />
              <path d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z' />
              <path d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z' />
              <path d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z' />
            </svg>
            Google
          </>
        )}
      </button>

      <div className='auth_switch_link'>
        Don't Have An Account? <Link href='/signup'>Register Now</Link>
      </div>
    </div>
  );
}
