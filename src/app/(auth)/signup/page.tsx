'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface FormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  name?: string;
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
  const [rememberMe, setRememberMe] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

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
    const { name, email, password } = formData;

    // ✅ Try to sign up directly with full name
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
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

    // Update user profile with full_name if user was created successfully
    if (data.user) {
      try {
        const { error: profileError } = await supabase
          .from('user_profiles')
          .update({ full_name: name })
          .eq('user_id', data.user.id);

        if (profileError) {
          console.error('Profile update error:', profileError);
          // Don't fail the signup if profile update fails
        }
      } catch (profileUpdateError) {
        console.error('Profile update failed:', profileUpdateError);
        // Don't fail the signup if profile update fails
      }
    }

    toast.success('🎉 Account Created Successfully!', {
      description: 'Please check your email to confirm your account.',
      duration: 5000,
    });
    setIsLoading(false);
    router.push('/login');
  };

  const handleGoogleSignUp = async () => {
    setIsLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'https://adsparker.com/signup-callback',
      },
    });

    if (error) {
      toast.error('Google sign-in failed: ' + error.message);
      setIsLoading(false);
    }
  };

  return (
    <div className='auth_form_container signup'>
      <Link href='/' className='auth_logo'>
        <img src='/images/adsparker-logo.png' alt='AdSparker Logo' />
      </Link>

      <h1 className='auth_title'>Create an account</h1>
      <p className='auth_description'>
        Enter your email and password to access your account.
      </p>

      <form onSubmit={handleSubmit} className='auth_form'>
        {errors.general && (
          <div className='auth_error_message'>{errors.general}</div>
        )}

        <div className='auth_form_group'>
          <label className='auth_form_label'>Name</label>
          <input
            type='text'
            placeholder='chris john'
            value={formData.name}
            onChange={e => handleInputChange('name', e.target.value)}
            className='auth_form_input'
          />
          {errors.name && (
            <p className='text-red-400 text-sm mt-1'>{errors.name}</p>
          )}
        </div>

        <div className='auth_form_group'>
          <label className='auth_form_label'>Email</label>
          <input
            type='email'
            placeholder='chrisjohn@gmail.com'
            value={formData.email}
            onChange={e => handleInputChange('email', e.target.value)}
            className='auth_form_input'
          />
          {errors.email && (
            <p className='text-red-400 text-sm mt-1'>{errors.email}</p>
          )}
        </div>

        <div className='auth_form_group'>
          <label className='auth_form_label'>Password</label>
          <div className='auth_password_container'>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder='chrisjohn'
              value={formData.password}
              onChange={e => handleInputChange('password', e.target.value)}
              className='auth_form_input'
            />
            <button
              type='button'
              onClick={() => setShowPassword(!showPassword)}
              className='auth_password_toggle'
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {errors.password && (
            <p className='text-red-400 text-sm mt-1'>{errors.password}</p>
          )}
        </div>

        <div className='auth_form_group'>
          <label className='auth_form_label'>Confirm Password</label>
          <div className='auth_password_container'>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder='chrisjohn'
              value={formData.confirmPassword}
              onChange={e =>
                handleInputChange('confirmPassword', e.target.value)
              }
              className='auth_form_input'
            />
            <button
              type='button'
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className='auth_password_toggle'
            >
              {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className='text-red-400 text-sm mt-1'>
              {errors.confirmPassword}
            </p>
          )}
        </div>

        <div className='auth_form_options'>
          <label className='auth_remember_me'>
            <Checkbox
              id='remember-me-signup'
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
              Creating Account...
            </>
          ) : (
            'Register'
          )}
        </button>
      </form>

      <div className='auth_divider'>
        <span>Or Register With</span>
      </div>

      <button
        onClick={handleGoogleSignUp}
        disabled={isLoading}
        className='auth_google_button'
      >
        {isLoading ? (
          <>
            <Loader2 className='w-4 h-4 animate-spin' />
            Signing up...
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
        Have An Account? <Link href='/login'>Login Now</Link>
      </div>
    </div>
  );
}
