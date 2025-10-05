'use client';

import type React from 'react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, Play } from 'lucide-react';

declare global {
  interface Window {
    UnicornStudio: {
      init: () => void;
      isInitialized: boolean;
    };
  }
}

export function HeroSection() {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [backgroundLoaded, setBackgroundLoaded] = useState(false);

  useEffect(() => {
    // Start with black background, then fade to UnicornStudio background after 500ms
    const timer = setTimeout(() => {
      setBackgroundLoaded(true);
    }, 500);

    // Load UnicornStudio script
    const script = document.createElement('script');
    script.src = 'https://cdn.unicorn.studio/v1.4.1/unicornStudio.umd.js';
    script.async = true;
    script.onload = () => {
      try {
        if (window.UnicornStudio) {
          window.UnicornStudio.init();
        }
      } catch (error) {
        console.log('UnicornStudio initialization failed:', error);
      }
    };
    document.head.appendChild(script);

    return () => {
      clearTimeout(timer);
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    window.location.href = '/signup';
  };

  return (
    <>
      <section className='relative min-h-screen flex items-center justify-center overflow-hidden'>
        {/* Black overlay that fades out */}
        <div
          className={`absolute inset-0 bg-black z-30 transition-opacity duration-1000 ${
            backgroundLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        />

        {/* UnicornStudio Background */}
        <div
          className='absolute inset-0 z-0'
          data-us-project='slR7ntcyaJ7HVqgHe42T'
          style={{
            background:
              'linear-gradient(135deg, #1e3a8a 0%, #3730a3 50%, #1e1b4b 100%)',
          }}
        />

        {/* Content */}
        <div className='relative z-10 text-center px-4 sm:px-6 lg:px-8 pt-20 pb-16'>
          <div className='max-w-5xl mx-auto'>
            {/* AI Badge */}
            <div className='flex justify-center mb-6'>
              <div className='inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full'>
                <div className='w-2 h-2 bg-green-400 rounded-full animate-pulse'></div>
                <span
                  className='text-sm text-white/90 font-medium'
                  style={{
                    fontFamily:
                      "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif",
                    fontSize: '14px',
                    fontWeight: 500,
                    letterSpacing: '-0.005em',
                  }}
                >
                  Powered by AI
                </span>
              </div>
            </div>

            {/* Main Headline */}
            <h1
              className='text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-semibold text-white mb-6 leading-[0.9] tracking-[-0.025em]'
              style={{
                fontFamily:
                  "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif",
                fontWeight: 600,
              }}
            >
              Effortless Meta Ads.{' '}
              <span>
                Built to{' '}
                <span
                  className='italic text-white/95'
                  style={{
                    fontFamily:
                      "'Playfair Display', 'Crimson Text', 'Times New Roman', Georgia, serif",
                    fontStyle: 'italic',
                    fontWeight: 700,
                    letterSpacing: '0.01em',
                  }}
                >
                  scale.
                </span>
              </span>{' '}
            </h1>

            {/* Subheading */}
            <p
              className='text-xl sm:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed'
              style={{
                fontFamily:
                  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif",
                fontSize: '20px',
                fontWeight: 400,
                letterSpacing: '-0.011em',
              }}
            >
              Launch and optimize Meta Ads to boost sales and maximize ROI.
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit} className='max-w-2xl mx-auto mb-8'>
              <div className='flex flex-col sm:flex-row gap-4'>
                <Input
                  type='url'
                  placeholder='https://yourstore/product/service'
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  className='flex-1 h-12 px-6 text-lg bg-white/20 backdrop-blur-md border-white/30 text-white placeholder:text-white/80 rounded-full focus:border-white/50 focus:ring-2 focus:ring-white/30 transition-all duration-200 shadow-lg'
                  style={{
                    fontFamily:
                      "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif",
                    fontSize: '17px',
                    fontWeight: 400,
                    letterSpacing: '-0.011em',
                    boxShadow:
                      '0 8px 32px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                  }}
                  required
                />
                <Button
                  type='submit'
                  disabled={isLoading}
                  className='relative bg-blue-600 backdrop-blur-sm text-white hover:bg-blue-700 font-medium px-6 h-12 rounded-full flex items-center gap-2 whitespace-nowrap transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] border border-blue-500/50 hover:border-blue-400/50 shadow-lg hover:shadow-xl'
                  style={{
                    boxShadow:
                      '0 4px 20px rgba(37, 99, 235, 0.3), 0 0 0 1px rgba(59, 130, 246, 0.1)',
                    fontFamily:
                      "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif",
                    fontSize: '15px',
                    fontWeight: 500,
                    letterSpacing: '-0.011em',
                  }}
                >
                  {isLoading ? (
                    <>
                      <div className='w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin' />
                      Getting Started...
                    </>
                  ) : (
                    <>
                      Get Started
                      <ArrowRight className='w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5' />
                    </>
                  )}
                </Button>
              </div>
            </form>

            {/* Version Info */}
            <div
              className='text-sm text-gray-400 mb-10'
              style={{
                fontFamily:
                  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif",
                fontSize: '15px',
                fontWeight: 400,
                letterSpacing: '-0.008em',
              }}
            >
              v2.1.0 • AI-powered • Launch in 60 seconds
            </div>
          </div>
        </div>

        {/* Gradient fade to black at bottom */}
        <div className='absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent z-5' />
      </section>

      {/* Demo Video Section */}
      <section className='relative py-20 px-4 sm:px-6 lg:px-8 bg-black'>
        <div className='max-w-6xl mx-auto text-center'>
          {/* Section Heading */}
          <h2
            className='text-4xl sm:text-5xl lg:text-6xl font-semibold text-white mb-4 leading-tight tracking-[-0.02em]'
            style={{
              fontFamily:
                "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif",
              fontWeight: 600,
              textShadow:
                '0 0 20px rgba(255, 255, 255, 0.3), 0 0 40px rgba(255, 255, 255, 0.2), 0 0 60px rgba(255, 255, 255, 0.1)',
            }}
          >
            See AdSparkr in Action
          </h2>

          <p
            className='text-lg text-gray-400 mb-12 max-w-2xl mx-auto'
            style={{
              fontFamily:
                "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif",
              fontSize: '18px',
              fontWeight: 400,
              letterSpacing: '-0.011em',
            }}
          >
            Watch how our AI analyzes your landing page and creates
            high-converting Meta ads in under 60 seconds.
          </p>

          {/* Video Container */}
          <div className='relative max-w-4xl mx-auto'>
            <div className='relative aspect-video bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden shadow-2xl'>
              {/* Video Placeholder */}
              <div className='absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900/40 to-gray-800/60'>
                <div className='flex flex-col items-center gap-4'>
                  <div className='w-20 h-20 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full flex items-center justify-center hover:bg-white/20 transition-all duration-200 cursor-pointer group'>
                    <Play className='w-8 h-8 text-white ml-1 group-hover:scale-110 transition-transform duration-200' />
                  </div>
                  <p
                    className='text-white/80 text-sm'
                    style={{
                      fontFamily:
                        "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif",
                      fontSize: '14px',
                      fontWeight: 500,
                    }}
                  >
                    Click to play demo
                  </p>
                </div>
              </div>

              {/* Actual video element (hidden for now, replace with real video) */}
              <video
                className='w-full h-full object-cover opacity-0'
                poster='/adsparkr-demo-thumbnail.png'
                controls
                preload='metadata'
              >
                <source src='/demo-video.mp4' type='video/mp4' />
                Your browser does not support the video tag.
              </video>
            </div>

            {/* Video Stats */}
            <div className='flex justify-center gap-8 mt-8'>
              <div className='text-center'>
                <div
                  className='text-2xl font-semibold text-white mb-1'
                  style={{
                    fontFamily:
                      "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif",
                    fontWeight: 600,
                  }}
                >
                  {'<60s'}
                </div>
                <div
                  className='text-sm text-gray-400'
                  style={{
                    fontFamily:
                      "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif",
                    fontSize: '14px',
                    fontWeight: 400,
                  }}
                >
                  Setup Time
                </div>
              </div>
              <div className='text-center'>
                <div
                  className='text-2xl font-semibold text-white mb-1'
                  style={{
                    fontFamily:
                      "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif",
                    fontWeight: 600,
                  }}
                >
                  3.2x
                </div>
                <div
                  className='text-sm text-gray-400'
                  style={{
                    fontFamily:
                      "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif",
                    fontSize: '14px',
                    fontWeight: 400,
                  }}
                >
                  Better CTR
                </div>
              </div>
              <div className='text-center'>
                <div
                  className='text-2xl font-semibold text-white mb-1'
                  style={{
                    fontFamily:
                      "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif",
                    fontWeight: 600,
                  }}
                >
                  45%
                </div>
                <div
                  className='text-sm text-gray-400'
                  style={{
                    fontFamily:
                      "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif",
                    fontSize: '14px',
                    fontWeight: 400,
                  }}
                >
                  Lower CPA
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
