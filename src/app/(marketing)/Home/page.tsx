'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';

export default function HomePage() {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  // Countdown timer to a launch date (30 days from now)
  useEffect(() => {
    const launchDate = new Date();
    launchDate.setDate(launchDate.getDate() + 30);

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = launchDate.getTime() - now;

      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor(
          (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
        ),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000),
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      // Here you would typically send to your backend
      console.log('Email submitted:', email);
      setIsSubmitted(true);
      setTimeout(() => {
        setIsSubmitted(false);
        setEmail('');
      }, 3000);
    }
  };

  return (
    <div className='min-h-screen bg-black text-white relative overflow-hidden'>
      {/* Animated Background */}
      <div className='fixed inset-0 bg-black'>
        <div className='absolute inset-0 bg-gradient-to-br from-blue-900/30 via-purple-900/30 to-black'></div>

        {/* Floating orbs */}
        <motion.div
          className='absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl'
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className='absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl'
          animate={{
            scale: [1, 1.3, 1],
            x: [0, -50, 0],
            y: [0, -30, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className='absolute top-1/2 left-1/2 w-64 h-64 bg-cyan-500/15 rounded-full blur-3xl'
          animate={{
            scale: [1, 1.5, 1],
            x: [-30, 30, -30],
            y: [20, -20, 20],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Grid pattern */}
        <div className='absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:100px_100px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)]'></div>
      </div>

      {/* Content */}
      <div className='relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-20'>
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className='mb-12'
        >
          <Image
            src='/images/adsparker-logo.png'
            alt='AdSparker Logo'
            width={200}
            height={60}
            className='h-12 w-auto'
          />
        </motion.div>

        {/* Main heading */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className='text-center mb-8'
        >
          <h1 className='text-5xl md:text-7xl lg:text-8xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 animate-gradient'>
            Coming Soon
          </h1>
          <p className='text-xl md:text-2xl text-gray-300 max-w-2xl mx-auto leading-relaxed'>
            We're building something amazing. AI-powered Meta Ads that boost
            sales and maximize ROI.
          </p>
        </motion.div>

        {/* Countdown Timer */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className='grid grid-cols-4 gap-4 md:gap-8 mb-12'
        >
          {[
            { label: 'Days', value: timeLeft.days },
            { label: 'Hours', value: timeLeft.hours },
            { label: 'Minutes', value: timeLeft.minutes },
            { label: 'Seconds', value: timeLeft.seconds },
          ].map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
              className='flex flex-col items-center'
            >
              <div className='relative'>
                <div className='absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl blur-xl'></div>
                <div className='relative bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl p-6 md:p-8 min-w-[80px] md:min-w-[120px]'>
                  <span className='text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-blue-400 to-purple-400'>
                    {String(item.value).padStart(2, '0')}
                  </span>
                </div>
              </div>
              <span className='text-sm md:text-base text-gray-400 mt-3 uppercase tracking-wider'>
                {item.label}
              </span>
            </motion.div>
          ))}
        </motion.div>

        {/* Email subscription form */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className='w-full max-w-md mb-12'
        >
          <form onSubmit={handleSubmit} className='relative'>
            <div className='relative group'>
              <div className='absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-lg opacity-75 group-hover:opacity-100 transition-opacity'></div>
              <div className='relative flex items-center bg-gray-900 rounded-full overflow-hidden border border-gray-700'>
                <input
                  type='email'
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder='Enter your email'
                  className='flex-1 px-6 py-4 bg-transparent text-white placeholder-gray-400 focus:outline-none'
                  required
                />
                <button
                  type='submit'
                  className='px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold hover:from-blue-600 hover:to-purple-600 transition-all duration-300 transform hover:scale-105'
                >
                  {isSubmitted ? '✓ Subscribed!' : 'Notify Me'}
                </button>
              </div>
            </div>
          </form>
          <p className='text-center text-gray-500 text-sm mt-4'>
            Be the first to know when we launch
          </p>
        </motion.div>

        {/* Features preview */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
          className='grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12'
        >
          {[
            {
              icon: '🤖',
              title: 'AI-Powered',
              description: 'Smart automation for better results',
            },
            {
              icon: '🎯',
              title: 'Precision Targeting',
              description: 'Reach the right audience every time',
            },
            {
              icon: '📈',
              title: 'Maximize ROI',
              description: 'Data-driven optimization',
            },
          ].map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.2 + index * 0.1 }}
              className='relative group'
            >
              <div className='absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-2xl blur-xl group-hover:blur-2xl transition-all'></div>
              <div className='relative bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 hover:border-gray-700 transition-all'>
                <div className='text-4xl mb-3'>{feature.icon}</div>
                <h3 className='text-xl font-semibold text-white mb-2'>
                  {feature.title}
                </h3>
                <p className='text-gray-400 text-sm'>{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Social links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.4 }}
          className='flex gap-6'
        >
          {['Twitter', 'LinkedIn', 'Facebook'].map(social => (
            <a
              key={social}
              href='#'
              className='text-gray-400 hover:text-white transition-colors duration-300'
            >
              <span className='text-sm uppercase tracking-wider'>{social}</span>
            </a>
          ))}
        </motion.div>
      </div>

      <style jsx global>{`
        @keyframes gradient {
          0%,
          100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 5s ease infinite;
        }
      `}</style>
    </div>
  );
}
