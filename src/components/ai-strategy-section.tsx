'use client';

import { Button } from '@/components/ui/button';
import { Target, ArrowRight } from 'lucide-react';

export function AiStrategySection() {
  return (
    <section className='py-20 bg-black relative overflow-hidden'>
      {/* Background Effects */}
      <div className='absolute inset-0'>
        <div className='absolute top-1/4 left-1/3 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl'></div>
        <div className='absolute bottom-1/4 right-1/3 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl'></div>
      </div>

      <div className='container mx-auto px-4 sm:px-6 lg:px-8 relative z-10'>
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center'>
          {/* Left Content - Text and Button (Desktop), Text only (Mobile) */}
          <div className='order-1 lg:order-1'>
            <h2
              className='text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6'
              style={{ textShadow: '0 0 20px rgba(255, 255, 255, 0.1)' }}
            >
              Build Winning Ad Strategies{' '}
              <span className='text-blue-400'>With AI—Effortlessly</span>
            </h2>

            <p className='text-xl text-gray-400 mb-8 leading-relaxed'>
              Stop endlessly creating useless ad plans. With AdSparkr, you can
              generate smart Meta Ads plans in seconds. It maximizes the ability
              of your ad creatives and continuously optimizes them for better
              performance, delivering more results with less effort.
            </p>

            {/* Desktop Button - Shows only on desktop */}
            <Button
              size='lg'
              className='bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg font-semibold hidden lg:block'
            >
              Try AdSparkr Now
              <ArrowRight className='ml-2 h-5 w-5' />
            </Button>
          </div>

          {/* Right Content - Ad Interface Mockup (Desktop), Mockup + Button (Mobile) */}
          <div className='order-2 lg:order-2'>
            <div className='bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-2xl p-6 max-w-md mx-auto lg:mx-0'>
              {/* Header */}
              <div className='flex items-center gap-2 mb-6'>
                <Target className='w-5 h-5 text-blue-400' />
                <h3 className='text-lg font-semibold text-white'>
                  Travel Enthusiast Pet Owners
                </h3>
              </div>

              {/* Demographics */}
              <div className='grid grid-cols-3 gap-4 mb-6'>
                <div className='bg-gray-800/50 rounded-lg p-3'>
                  <p className='text-xs text-gray-400 mb-1'>Age</p>
                  <p className='text-white font-medium'>25 - 45</p>
                </div>
                <div className='bg-gray-800/50 rounded-lg p-3'>
                  <p className='text-xs text-gray-400 mb-1'>Gender</p>
                  <p className='text-white font-medium'>All genders</p>
                </div>
                <div className='bg-gray-800/50 rounded-lg p-3'>
                  <p className='text-xs text-gray-400 mb-1'>Locations</p>
                  <p className='text-white font-medium'>New York</p>
                </div>
              </div>

              {/* Budget */}
              <div className='flex justify-between items-center mb-6'>
                <span className='text-gray-400'>Ad Set Spend</span>
                <span className='text-white font-medium'>$ 12.00</span>
              </div>

              {/* Audience Tags */}
              <div className='mb-6'>
                <p className='text-gray-400 text-sm mb-3'>Audience Tags</p>
                <div className='flex flex-wrap gap-2'>
                  {[
                    'Cats & Dogs',
                    'Happy Pets',
                    'PetLove',
                    'Dogs Natural...',
                    'The Dogingt...',
                    'Bark Magazine',
                  ].map((tag, index) => (
                    <span
                      key={index}
                      className='bg-blue-600/20 text-blue-300 px-3 py-1 rounded-full text-xs border border-blue-500/30'
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Ad Preview */}
              <div className='bg-gray-800/30 rounded-lg p-4'>
                <div className='flex items-center gap-2 mb-3'>
                  <div className='w-8 h-8 bg-gray-600 rounded-full'></div>
                  <div>
                    <p className='text-white text-sm font-medium'>Your Name</p>
                    <p className='text-gray-400 text-xs'>Sponsored</p>
                  </div>
                </div>
                <div className='aspect-video bg-gradient-to-br from-orange-400 to-red-500 rounded-lg mb-3 flex items-center justify-center'>
                  <div className='text-white text-center'>
                    <p className='text-sm font-medium'>
                      Ready to execute your pet travel plans?
                    </p>
                    <p className='text-xs mt-1'>
                      Visit The Canine Corner Blog - your pet...
                    </p>
                  </div>
                </div>
                <div className='flex items-center justify-between text-gray-400 text-xs'>
                  <div className='flex gap-4'>
                    <span>👍 Like</span>
                    <span>💬 Comment</span>
                    <span>↗️ Share</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Button - Shows only on mobile */}
            <Button
              size='lg'
              className='bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg font-semibold w-full mt-6 lg:hidden'
            >
              Try AdSparkr Now
              <ArrowRight className='ml-2 h-5 w-5' />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
