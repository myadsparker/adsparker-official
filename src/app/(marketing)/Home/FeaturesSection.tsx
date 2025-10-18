'use client';

import { Link } from 'lucide-react';
import Image from 'next/image';
import Globe from '@/components/Globe';
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function FeaturesSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    // Get all feature blocks
    const blockItems = section.querySelectorAll('.block_item');

    // Add intense hover animations to each block
    blockItems.forEach((block, index) => {
      const blockElement = block as HTMLElement;

      // Mouse enter animation - smooth background change and button reveal
      blockElement.addEventListener('mouseenter', () => {
        gsap.to(blockElement, {
          duration: 0.25,
          scale: 1.01,
          y: -6,
          backgroundColor: '#7e52e0',
          color: 'white',
          boxShadow: '0 15px 30px rgba(126, 82, 224, 0.25)',
          ease: 'power2.out',
        });

        // Animate the count numbers
        const countElement = blockElement.querySelector('.count');
        if (countElement) {
          gsap.to(countElement, {
            duration: 0.25,
            scale: 1.05,
            color: 'white',
            ease: 'power2.out',
          });
        }

        // Animate the title
        const titleElement = blockElement.querySelector('h4');
        if (titleElement) {
          gsap.to(titleElement, {
            duration: 0.25,
            y: -1,
            color: 'white',
            ease: 'power2.out',
          });
        }

        // Animate the paragraph
        const paragraphElement = blockElement.querySelector('p');
        if (paragraphElement) {
          gsap.to(paragraphElement, {
            duration: 0.25,
            color: 'rgba(255, 255, 255, 0.9)',
            ease: 'power2.out',
          });
        }

        // Reveal the start trial button
        const buttonElement = blockElement.querySelector('.start-trial-btn');
        if (buttonElement) {
          gsap.to(buttonElement, {
            duration: 0.3,
            opacity: 1,
            visibility: 'visible',
            y: 0,
            ease: 'power2.out',
          });
        }
      });

      // Mouse leave animation - return to normal state
      blockElement.addEventListener('mouseleave', () => {
        gsap.killTweensOf(blockElement);

        gsap.to(blockElement, {
          duration: 0.25,
          scale: 1,
          y: 0,
          backgroundColor: '',
          color: '',
          boxShadow: '',
          ease: 'power2.out',
        });

        // Reset count element
        const countElement = blockElement.querySelector('.count');
        if (countElement) {
          gsap.to(countElement, {
            duration: 0.25,
            scale: 1,
            color: '',
            ease: 'power2.out',
          });
        }

        // Reset title
        const titleElement = blockElement.querySelector('h4');
        if (titleElement) {
          gsap.to(titleElement, {
            duration: 0.25,
            y: 0,
            color: '',
            ease: 'power2.out',
          });
        }

        // Reset paragraph
        const paragraphElement = blockElement.querySelector('p');
        if (paragraphElement) {
          gsap.to(paragraphElement, {
            duration: 0.25,
            color: '',
            ease: 'power2.out',
          });
        }

        // Hide the start trial button
        const buttonElement = blockElement.querySelector('.start-trial-btn');
        if (buttonElement) {
          gsap.to(buttonElement, {
            duration: 0.3,
            opacity: 0,
            visibility: 'hidden',
            y: 15,
            ease: 'power2.out',
          });
        }
      });

      // Add click animation for extra feedback
      blockElement.addEventListener('click', () => {
        gsap.to(blockElement, {
          duration: 0.1,
          scale: 0.95,
          ease: 'power2.out',
          yoyo: true,
          repeat: 1,
        });
      });
    });

    // Add entrance animations for the blocks
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top 80%',
        end: 'bottom 20%',
        toggleActions: 'play none none reverse',
      },
    });

    // Animate first row blocks
    const firstRowBlocks = section.querySelectorAll('.first_row .block_item');
    tl.fromTo(
      firstRowBlocks,
      { y: 50, opacity: 0, scale: 0.9, rotationY: -15 },
      {
        duration: 0.8,
        y: 0,
        opacity: 1,
        scale: 1,
        rotationY: 0,
        ease: 'power3.out',
        stagger: 0.2,
      }
    );

    // Animate second row blocks
    const secondRowBlocks = section.querySelectorAll('.second_row .block_item');
    tl.fromTo(
      secondRowBlocks,
      { y: 50, opacity: 0, scale: 0.9, rotationY: 15 },
      {
        duration: 0.8,
        y: 0,
        opacity: 1,
        scale: 1,
        rotationY: 0,
        ease: 'power3.out',
        stagger: 0.2,
      },
      '-=0.4'
    );

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  return (
    <section ref={sectionRef} className='features_section'>
      <div className='features_section_bg_container'>
        <Image
          src='/images/features_section_bg.png'
          alt='Features Section Background'
          width={1000}
          height={1000}
          className='features_section_bg'
        />
        <div className='container'>
          <div className='blocks_row first_row'>
            <div className='block_item'>
              <h4>Launch Ads in Minutes</h4>
              <p>
                Go from idea to live campaign instantly. AdSparker automates
                setup so you can launch 30x faster than manual methods.
              </p>
              <div className='count'>30X</div>
              <button className='start-trial-btn'>
                Start Free Trial
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  height='15'
                  viewBox='0 0 79 15'
                  fill='none'
                >
                  <path
                    d='M78.1629 8.53792C78.529 8.1718 78.529 7.57821 78.1629 7.21209L72.1967 1.24588C71.8306 0.879764 71.237 0.879764 70.8709 1.24588C70.5048 1.612 70.5048 2.20559 70.8709 2.57171L76.1742 7.87501L70.8709 13.1783C70.5048 13.5444 70.5048 14.138 70.8709 14.5041C71.237 14.8702 71.8306 14.8702 72.1967 14.5041L78.1629 8.53792ZM0 7.875L-8.19589e-08 8.8125L77.5 8.81251L77.5 7.87501L77.5 6.93751L8.19589e-08 6.9375L0 7.875Z'
                    fill='white'
                  ></path>
                </svg>
              </button>
            </div>
            <div className='block_item'>
              <h4>Make Every Dollar Count</h4>
              <p>
                Stop wasting ad spend. Precision AI targeting finds your
                highest-value customers and delivers up to 6x better savings.
              </p>
              <div className='count'>6X</div>
              <button className='start-trial-btn'>
                Start Free Trial
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  height='15'
                  viewBox='0 0 79 15'
                  fill='none'
                >
                  <path
                    d='M78.1629 8.53792C78.529 8.1718 78.529 7.57821 78.1629 7.21209L72.1967 1.24588C71.8306 0.879764 71.237 0.879764 70.8709 1.24588C70.5048 1.612 70.5048 2.20559 70.8709 2.57171L76.1742 7.87501L70.8709 13.1783C70.5048 13.5444 70.5048 14.138 70.8709 14.5041C71.237 14.8702 71.8306 14.8702 72.1967 14.5041L78.1629 8.53792ZM0 7.875L-8.19589e-08 8.8125L77.5 8.81251L77.5 7.87501L77.5 6.93751L8.19589e-08 6.9375L0 7.875Z'
                    fill='white'
                  ></path>
                </svg>
              </button>
            </div>
          </div>
          <div className='blocks_row second_row'>
            <div className='block_item'>
              <h4>Maximize Your ROAS</h4>
              <p>
                Your always-on optimizer works 24/7 to scale profits and deliver
                up to 10.8x higher returns automatically.
              </p>
              <div className='count'>10.8X</div>
              <button className='start-trial-btn'>
                Start Free Trial
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  height='15'
                  viewBox='0 0 79 15'
                  fill='none'
                >
                  <path
                    d='M78.1629 8.53792C78.529 8.1718 78.529 7.57821 78.1629 7.21209L72.1967 1.24588C71.8306 0.879764 71.237 0.879764 70.8709 1.24588C70.5048 1.612 70.5048 2.20559 70.8709 2.57171L76.1742 7.87501L70.8709 13.1783C70.5048 13.5444 70.5048 14.138 70.8709 14.5041C71.237 14.8702 71.8306 14.8702 72.1967 14.5041L78.1629 8.53792ZM0 7.875L-8.19589e-08 8.8125L77.5 8.81251L77.5 7.87501L77.5 6.93751L8.19589e-08 6.9375L0 7.875Z'
                    fill='white'
                  ></path>
                </svg>
              </button>
            </div>
            <div className='block_item'>
              <div>
                <h4>Evergreen Campaigns</h4>
                <p>
                  Set it once and let it run. AdSparker keeps your ads fresh and
                  performing all year — no manual updates needed.
                </p>
              </div>
              <div className='count'>
                365 <span>Days</span>
              </div>
              <button className='start-trial-btn'>
                Start Free Trial
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  height='15'
                  viewBox='0 0 79 15'
                  fill='none'
                >
                  <path
                    d='M78.1629 8.53792C78.529 8.1718 78.529 7.57821 78.1629 7.21209L72.1967 1.24588C71.8306 0.879764 71.237 0.879764 70.8709 1.24588C70.5048 1.612 70.5048 2.20559 70.8709 2.57171L76.1742 7.87501L70.8709 13.1783C70.5048 13.5444 70.5048 14.138 70.8709 14.5041C71.237 14.8702 71.8306 14.8702 72.1967 14.5041L78.1629 8.53792ZM0 7.875L-8.19589e-08 8.8125L77.5 8.81251L77.5 7.87501L77.5 6.93751L8.19589e-08 6.9375L0 7.875Z'
                    fill='white'
                  ></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div
        className='container second_container'
        style={{ paddingTop: '140px', position: 'relative' }}
      >
        <div className='globe_background'>
          <Globe />
        </div>
        <div className='heading_block'>
          <div>
            <h2>
              Advertising <br /> Without Borders
            </h2>
            <p className='description'>
              No limits. No barriers. AdSparker helps your business break
              borders — From local startups to international brands, AdSparker
              makes it effortless to advertise anywhere in the world.
            </p>
          </div>
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
        <div className='stats_row'>
          <div className='stat_item active'>
            <p className='badge'>
              <svg
                width='24'
                height='24'
                viewBox='0 0 24 24'
                fill='none'
                xmlns='http://www.w3.org/2000/svg'
              >
                <path
                  d='M10.7992 7.2001C10.7992 9.18832 9.18744 10.8001 7.19922 10.8001C5.21099 10.8001 3.59922 9.18832 3.59922 7.2001C3.59922 5.21187 5.21099 3.6001 7.19922 3.6001C9.18744 3.6001 10.7992 5.21187 10.7992 7.2001Z'
                  fill='white'
                />
                <path
                  d='M20.3992 7.2001C20.3992 9.18832 18.7874 10.8001 16.7992 10.8001C14.811 10.8001 13.1992 9.18832 13.1992 7.2001C13.1992 5.21187 14.811 3.6001 16.7992 3.6001C18.7874 3.6001 20.3992 5.21187 20.3992 7.2001Z'
                  fill='white'
                />
                <path
                  d='M15.5142 20.4001C15.5702 20.0082 15.5992 19.6075 15.5992 19.2001C15.5992 17.2379 14.9264 15.4328 13.7989 14.003C14.6815 13.4924 15.7062 13.2001 16.7992 13.2001C20.1129 13.2001 22.7992 15.8864 22.7992 19.2001V20.4001H15.5142Z'
                  fill='white'
                />
                <path
                  d='M7.19922 13.2001C10.5129 13.2001 13.1992 15.8864 13.1992 19.2001V20.4001H1.19922V19.2001C1.19922 15.8864 3.88551 13.2001 7.19922 13.2001Z'
                  fill='white'
                />
              </svg>
              Existing users
            </p>
            <p className='count'>214K+</p>
            <p className='description'>
              Serving global clients in over 80 countries.
            </p>
          </div>
          <div className='stat_item'>
            <p className='badge'>
              <svg
                width='24'
                height='24'
                viewBox='0 0 24 24'
                fill='none'
                xmlns='http://www.w3.org/2000/svg'
              >
                <path
                  fill-rule='evenodd'
                  clip-rule='evenodd'
                  d='M21.6 11.9999C21.6 17.3018 17.3019 21.5999 12 21.5999C6.69806 21.5999 2.39999 17.3018 2.39999 11.9999C2.39999 6.69797 6.69806 2.3999 12 2.3999C17.3019 2.3999 21.6 6.69797 21.6 11.9999ZM19.2 11.9999C19.2 13.191 18.9107 14.3146 18.3987 15.3042L16.5692 13.4747C16.719 13.0101 16.8 12.5144 16.8 11.9999C16.8 11.6055 16.7524 11.2223 16.6627 10.8556L18.5381 8.98022C18.9629 9.89856 19.2 10.9215 19.2 11.9999ZM13.0015 16.6953L14.8988 18.5926C14.0119 18.9831 13.0313 19.1999 12 19.1999C10.9216 19.1999 9.89866 18.9628 8.98031 18.538L10.8556 16.6626C11.2224 16.7523 11.6056 16.7999 12 16.7999C12.3434 16.7999 12.6785 16.7638 13.0015 16.6953ZM7.38968 13.3404C7.26619 12.915 7.19999 12.4652 7.19999 11.9999C7.19999 11.6016 7.24851 11.2146 7.33995 10.8446L7.24536 10.9392L5.40733 9.10113C5.0168 9.98802 4.79999 10.9686 4.79999 11.9999C4.79999 13.1445 5.06709 14.2268 5.54236 15.1877L7.38968 13.3404ZM8.69566 5.60123C9.68528 5.08915 10.8089 4.7999 12 4.7999C13.1446 4.7999 14.2269 5.067 15.1878 5.54227L13.3405 7.38958C12.9151 7.2661 12.4653 7.1999 12 7.1999C11.4855 7.1999 10.9898 7.28086 10.5252 7.43074L8.69566 5.60123ZM14.4 11.9999C14.4 13.3254 13.3255 14.3999 12 14.3999C10.6745 14.3999 9.59999 13.3254 9.59999 11.9999C9.59999 10.6744 10.6745 9.5999 12 9.5999C13.3255 9.5999 14.4 10.6744 14.4 11.9999Z'
                  fill='#7E52E0'
                />
              </svg>
              Industries
            </p>
            <p className='count'>40+</p>
            <p className='description'>
              Supporting 40+ industries with tailored ad solutions.
            </p>
          </div>
          <div className='stat_item'>
            <p className='badge'>
              <svg
                width='24'
                height='24'
                viewBox='0 0 24 24'
                fill='none'
                xmlns='http://www.w3.org/2000/svg'
              >
                <path
                  d='M2.40002 4.8001C2.40002 4.13736 2.93728 3.6001 3.60002 3.6001H6.00002C6.66277 3.6001 7.20002 4.13736 7.20002 4.8001V19.2001C7.20002 19.8628 6.66277 20.4001 6.00002 20.4001H3.60002C2.93728 20.4001 2.40002 19.8628 2.40002 19.2001V4.8001Z'
                  fill='#7E52E0'
                />
                <path
                  d='M9.60002 4.8001C9.60002 4.13736 10.1373 3.6001 10.8 3.6001H13.2C13.8628 3.6001 14.4 4.13736 14.4 4.8001V19.2001C14.4 19.8628 13.8628 20.4001 13.2 20.4001H10.8C10.1373 20.4001 9.60002 19.8628 9.60002 19.2001V4.8001Z'
                  fill='#7E52E0'
                />
                <path
                  d='M18 3.6001C17.3373 3.6001 16.8 4.13736 16.8 4.8001V19.2001C16.8 19.8628 17.3373 20.4001 18 20.4001H20.4C21.0628 20.4001 21.6 19.8628 21.6 19.2001V4.8001C21.6 4.13736 21.0628 3.6001 20.4 3.6001H18Z'
                  fill='#7E52E0'
                />
              </svg>
              Total Advertising Spend
            </p>
            <p className='count'>$1.3 M</p>
            <p className='description'>
              Over $1.37M in ads generated using Meta AI tools.
            </p>
          </div>
          <div className='stat_item'>
            <p className='badge'>
              <svg
                width='24'
                height='24'
                viewBox='0 0 24 24'
                fill='none'
                xmlns='http://www.w3.org/2000/svg'
              >
                <path
                  d='M19 7V4C19 3.73478 18.8946 3.48043 18.7071 3.29289C18.5196 3.10536 18.2652 3 18 3H5C4.46957 3 3.96086 3.21071 3.58579 3.58579C3.21071 3.96086 3 4.46957 3 5C3 5.53043 3.21071 6.03914 3.58579 6.41421C3.96086 6.78929 4.46957 7 5 7H20C20.2652 7 20.5196 7.10536 20.7071 7.29289C20.8946 7.48043 21 7.73478 21 8V12M21 12H18C17.4696 12 16.9609 12.2107 16.5858 12.5858C16.2107 12.9609 16 13.4696 16 14C16 14.5304 16.2107 15.0391 16.5858 15.4142C16.9609 15.7893 17.4696 16 18 16H21C21.2652 16 21.5196 15.8946 21.7071 15.7071C21.8946 15.5196 22 15.2652 22 15V13C22 12.7348 21.8946 12.4804 21.7071 12.2929C21.5196 12.1054 21.2652 12 21 12Z'
                  stroke='#7E52E0'
                  stroke-width='2'
                  stroke-linecap='round'
                  stroke-linejoin='round'
                />
                <path
                  d='M3 5V19C3 19.5304 3.21071 20.0391 3.58579 20.4142C3.96086 20.7893 4.46957 21 5 21H20C20.2652 21 20.5196 20.8946 20.7071 20.7071C20.8946 20.5196 21 20.2652 21 20V16'
                  stroke='#7E52E0'
                  stroke-width='2'
                  stroke-linecap='round'
                  stroke-linejoin='round'
                />
              </svg>
              Existing users
            </p>
            <p className='count'>214K+</p>
            <p className='description'>
              Trusted by thousands of advertisers worldwide.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
