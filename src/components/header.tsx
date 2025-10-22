'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className='fixed top-0 left-0 right-0 z-50 px-3 sm:px-4 md:px-6 lg:px-8 pt-3 sm:pt-4 md:pt-6'>
      <div className='max-w-7xl mx-auto'>
        <nav className='bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl sm:rounded-full px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between shadow-lg'>
          {/* Logo */}
          <Link href='/' className='flex items-center gap-1.5 sm:gap-2'>
            <div className='flex items-center justify-center'>
              <span className='text-yellow-400 text-lg sm:text-xl md:text-2xl'>
                ✨
              </span>
            </div>
            <span
              className='text-white font-semibold text-base sm:text-lg'
              style={{
                fontFamily:
                  "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif",
                fontWeight: 600,
              }}
            >
              AdSparkr
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className='hidden md:flex items-center gap-6 lg:gap-8'>
            <a
              href='#features'
              className='text-white/80 hover:text-white transition-colors duration-200'
              style={{
                fontFamily:
                  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif",
                fontSize: '15px',
                fontWeight: 500,
              }}
            >
              Features
            </a>
            <a
              href='#pricing'
              className='text-white/80 hover:text-white transition-colors duration-200'
              style={{
                fontFamily:
                  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif",
                fontSize: '15px',
                fontWeight: 500,
              }}
            >
              Pricing
            </a>
            <a
              href='#about'
              className='text-white/80 hover:text-white transition-colors duration-200'
              style={{
                fontFamily:
                  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif",
                fontSize: '15px',
                fontWeight: 500,
              }}
            >
              About
            </a>
          </div>

          {/* Desktop CTA */}
          <div className='hidden md:flex items-center gap-3 lg:gap-4'>
            <Link
              href={'/login'}
              className='text-white hover:bg-white/10 transition-colors duration-200 px-3 lg:px-4'
              style={{
                fontFamily:
                  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif",
                fontSize: '15px',
                fontWeight: 500,
              }}
            >
              Sign In
            </Link>
            <Button
              className='bg-white text-gray-900 hover:bg-gray-100 transition-colors duration-200 px-3 lg:px-4'
              style={{
                fontFamily:
                  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif",
                fontSize: '15px',
                fontWeight: 500,
              }}
              onClick={() => (window.location.href = '/login')}
            >
              Get Started
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className='md:hidden p-1.5 sm:p-2 text-white hover:bg-white/10 rounded-lg transition-colors duration-200'
          >
            {isMenuOpen ? (
              <X className='w-4 h-4 sm:w-5 sm:h-5' />
            ) : (
              <Menu className='w-4 h-4 sm:w-5 sm:h-5' />
            )}
          </button>
        </nav>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className='md:hidden mt-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg'>
            <div className='flex flex-col gap-3 sm:gap-4'>
              <a
                href='#features'
                className='text-white/80 hover:text-white transition-colors duration-200 py-2 px-2 rounded-lg hover:bg-white/5'
                style={{
                  fontFamily:
                    "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif",
                  fontSize: '16px',
                  fontWeight: 500,
                }}
                onClick={() => setIsMenuOpen(false)}
              >
                Features
              </a>
              <a
                href='#pricing'
                className='text-white/80 hover:text-white transition-colors duration-200 py-2 px-2 rounded-lg hover:bg-white/5'
                style={{
                  fontFamily:
                    "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif",
                  fontSize: '16px',
                  fontWeight: 500,
                }}
                onClick={() => setIsMenuOpen(false)}
              >
                Pricing
              </a>
              <a
                href='#about'
                className='text-white/80 hover:text-white transition-colors duration-200 py-2 px-2 rounded-lg hover:bg-white/5'
                style={{
                  fontFamily:
                    "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif",
                  fontSize: '16px',
                  fontWeight: 500,
                }}
                onClick={() => setIsMenuOpen(false)}
              >
                About
              </a>
              <div className='border-t border-white/20 pt-3 sm:pt-4 mt-2'>
                <div className='flex flex-col gap-2 sm:gap-3'>
                  <Link
                    href={'/login'}
                    className='text-white hover:bg-white/10 justify-start h-10 sm:h-11'
                    style={{
                      fontFamily:
                        "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif",
                      fontSize: '16px',
                      fontWeight: 500,
                    }}
                  >
                    Sign In
                  </Link>
                  <Button
                    className='bg-white text-gray-900 hover:bg-gray-100 h-10 sm:h-11'
                    style={{
                      fontFamily:
                        "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif",
                      fontSize: '16px',
                      fontWeight: 500,
                    }}
                    onClick={() => (window.location.href = '/login')}
                  >
                    Get Started
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
