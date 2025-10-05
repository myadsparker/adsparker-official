'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

export default function SignUpPage() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    const { email, password } = formData;

    // ✅ Try to sign up directly
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    console.log('SignUp Response:', { data, error });

    if (error) {
      if (error.message.includes('User already registered')) {
        setErrors({ email: 'An account with this email already exists.' });
      } else {
        setErrors({ general: error.message || 'Something went wrong' });
      }
      setIsLoading(false);
      return;
    }

    toast.success('Signup successful! Please check your email to confirm.');
    setIsLoading(false);
    router.push('/login');
  };

  const handleGoogleSignUp = async () => {
    setIsLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/signup-callback`,
      },
    });

    if (error) {
      toast.error('Google sign-in failed: ' + error.message);
      setIsLoading(false);
    }
  };

  return (
    <div className='min-h-screen bg-gray-900 flex items-center justify-center p-4 pt-40'>
      <div className='w-full max-w-md space-y-6'>
        <div className='text-center'>
          <h1 className='text-3xl font-bold text-white'>Create an Account</h1>
          <p className='text-gray-400 mt-2'>
            Already have an account?{' '}
            <Link href='/login' className='text-purple-400 hover:underline'>
              Log in
            </Link>
          </p>
        </div>

        <Button
          onClick={handleGoogleSignUp}
          variant='outline'
          className='w-full h-12 bg-white/5 border-gray-600 hover:bg-white/10 text-white'
        >
          <svg className='w-5 h-5 mr-3' viewBox='0 0 24 24' fill='currentColor'>
            <path d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z' />
            <path d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z' />
            <path d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z' />
            <path d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z' />
          </svg>
          Sign up with Google
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
          {errors.general && (
            <div className='text-red-400 text-sm text-center bg-red-400/10 p-3 rounded-lg'>
              {errors.general}
            </div>
          )}

          <div>
            <Input
              type='email'
              placeholder='Email'
              value={formData.email}
              onChange={e => handleInputChange('email', e.target.value)}
              className='h-12 bg-white/5 border-gray-600 text-white placeholder:text-gray-400'
            />
            {errors.email && (
              <p className='text-red-400 text-sm mt-1'>{errors.email}</p>
            )}
          </div>

          <div className='relative'>
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder='Password'
              value={formData.password}
              onChange={e => handleInputChange('password', e.target.value)}
              className='h-12 bg-white/5 border-gray-600 text-white placeholder:text-gray-400 pr-12'
            />
            <button
              type='button'
              onClick={() => setShowPassword(!showPassword)}
              className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400'
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
            {errors.password && (
              <p className='text-red-400 text-sm mt-1'>{errors.password}</p>
            )}
          </div>

          <div className='relative'>
            <Input
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder='Confirm Password'
              value={formData.confirmPassword}
              onChange={e =>
                handleInputChange('confirmPassword', e.target.value)
              }
              className='h-12 bg-white/5 border-gray-600 text-white placeholder:text-gray-400 pr-12'
            />
            <button
              type='button'
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400'
            >
              {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
            {errors.confirmPassword && (
              <p className='text-red-400 text-sm mt-1'>
                {errors.confirmPassword}
              </p>
            )}
          </div>

          <Button
            type='submit'
            disabled={isLoading}
            className='w-full h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold text-lg mt-6'
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>

        <p className='text-center text-sm text-gray-400 mt-6'>
          By registering you agree to our{' '}
          <Link href='/terms' className='text-purple-400 hover:underline'>
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href='/privacy' className='text-purple-400 hover:underline'>
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
