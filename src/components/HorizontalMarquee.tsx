'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

export default function HorizontalMarquee() {
  const row1Ref = useRef<HTMLDivElement>(null);
  const row2Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Create truly infinite horizontal marquee animation
    const createMarqueeAnimation = (
      rowRef: React.RefObject<HTMLDivElement | null>,
      direction: 'left' | 'right'
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

      // Calculate the width of one complete set
      const singleSetWidth = originalImages.length * (140 + 20); // image width + gap
      const duration = singleSetWidth / 25; // pixels per second (slower, smoother animation)

      // Kill any existing animations
      gsap.killTweensOf(row);

      if (direction === 'left') {
        // For left animation: continuous flow left
        gsap.set(row, { x: 0 });
        gsap.to(row, {
          x: -singleSetWidth,
          duration: duration,
          ease: 'none',
          repeat: -1,
          onRepeat: () => {
            gsap.set(row, { x: 0 });
          },
        });
      } else {
        // For right animation: continuous flow right
        gsap.set(row, { x: -singleSetWidth });
        gsap.to(row, {
          x: 0,
          duration: duration,
          ease: 'none',
          repeat: -1,
          onRepeat: () => {
            gsap.set(row, { x: -singleSetWidth });
          },
        });
      }
    };

    // Initialize animations with alternating directions
    createMarqueeAnimation(row1Ref, 'left'); // First row goes left
    createMarqueeAnimation(row2Ref, 'right'); // Second row goes right

    // Add hover pause functionality
    const rows = [row1Ref, row2Ref];

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
    <div className='horizontal-marquee-container' style={{ 
      width: '100%', 
      overflow: 'hidden',
      marginTop: '60px',
      padding: '20px 0'
    }}>
      {/* First row - moving left */}
      <div 
        ref={row1Ref}
        className='horizontal-marquee-row'
        style={{
          display: 'flex',
          gap: '20px',
          width: 'fit-content',
          willChange: 'transform'
        }}
      >
        <Image
          src='/images/home-banner/asset-1.png'
          alt='Product 1'
          width={140}
          height={180}
          style={{ flexShrink: 0 }}
        />
        <Image
          src='/images/home-banner/asset-2.png'
          alt='Product 2'
          width={140}
          height={180}
          style={{ flexShrink: 0 }}
        />
        <Image
          src='/images/home-banner/asset-3.png'
          alt='Product 3'
          width={140}
          height={180}
          style={{ flexShrink: 0 }}
        />
        <Image
          src='/images/home-banner/asset-4.png'
          alt='Product 4'
          width={140}
          height={180}
          style={{ flexShrink: 0 }}
        />
        <Image
          src='/images/home-banner/asset-5.png'
          alt='Product 5'
          width={140}
          height={180}
          style={{ flexShrink: 0 }}
        />
        <Image
          src='/images/home-banner/asset-6.png'
          alt='Product 6'
          width={140}
          height={180}
          style={{ flexShrink: 0 }}
        />
        <Image
          src='/images/home-banner/asset-7.png'
          alt='Product 7'
          width={140}
          height={180}
          style={{ flexShrink: 0 }}
        />
        <Image
          src='/images/home-banner/asset-8.png'
          alt='Product 8'
          width={140}
          height={180}
          style={{ flexShrink: 0 }}
        />
      </div>

      {/* Second row - moving right */}
      <div 
        ref={row2Ref}
        className='horizontal-marquee-row'
        style={{
          display: 'flex',
          gap: '20px',
          width: 'fit-content',
          marginTop: '20px',
          willChange: 'transform'
        }}
      >
        <Image
          src='/images/home-banner/asset-9.png'
          alt='Product 9'
          width={140}
          height={180}
          style={{ flexShrink: 0 }}
        />
        <Image
          src='/images/home-banner/asset-10.png'
          alt='Product 10'
          width={140}
          height={180}
          style={{ flexShrink: 0 }}
        />
        <Image
          src='/images/home-banner/asset-11.png'
          alt='Product 11'
          width={140}
          height={180}
          style={{ flexShrink: 0 }}
        />
        <Image
          src='/images/home-banner/asset-12.png'
          alt='Product 12'
          width={140}
          height={180}
          style={{ flexShrink: 0 }}
        />
        <Image
          src='/images/home-banner/asset-13.png'
          alt='Product 13'
          width={140}
          height={180}
          style={{ flexShrink: 0 }}
        />
        <Image
          src='/images/home-banner/asset-1.png'
          alt='Product 1'
          width={140}
          height={180}
          style={{ flexShrink: 0 }}
        />
        <Image
          src='/images/home-banner/asset-2.png'
          alt='Product 2'
          width={140}
          height={180}
          style={{ flexShrink: 0 }}
        />
        <Image
          src='/images/home-banner/asset-3.png'
          alt='Product 3'
          width={140}
          height={180}
          style={{ flexShrink: 0 }}
        />
      </div>
    </div>
  );
}

