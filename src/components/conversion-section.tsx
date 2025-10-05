import { Button } from '@/components/ui/button';
import { ArrowRight, TrendingUp, Sparkles } from 'lucide-react';
import Link from 'next/link';

export function ConversionSection() {
  const benefits = [
    {
      title: 'AI-Powered Customer Targeting',
      description:
        'AI pinpoints your ICP (Ideal Customer Profile) automatically',
    },
    {
      title: 'Intelligent Ad Copy',
      description: 'GPT writes ad copy that matches exact user intent',
    },
    {
      title: 'Smart Keyword Selection',
      description: 'Keyword targeting focuses on buyers, not window shoppers',
    },
    {
      title: 'Automatic Budget Optimization',
      description: "Weekly optimization shifts budget to what's working",
    },
    {
      title: 'Landing Page Enhancement',
      description:
        'Your landing page gets AI-tuned suggestions to boost conversions',
    },
  ];

  return (
    <section className='py-20 bg-gray-800'>
      <div className='container mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='max-w-7xl mx-auto'>
          {/* Desktop: Two-column layout, Mobile: Single column */}
          <div className='lg:grid lg:grid-cols-2 lg:gap-20 lg:items-start'>
            {/* Content Section */}
            <div className='text-center lg:text-left order-2 lg:order-1'>
              <h2 className='text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-8 font-heading leading-tight'>
                Built to Convert.
                <br className='hidden lg:block' />
                <span className='bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent'>
                  {' '}
                  Powered by AI.
                </span>
              </h2>

              <p className='text-xl sm:text-2xl text-gray-300 mb-12 leading-relaxed font-body max-w-4xl mx-auto lg:mx-0 font-light'>
                Sparkr doesn't just get you clicks — it finds your ideal
                customers, targets them with the right keywords, and drives
                traffic that actually converts.
              </p>

              {/* Benefits List */}
              <div className='bg-gray-700/30 backdrop-blur-sm border border-gray-600/50 rounded-2xl p-6 lg:p-8 mb-12 lg:mb-16'>
                <div className='space-y-6'>
                  {benefits.map((benefit, index) => (
                    <div
                      key={index}
                      className='flex items-start text-left group'
                    >
                      <div className='w-7 h-7 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center mr-5 flex-shrink-0 mt-1 shadow-lg group-hover:scale-110 transition-transform duration-300'>
                        <Sparkles className='h-4 w-4 text-gray-900' />
                      </div>
                      <div className='flex-1'>
                        <h3 className='font-extrabold text-white font-heading text-sm sm:text-base lg:text-lg'>
                          {benefit.title}
                        </h3>
                        <span className='text-gray-200 font-body leading-relaxed text-lg sm:text-xl font-medium'>
                          {benefit.description}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA Button - Hidden on mobile, shown on desktop */}
            </div>

            {/* Chart Section - Redesigned for better spacing */}
            <div className='order-1 lg:order-2 mb-8 lg:mb-0'>
              <div className='bg-gray-800/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700/50 overflow-hidden max-w-2xl mx-auto lg:max-w-none transform hover:scale-105 transition-all duration-500'>
                {/* Header with Badge */}
                <div className='relative bg-gradient-to-r from-gray-800/80 to-gray-700/80 p-6 border-b border-gray-600/30'>
                  <div className='text-center'>
                    <h3 className='text-xl font-semibold text-white mb-2 font-heading'>
                      More Leads, Less Waste. Fast.
                    </h3>
                    <p className='text-sm text-gray-400 font-body mb-3'>
                      Users see 244% higher conversion rates in just 4 weeks.
                    </p>
                  </div>
                </div>

                {/* Chart Container */}
                <div className='p-6'>
                  <div className='relative h-64 bg-gradient-to-t from-gray-700/20 to-transparent rounded-xl border border-gray-600/30 p-4 mb-6'>
                    {/* Y-axis label */}
                    <div className='absolute -left-2 top-1/2 transform -translate-y-1/2 -rotate-90 text-xs text-gray-400 font-body whitespace-nowrap'>
                      Conversion Rate (%)
                    </div>

                    {/* Y-axis labels */}
                    <div className='absolute left-6 top-0 h-full flex flex-col justify-between text-xs text-gray-400 font-body py-2'>
                      <span>8%</span>
                      <span>6%</span>
                      <span>4%</span>
                      <span>2%</span>
                      <span>0%</span>
                    </div>

                    {/* X-axis labels */}
                    <div className='absolute bottom-0 left-12 right-4 flex justify-between text-xs text-gray-400 font-body'>
                      <span>Week 1</span>
                      <span>Week 2</span>
                      <span>Week 3</span>
                      <span>Week 4</span>
                    </div>

                    {/* Line Chart SVG */}
                    <div className='ml-10 mr-2 h-full relative'>
                      <svg
                        className='w-full h-full'
                        viewBox='0 0 300 180'
                        preserveAspectRatio='none'
                      >
                        {/* Grid lines */}
                        <defs>
                          <pattern
                            id='grid'
                            width='75'
                            height='45'
                            patternUnits='userSpaceOnUse'
                          >
                            <path
                              d='M 75 0 L 0 0 0 45'
                              fill='none'
                              stroke='rgb(75 85 99)'
                              strokeWidth='0.5'
                              opacity='0.3'
                            />
                          </pattern>

                          {/* Glow effect under the line */}
                          <filter id='glow'>
                            <feGaussianBlur
                              stdDeviation='3'
                              result='coloredBlur'
                            />
                            <feMerge>
                              <feMergeNode in='coloredBlur' />
                              <feMergeNode in='SourceGraphic' />
                            </feMerge>
                          </filter>

                          {/* Red to Orange gradient for Week 1-2 */}
                          <linearGradient
                            id='redGradient'
                            x1='0%'
                            y1='0%'
                            x2='50%'
                            y2='0%'
                          >
                            <stop offset='0%' stopColor='#ef4444' />
                            <stop offset='100%' stopColor='#f97316' />
                          </linearGradient>

                          {/* Green gradient for Week 3-4 */}
                          <linearGradient
                            id='greenGradient'
                            x1='50%'
                            y1='0%'
                            x2='100%'
                            y2='0%'
                          >
                            <stop offset='0%' stopColor='#22c55e' />
                            <stop offset='100%' stopColor='#10b981' />
                          </linearGradient>

                          {/* Subtle glow under line */}
                          <linearGradient
                            id='glowGradient'
                            x1='0%'
                            y1='0%'
                            x2='100%'
                            y2='0%'
                          >
                            <stop
                              offset='0%'
                              stopColor='#ef4444'
                              stopOpacity='0.3'
                            />
                            <stop
                              offset='25%'
                              stopColor='#f97316'
                              stopOpacity='0.3'
                            />
                            <stop
                              offset='50%'
                              stopColor='#eab308'
                              stopOpacity='0.3'
                            />
                            <stop
                              offset='75%'
                              stopColor='#22c55e'
                              stopOpacity='0.3'
                            />
                            <stop
                              offset='100%'
                              stopColor='#10b981'
                              stopOpacity='0.3'
                            />
                          </linearGradient>
                        </defs>

                        <rect width='100%' height='100%' fill='url(#grid)' />

                        {/* Glow area under the line */}
                        <polygon
                          fill='url(#glowGradient)'
                          points='0,135 75,124 150,90 225,45 300,34 300,180 0,180'
                          opacity='0.2'
                        />

                        {/* Week 1-2 line (red to orange) */}
                        <polyline
                          fill='none'
                          stroke='url(#redGradient)'
                          strokeWidth='3'
                          points='0,135 75,124 150,90'
                          className='drop-shadow-lg'
                          filter='url(#glow)'
                        />

                        {/* Week 3-4 line (green) */}
                        <polyline
                          fill='none'
                          stroke='url(#greenGradient)'
                          strokeWidth='3'
                          points='150,90 225,45 300,34'
                          className='drop-shadow-lg'
                          filter='url(#glow)'
                        />

                        {/* Data points with enhanced backgrounds */}
                        <circle
                          cx='0'
                          cy='135'
                          r='5'
                          fill='#ef4444'
                          stroke='#1f2937'
                          strokeWidth='2'
                          className='drop-shadow-lg'
                        />
                        <circle
                          cx='75'
                          cy='124'
                          r='5'
                          fill='#f97316'
                          stroke='#1f2937'
                          strokeWidth='2'
                          className='drop-shadow-lg'
                        />
                        <circle
                          cx='150'
                          cy='90'
                          r='5'
                          fill='#eab308'
                          stroke='#1f2937'
                          strokeWidth='2'
                          className='drop-shadow-lg'
                        />
                        <circle
                          cx='225'
                          cy='45'
                          r='5'
                          fill='#22c55e'
                          stroke='#1f2937'
                          strokeWidth='2'
                          className='drop-shadow-lg'
                        />
                        <circle
                          cx='300'
                          cy='34'
                          r='5'
                          fill='#10b981'
                          stroke='#1f2937'
                          strokeWidth='2'
                          className='drop-shadow-lg'
                        />
                      </svg>

                      {/* Data labels with enhanced styling */}
                      <div className='absolute inset-0 pointer-events-none'>
                        <div
                          className='absolute'
                          style={{ left: '-2%', top: '70%' }}
                        >
                          <span className='text-xs text-red-400 font-semibold font-body bg-gray-900/90 px-2 py-1 rounded shadow-lg border border-red-500/30'>
                            1.8%
                          </span>
                        </div>
                        <div
                          className='absolute'
                          style={{ left: '23%', top: '65%' }}
                        >
                          <span className='text-xs text-orange-400 font-semibold font-body bg-gray-900/90 px-2 py-1 rounded shadow-lg border border-orange-500/30'>
                            2.1%
                          </span>
                        </div>
                        <div
                          className='absolute'
                          style={{ left: '48%', top: '45%' }}
                        >
                          <span className='text-xs text-yellow-400 font-semibold font-body bg-gray-900/90 px-2 py-1 rounded shadow-lg border border-yellow-500/30'>
                            3.8%
                          </span>
                        </div>
                        <div
                          className='absolute'
                          style={{ left: '73%', top: '20%' }}
                        >
                          <span className='text-xs text-green-400 font-semibold font-body bg-gray-900/90 px-2 py-1 rounded shadow-lg border border-green-500/30'>
                            5.9%
                          </span>
                        </div>
                        <div
                          className='absolute'
                          style={{ left: '95%', top: '15%' }}
                        >
                          <span className='text-xs text-green-400 font-semibold font-body bg-gray-900/90 px-2 py-1 rounded shadow-lg border border-green-500/30'>
                            6.2%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Improvement indicator */}
                    <div className='absolute top-2 right-2 bg-green-500/20 border border-green-500/30 rounded-lg px-2 py-1'>
                      <div className='flex items-center space-x-1'>
                        <TrendingUp className='h-3 w-3 text-green-400' />
                        <span className='text-xs font-semibold text-green-400 font-body'>
                          +244%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom stats with better spacing */}
                  <div className='grid grid-cols-1 sm:grid-cols-3 gap-4 text-center'>
                    <div className='bg-gray-700/30 rounded-lg p-4 border border-gray-600/30 hover:bg-gray-700/40 transition-colors'>
                      <div className='text-xl font-bold text-white font-heading mb-1'>
                        3.2x
                      </div>
                      <div className='text-sm text-gray-400 font-body mb-2'>
                        More Leads
                      </div>
                      <div className='text-xs text-gray-500 font-body leading-tight'>
                        vs. last 30 days before using Sparkr
                      </div>
                    </div>
                    <div className='bg-gray-700/30 rounded-lg p-4 border border-gray-600/30 hover:bg-gray-700/40 transition-colors'>
                      <div className='text-xl font-bold text-white font-heading mb-1'>
                        -42%
                      </div>
                      <div className='text-sm text-gray-400 font-body mb-2'>
                        Lower CPA
                      </div>
                      <div className='text-xs text-gray-500 font-body leading-tight'>
                        Cost per acquisition dropped with auto-optimization
                      </div>
                    </div>
                    <div className='bg-gray-700/30 rounded-lg p-4 border border-gray-600/30 hover:bg-gray-700/40 transition-colors'>
                      <div className='text-xl font-bold text-white font-heading mb-1'>
                        89%
                      </div>
                      <div className='text-sm text-gray-400 font-body mb-2'>
                        Quality Score
                      </div>
                      <div className='text-xs text-gray-500 font-body leading-tight'>
                        Google Ads quality score for top campaigns
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Desktop CTA Button - Under chart */}
              <div className='hidden lg:flex lg:justify-center mt-6'>
                <Link href='/signup'>
                  <Button
                    size='lg'
                    className='bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 font-body'
                  >
                    Launch High-Converting Ads Now
                    <ArrowRight className='ml-2 h-5 w-5' />
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Mobile CTA Button - Only shows on mobile, positioned after chart */}
          <div className='lg:hidden text-center mt-8'>
            <Link href='/signup'>
              <Button
                size='lg'
                className='w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 font-body'
              >
                Launch High-Converting Ads Now
                <ArrowRight className='ml-2 h-5 w-5' />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
