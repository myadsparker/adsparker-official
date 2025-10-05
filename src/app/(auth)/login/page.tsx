'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      const redirectTo = searchParams.get('redirect') || '/dashboard';

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

      toast.success('Logged in successfully!');
      router.refresh(); // refresh session state
      router.push(result.redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
      toast.error(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const supabase = createClientComponentClient();

    const redirectTo = `${window.location.origin}/login-callback`;

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
    <div className='min-h-screen bg-gray-900 flex items-center justify-center p-4 pt-20'>
      <div className='w-full max-w-md space-y-6'>
        <div className='text-center'>
          <h1 className='text-3xl font-bold text-white'>Welcome Back</h1>
          <p className='text-gray-400 mt-2'>
            Don't have an account?{' '}
            <Link href='/signup' className='text-purple-400 hover:underline'>
              Sign up
            </Link>
          </p>
        </div>

        <Button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          variant='outline'
          className='w-full h-12 bg-white/5 border-gray-600 hover:bg-white/10 text-white'
        >
          <svg className='w-5 h-5 mr-3' viewBox='0 0 24 24' fill='currentColor'>
            <path d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z' />
            <path d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z' />
            <path d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z' />
            <path d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z' />
          </svg>
          Sign in with Google
        </Button>

        <div className='relative text-center'>
          <div className='absolute inset-0 flex items-center'>
            <div className='w-full border-t border-gray-600' />
          </div>
          <span className='bg-gray-900 px-2 text-gray-400 relative z-10'>
            OR
          </span>
        </div>

        <form onSubmit={handleSubmit} className='space-y-4'>
          {error && (
            <div className='text-red-400 text-sm text-center bg-red-400/10 p-3 rounded-lg'>
              {error}
            </div>
          )}

          <Input
            type='email'
            placeholder='Email'
            value={email}
            onChange={e => setEmail(e.target.value)}
            className='h-12 bg-white/5 border-gray-600 text-white placeholder:text-gray-400'
            disabled={isLoading}
          />

          <div className='relative'>
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder='Password'
              value={password}
              onChange={e => setPassword(e.target.value)}
              className='h-12 bg-white/5 border-gray-600 text-white placeholder:text-gray-400 pr-12'
              disabled={isLoading}
            />
            <button
              type='button'
              onClick={() => setShowPassword(!showPassword)}
              className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400'
              disabled={isLoading}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <Button
            type='submit'
            disabled={isLoading}
            className='w-full h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold text-lg mt-6'
          >
            {isLoading ? 'Logging in...' : 'Log In'}
          </Button>
        </form>

        <p className='text-center text-sm text-gray-400 mt-6'>
          Forgot your password?{' '}
          <Link
            href='/forgetpassword'
            className='text-purple-400 hover:underline'
          >
            Reset it here
          </Link>
        </p>
      </div>
    </div>
  );
}
