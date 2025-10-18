'use client';

import { useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollSmoother } from 'gsap/ScrollSmoother';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollSmoother, ScrollTrigger);

export default function SmoothScroll({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Initialize smooth scrolling
    const smoother = ScrollSmoother.create({
      wrapper: '#smooth-wrapper',
      content: '#smooth-content',
      smooth: 1.5, // Smoothness factor (0-3, higher = smoother)
      effects: true, // Enable data-speed and data-lag effects
      normalizeScroll: true, // Normalize scroll for different devices
      ignoreMobileResize: true, // Ignore mobile resize events
    });

    // Cleanup on unmount
    return () => {
      smoother.kill();
    };
  }, []);

  return (
    <div id='smooth-wrapper'>
      <div id='smooth-content'>{children}</div>
    </div>
  );
}
