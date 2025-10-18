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

    // Add fade-in animations for any elements with data-animate class
    const animateElements = document.querySelectorAll('[data-animate]');
    animateElements.forEach(element => {
      const animationType = element.getAttribute('data-animate') || 'fadeInUp';

      let animationProps = { y: 50, opacity: 0 };
      let toProps = { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' };

      switch (animationType) {
        case 'fadeInLeft':
          animationProps = { x: -50, opacity: 0 };
          toProps = { x: 0, opacity: 1, duration: 0.8, ease: 'power3.out' };
          break;
        case 'fadeInRight':
          animationProps = { x: 50, opacity: 0 };
          toProps = { x: 0, opacity: 1, duration: 0.8, ease: 'power3.out' };
          break;
        case 'fadeInScale':
          animationProps = { scale: 0.8, opacity: 0 };
          toProps = {
            scale: 1,
            opacity: 1,
            duration: 0.8,
            ease: 'back.out(1.7)',
          };
          break;
        case 'fadeInUp':
        default:
          break;
      }

      gsap.fromTo(element, animationProps, {
        ...toProps,
        scrollTrigger: {
          trigger: element,
          start: 'top 80%',
          end: 'bottom 20%',
          toggleActions: 'play none none reverse',
        },
      });
    });

    // Add smooth reveal animations for text elements
    const textElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p');
    textElements.forEach(element => {
      if (element.closest('[data-animate]')) return; // Skip if already animated
      if (element.closest('.marquee-item')) return; // Skip testimonial cards
      if (element.closest('.testimonials_section')) return; // Skip entire testimonials section

      gsap.fromTo(
        element,
        { y: 20, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: element,
            start: 'top 85%',
            end: 'bottom 15%',
            toggleActions: 'play none none reverse',
          },
        }
      );
    });

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
