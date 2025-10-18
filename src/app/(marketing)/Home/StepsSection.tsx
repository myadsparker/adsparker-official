'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import { gsap } from 'gsap';

const stepsData = [
  {
    id: 1,
    title: 'Simply Start With Your URL',
    description:
      'Just enter your website URL and AdSparker automatically analyzes your business, audience, and products—setting the foundation for your ad campaigns in seconds.',
    image: '/images/adsparker-022 1.png',
    video: '/images/1.mp4',
  },
  {
    id: 2,
    title: 'Precise Targeting',
    description:
      'Reach the right people at the right time. AdSparker uses advanced data signals and machine learning to match your ads with the most valuable audience.',
    image: '/images/meta.png',
    video: '/images/2.mp4',
  },
  {
    id: 3,
    title: 'Smart Ad Creatives',
    description:
      'AdSparker generates high-performing ad creatives - both copy and visuals - tailored to your audience.',
    image: '/images/logo.png',
    video: '/images/3.mp4',
  },
  {
    id: 4,
    title: 'Continuous Optimization',
    description:
      "Your ads never stop improving. AdSparker tests and refines every element—from creatives to targeting and budgets—scaling what works and replacing what doesn't, so your campaigns grow smarter and more profitable over time.",
    image: '/images/adsparker-logo.png',
    video: '/images/4.mp4',
  },
];

