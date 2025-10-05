'use client';

import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  TrendingDown,
  BarChart3,
  PenTool,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import Link from 'next/link';

export function FixExistingAdsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.5, ease: 'easeOut' },
    },
  };

  const features = [
    {
      icon: TrendingDown,
      title: 'Reduce wasted spend',
      description:
        'Sparkr identifies low-performing keywords and ad groups that drain your budget with little return.',
      gradient: 'from-red-500 to-red-600',
    },
    {
      icon: BarChart3,
      title: 'Auto-adjust budgets & targeting',
      description:
        "Automatically reallocate your budget to what's working and refine targeting for better results.",
      gradient: 'from-blue-500 to-blue-600',
    },
    {
      icon: PenTool,
      title: 'Fix underperforming ad copy',
      description:
        'AI rewrites your weakest ads to boost click-through rates and quality scores.',
      gradient: 'from-green-500 to-green-600',
    },
  ];

  return (
    <section ref={sectionRef} className='py-20 bg-gray-800'>
      <div className='container mx-auto px-4 sm:px-6 lg:px-8'>
        <motion.div
          className='max-w-6xl mx-auto'
          initial='hidden'
          animate={isInView ? 'visible' : 'hidden'}
          variants={containerVariants}
        >
          <motion.div
            className='text-center mb-12 sm:mb-16'
            variants={itemVariants}
          >
            <h2 className='text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-4 font-heading'>
              Already Running Google Ads?
            </h2>
            <p className='text-xl text-gray-300 max-w-3xl mx-auto font-body'>
              Connect your account and let Sparkr automatically find and fix
              issues, then optimize your ads every week.
            </p>
          </motion.div>

          {/* Side-by-side visual placeholder */}
          <motion.div
            className='mb-12 sm:mb-16 grid grid-cols-1 md:grid-cols-2 gap-8 items-center'
            variants={itemVariants}
          >
            <div className='bg-gray-700/50 p-6 rounded-xl border border-gray-600/50'>
              <h3 className='text-xl font-semibold text-red-400 mb-3 font-heading flex items-center'>
                <AlertTriangle className='h-5 w-5 mr-2' />
                Before Sparkr
              </h3>
              <ul className='space-y-2 text-gray-400 text-sm font-body'>
                <li className='flex items-center'>
                  <TrendingDown className='h-4 w-4 mr-2 text-red-500' />
                  Low Click-Through Rates (CTR)
                </li>
                <li className='flex items-center'>
                  <TrendingDown className='h-4 w-4 mr-2 text-red-500' />
                  High Cost Per Click (CPC)
                </li>
                <li className='flex items-center'>
                  <TrendingDown className='h-4 w-4 mr-2 text-red-500' />
                  Wasted Ad Spend on irrelevant keywords
                </li>
                <li className='flex items-center'>
                  <TrendingDown className='h-4 w-4 mr-2 text-red-500' />
                  Poor Quality Scores
                </li>
                <li className='flex items-center'>
                  <TrendingDown className='h-4 w-4 mr-2 text-red-500' />
                  Generic, underperforming ad copy
                </li>
              </ul>
            </div>
            <div className='bg-gray-700/50 p-6 rounded-xl border border-gray-600/50'>
              <h3 className='text-xl font-semibold text-green-400 mb-3 font-heading flex items-center'>
                <CheckCircle className='h-5 w-5 mr-2' />
                After Sparkr AI Optimization
              </h3>
              <ul className='space-y-2 text-gray-300 text-sm font-body'>
                <li className='flex items-center'>
                  <BarChart3 className='h-4 w-4 mr-2 text-green-500' />
                  Improved CTR with AI-written ads
                </li>
                <li className='flex items-center'>
                  <BarChart3 className='h-4 w-4 mr-2 text-green-500' />
                  Lower CPC through smart bidding
                </li>
                <li className='flex items-center'>
                  <BarChart3 className='h-4 w-4 mr-2 text-green-500' />
                  Focused spend on high-intent keywords
                </li>
                <li className='flex items-center'>
                  <BarChart3 className='h-4 w-4 mr-2 text-green-500' />
                  Enhanced Quality Scores
                </li>
                <li className='flex items-center'>
                  <BarChart3 className='h-4 w-4 mr-2 text-green-500' />
                  Compelling, A/B tested ad copy
                </li>
              </ul>
            </div>
          </motion.div>

          <motion.div
            className='grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-12 sm:mb-16'
            variants={containerVariants}
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                className='bg-gray-800/50 backdrop-blur-xl p-6 rounded-2xl shadow-2xl border border-gray-700/50 hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-2 group'
                variants={itemVariants}
              >
                <div className='absolute inset-0 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-sm'></div>
                <div className='relative z-10'>
                  <div
                    className={`w-12 h-12 bg-gradient-to-br ${feature.gradient} rounded-xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}
                  >
                    <feature.icon className='h-6 w-6 text-white' />
                  </div>
                  <h3 className='text-lg sm:text-xl font-extrabold text-white mb-2 font-heading'>
                    {feature.title}
                  </h3>
                  <p className='text-gray-400 font-body'>
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          <motion.div className='text-center' variants={itemVariants}>
            <Link href='/signup'>
              <Button
                size='lg'
                className='bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 font-body'
              >
                Optimize My Campaigns
                <ArrowRight className='ml-2 h-5 w-5' />
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
