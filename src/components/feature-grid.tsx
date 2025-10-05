'use client';

import type React from 'react';
import { useState, useRef, useEffect } from 'react';
import {
  Search,
  PenTool,
  Shield,
  Lightbulb,
  BarChart3,
  DollarSign,
  Monitor,
  ChevronLeft,
  ChevronRight,
  MessagesSquare,
  MousePointer,
  FileText,
  Zap,
  Settings,
  ChevronDown,
  TrendingUp,
  Edit3,
  Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { AnimatePresence } from 'framer-motion';

interface Feature {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string; // Micro-description
  detailedDescription?: string; // Optional full description
  gradient: string;
  badge?: string;
  category: 'launch' | 'optimize';
}

export function FeatureGrid() {
  const [activeTab, setActiveTab] = useState<'launch' | 'optimize'>('launch');
  const [currentPage, setCurrentPage] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [isFullListExpanded, setIsFullListExpanded] = useState(false);

  const allFeatures: Feature[] = [
    {
      icon: Search,
      title: 'Search + Display Campaigns',
      description:
        'Reach customers across Google Search and Display networks with versatile campaign types.',
      detailedDescription:
        'Sparkr supports both Google Search campaigns (targeting users actively searching for your products/services) and Google Display Network campaigns (reaching users across websites and apps). This ensures comprehensive coverage for your advertising goals.',
      gradient: 'from-blue-500 to-blue-600',
      category: 'launch',
    },
    {
      icon: PenTool,
      title: 'AI Keyword Expansion Engine',
      description:
        'Get 20+ auto-clustered keyword ideas per ad group, optimized weekly for trends and intent.',
      detailedDescription:
        'Our AI analyzes your business and ad focus to generate a comprehensive list of relevant keywords. These are automatically grouped into ad groups and continuously refined based on search trends and performance data to maximize relevance and ROI.',
      gradient: 'from-purple-500 to-purple-600',
      category: 'launch',
    },
    {
      icon: MessagesSquare, // Changed from MessageSquareText
      title: 'Sparkr Assist (AI Troubleshooting)',
      description:
        'AI chat helps diagnose and fix your ad issues (Growth & Pro only).',
      detailedDescription:
        'Stuck on a rejected ad, low performance, or confusing Google Ads setting? Sparkr Assist provides 24/7 AI-powered chat support to help you troubleshoot and resolve common ad issues quickly. Available on Growth and Pro plans.',
      gradient: 'from-yellow-500 to-orange-500',
      badge: 'Growth & Pro Only',
      category: 'optimize',
    },
    {
      icon: Shield,
      title: 'Policy Compliance Checker',
      description:
        'Sparkr checks ads for Google policy violations before launch, reducing rejections.',
      detailedDescription:
        'Avoid frustrating ad disapprovals. Our AI scans your ad copy for potential Google Ads policy violations (e.g., restricted terms, misleading claims) before you launch, helping ensure smoother campaign activation.',
      gradient: 'from-green-500 to-green-600',
      category: 'launch',
    },
    {
      icon: MousePointer,
      title: '1-Click Fix Application',
      description:
        "Approve Sparkr's weekly ad, budget, and keyword fixes in one tap. No manual tweaks needed.",
      detailedDescription:
        "Save time and effort. Sparkr's AI identifies optimization opportunities and presents them as simple, one-click fixes. Approve changes to your ads, budget allocation, and keywords instantly.",
      gradient: 'from-indigo-500 to-indigo-600',
      category: 'optimize',
    },
    {
      icon: FileText,
      title: 'Weekly Optimization Transparency',
      description:
        'View what Sparkr changes each week, including improvements and impact.',
      detailedDescription:
        'Understand exactly how Sparkr is improving your campaigns. Get clear weekly reports on all AI-driven optimizations, including changes made to ad copy, keywords, bids, and budget, along with their performance impact.',
      gradient: 'from-emerald-500 to-emerald-600',
      category: 'optimize',
    },
    {
      icon: Lightbulb,
      title: 'Landing Page Fix Suggestions',
      description:
        'Get AI-driven tips to optimize your landing pages for better conversion rates.',
      detailedDescription:
        "Your ads are only half the battle. Sparkr's AI can analyze your landing page (on Growth/Pro plans) and provide actionable suggestions to improve its structure, copy, and calls-to-action, ultimately boosting conversion rates.",
      gradient: 'from-yellow-500 to-orange-500',
      category: 'optimize',
    },
    {
      icon: BarChart3,
      title: 'Weekly A/B Testing + Rewrites',
      description:
        'AI continuously tests ad variations and rewrites underperforming assets to improve results.',
      detailedDescription:
        'Sparkr automatically sets up A/B tests for your ad copy. The AI learns what resonates with your audience and proactively rewrites underperforming ad variants to continuously enhance click-through rates and conversion.',
      gradient: 'from-indigo-500 to-indigo-600',
      category: 'optimize',
    },
    {
      icon: DollarSign,
      title: 'Budget Reallocation Engine',
      description:
        'AI automatically moves budget to your best-performing ads and campaigns for max ROI.',
      detailedDescription:
        "Ensure your ad spend is always working its hardest. Sparkr's AI monitors campaign and ad group performance, automatically shifting budget towards the top performers to maximize your return on investment.",
      gradient: 'from-emerald-500 to-emerald-600',
      category: 'optimize',
    },
    {
      icon: Monitor,
      title: 'Campaign Performance Dashboard',
      description:
        'Track all your campaigns, key metrics, and AI optimizations in one beautiful dashboard.',
      detailedDescription:
        'Get a clear, consolidated view of your Google Ads performance. The Sparkr dashboard displays key metrics like spend, clicks, CTR, and conversions, alongside a log of all AI-driven optimizations.',
      gradient: 'from-cyan-500 to-cyan-600',
      category: 'optimize',
    },
    {
      icon: Zap,
      title: 'One-Click Campaign Creation',
      description:
        'Describe your product and audience. AdSparkr instantly generates ad copy, creatives, and targeting using GPT-4o.',
      gradient: 'from-blue-500 to-blue-600',
      category: 'launch',
    },
    {
      icon: TrendingUp,
      title: 'Real-Time Ad Optimization',
      description:
        'AI scans live performance, reallocates budget, updates copy, and pauses underperforming assets to maximize ROI.',
      gradient: 'from-green-500 to-green-600',
      category: 'optimize',
    },
    {
      icon: Edit3,
      title: 'Editable Live Campaigns',
      description:
        'Edit already published campaigns (headlines, descriptions, images, targeting) directly from the AdSparkr dashboard.',
      gradient: 'from-purple-500 to-purple-600',
      category: 'optimize',
    },
    {
      icon: Target,
      title: 'High-Converting Ad Training',
      description:
        "GPT-4o is trained on patterns from Meta's top-performing ads to ensure your campaigns mimic what's already working.",
      gradient: 'from-orange-500 to-orange-600',
      category: 'launch',
    },
    {
      icon: BarChart3,
      title: 'Data-Driven Insights',
      description:
        'Budget forecasts, CTR/CPC/CPM comparisons vs industry benchmarks, and smart suggestions to improve ad health.',
      gradient: 'from-teal-500 to-teal-600',
      category: 'optimize',
    },
    {
      icon: Shield,
      title: 'No More Meta Confusion',
      description:
        'Skip the complexity of Meta Ads Manager. Clean, intuitive dashboard where AI does all the heavy lifting.',
      gradient: 'from-red-500 to-red-600',
      category: 'launch',
    },
  ];

  const filteredFeatures = allFeatures.filter(
    feature => feature.category === activeTab
  );

  const getFeaturesPerPage = () => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth >= 1024) return 3;
      if (window.innerWidth >= 768) return 2;
      return 1;
    }
    return 3;
  };

  const [featuresPerPage, setFeaturesPerPage] = useState(3);
  const totalPages = Math.ceil(filteredFeatures.length / featuresPerPage);

  useEffect(() => {
    const handleResize = () => {
      setFeaturesPerPage(getFeaturesPerPage());
      setCurrentPage(0); // Reset to first page on resize
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeTab]); // Re-run on activeTab change as well

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 } // Lowered threshold for earlier animation trigger
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setCurrentPage(0); // Reset page when tab changes
  }, [activeTab]);

  const goToNextPage = () =>
    setCurrentPage(prev => (prev === totalPages - 1 ? 0 : prev + 1));
  const goToPrevPage = () =>
    setCurrentPage(prev => (prev === 0 ? totalPages - 1 : prev - 1));
  const goToPage = (pageIndex: number) => setCurrentPage(pageIndex);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  const handleTouchMove = (e: React.TouchEvent) =>
    setTouchEnd(e.targetTouches[0].clientX);
  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > 50) goToNextPage();
    if (distance < -50) goToPrevPage();
  };

  const currentDisplayFeatures = filteredFeatures.slice(
    currentPage * featuresPerPage,
    (currentPage + 1) * featuresPerPage
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
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

  return (
    <section id='features' className='py-20 bg-gray-900' ref={containerRef}>
      <div className='container mx-auto px-4 sm:px-6 lg:px-8'>
        <motion.div
          className='max-w-5xl mx-auto'
          initial='hidden'
          animate={isInView ? 'visible' : 'hidden'}
          variants={containerVariants}
        >
          <motion.div className='text-center mb-12' variants={itemVariants}>
            <h2 className='text-3xl sm:text-4xl lg:text-5xl font-extrabold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-4 font-heading'>
              Everything you need to win with Google Ads — built into one tool,
              all automated.
            </h2>
          </motion.div>

          {/* Tabs for Launch/Optimize */}
          <motion.div
            className='flex justify-center space-x-2 sm:space-x-4 mb-8 sm:mb-10'
            variants={itemVariants}
          >
            {(['launch', 'optimize'] as const).map(tab => (
              <Button
                key={tab}
                variant={activeTab === tab ? 'default' : 'outline'}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base font-medium rounded-lg transition-all duration-300 transform hover:scale-105 focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900
                  ${
                    activeTab === tab
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg border-transparent'
                      : 'border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800 hover:border-gray-600 focus:ring-blue-500'
                  }`}
              >
                {tab === 'launch' ? (
                  <Zap className='h-4 w-4 sm:h-5 sm:w-5 mr-2' />
                ) : (
                  <Settings className='h-4 w-4 sm:h-5 sm:w-5 mr-2' />
                )}
                {tab.charAt(0).toUpperCase() + tab.slice(1)} Ads
              </Button>
            ))}
          </motion.div>

          {/* Navigation Controls (conditionally render if more than 1 page) */}
          {totalPages > 1 && (
            <motion.div
              className='flex items-center justify-between mb-8'
              variants={itemVariants}
            >
              <Button
                variant='outline'
                size='icon'
                onClick={goToPrevPage}
                className='border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800 bg-transparent'
                aria-label='Previous features'
              >
                <ChevronLeft className='h-5 w-5' />{' '}
                <span className='sr-only'>Previous</span>
              </Button>
              <div className='flex space-x-2'>
                {Array.from({ length: totalPages }).map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToPage(index)}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${currentPage === index ? 'bg-blue-500 w-5' : 'bg-gray-600 hover:bg-gray-500'}`}
                    aria-label={`Go to page ${index + 1}`}
                  />
                ))}
              </div>
              <Button
                variant='outline'
                size='icon'
                onClick={goToNextPage}
                className='border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800 bg-transparent'
                aria-label='Next features'
              >
                <ChevronRight className='h-5 w-5' />{' '}
                <span className='sr-only'>Next</span>
              </Button>
            </motion.div>
          )}

          <motion.div
            className='relative overflow-hidden min-h-[320px] sm:min-h-[300px]'
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            variants={itemVariants}
          >
            <AnimatePresence mode='wait'>
              <motion.div
                key={activeTab + currentPage} // Ensure re-render on tab or page change
                className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 justify-items-center'
                initial={{ opacity: 0, x: activeTab === 'launch' ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: activeTab === 'launch' ? 20 : -20 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
                {currentDisplayFeatures.map((feature, index) => (
                  <motion.div
                    key={feature.title}
                    className='bg-gray-800/50 backdrop-blur-xl p-6 rounded-2xl shadow-2xl border border-gray-700/50 hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-2 group w-full flex flex-col'
                    variants={itemVariants} // Use itemVariants for individual card animation
                    whileHover={{ scale: 1.03 }}
                  >
                    <div className='absolute inset-0 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-sm'></div>
                    <div className='relative z-10 text-center flex flex-col flex-grow'>
                      <motion.div
                        className={`w-12 h-12 bg-gradient-to-br ${feature.gradient} rounded-xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300 mx-auto`}
                        whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                        transition={{ duration: 0.5 }}
                      >
                        <feature.icon className='h-6 w-6 text-white' />
                      </motion.div>
                      <div className='flex flex-col items-center flex-grow'>
                        <h3 className='text-lg sm:text-xl font-extrabold text-white mb-2 font-heading'>
                          {feature.title}
                        </h3>
                        {feature.badge && (
                          <Badge className='mb-2 bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs'>
                            {feature.badge}
                          </Badge>
                        )}
                        <p className='text-gray-400 font-body text-sm flex-grow'>
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {totalPages > 1 &&
            currentDisplayFeatures.length < filteredFeatures.length && (
              <motion.div
                className='mt-6 text-center text-gray-500 text-sm md:hidden'
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <span className='inline-flex items-center'>
                  <ChevronLeft className='h-3 w-3 mr-1' /> Swipe to navigate{' '}
                  <ChevronRight className='h-3 w-3 ml-1' />
                </span>
              </motion.div>
            )}

          {/* See Full Feature List Dropdown */}
          <motion.div className='mt-10 text-center' variants={itemVariants}>
            <Collapsible
              open={isFullListExpanded}
              onOpenChange={setIsFullListExpanded}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant='outline'
                  className='border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800 bg-transparent'
                >
                  {isFullListExpanded ? 'Hide' : 'See'} Full Feature List
                  <ChevronDown
                    className={`ml-2 h-4 w-4 transition-transform duration-200 ${isFullListExpanded ? 'rotate-180' : ''}`}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className='mt-6 text-left'>
                <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6 bg-gray-800/30 p-6 rounded-lg border border-gray-700/50'>
                  {allFeatures.map(feature => (
                    <div key={feature.title} className='py-1'>
                      <h4 className='font-semibold text-white text-sm mb-0.5'>
                        {feature.title}{' '}
                        {feature.badge && (
                          <Badge
                            variant='outline'
                            className='ml-1 text-xs bg-purple-500/20 text-purple-300 border-purple-500/30'
                          >
                            {feature.badge}
                          </Badge>
                        )}
                      </h4>
                      <p className='text-gray-400 text-xs'>
                        {feature.detailedDescription || feature.description}
                      </p>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </motion.div>

          {/* ROI Comparison */}
          <div className='mt-20 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl p-8 border border-blue-500/30'>
            <div className='text-center mb-8'>
              <h3 className='text-2xl font-bold text-white mb-4 font-heading'>
                Manual vs AdSparkr
              </h3>
              <p className='text-gray-300 font-body'>
                See why AI-powered campaigns outperform traditional management
              </p>
            </div>

            <div className='grid md:grid-cols-2 gap-8'>
              <div className='bg-red-500/10 border border-red-500/30 rounded-xl p-6'>
                <h4 className='text-lg font-semibold text-red-300 mb-4 font-heading'>
                  Manual Campaign Management
                </h4>
                <ul className='space-y-2 text-gray-400 font-body'>
                  <li>• Hours spent learning Meta Ads Manager</li>
                  <li>• Manual budget adjustments</li>
                  <li>• Guesswork on targeting</li>
                  <li>• Delayed optimization responses</li>
                  <li>• Average 1.2x ROAS</li>
                </ul>
              </div>

              <div className='bg-green-500/10 border border-green-500/30 rounded-xl p-6'>
                <h4 className='text-lg font-semibold text-green-300 mb-4 font-heading'>
                  AdSparkr AI Management
                </h4>
                <ul className='space-y-2 text-gray-400 font-body'>
                  <li>• Launch campaigns in 60 seconds</li>
                  <li>• Real-time budget optimization</li>
                  <li>• AI-powered audience targeting</li>
                  <li>• 24/7 performance monitoring</li>
                  <li>• Average 3.6x ROAS</li>
                </ul>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
