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

    // Add smooth reveal animations for text elements with enhanced effects
    const textElements = document.querySelectorAll(
      'h1, h2, h3, h4, h5, h6, p, span, div[class*="text"]'
    );
    textElements.forEach((element, index) => {
      if (element.closest('[data-animate]')) return; // Skip if already animated
      if (element.closest('.marquee-item')) return; // Skip testimonial cards
      if (element.closest('.testimonials_section')) return; // Skip entire testimonials section
      if (element.closest('.hero-section')) return; // Skip hero section (handled separately)
      if (element.closest('.steps_section')) return; // Skip steps section (handled separately)

      // Different animation types based on element type
      let animationProps = { y: 30, opacity: 0, scale: 0.95 };
      let toProps = {
        y: 0,
        opacity: 1,
        scale: 1,
        duration: 0.8,
        ease: 'power3.out',
        delay: index * 0.05, // Stagger effect
      };

      // Special animations for headings
      if (element.tagName.match(/^H[1-6]$/)) {
        animationProps = { y: 50, opacity: 0, scale: 0.9 };
        toProps = {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 1,
          ease: 'power3.out',
          delay: index * 0.1,
        };
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

    // Add word-by-word animation for important headings
    const importantHeadings = document.querySelectorAll(
      'h1, h2[class*="heading"], h3[class*="title"]'
    );
    importantHeadings.forEach(heading => {
      if (heading.closest('[data-animate]')) return;
      if (heading.closest('.hero-section')) return;
      if (heading.closest('.steps_section')) return;

      const words = heading.textContent?.split(' ') || [];
      if (words.length > 1) {
        // Wrap each word in a span
        const wrappedText = words
          .map(word => `<span class="word-animate">${word}</span>`)
          .join(' ');
        heading.innerHTML = wrappedText;

        // Animate each word
        const wordSpans = heading.querySelectorAll('.word-animate');
        wordSpans.forEach((word, index) => {
          gsap.fromTo(
            word,
            { y: 30, opacity: 0, rotateX: 90 },
            {
              y: 0,
              opacity: 1,
              rotateX: 0,
              duration: 0.6,
              ease: 'power3.out',
              delay: index * 0.1,
              scrollTrigger: {
                trigger: heading,
                start: 'top 80%',
                end: 'bottom 20%',
                toggleActions: 'play none none reverse',
              },
            }
          );
        });
      }
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

    // Add text reveal animations with different effects
    const revealElements = document.querySelectorAll('[data-reveal]');
    revealElements.forEach(element => {
      const revealType = element.getAttribute('data-reveal') || 'fadeUp';

      let animationProps = { y: 50, opacity: 0 };
      let toProps = { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' };

      switch (revealType) {
        case 'fadeLeft':
          animationProps = { x: -50, opacity: 0 };
          toProps = { x: 0, opacity: 1, duration: 0.8, ease: 'power3.out' };
          break;
        case 'fadeRight':
          animationProps = { x: 50, opacity: 0 };
          toProps = { x: 0, opacity: 1, duration: 0.8, ease: 'power3.out' };
          break;
        case 'fadeScale':
          animationProps = { scale: 0.8, opacity: 0 };
          toProps = {
            scale: 1,
            opacity: 1,
            duration: 0.8,
            ease: 'back.out(1.7)',
          };
          break;
        case 'fadeRotate':
          animationProps = { rotation: -10, opacity: 0, scale: 0.9 };
          toProps = {
            rotation: 0,
            opacity: 1,
            scale: 1,
            duration: 0.8,
            ease: 'power3.out',
          };
          break;
        case 'fadeUp':
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

    // Add typewriter effect for specific elements
    const typewriterElements = document.querySelectorAll('[data-typewriter]');
    typewriterElements.forEach(element => {
      const text = element.textContent || '';
      const speed = parseFloat(
        element.getAttribute('data-typewriter-speed') || '50'
      );

      element.textContent = '';

      gsap.to(element, {
        scrollTrigger: {
          trigger: element,
          start: 'top 80%',
          end: 'bottom 20%',
          toggleActions: 'play none none reverse',
          onEnter: () => {
            let i = 0;
            const timer = setInterval(() => {
              if (i < text.length) {
                element.textContent += text[i];
                i++;
              } else {
                clearInterval(timer);
              }
            }, speed);
          },
        },
      });
    });

    // Add parallax text effects
    const parallaxTextElements = document.querySelectorAll(
      '[data-parallax-text]'
    );
    parallaxTextElements.forEach(element => {
      const speed = parseFloat(
        element.getAttribute('data-parallax-text') || '0.5'
      );

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