export default function StepsSection() {
  const [activeStep, setActiveStep] = useState(0);
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(false);

  const sectionRef = useRef<HTMLElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 });

  // Note: Video progression is now handled by onEnded event, no automatic timer needed

  // Ensure video plays when component mounts
  useEffect(() => {
    if (videoRef.current) {
      const playVideo = async () => {
        try {
          await videoRef.current!.play();
        } catch (error) {
          console.log('Autoplay prevented:', error);
          // If autoplay fails, try again when user interacts
          const handleUserInteraction = () => {
            videoRef.current?.play().catch(console.log);
            document.removeEventListener('click', handleUserInteraction);
            document.removeEventListener('touchstart', handleUserInteraction);
          };
          document.addEventListener('click', handleUserInteraction);
          document.addEventListener('touchstart', handleUserInteraction);
        }
      };
      playVideo();
    }
  }, []);

  // Smooth video transition when activeStep changes
  useEffect(() => {
    if (videoRef.current && videoContainerRef.current) {
      setIsVideoLoading(true);
      setVideoError(false);

      // Fade out current video
      gsap.to(videoContainerRef.current, {
        opacity: 0,
        scale: 0.95,
        duration: 0.3,
        ease: 'power2.out',
        onComplete: () => {
          // Load new video
          videoRef.current!.load();

          // Wait for video to be ready
          const handleCanPlay = () => {
            setIsVideoLoading(false);
            // Fade in new video
            gsap.to(videoContainerRef.current, {
              opacity: 1,
              scale: 1,
              duration: 0.4,
              ease: 'power2.out',
              onComplete: () => {
                // Try to play the new video
                videoRef.current?.play().catch(error => {
                  console.log('Autoplay prevented for new video:', error);
                });
              },
            });
            videoRef.current?.removeEventListener('canplay', handleCanPlay);
          };

          videoRef.current?.addEventListener('canplay', handleCanPlay);
        },
      });
    }
  }, [activeStep]);

  // GSAP animations for section elements
  useEffect(() => {
    if (isInView) {
      const tl = gsap.timeline();

      // Animate heading
      tl.fromTo(
        '.steps-heading',
        { y: 50, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }
      );

      // Animate CTA button
      tl.fromTo(
        '.steps-cta',
        { y: 30, opacity: 0, scale: 0.9 },
        { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.7)' },
        '-=0.4'
      );

      // Animate step items with stagger
      tl.fromTo(
        '.step-item',
        { x: -50, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.6,
          ease: 'power2.out',
          stagger: 0.1,
        },
        '-=0.2'
      );

      // Animate video container
      tl.fromTo(
        '.steps-right',
        { x: 50, opacity: 0, scale: 0.9 },
        { x: 0, opacity: 1, scale: 1, duration: 0.8, ease: 'power3.out' },
        '-=0.4'
      );
    }
  }, [isInView]);

  const handleStepClick = (stepIndex: number) => {
    setIsUserInteracting(true);

    // Animate step transition
    if (leftRef.current) {
      const stepItems = leftRef.current.querySelectorAll('.step-item');
      stepItems.forEach((item, index) => {
        gsap.to(item, {
          scale: index === stepIndex ? 1.02 : 1,
          duration: 0.3,
          ease: 'power2.out',
        });
      });
    }

    setActiveStep(stepIndex);

    // Reset user interaction after 10 seconds to allow automatic progression again
    setTimeout(() => {
      setIsUserInteracting(false);
    }, 10000);
  };

  return (
    <section ref={sectionRef} className='steps_section'>
      <div className='container'>
        <div className='heading_block'>
          <h2 className='steps-heading'>
            Powering Every Step of Your Ads in One Seamless Flow.
          </h2>
          <motion.div
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <Link href='/' className='steps-cta'>
              Generate Ads
              <svg
                width='20'
                height='20'
                viewBox='0 0 20 20'
                fill='none'
                xmlns='http://www.w3.org/2000/svg'
              >
                <path
                  d='M15 6.6665L18.3333 9.99984L15 13.3332'
                  stroke='white'
                  strokeWidth='2'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                />
                <path
                  d='M1.66602 10H18.3327'
                  stroke='white'
                  strokeWidth='2'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                />
              </svg>
            </Link>
          </motion.div>
        </div>

        <div className='steps_content'>
          <div ref={leftRef} className='steps_left'>
            {stepsData.map((step, index) => (
              <motion.div
                key={step.id}
                className={`step-item ${index === activeStep ? 'active' : ''}`}
                onClick={() => handleStepClick(index)}
                whileHover={{
                  scale: 1.02,
                  x: 10,
                  transition: { type: 'spring', stiffness: 300, damping: 20 },
                }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <div className='step-content'>
                  <h3 className='step-title'>{step.title}</h3>
                  <p className='step-description'>{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div ref={rightRef} className='steps_right'>
            <div className='step-image-container'>
              <motion.div
                ref={videoContainerRef}
                className='step-video-container'
                onClick={() => {
                  console.log('Video container clicked, attempting to play...');
                  videoRef.current?.play().catch(error => {
                    console.log('Manual play failed:', error);
                  });
                }}
                whileHover={{ scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <video
                  ref={videoRef}
                  className='step-video'
                  width='100%'
                  height='100%'
                  autoPlay
                  muted
                  playsInline
                  preload='metadata'
                  onLoadedData={() => {
                    console.log('Video loaded, attempting to play...');
                    videoRef.current?.play().catch(error => {
                      console.log('Video play failed:', error);
                    });
                  }}
                  onCanPlay={() => {
                    console.log('Video can play, attempting to play...');
                    videoRef.current?.play().catch(error => {
                      console.log('Video play failed on canPlay:', error);
                    });
                  }}
                  onEnded={() => {
                    console.log('Video ended, moving to next step...');
                    setActiveStep(current => (current + 1) % stepsData.length);
                  }}
                  onError={e => {
                    console.log('Video error:', e);
                    setVideoError(true);
                  }}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: '20px',
                    border: 'none',
                  }}
                >
                  <source
                    src={stepsData[activeStep]?.video || '/images/1.mp4'}
                    type='video/mp4'
                  />
                  Your browser does not support the video tag.
                </video>

                {/* Loading overlay */}
                {isVideoLoading && (
                  <motion.div
                    className='absolute inset-0 flex items-center justify-center bg-gray-900/80 text-white rounded-2xl'
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <div className='text-center'>
                      <div className='w-8 h-8 border-2 border-white/40 border-t-white rounded-full animate-spin mx-auto mb-2'></div>
                      <p className='text-sm'>Loading video...</p>
                    </div>
                  </motion.div>
                )}

                {videoError && (
                  <motion.div
                    className='absolute inset-0 flex items-center justify-center bg-gray-900 text-white rounded-2xl'
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    <div className='text-center'>
                      <p className='text-lg mb-2'>Video could not load</p>
                      <motion.button
                        onClick={() => {
                          setVideoError(false);
                          videoRef.current?.load();
                        }}
                        className='px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700'
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Retry
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
