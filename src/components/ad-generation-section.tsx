'use client';

import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight } from 'lucide-react';

export function AdGenerationSection() {
  return (
    <section className='py-20 bg-black relative overflow-hidden'>
      {/* Background Effects */}
      <div className='absolute inset-0'>
        <div className='absolute top-1/4 left-1/3 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl'></div>
        <div className='absolute bottom-1/4 right-1/3 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl'></div>
      </div>

      <div className='container mx-auto px-4 sm:px-6 lg:px-8 relative z-10'>
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center'>
          {/* Left Content */}
          <div className='order-1 lg:order-1'>
            <h2
              className='text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6'
              style={{ textShadow: '0 0 20px rgba(255, 255, 255, 0.1)' }}
            >
              Generate Ad Images{' '}
              <span className='text-blue-400'>In One Click</span>
            </h2>

            <p className='text-xl text-gray-400 mb-8 leading-relaxed'>
              You don't need to prepare ad creatives in advance—AdSparkr
              generates high-performing images tailored for Meta ads to capture
              your ideal audience and drive growth.
            </p>

            {/* Desktop Button - Shows only on desktop */}
            <Button
              size='lg'
              className='bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg font-semibold hidden lg:flex items-center'
            >
              <Sparkles className='mr-2 h-5 w-5' />
              Explore Now
              <ArrowRight className='ml-2 h-5 w-5' />
            </Button>
          </div>

          {/* Right Content - Ad Mockups */}
          <div className='order-2 lg:order-2'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              {/* First Ad Mockup */}
              <div className='bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-2xl p-4'>
                <div className='flex items-center gap-2 mb-3'>
                  <div className='w-8 h-8 bg-gray-600 rounded-full'></div>
                  <div>
                    <p className='text-white text-sm font-medium'>Your Name</p>
                    <p className='text-gray-400 text-xs'>Sponsored</p>
                  </div>
                </div>
                <div className='aspect-square bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg mb-3 flex items-center justify-center relative overflow-hidden'>
                  <div className='text-white text-center p-4'>
                    <h3 className='text-lg font-bold mb-2'>DISCOUNT PRICES</h3>
                    <div className='w-16 h-12 bg-gray-800 rounded mx-auto mb-2'></div>
                    <p className='text-sm font-medium'>LAND CRUISER PARTS</p>
                    <p className='text-xs'>US</p>
                    <div className='absolute bottom-2 right-2 bg-black text-white px-2 py-1 rounded text-xs font-bold'>
                      SHOP NOW
                    </div>
                  </div>
                </div>
                <div className='flex items-center justify-between text-gray-400 text-xs'>
                  <div className='flex gap-4'>
                    <span>👍 Like</span>
                    <span>💬 Comment</span>
                    <span>↗️ Share</span>
                  </div>
                  <span>Views</span>
                </div>
              </div>

              {/* Second Ad Mockup */}
              <div className='bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-2xl p-4'>
                <div className='flex items-center gap-2 mb-3'>
                  <div className='w-8 h-8 bg-gray-600 rounded-full'></div>
                  <div>
                    <p className='text-white text-sm font-medium'>Your Name</p>
                    <p className='text-gray-400 text-xs'>Sponsored</p>
                  </div>
                </div>
                <div className='aspect-square bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg mb-3 flex items-center justify-center relative overflow-hidden'>
                  <div className='text-white text-center p-4'>
                    <h3 className='text-sm font-bold mb-2'>
                      OEM & AFTERMARKET
                    </h3>
                    <h3 className='text-lg font-bold mb-2'>
                      PARTS AT DISCOUNT PRICES
                    </h3>
                    <div className='w-16 h-12 bg-gray-300 rounded mx-auto mb-2'></div>
                    <div className='absolute bottom-2 right-2 bg-white text-black px-2 py-1 rounded text-xs font-bold'>
                      SHOP NOW
                    </div>
                    <div className='absolute bottom-2 left-2 w-8 h-8 bg-white rounded-full flex items-center justify-center'>
                      <div className='w-4 h-4 bg-black rounded-full'></div>
                    </div>
                  </div>
                </div>
                <div className='flex items-center justify-between text-gray-400 text-xs'>
                  <div className='flex gap-4'>
                    <span>👍 Like</span>
                    <span>💬 Comment</span>
                    <span>↗️ Share</span>
                  </div>
                  <span>Views</span>
                </div>
              </div>
            </div>

            {/* Mobile Button - Shows only on mobile */}
            <Button
              size='lg'
              className='bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg font-semibold w-full mt-6 lg:hidden flex items-center justify-center'
            >
              <Sparkles className='mr-2 h-5 w-5' />
              Explore Now
              <ArrowRight className='ml-2 h-5 w-5' />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
