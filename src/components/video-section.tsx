'use client';

import React, { useState, useRef, useEffect } from 'react';
import ReactPlayer from 'react-player';

export default function VideoSection() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    // Try to play video after component mounts
    const timer = setTimeout(() => {
      if (!hasUserInteracted) {
        setIsPlaying(true);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [hasUserInteracted]);

  const handleUserInteraction = () => {
    setHasUserInteracted(true);
    setIsPlaying(true);
  };

  return (
    <section className='py-20 bg-gray-50'>
      <div className='container mx-auto px-4'>
        <div className='max-w-4xl mx-auto text-center'>
          <h2 className='text-4xl font-bold text-gray-900 mb-6'>
            See AdSparker in Action
          </h2>
          <p className='text-xl text-gray-600 mb-12'>
            Watch how our AI-powered platform transforms your business into
            high-converting ad campaigns
          </p>

          <div className='relative rounded-2xl overflow-hidden shadow-2xl'>
            <div
              style={{ width: '100%', height: 'auto' }}
              onClick={handleUserInteraction}
              onTouchStart={handleUserInteraction}
            >
              {!useFallback ? (
                <ReactPlayer
                  ref={playerRef}
                  {...({
                    url: '/images/4.mp4',
                    width: '100%',
                    height: 'auto',
                    playing: isPlaying,
                    muted: true,
                    loop: true,
                    controls: true,
                    playsinline: true,
                    onReady: () => {
                      console.log('Video ready - attempting to play');
                      if (!hasUserInteracted) {
                        setIsPlaying(true);
                      }
                    },
                    onError: (error: any) => {
                      console.error('Video error:', error);
                      console.log('Video URL:', '/images/4.mp4');
                      setUseFallback(true);
                    },
                    onPlay: () => {
                      console.log('Video is now playing');
                      setIsPlaying(true);
                    },
                    onPause: () => {
                      console.log('Video paused');
                      setIsPlaying(false);
                    },
                    onStart: () => {
                      console.log('Video started');
                    },
                  } as any)}
                />
              ) : (
                <video
                  width='100%'
                  height='auto'
                  controls
                  muted
                  loop
                  playsInline
                  autoPlay={isPlaying}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onError={e => {
                    console.error('Fallback video error:', e);
                  }}
                  style={{
                    width: '100%',
                    height: 'auto',
                    objectFit: 'cover',
                  }}
                >
                  <source src='/images/4.mp4' type='video/mp4' />
                  Your browser does not support the video tag.
                </video>
              )}
            </div>

            {!isPlaying && (
              <div
                className='absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 cursor-pointer'
                onClick={handleUserInteraction}
              >
                <div className='text-white text-center'>
                  <div className='w-16 h-16 mx-auto mb-4 bg-white bg-opacity-20 rounded-full flex items-center justify-center'>
                    <svg
                      className='w-8 h-8 ml-1'
                      fill='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path d='M8 5v14l11-7z' />
                    </svg>
                  </div>
                  <p className='text-lg font-semibold'>Click to play video</p>
                </div>
              </div>
            )}
          </div>

          <div className='mt-8'>
            <p className='text-lg text-gray-700'>
              Experience the power of automated ad generation and optimization
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
