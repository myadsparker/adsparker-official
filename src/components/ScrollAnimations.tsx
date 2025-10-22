'use client';

import { useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function ScrollAnimations() {
  useEffect(() => {
    // Global scroll configuration
    ScrollTrigger.config({
      ignoreMobileResize: true,
      syncInterval: 16, // 60fps
    });

    // Performance optimizations
    ScrollTrigger.defaults({
      scroller: '#smooth-wrapper',
      toggleActions: 'play none none reverse',
    });

    // Add parallax effects to background images
    const parallaxElements = document.querySelectorAll('[data-speed]');
    parallaxElements.forEach(element => {
      const speed = parseFloat(element.getAttribute('data-speed') || '1');

      gsap.to(element, {
        y: () => -ScrollTrigger.maxScroll(window) * speed,
        ease: 'none',
        scrollTrigger: {
          trigger: element,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      });
    });

    // Data-animate animations disabled - all elements are now static

    // Text animations disabled - all text elements are now static

    // Add floating animations to elements with data-float class
    const floatElements = document.querySelectorAll('[data-float]');
    floatElements.forEach(element => {
      const duration = parseFloat(
        element.getAttribute('data-float-duration') || '3'
      );
      const distance = parseFloat(
        element.getAttribute('data-float-distance') || '20'
      );

      gsap.to(element, {
        y: -distance,
        duration: duration,
        ease: 'power2.inOut',
        yoyo: true,
        repeat: -1,
      });
    });

    // Add rotation animations to elements with data-rotate class
    const rotateElements = document.querySelectorAll('[data-rotate]');
    rotateElements.forEach(element => {
      const duration = parseFloat(
        element.getAttribute('data-rotate-duration') || '10'
      );
      const direction =
        element.getAttribute('data-rotate-direction') === 'reverse'
          ? -360
          : 360;

      gsap.to(element, {
        rotation: direction,
        duration: duration,
        ease: 'none',
        repeat: -1,
      });
    });

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  return null;
}
