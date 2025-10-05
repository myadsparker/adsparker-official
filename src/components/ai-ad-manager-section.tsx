'use client';

import { Button } from '@/components/ui/button';
import { Check, Star, ArrowRight, Mail } from 'lucide-react';

export function AiAdManagerSection() {
  return (
    <section className='py-20 bg-black relative overflow-hidden'>
      {/* Background Effects */}
      <div className='absolute inset-0'>
        <div className='absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl'></div>
        <div className='absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl'></div>
      </div>

      <div className='container mx-auto px-4 sm:px-6 lg:px-8 relative z-10'>
        {/* Header */}
        <div className='text-center mb-16'>
          <h2
            className='text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6'
            style={{ textShadow: '0 0 20px rgba(255, 255, 255, 0.1)' }}
          >
            Grow With Your{' '}
            <span className='text-blue-400'>24/7 AI Ad Manager</span>
          </h2>
          <p className='text-xl text-gray-400 max-w-3xl mx-auto'>
            No hiring. No stress. Just high-performing ads that scale your
            business
          </p>
        </div>

        {/* Pricing Cards */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto'>
          {/* Starter Monthly */}
          <div className='bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-2xl p-8 relative'>
            <div className='mb-6'>
              <h3 className='text-xl font-bold text-white mb-2'>
                Starter Monthly
              </h3>
              <p className='text-gray-400 text-sm mb-4'>
                For small businesses & startups looking for simple, AI-driven ad
                automation.
              </p>
              <div className='flex items-baseline'>
                <span className='text-4xl font-bold text-white'>$199</span>
                <span className='text-gray-400 ml-2'>/month</span>
              </div>
            </div>

            <Button className='w-full bg-blue-600 hover:bg-blue-700 text-white mb-6'>
              Get Started Now
              <ArrowRight className='ml-2 h-4 w-4' />
            </Button>

            <div className='space-y-3'>
              {[
                '1-Min Ad Setup',
                '24/7 Ad Campaign Optimization',
                'AI Market Research',
                'AI Budget Optimizer & Performance Forecasts',
                'AI Ad Copy & Image Generation',
                'Expert Ad Targeting Strategy',
                'Top-performing Audiences',
                'Live Data Insights',
                'Customer Support',
              ].map((feature, index) => (
                <div key={index} className='flex items-center gap-3'>
                  <Check className='w-5 h-5 text-green-400 flex-shrink-0' />
                  <span className='text-gray-300 text-sm'>{feature}</span>
                </div>
              ))}
            </div>

            <div className='mt-6 pt-6 border-t border-gray-700'>
              <p className='text-gray-400 text-sm mb-2'>Limitations</p>
              <div className='space-y-2'>
                <div className='flex items-center gap-3'>
                  <div className='w-2 h-2 bg-blue-400 rounded-full flex-shrink-0'></div>
                  <span className='text-gray-400 text-sm'>
                    Only one Facebook Account
                  </span>
                </div>
                <div className='flex items-center gap-3'>
                  <div className='w-2 h-2 bg-blue-400 rounded-full flex-shrink-0'></div>
                  <span className='text-gray-400 text-sm'>
                    Daily Budget Cap: $150
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Starter Weekly - Most Popular */}
          <div className='bg-gray-900/50 backdrop-blur-xl border-2 border-blue-500 rounded-2xl p-8 relative'>
            {/* Popular Badge */}
            <div className='absolute -top-4 left-1/2 transform -translate-x-1/2'>
              <div className='bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2'>
                <Star className='w-4 h-4' />
                Starter Weekly
              </div>
            </div>

            <div className='mb-6 mt-4'>
              <p className='text-gray-400 text-sm mb-4'>
                For small businesses & startups looking for simple, AI-driven ad
                automation.
              </p>
              <div className='flex items-baseline'>
                <span className='text-gray-400 line-through text-xl mr-2'>
                  $59
                </span>
                <span className='text-4xl font-bold text-white'>$19.9</span>
                <span className='text-blue-400 ml-2 font-semibold'>
                  First week
                </span>
              </div>
            </div>

            <Button className='w-full bg-blue-600 hover:bg-blue-700 text-white mb-6'>
              Get Started Now
              <ArrowRight className='ml-2 h-4 w-4' />
            </Button>

            <div className='space-y-3'>
              {[
                '1-Min Ad Setup',
                '24/7 Ad Campaign Optimization',
                'AI Market Research',
                'AI Budget Optimizer & Performance Forecasts',
                'AI Ad Copy & Image Generation',
                'Expert Ad Targeting Strategy',
                'Top-performing Audiences',
                'Live Data Insights',
                'Customer Support',
              ].map((feature, index) => (
                <div key={index} className='flex items-center gap-3'>
                  <Check className='w-5 h-5 text-green-400 flex-shrink-0' />
                  <span className='text-gray-300 text-sm'>{feature}</span>
                </div>
              ))}
            </div>

            <div className='mt-6 pt-6 border-t border-gray-700'>
              <p className='text-gray-400 text-sm mb-2'>Limitations</p>
              <div className='space-y-2'>
                <div className='flex items-center gap-3'>
                  <div className='w-2 h-2 bg-blue-400 rounded-full flex-shrink-0'></div>
                  <span className='text-gray-400 text-sm'>
                    Only one Facebook Account
                  </span>
                </div>
                <div className='flex items-center gap-3'>
                  <div className='w-2 h-2 bg-blue-400 rounded-full flex-shrink-0'></div>
                  <span className='text-gray-400 text-sm'>
                    Daily Budget Cap: $150
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Enterprise Plan */}
          <div className='bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-2xl p-8 relative'>
            <div className='mb-6'>
              <h3 className='text-xl font-bold text-white mb-2'>
                Enterprise Plan
              </h3>
              <p className='text-gray-400 text-sm mb-4'>
                For growing brands & enterprises needing advanced AI ad
                optimization and strategic support.
              </p>
              <div className='flex items-baseline'>
                <span className='text-4xl font-bold text-white'>
                  Custom Price
                </span>
              </div>
            </div>

            <Button className='w-full bg-blue-600 hover:bg-blue-700 text-white mb-6'>
              <Mail className='mr-2 h-4 w-4' />
              Contact Us
              <ArrowRight className='ml-2 h-4 w-4' />
            </Button>

            <div className='space-y-3'>
              {[
                'All Starter Plan Features Included',
                'Enhanced Ad Creativity',
                'Advanced AI Ads Testing',
                'Unlimited Budget',
                'Multiple Facebook Accounts',
                'Team Collaboration',
                'Dedicated AI Ad Consultant',
              ].map((feature, index) => (
                <div key={index} className='flex items-center gap-3'>
                  <Check className='w-5 h-5 text-green-400 flex-shrink-0' />
                  <span className='text-gray-300 text-sm'>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
