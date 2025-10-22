'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

export function StickyCTA() {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const handleGetStarted = () => {
    router.push('/login');
  };

  useEffect(() => {
    const handleScroll = () => {
      // Show after scrolling 60% of the viewport height
      const scrollThreshold = window.innerHeight * 0.6;
      if (window.scrollY > scrollThreshold && !isDismissed) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isDismissed]);

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className='fixed bottom-4 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none'
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        >
          <div className='bg-gradient-to-r from-indigo-600/95 to-indigo-800/95 backdrop-blur-md rounded-lg shadow-2xl border border-indigo-500/30 p-4 max-w-md w-full flex items-center justify-between pointer-events-auto'>
            <div className='mr-4'>
              <p className='text-white font-medium text-sm'>
                Ready to boost your ad performance?
              </p>
            </div>
            <div className='flex items-center gap-2'>
              <Button
                size='sm'
                className='bg-white text-indigo-700 hover:bg-gray-100 shadow-md whitespace-nowrap'
                onClick={handleGetStarted}
              >
                Get Started
                <ArrowRight className='ml-1 h-3 w-3' />
              </Button>
              <button
                onClick={handleDismiss}
                className='text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors'
                aria-label='Dismiss'
              >
                <X className='h-4 w-4' />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
