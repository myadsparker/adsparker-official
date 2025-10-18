'use client';

import React, { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

const Header = () => {
  const headerRef = useRef<HTMLElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const header = headerRef.current;
    const logo = logoRef.current;
    const nav = navRef.current;

    if (!header || !logo || !nav) return;

    // Create scroll trigger for sticky header
    ScrollTrigger.create({
      trigger: header,
      start: 'top -100px',
      end: 'bottom top',
      toggleClass: { targets: header, className: 'header-scrolled' },
      onEnter: () => {
        // Animate header when scrolling down
        gsap.to(header, {
          duration: 0.3,
          y: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          ease: 'power2.out',
        });

        // Scale down logo
        gsap.to(logo, {
          duration: 0.3,
          scale: 0.8,
          ease: 'power2.out',
        });

        // Adjust nav padding
        gsap.to(nav, {
          duration: 0.3,
          padding: '12px 40px',
          ease: 'power2.out',
        });
      },
      onLeave: () => {
        // Animate header when scrolling back up
        gsap.to(header, {
          duration: 0.3,
          y: 0,
          backgroundColor: 'transparent',
          backdropFilter: 'none',
          boxShadow: 'none',
          ease: 'power2.out',
        });

        // Scale up logo
        gsap.to(logo, {
          duration: 0.3,
          scale: 1,
          ease: 'power2.out',
        });

        // Restore nav padding
        gsap.to(nav, {
          duration: 0.3,
          padding: '18px 60px',
          ease: 'power2.out',
        });
      },
    });

    // Initial animation on page load
    gsap.fromTo(
      header,
      { y: -100, opacity: 0 },
      {
        duration: 0.8,
        y: 0,
        opacity: 1,
        ease: 'power3.out',
        delay: 0.2,
      }
    );

    // Animate logo on load
    gsap.fromTo(
      logo,
      { scale: 0, rotation: -10 },
      {
        duration: 0.6,
        scale: 1,
        rotation: 0,
        ease: 'back.out(1.7)',
        delay: 0.4,
      }
    );

    // Animate menu items
    gsap.fromTo(
      '.menu a',
      { y: 20, opacity: 0 },
      {
        duration: 0.5,
        y: 0,
        opacity: 1,
        stagger: 0.1,
        ease: 'power2.out',
        delay: 0.6,
      }
    );

    // Animate CTA buttons
    gsap.fromTo(
      '.cta a',
      { y: 20, opacity: 0 },
      {
        duration: 0.5,
        y: 0,
        opacity: 1,
        stagger: 0.1,
        ease: 'power2.out',
        delay: 0.8,
      }
    );

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  return (
    <header ref={headerRef} className='header-main'>
      <div className='container'>
        <div className='nav' ref={navRef}>
          <Image
            ref={logoRef}
            src='/images/adsparker-logo.png'
            alt='Adsparker Logo'
            width={194}
            height={40}
          />
          <div className='menu'>
            <Link href='/'>Home</Link>
            <Link href='/'>Pricing</Link>
            <Link href='/'>FAQ's</Link>
          </div>
          <div className='cta'>
            <Link href='/' className='sign_in'>
              Sign In
            </Link>
            <Link href='/' className='get_started'>
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
