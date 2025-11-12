'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Target } from 'lucide-react';

const businessCategories = [
  [
    {
      name: 'E-commerce',
      description: 'Online stores & marketplaces',
      emoji: '🛒',
      gradient: 'from-blue-600 to-blue-800',
    },
    {
      name: 'SaaS',
      description: 'Software & tech platforms',
      emoji: '💻',
      gradient: 'from-purple-600 to-purple-800',
    },
    {
      name: 'Healthcare',
      description: 'Medical & wellness services',
      emoji: '🏥',
      gradient: 'from-green-600 to-green-800',
    },
  ],
  [
    {
      name: 'Real Estate',
      description: 'Property & investment',
      emoji: '🏠',
      gradient: 'from-orange-600 to-orange-800',
    },
    {
      name: 'Education',
      description: 'Learning & development',
      emoji: '📚',
      gradient: 'from-indigo-600 to-indigo-800',
    },
    {
      name: 'Finance',
      description: 'Banking & fintech',
      emoji: '💰',
      gradient: 'from-yellow-600 to-yellow-800',
    },
  ],
  [
    {
      name: 'Travel',
      description: 'Tourism & hospitality',
      emoji: '✈️',
      gradient: 'from-teal-600 to-teal-800',
    },
    {
      name: 'Fitness',
      description: 'Health & wellness',
      emoji: '💪',
      gradient: 'from-red-600 to-red-800',
    },
    {
      name: 'Food',
      description: 'Restaurants & delivery',
      emoji: '🍕',
      gradient: 'from-pink-600 to-pink-800',
    },
  ],
];

export function AudienceTargetingSection() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const nextSlide = () => {
    setCurrentSlide(prev => (prev + 1) % businessCategories.length);
  };

  const prevSlide = () => {
    setCurrentSlide(
      prev => (prev - 1 + businessCategories.length) % businessCategories.length
    );
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  return (
    <section className='py-12 md:py-20 px-4 bg-black relative overflow-hidden'>
      {/* Background Effects */}
      <div className='absolute inset-0'>
        <div className='absolute top-1/4 left-1/4 w-64 h-64 md:w-96 md:h-96 bg-blue-500/5 rounded-full blur-3xl'></div>
        <div className='absolute bottom-1/4 right-1/4 w-64 h-64 md:w-96 md:h-96 bg-purple-500/5 rounded-full blur-3xl'></div>
      </div>

      <div className='max-w-7xl mx-auto relative z-10'>
        {/* Header */}
        <div className='text-center mb-8 md:mb-16 space-y-4 md:space-y-6'>
          <div className='flex items-center justify-center gap-2 text-blue-400'>
            <Target className='w-4 h-4 md:w-5 md:h-5' />
            <span className='text-xs md:text-sm font-medium uppercase tracking-wider'>
              Smart Targeting
            </span>
          </div>

          <h2 className='text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight max-w-4xl mx-auto'>
            Reach your highest-converting audience
          </h2>

          <p className='text-gray-300 text-base md:text-lg leading-relaxed max-w-3xl mx-auto'>
            Worried about reaching the right audience? AdSparker ensures your ads
            land in front of high-intent buyers—anywhere in the world.
          </p>

          <Button
            size='lg'
            className='bg-blue-600 hover:bg-blue-700 text-white px-6 md:px-8 py-4 md:py-6 text-base md:text-lg font-semibold rounded-full transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/25'
          >
            Maximize Your Reach
            <Target className='ml-2 w-4 h-4 md:w-5 md:h-5' />
          </Button>
        </div>

        {/* Business Categories Carousel */}
        <div className='relative'>
          {/* Cards Container */}
          <div className='overflow-hidden'>
            <div
              className='flex transition-transform duration-500 ease-in-out'
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {businessCategories.map((slideCategories, slideIndex) => (
                <div key={slideIndex} className='w-full flex-shrink-0'>
                  {isMobile ? (
                    // Mobile: Single card layout
                    <div className='flex justify-center'>
                      <div className='w-full max-w-sm'>
                        {slideCategories.map((category, categoryIndex) => (
                          <div
                            key={categoryIndex}
                            className={`bg-gradient-to-br ${category.gradient} rounded-2xl p-6 mb-4 transform hover:scale-105 transition-all duration-300 hover:shadow-xl cursor-pointer group`}
                          >
                            <div className='flex items-center gap-4'>
                              <div className='text-3xl'>{category.emoji}</div>
                              <div className='flex-1'>
                                <h3 className='text-xl font-bold text-white mb-1'>
                                  {category.name}
                                </h3>
                                <p className='text-white/80 text-sm'>
                                  {category.description}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    // Desktop: Grid layout
                    <div className='grid md:grid-cols-3 gap-6 md:gap-8'>
                      {slideCategories.map((category, categoryIndex) => (
                        <div
                          key={categoryIndex}
                          className={`bg-gradient-to-br ${category.gradient} rounded-2xl p-6 md:p-8 transform hover:scale-105 transition-all duration-300 hover:shadow-xl cursor-pointer group`}
                        >
                          <div className='text-center space-y-4'>
                            <div className='text-4xl md:text-5xl'>
                              {category.emoji}
                            </div>
                            <div>
                              <h3 className='text-xl md:text-2xl font-bold text-white mb-2'>
                                {category.name}
                              </h3>
                              <p className='text-white/80 text-sm md:text-base'>
                                {category.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Controls */}
          <div className='flex items-center justify-center gap-4 mt-8 md:mt-12'>
            <button
              onClick={prevSlide}
              className='bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 rounded-full p-2 md:p-3 transition-all duration-300 hover:scale-110'
            >
              <ChevronLeft className='w-4 h-4 md:w-5 md:h-5 text-white' />
            </button>

            {/* Pagination Dots */}
            <div className='flex gap-2'>
              {businessCategories.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`w-2 h-2 md:w-3 md:h-3 rounded-full transition-all duration-300 ${
                    index === currentSlide
                      ? 'bg-blue-500 scale-125'
                      : 'bg-gray-600 hover:bg-gray-500'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={nextSlide}
              className='bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 rounded-full p-2 md:p-3 transition-all duration-300 hover:scale-110'
            >
              <ChevronRight className='w-4 h-4 md:w-5 md:h-5 text-white' />
            </button>
          </div>

          {/* CTA Button */}
          <div className='text-center mt-8 md:mt-12'>
            <Button
              size='lg'
              className='bg-blue-600 hover:bg-blue-700 text-white px-8 md:px-12 py-4 md:py-6 text-base md:text-xl font-semibold rounded-full transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/25'
            >
              Get Started
              <Target className='ml-2 w-5 h-5 md:w-6 md:h-6' />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
