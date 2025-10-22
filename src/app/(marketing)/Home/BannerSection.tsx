'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function BannerSection() {
  const row1Ref = useRef<HTMLDivElement>(null);
  const row2Ref = useRef<HTMLDivElement>(null);
  const row3Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Create truly infinite marquee animation for each column
    const createMarqueeAnimation = (
      rowRef: React.RefObject<HTMLDivElement | null>,
      direction: 'up' | 'down'
    ) => {
      if (!rowRef.current) return;

      const row = rowRef.current;

      // Remove any existing clones to prevent accumulation
      const existingClones = row.querySelectorAll('.clone');
      existingClones.forEach(clone => clone.remove());

      const images = row.querySelectorAll('img');
      const originalImages = Array.from(images);

      // Create clones for seamless loop (duplicate the entire set)
      originalImages.forEach(img => {
        const clone = img.cloneNode(true) as HTMLImageElement;
        clone.classList.add('clone');
        row.appendChild(clone);
      });

      // Calculate the height of one complete set
      const singleSetHeight = originalImages.length * (120 + 15); // image height + gap
      const duration = singleSetHeight / 60; // pixels per second

      // Kill any existing animations
      gsap.killTweensOf(row);

      if (direction === 'up') {
        // For upward animation: continuous flow upward
        gsap.set(row, { y: 0 });
        gsap.to(row, {
          y: -singleSetHeight,
          duration: duration,
          ease: 'none',
          repeat: -1,
          onRepeat: () => {
            gsap.set(row, { y: 0 });
          },
        });
      } else {
        // For downward animation: continuous flow downward
        gsap.set(row, { y: -singleSetHeight });
        gsap.to(row, {
          y: 0,
          duration: duration,
          ease: 'none',
          repeat: -1,
          onRepeat: () => {
            gsap.set(row, { y: -singleSetHeight });
          },
        });
      }
    };

    // Initialize animations with alternating directions
    createMarqueeAnimation(row1Ref, 'up'); // First column goes up
    createMarqueeAnimation(row2Ref, 'down'); // Second column goes down
    createMarqueeAnimation(row3Ref, 'up'); // Third column goes up

    // Add hover pause functionality
    const rows = [row1Ref, row2Ref, row3Ref];

    rows.forEach(rowRef => {
      if (!rowRef.current) return;

      const pauseAnimation = () => {
        const tween = gsap.getTweensOf(rowRef.current)[0];
        if (tween) tween.pause();
      };

      const resumeAnimation = () => {
        const tween = gsap.getTweensOf(rowRef.current)[0];
        if (tween) tween.play();
      };

      rowRef.current.addEventListener('mouseenter', pauseAnimation);
      rowRef.current.addEventListener('mouseleave', resumeAnimation);
    });

    return () => {
      // Cleanup
      rows.forEach(rowRef => {
        if (rowRef.current) {
          gsap.killTweensOf(rowRef.current);
        }
      });
    };
  }, []);

  return (
    <>
      <section className='home_banner'>
        <div className='container'>
          <div className='grid_row'>
            <div className='content_left'>
              <div className='badge'>
                <svg
                  width='16'
                  height='16'
                  viewBox='0 0 16 16'
                  fill='none'
                  xmlns='http://www.w3.org/2000/svg'
                >
                  <path
                    d='M13.0006 9C13.0019 9.20386 12.9399 9.40311 12.8233 9.57033C12.7067 9.73754 12.5411 9.86451 12.3493 9.93375L9.12559 11.125L7.93809 14.3512C7.86777 14.5423 7.74053 14.7072 7.57356 14.8236C7.40659 14.9401 7.20791 15.0025 7.00434 15.0025C6.80076 15.0025 6.60208 14.9401 6.43511 14.8236C6.26814 14.7072 6.14091 14.5423 6.07059 14.3512L4.87559 11.125L1.64934 9.9375C1.45829 9.86718 1.29342 9.73995 1.17695 9.57298C1.06049 9.406 0.998047 9.20733 0.998047 9.00375C0.998047 8.80017 1.06049 8.6015 1.17695 8.43452C1.29342 8.26755 1.45829 8.14032 1.64934 8.07L4.87559 6.875L6.06309 3.64875C6.13341 3.45771 6.26064 3.29283 6.42761 3.17637C6.59458 3.0599 6.79326 2.99746 6.99684 2.99746C7.20041 2.99746 7.39909 3.0599 7.56606 3.17637C7.73303 3.29283 7.86027 3.45771 7.93059 3.64875L9.12559 6.875L12.3518 8.0625C12.5437 8.13237 12.7092 8.26008 12.8254 8.42801C12.9416 8.59594 13.0028 8.7958 13.0006 9ZM9.50059 3H10.5006V4C10.5006 4.13261 10.5533 4.25979 10.647 4.35355C10.7408 4.44732 10.868 4.5 11.0006 4.5C11.1332 4.5 11.2604 4.44732 11.3541 4.35355C11.4479 4.25979 11.5006 4.13261 11.5006 4V3H12.5006C12.6332 3 12.7604 2.94732 12.8541 2.85355C12.9479 2.75979 13.0006 2.63261 13.0006 2.5C13.0006 2.36739 12.9479 2.24021 12.8541 2.14645C12.7604 2.05268 12.6332 2 12.5006 2H11.5006V1C11.5006 0.867392 11.4479 0.740215 11.3541 0.646447C11.2604 0.552678 11.1332 0.5 11.0006 0.5C10.868 0.5 10.7408 0.552678 10.647 0.646447C10.5533 0.740215 10.5006 0.867392 10.5006 1V2H9.50059C9.36798 2 9.2408 2.05268 9.14703 2.14645C9.05327 2.24021 9.00059 2.36739 9.00059 2.5C9.00059 2.63261 9.05327 2.75979 9.14703 2.85355C9.2408 2.94732 9.36798 3 9.50059 3ZM15.0006 5H14.5006V4.5C14.5006 4.36739 14.4479 4.24021 14.3541 4.14645C14.2604 4.05268 14.1332 4 14.0006 4C13.868 4 13.7408 4.05268 13.647 4.14645C13.5533 4.24021 13.5006 4.36739 13.5006 4.5V5H13.0006C12.868 5 12.7408 5.05268 12.647 5.14645C12.5533 5.24021 12.5006 5.36739 12.5006 5.5C12.5006 5.63261 12.5533 5.75979 12.647 5.85355C12.7408 5.94732 12.868 6 13.0006 6H13.5006V6.5C13.5006 6.63261 13.5533 6.75979 13.647 6.85355C13.7408 6.94732 13.868 7 14.0006 7C14.1332 7 14.2604 6.94732 14.3541 6.85355C14.4479 6.75979 14.5006 6.63261 14.5006 6.5V6H15.0006C15.1332 6 15.2604 5.94732 15.3541 5.85355C15.4479 5.75979 15.5006 5.63261 15.5006 5.5C15.5006 5.36739 15.4479 5.24021 15.3541 5.14645C15.2604 5.05268 15.1332 5 15.0006 5Z'
                    fill='#7E35E5'
                  />
                </svg>
                AI Handles Everything
              </div>
              <h1>
                Meta Ads in
                <span>
                  Minutes
                  <svg
                    width='308'
                    height='105'
                    viewBox='0 0 308 105'
                    fill='none'
                    xmlns='http://www.w3.org/2000/svg'
                  >
                    <rect
                      x='0.509916'
                      y='0.489714'
                      width='296.293'
                      height='89.6101'
                      transform='matrix(0.999792 -0.0203708 0.0200397 0.999799 4.45709 10.6133)'
                      fill='#8C40F5'
                      fill-opacity='0.15'
                      stroke='#8C40F5'
                    />
                    <rect
                      width='8.79603'
                      height='7.02404'
                      transform='matrix(0.999792 -0.0203708 0.0200397 0.999799 298.268 91.03)'
                      fill='#8C40F5'
                    />
                    <rect
                      width='8.79603'
                      height='7.02404'
                      transform='matrix(0.999792 -0.0203708 0.0200397 0.999799 1.80273 97.0706)'
                      fill='#8C40F5'
                    />
                    <rect
                      width='8.79603'
                      height='7.02404'
                      transform='matrix(0.999792 -0.0203708 0.0200397 0.999799 296.469 1.14062)'
                      fill='#8C40F5'
                    />
                    <rect
                      width='8.79603'
                      height='7.02404'
                      transform='matrix(0.999792 -0.0203708 0.0200397 0.999799 0 7.18115)'
                      fill='#8C40F5'
                    />
                  </svg>
                </span>
              </h1>
              <p className='description'>
                Create Facebook and Instagram ads powered by AI — from targeting
                to optimization, everything's handled for you. No wasted spend,
                no manual effort.
              </p>
              <a href='#' className='cta'>
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
                    stroke-width='2'
                    stroke-linecap='round'
                    stroke-linejoin='round'
                  />
                  <path
                    d='M1.66602 10H18.3327'
                    stroke='white'
                    stroke-width='2'
                    stroke-linecap='round'
                    stroke-linejoin='round'
                  />
                </svg>
              </a>

              <div className='features_extra'>
                <p>
                  Finally, ads that work while you sleep - no guesswork, no
                  stress.
                </p>
                <div className='row'>
                  <div className='feature'>
                    <svg
                      width='20'
                      height='20'
                      viewBox='0 0 20 20'
                      fill='none'
                      xmlns='http://www.w3.org/2000/svg'
                    >
                      <g clip-path='url(#clip0_463_2150)'>
                        <path
                          d='M9.99935 18.3332C14.6017 18.3332 18.3327 14.6022 18.3327 9.99984C18.3327 5.39746 14.6017 1.6665 9.99935 1.6665C5.39698 1.6665 1.66602 5.39746 1.66602 9.99984C1.66602 14.6022 5.39698 18.3332 9.99935 18.3332Z'
                          stroke='white'
                          stroke-width='1.5'
                          stroke-linecap='round'
                          stroke-linejoin='round'
                        />
                        <path
                          d='M18.3333 10H15'
                          stroke='white'
                          stroke-width='1.5'
                          stroke-linecap='round'
                          stroke-linejoin='round'
                        />
                        <path
                          d='M4.99935 10H1.66602'
                          stroke='white'
                          stroke-width='1.5'
                          stroke-linecap='round'
                          stroke-linejoin='round'
                        />
                        <path
                          d='M10 4.99984V1.6665'
                          stroke='white'
                          stroke-width='1.5'
                          stroke-linecap='round'
                          stroke-linejoin='round'
                        />
                        <path
                          d='M10 18.3333V15'
                          stroke='white'
                          stroke-width='1.5'
                          stroke-linecap='round'
                          stroke-linejoin='round'
                        />
                      </g>
                      <defs>
                        <clipPath id='clip0_463_2150'>
                          <rect width='20' height='20' fill='white' />
                        </clipPath>
                      </defs>
                    </svg>
                    Auto Targeting
                  </div>
                  <div className='feature'>
                    <svg
                      width='20'
                      height='20'
                      viewBox='0 0 20 20'
                      fill='none'
                      xmlns='http://www.w3.org/2000/svg'
                    >
                      <path
                        d='M12.5007 1.6665H5.00065C4.55862 1.6665 4.1347 1.8421 3.82214 2.15466C3.50958 2.46722 3.33398 2.89114 3.33398 3.33317V16.6665C3.33398 17.1085 3.50958 17.5325 3.82214 17.845C4.1347 18.1576 4.55862 18.3332 5.00065 18.3332H15.0006C15.4427 18.3332 15.8666 18.1576 16.1792 17.845C16.4917 17.5325 16.6673 17.1085 16.6673 16.6665V5.83317L12.5007 1.6665Z'
                        stroke='white'
                        stroke-width='1.5'
                        stroke-linecap='round'
                        stroke-linejoin='round'
                      />
                      <path
                        d='M11.666 1.6665V4.99984C11.666 5.44186 11.8416 5.86579 12.1542 6.17835C12.4667 6.49091 12.8907 6.6665 13.3327 6.6665H16.666'
                        stroke='white'
                        stroke-width='1.5'
                        stroke-linecap='round'
                        stroke-linejoin='round'
                      />
                      <path
                        d='M8.33268 7.5H6.66602'
                        stroke='white'
                        stroke-width='1.5'
                        stroke-linecap='round'
                        stroke-linejoin='round'
                      />
                      <path
                        d='M13.3327 10.8335H6.66602'
                        stroke='white'
                        stroke-width='1.5'
                        stroke-linecap='round'
                        stroke-linejoin='round'
                      />
                      <path
                        d='M13.3327 14.1665H6.66602'
                        stroke='white'
                        stroke-width='1.5'
                        stroke-linecap='round'
                        stroke-linejoin='round'
                      />
                    </svg>
                    AI Ad Copy
                  </div>
                  <div className='feature'>
                    <svg
                      width='20'
                      height='20'
                      viewBox='0 0 20 20'
                      fill='none'
                      xmlns='http://www.w3.org/2000/svg'
                    >
                      <path
                        d='M12.5007 1.6665H5.00065C4.55862 1.6665 4.1347 1.8421 3.82214 2.15466C3.50958 2.46722 3.33398 2.89114 3.33398 3.33317V16.6665C3.33398 17.1085 3.50958 17.5325 3.82214 17.845C4.1347 18.1576 4.55862 18.3332 5.00065 18.3332H15.0006C15.4427 18.3332 15.8666 18.1576 16.1792 17.845C16.4917 17.5325 16.6673 17.1085 16.6673 16.6665V5.83317L12.5007 1.6665Z'
                        stroke='white'
                        stroke-width='1.5'
                        stroke-linecap='round'
                        stroke-linejoin='round'
                      />
                      <path
                        d='M11.666 1.6665V4.99984C11.666 5.44186 11.8416 5.86579 12.1542 6.17835C12.4667 6.49091 12.8907 6.6665 13.3327 6.6665H16.666'
                        stroke='white'
                        stroke-width='1.5'
                        stroke-linecap='round'
                        stroke-linejoin='round'
                      />
                      <path
                        d='M8.33268 7.5H6.66602'
                        stroke='white'
                        stroke-width='1.5'
                        stroke-linecap='round'
                        stroke-linejoin='round'
                      />
                      <path
                        d='M13.3327 10.8335H6.66602'
                        stroke='white'
                        stroke-width='1.5'
                        stroke-linecap='round'
                        stroke-linejoin='round'
                      />
                      <path
                        d='M13.3327 14.1665H6.66602'
                        stroke='white'
                        stroke-width='1.5'
                        stroke-linecap='round'
                        stroke-linejoin='round'
                      />
                    </svg>
                    AI Crafted Visuals
                  </div>
                  <div className='feature'>
                    <svg
                      width='20'
                      height='20'
                      viewBox='0 0 20 20'
                      fill='none'
                      xmlns='http://www.w3.org/2000/svg'
                    >
                      <path
                        d='M2.5 2.5V15.8333C2.5 16.2754 2.67559 16.6993 2.98816 17.0118C3.30072 17.3244 3.72464 17.5 4.16667 17.5H17.5'
                        stroke='white'
                        stroke-width='1.5'
                        stroke-linecap='round'
                        stroke-linejoin='round'
                      />
                      <path
                        d='M15.834 7.5L11.6673 11.6667L8.33398 8.33333L5.83398 10.8333'
                        stroke='white'
                        stroke-width='1.5'
                        stroke-linecap='round'
                        stroke-linejoin='round'
                      />
                    </svg>
                    Smart Optimization
                  </div>
                </div>
              </div>
            </div>
            <div className='content_right'>
              <div className='product_marquee_container'>
                <div className='row' ref={row1Ref}>
                  <Image
                    src='/images/home-banner/asset-1.png'
                    alt='Product 1'
                    width={140}
                    height={180}
                  />
                  <Image
                    src='/images/home-banner/asset-2.png'
                    alt='Product 2'
                    width={140}
                    height={180}
                  />
                  <Image
                    src='/images/home-banner/asset-3.png'
                    alt='Product 3'
                    width={140}
                    height={180}
                  />
                  <Image
                    src='/images/home-banner/asset-4.png'
                    alt='Product 3'
                    width={140}
                    height={180}
                  />
                  <Image
                    src='/images/home-banner/asset-5.png'
                    alt='Product 3'
                    width={140}
                    height={180}
                  />
                  <Image
                    src='/images/home-banner/asset-6.png'
                    alt='Product 3'
                    width={140}
                    height={180}
                  />
                </div>
                <div className='row' ref={row2Ref}>
                  <Image
                    src='/images/home-banner/asset-1.png'
                    alt='Product 1'
                    width={140}
                    height={180}
                  />
                  <Image
                    src='/images/home-banner/asset-2.png'
                    alt='Product 2'
                    width={140}
                    height={180}
                  />
                  <Image
                    src='/images/home-banner/asset-3.png'
                    alt='Product 3'
                    width={140}
                    height={180}
                  />
                  <Image
                    src='/images/home-banner/asset-4.png'
                    alt='Product 3'
                    width={140}
                    height={180}
                  />
                  <Image
                    src='/images/home-banner/asset-5.png'
                    alt='Product 3'
                    width={140}
                    height={180}
                  />
                  <Image
                    src='/images/home-banner/asset-6.png'
                    alt='Product 3'
                    width={140}
                    height={180}
                  />
                </div>
                <div className='row' ref={row3Ref}>
                  <Image
                    src='/images/home-banner/asset-1.png'
                    alt='Product 1'
                    width={140}
                    height={180}
                  />
                  <Image
                    src='/images/home-banner/asset-2.png'
                    alt='Product 2'
                    width={140}
                    height={180}
                  />
                  <Image
                    src='/images/home-banner/asset-3.png'
                    alt='Product 3'
                    width={140}
                    height={180}
                  />
                  <Image
                    src='/images/home-banner/asset-4.png'
                    alt='Product 3'
                    width={140}
                    height={180}
                  />
                  <Image
                    src='/images/home-banner/asset-5.png'
                    alt='Product 3'
                    width={140}
                    height={180}
                  />
                  <Image
                    src='/images/home-banner/asset-6.png'
                    alt='Product 3'
                    width={140}
                    height={180}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <Image
          className='banner_bg'
          src='/images/home-banner-bg.png'
          alt='Banner Image'
          width={1000}
          height={1000}
        />
      </section>
      <section className='partner_section'>
        <div className='container'>
          <p>
            Built for small businesses, startups, and e-commerce brands ready to
            scale.
          </p>

          <div className='partner_logos'>
            <div className='partner_logo'>
              <Image
                src='/images/adsparker-logo-grey.png'
                alt='Adsparker'
                width={100}
                height={100}
              />
            </div>
            <div className='partner_logo'>
              <Image
                src='/images/adsparker-logo-grey.png'
                alt='Adsparker'
                width={100}
                height={100}
              />
            </div>
            <div className='partner_logo'>
              <Image
                src='/images/adsparker-logo-grey.png'
                alt='Adsparker'
                width={100}
                height={100}
              />
            </div>
            <div className='partner_logo'>
              <Image
                src='/images/adsparker-logo-grey.png'
                alt='Adsparker'
                width={100}
                height={100}
              />
            </div>
            <div className='partner_logo'>
              <Image
                src='/images/adsparker-logo-grey.png'
                alt='Adsparker'
                width={100}
                height={100}
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
