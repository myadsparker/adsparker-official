'use client';

import { Button } from '@/components/ui/button';
import { ArrowRight, Globe, BarChart3, Target } from 'lucide-react';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

export function UnlockPotentialSection() {
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
    hidden: { y: 50, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.8, ease: 'easeOut' },
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
        <div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-gradient-to-r from-blue-600/3 via-blue-500/2 to-blue-400/3 rounded-full blur-3xl'></div>
      </div>

      <div className='container mx-auto px-4 sm:px-6 lg:px-8 relative z-10'>
        <motion.div
          className='max-w-7xl mx-auto'
          initial='hidden'
          animate={isInView ? 'visible' : 'hidden'}
          variants={containerVariants}
        >
          <div className='max-w-7xl mx-auto'>
            {/* Section Header */}
            <motion.div
              className='text-center mb-16'
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              <h2
                className='text-4xl sm:text-5xl lg:text-6xl font-semibold text-white mb-4 leading-tight tracking-[-0.02em]'
                style={{
                  fontFamily:
                    "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif",
                }}
              >
                Unlock Your Business Potential
              </h2>
              <p
                className='max-w-3xl mx-auto text-lg text-gray-400'
                style={{
                  fontFamily:
                    "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif",
                }}
              >
                AdSparkr gives you the tools to grow. Simple, powerful, and
                built for results.
              </p>
            </motion.div>

            {/* Features Grid */}
            <motion.div
              className='grid grid-cols-1 md:grid-cols-3 gap-8'
              initial='hidden'
              animate={isInView ? 'visible' : 'hidden'}
              variants={{
                visible: { transition: { staggerChildren: 0.2 } },
              }}
            >
              {/* Feature Card 1 */}
              <motion.div
                className='bg-gray-900/50 backdrop-blur-lg rounded-3xl p-8 border border-gray-700/50 shadow-2xl text-center flex flex-col items-center'
                variants={{
                  hidden: { y: 30, opacity: 0 },
                  visible: {
                    y: 0,
                    opacity: 1,
                    transition: { duration: 0.6, ease: 'easeOut' },
                  },
                }}
              >
                <div className='w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6'>
                  <Target className='h-8 w-8 text-white' />
                </div>
                <h3
                  className='text-xl font-medium text-white mb-3'
                  style={{
                    fontFamily:
                      "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif",
                  }}
                >
                  AI-Powered Targeting
                </h3>
                <p
                  className='text-gray-400 leading-relaxed'
                  style={{
                    fontFamily:
                      "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif",
                  }}
                >
                  Pinpoint your ideal customers with precision AI to maximize
                  your ad spend.
                </p>
              </motion.div>

              {/* Feature Card 2 */}
              <motion.div
                className='bg-gray-900/50 backdrop-blur-lg rounded-3xl p-8 border border-gray-700/50 shadow-2xl text-center flex flex-col items-center'
                variants={{
                  hidden: { y: 30, opacity: 0 },
                  visible: {
                    y: 0,
                    opacity: 1,
                    transition: { duration: 0.6, ease: 'easeOut' },
                  },
                }}
              >
                <div className='w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6'>
                  <BarChart3 className='h-8 w-8 text-white' />
                </div>
                <h3
                  className='text-xl font-medium text-white mb-3'
                  style={{
                    fontFamily:
                      "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif",
                  }}
                >
                  Instant Market Research
                </h3>
                <p
                  className='text-gray-400 leading-relaxed'
                  style={{
                    fontFamily:
                      "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif",
                  }}
                >
                  Get real-time, data-driven insights to stay ahead of the
                  competition.
                </p>
              </motion.div>

              {/* Feature Card 3 */}
              <motion.div
                className='bg-gray-900/50 backdrop-blur-lg rounded-3xl p-8 border border-gray-700/50 shadow-2xl text-center flex flex-col items-center'
                variants={{
                  hidden: { y: 30, opacity: 0 },
                  visible: {
                    y: 0,
                    opacity: 1,
                    transition: { duration: 0.6, ease: 'easeOut' },
                  },
                }}
              >
                <div className='w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6'>
                  <Globe className='h-8 w-8 text-white' />
                </div>
                <h3
                  className='text-xl font-medium text-white mb-3'
                  style={{
                    fontFamily:
                      "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif",
                  }}
                >
                  Global Reach
                </h3>
                <p
                  className='text-gray-400 leading-relaxed'
                  style={{
                    fontFamily:
                      "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif",
                  }}
                >
                  Launch campaigns worldwide and connect with customers
                  anywhere.
                </p>
              </motion.div>
            </motion.div>

            {/* CTA */}
            <motion.div
              className='text-center mt-16'
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, ease: 'easeOut', delay: 0.5 }}
            >
              <Button
                size='lg'
                className='bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 rounded-full'
                style={{
                  fontFamily:
                    "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif",
                }}
              >
                Start Growing with AdSparkr
                <ArrowRight className='ml-2 h-5 w-5' />
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
