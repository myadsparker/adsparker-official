'use client';

import { Button } from '@/components/ui/button';
import { ArrowRight, TrendingUp, Target, BarChart3, Zap } from 'lucide-react';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

export function OutperformSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.6, ease: 'easeOut' },
    },
  };

  const cardVariants = {
    hidden: { x: -50, opacity: 0 },
    visible: {
      x: 0,
      opacity: 1,
      transition: { duration: 0.8, ease: 'easeOut' },
    },
  };

  const dashboardVariants = {
    hidden: { x: 50, opacity: 0, scale: 0.9 },
    visible: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: { duration: 0.8, ease: 'easeOut', delay: 0.2 },
    },
  };

  return (
    <section
      ref={sectionRef}
      className='py-24 bg-black relative overflow-hidden'
    >
      {/* Background Elements */}
      <div className='absolute inset-0'>
        <div className='absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl'></div>
        <div className='absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl'></div>
      </div>

      <div className='container mx-auto px-4 sm:px-6 lg:px-8 relative z-10'>
        <motion.div
          className='max-w-7xl mx-auto'
          initial='hidden'
          animate={isInView ? 'visible' : 'hidden'}
          variants={containerVariants}
        >
          {/* Section Header */}
          <motion.div className='text-center mb-16' variants={itemVariants}>
            <h2
              className='text-4xl sm:text-5xl lg:text-6xl font-semibold text-white mb-6 leading-tight tracking-[-0.02em]'
              style={{
                fontFamily:
                  "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif",
                textShadow:
                  '0 0 20px rgba(255, 255, 255, 0.3), 0 0 40px rgba(255, 255, 255, 0.2), 0 0 60px rgba(255, 255, 255, 0.1)',
              }}
            >
              Outperform Human Ad Experts with{' '}
              <span
                className='font-bold italic'
                style={{
                  fontFamily:
                    "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif",
                  color: 'white',
                }}
              >
                AdSparkr
              </span>
            </h2>
            <p
              className='text-gray-400 text-lg lg:text-xl max-w-4xl mx-auto mb-16 leading-relaxed tracking-[-0.01em]'
              style={{
                fontFamily:
                  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif",
              }}
            >
              AI-driven strategies analyze market trends, optimize targeting,
              and maximize ad performance beyond manual expertise
            </p>
          </motion.div>

          {/* Main Content */}
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center'>
            {/* Performance Card */}
            <motion.div variants={cardVariants}>
              <div className='relative'>
                {/* Main Card */}
                <div className='bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl rounded-3xl p-8 lg:p-12 border border-gray-700/50 shadow-2xl relative overflow-hidden'>
                  {/* Card Background Effects */}
                  <div className='absolute inset-0 bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-3xl'></div>
                  <div className='absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-transparent rounded-full blur-2xl'></div>

                  <div className='relative z-10'>
                    <h3
                      className='text-2xl lg:text-3xl font-medium text-white mb-8 tracking-[-0.01em]'
                      style={{
                        fontFamily:
                          "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif",
                      }}
                    >
                      Outperform Human Ad Experts
                    </h3>

                    {/* Metrics */}
                    <div className='grid grid-cols-2 gap-8'>
                      <div className='text-center'>
                        <div className='text-5xl lg:text-6xl font-bold text-white mb-2 tracking-tight'>
                          3x
                        </div>
                        <div className='text-gray-300 text-lg font-medium tracking-wide'>
                          ROI
                        </div>
                      </div>
                      <div className='text-center'>
                        <div className='text-5xl lg:text-6xl font-bold text-white mb-2 tracking-tight'>
                          50%
                        </div>
                        <div className='text-gray-300 text-lg font-medium tracking-wide'>
                          Lower Costs
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating Elements */}
                <motion.div
                  className='absolute -top-4 -right-4 w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg'
                  animate={{
                    y: [0, -10, 0],
                    rotate: [0, 5, 0],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: 'easeInOut',
                  }}
                >
                  <TrendingUp className='h-8 w-8 text-white' />
                </motion.div>

                <motion.div
                  className='absolute -bottom-6 -left-6 w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg'
                  animate={{
                    y: [0, 8, 0],
                    rotate: [0, -5, 0],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: 'easeInOut',
                    delay: 1,
                  }}
                >
                  <Target className='h-6 w-6 text-white' />
                </motion.div>
              </div>
            </motion.div>

            {/* Dashboard Visualization */}
            <motion.div variants={dashboardVariants}>
              <div className='relative'>
                {/* Main Dashboard */}
                <div className='bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/30 shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-500'>
                  <div className='flex items-center justify-between mb-4'>
                    <div className='flex items-center space-x-3'>
                      <div className='w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center'>
                        <Zap className='h-4 w-4 text-white' />
                      </div>
                      <span className='text-white font-medium'>
                        AdSparkr AI Dashboard
                      </span>
                    </div>
                    <div className='flex space-x-1'>
                      <div className='w-3 h-3 bg-red-500 rounded-full'></div>
                      <div className='w-3 h-3 bg-yellow-500 rounded-full'></div>
                      <div className='w-3 h-3 bg-green-500 rounded-full'></div>
                    </div>
                  </div>

                  <div className='space-y-3'>
                    <div className='h-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full'></div>
                    <div className='h-2 bg-gray-700 rounded-full w-3/4'></div>
                    <div className='h-2 bg-gray-700 rounded-full w-1/2'></div>
                  </div>
                </div>

                {/* Floating Cards */}
                <motion.div
                  className='absolute -top-8 -right-8 bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl rounded-xl p-4 border border-gray-700/50 shadow-xl'
                  animate={{
                    y: [0, -8, 0],
                    x: [0, 4, 0],
                  }}
                  transition={{
                    duration: 5,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: 'easeInOut',
                  }}
                >
                  <div className='flex items-center space-x-2'>
                    <BarChart3 className='h-4 w-4 text-blue-400' />
                    <span className='text-white text-sm font-medium'>
                      +127% CTR
                    </span>
                  </div>
                </motion.div>

                <motion.div
                  className='absolute -bottom-6 -left-8 bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl rounded-xl p-4 border border-gray-700/50 shadow-xl'
                  animate={{
                    y: [0, 6, 0],
                    x: [0, -3, 0],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: 'easeInOut',
                    delay: 2,
                  }}
                >
                  <div className='flex items-center space-x-2'>
                    <Target className='h-4 w-4 text-blue-400' />
                    <span className='text-white text-sm font-medium'>
                      -43% CPA
                    </span>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>

          {/* Description */}
          <motion.div className='text-center mt-16' variants={itemVariants}>
            <Button
              size='lg'
              className='bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 rounded-full'
              style={{
                fontFamily:
                  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif",
              }}
            >
              Get Started Now
              <ArrowRight className='ml-2 h-5 w-5' />
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
