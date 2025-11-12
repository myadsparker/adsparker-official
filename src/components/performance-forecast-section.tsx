'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { TrendingUp, ArrowRight } from 'lucide-react';

export function PerformanceForecastSection() {
  const [budget, setBudget] = useState(60);

  // Calculate metrics based on budget
  const impressions = Math.round(budget * 208.33);
  const clicks = Math.round(budget * 7.5);
  const conversions = Math.round(budget * 0.3);
  const roas = (3.8).toFixed(1);

  // Calculate chart points based on budget (higher budget = better performance curve)
  const basePerformance = budget / 200; // Normalize budget to 0-1 scale
  const chartPoints = [
    { x: 50, y: 150 - basePerformance * 30 },
    { x: 150, y: 120 - basePerformance * 40 },
    { x: 250, y: 80 - basePerformance * 30 },
    { x: 350, y: 50 - basePerformance * 20 },
  ];

  return (
    <section className='py-20 bg-black relative overflow-hidden'>
      {/* Background Effects */}
      <div className='absolute inset-0'>
        <div className='absolute top-1/4 right-1/3 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl'></div>
        <div className='absolute bottom-1/4 left-1/3 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl'></div>
      </div>

      <div className='container mx-auto px-4 sm:px-6 lg:px-8 relative z-10'>
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center'>
          {/* Left Content - Chart and Controls */}
          <div className='order-2 lg:order-1'>
            {/* Budget Slider */}
            <div className='bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-2xl p-6 mb-6'>
              <div className='flex items-center justify-between mb-4'>
                <span className='text-gray-400 text-sm'>📊 Daily Budget</span>
                <span className='text-white font-bold text-xl'>${budget}</span>
              </div>
              <div className='relative'>
                <input
                  type='range'
                  min='20'
                  max='200'
                  value={budget}
                  onChange={e => setBudget(Number(e.target.value))}
                  className='w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer'
                  style={{
                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${
                      ((budget - 20) / 180) * 100
                    }%, #6b7280 ${((budget - 20) / 180) * 100}%, #6b7280 100%)`,
                  }}
                />
                <style jsx>{`
                  input[type='range']::-webkit-slider-thumb {
                    appearance: none;
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background: #3b82f6;
                    cursor: pointer;
                    border: 2px solid #1e293b;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                  }
                  input[type='range']::-moz-range-thumb {
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background: #3b82f6;
                    cursor: pointer;
                    border: 2px solid #1e293b;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                  }
                `}</style>
              </div>
            </div>

            {/* Performance Chart */}
            <div className='bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-2xl p-6'>
              <div className='flex items-center gap-2 mb-6'>
                <TrendingUp className='w-5 h-5 text-blue-400' />
                <h3 className='text-lg font-semibold text-white'>
                  Performance Forecast
                </h3>
              </div>

              {/* Chart Area */}
              <div className='relative h-48 md:h-64 mb-6'>
                <svg className='w-full h-full' viewBox='0 0 400 200'>
                  {/* Grid Lines */}
                  <defs>
                    <pattern
                      id='grid'
                      width='40'
                      height='40'
                      patternUnits='userSpaceOnUse'
                    >
                      <path
                        d='M 40 0 L 0 0 0 40'
                        fill='none'
                        stroke='#374151'
                        strokeWidth='0.5'
                        opacity='0.3'
                      />
                    </pattern>
                  </defs>
                  <rect width='100%' height='100%' fill='url(#grid)' />

                  {/* Performance Line */}
                  <path
                    d={`M ${chartPoints[0].x} ${chartPoints[0].y} Q ${chartPoints[1].x} ${chartPoints[1].y} ${chartPoints[2].x} ${chartPoints[2].y} T ${chartPoints[3].x} ${chartPoints[3].y}`}
                    fill='none'
                    stroke='#3b82f6'
                    strokeWidth='3'
                    className='transition-all duration-500 ease-in-out'
                  />

                  {/* Data Points */}
                  {chartPoints.map((point, index) => (
                    <circle
                      key={index}
                      cx={point.x}
                      cy={point.y}
                      r='4'
                      fill='#3b82f6'
                      className='transition-all duration-500 ease-in-out'
                    />
                  ))}
                </svg>

                {/* Week Labels */}
                <div className='absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-400 px-4'>
                  <span>Week 1</span>
                  <span>Week 2</span>
                  <span>Week 3</span>
                  <span>Week 4</span>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className='grid grid-cols-2 gap-4'>
                <div className='bg-gray-800/50 rounded-lg p-4'>
                  <p className='text-gray-400 text-sm mb-1'>Impressions</p>
                  <p className='text-white text-2xl font-bold'>
                    {impressions.toLocaleString()}
                  </p>
                </div>
                <div className='bg-gray-800/50 rounded-lg p-4'>
                  <p className='text-gray-400 text-sm mb-1'>Clicks</p>
                  <p className='text-white text-2xl font-bold'>{clicks}</p>
                </div>
                <div className='bg-gray-800/50 rounded-lg p-4'>
                  <p className='text-gray-400 text-sm mb-1'>Conversions</p>
                  <p className='text-white text-2xl font-bold'>{conversions}</p>
                </div>
                <div className='bg-gray-800/50 rounded-lg p-4'>
                  <p className='text-gray-400 text-sm mb-1'>ROAS</p>
                  <p className='text-green-400 text-2xl font-bold'>{roas}x</p>
                </div>
              </div>
            </div>

            {/* Mobile Button - Shows only on mobile */}
            <Button
              size='lg'
              className='bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg font-semibold w-full mt-6 lg:hidden'
            >
              Boost My Ads
              <ArrowRight className='ml-2 h-5 w-5' />
            </Button>
          </div>

          {/* Right Content */}
          <div className='order-1 lg:order-2'>
            <h2
              className='text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6'
              style={{ textShadow: '0 0 20px rgba(255, 255, 255, 0.1)' }}
            >
              Estimate Results Before Launch—
              <span className='text-blue-400'>With Budget-Based Insights</span>
            </h2>

            <p className='text-xl text-gray-400 mb-8 leading-relaxed'>
              AdSparker's advanced forecasting estimates Meta ad performance
              based on your budget. With a single click, it handles bid
              adjustments, budget distribution, and audience testing around the
              clock—keeping campaigns optimized while you focus on growing your
              business.
            </p>

            {/* Desktop Button - Shows only on desktop */}
            <Button
              size='lg'
              className='bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg font-semibold hidden lg:block'
            >
              Boost My Ads
              <ArrowRight className='ml-2 h-5 w-5' />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
