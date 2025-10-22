'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

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

  const sectionRef = useRef<HTMLElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

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

  // Reload video when activeStep changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load(); // Reload the video with new source
      setVideoError(false); // Reset error state

      // Try to play the new video
      const playNewVideo = async () => {
        try {
          await videoRef.current!.play();
        } catch (error) {
          console.log('Autoplay prevented for new video:', error);
        }
      };

      // Small delay to ensure video is loaded
      setTimeout(playNewVideo, 100);
    }
  }, [activeStep]);

  const handleStepClick = (stepIndex: number) => {
    setIsUserInteracting(true);
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
          <h2>Powering Every Step of Your Ads in One Seamless Flow.</h2>
          <Link href='/'>
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
        </div>

        <div className='steps_content'>
          <div ref={leftRef} className='steps_left'>
            {stepsData.map((step, index) => (
              <div
                key={step.id}
                className={`step-item ${index === activeStep ? 'active' : ''}`}
                onClick={() => handleStepClick(index)}
              >
                <div className='step-content'>
                  <h3 className='step-title'>{step.title}</h3>
                  <p className='step-description'>{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div ref={rightRef} className='steps_right'>
            <div className='step-image-container'>
              <div
                className='step-video-container'
                onClick={() => {
                  console.log('Video container clicked, attempting to play...');
                  videoRef.current?.play().catch(error => {
                    console.log('Manual play failed:', error);
                  });
                }}
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
                {videoError && (
                  <div className='absolute inset-0 flex items-center justify-center bg-gray-900 text-white rounded-2xl'>
                    <div className='text-center'>
                      <p className='text-lg mb-2'>Video could not load</p>
                      <button
                        onClick={() => {
                          setVideoError(false);
                          videoRef.current?.load();
                        }}
                        className='px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700'
                      >
                        Retry
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
