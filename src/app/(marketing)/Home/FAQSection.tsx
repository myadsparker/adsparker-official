'use client';

import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Image from 'next/image';

gsap.registerPlugin(ScrollTrigger);

const faqData = [
  {
    id: 1,
    question:
      'What types of products or services can I promote with AdSparker?',
    answer:
      'Any industry or business size—Shopify stores, real estate, online courses, restaurants, clinics, agencies, & more. If you have a website, Facebook Page, or Instagram profile, you can promote it with AdSparker.',
  },
  {
    id: 2,
    question: 'Which countries and regions does AdSparker support?',
    answer:
      'AdSparker supports advertising in over 200 countries and territories worldwide, including all major markets like the US, Canada, UK, Australia, and European Union countries.',
  },
  {
    id: 3,
    question: 'What platforms does AdSparker support?',
    answer:
      'AdSparker currently supports Facebook and Instagram advertising through Meta Ads Manager, with plans to expand to Google Ads and other platforms in the future.',
  },
  {
    id: 4,
    question:
      'Do I need my own Facebook business manager account to use AdSparker?',
    answer:
      "Yes, you need a Facebook Business Manager account to connect with AdSparker. We can help you set one up if you don't have one already.",
  },
  {
    id: 5,
    question: 'How is AdSparker different from other tools?',
    answer:
      'AdSparker uses advanced AI to automatically create, optimize, and manage your ad campaigns. Unlike other tools that require manual setup, AdSparker handles everything from targeting to creative generation.',
  },
  {
    id: 6,
    question: 'How does AdSparker handle ad spend?',
    answer:
      'You maintain full control over your ad spend. AdSparker optimizes your budget allocation across campaigns and audiences to maximize ROI while staying within your specified limits.',
  },
  {
    id: 7,
    question: 'Can I cancel my AdSparker subscription at any time?',
    answer:
      "Yes, you can cancel your subscription at any time. There are no long-term contracts or cancellation fees. You'll retain access to your account until the end of your billing period.",
  },
];

export default function FAQSection() {
  const [openItem, setOpenItem] = useState<number | null>(1); // First item open by default
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const faqItemsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const section = sectionRef.current;
    const heading = headingRef.current;
    const faqItems = faqItemsRef.current;

    if (!section || !heading || !faqItems.length) return;

    // Viewport entrance animations
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top 80%',
        end: 'bottom 20%',
        toggleActions: 'play none none reverse',
      },
    });

    // Animate heading
    tl.fromTo(
      heading,
      { y: 50, opacity: 0 },
      { duration: 0.8, y: 0, opacity: 1, ease: 'power3.out' }
    );

    // Animate FAQ items with stagger and enhanced effects
    tl.fromTo(
      faqItems,
      { y: 30, opacity: 0, scale: 0.95 },
      {
        duration: 0.6,
        y: 0,
        opacity: 1,
        scale: 1,
        ease: 'back.out(1.7)',
        stagger: 0.1,
      },
      '-=0.4'
    );

    // Add hover animations for FAQ items
    faqItems.forEach((item, index) => {
      if (!item) return;

      const itemElement = item as HTMLElement;

      itemElement.addEventListener('mouseenter', () => {
        gsap.to(itemElement, {
          duration: 0.3,
          scale: 1.02,
          y: -5,
          ease: 'power2.out',
        });
      });

      itemElement.addEventListener('mouseleave', () => {
        gsap.to(itemElement, {
          duration: 0.3,
          scale: 1,
          y: 0,
          ease: 'power2.out',
        });
      });
    });

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  const toggleFAQ = (id: number) => {
    setOpenItem(openItem === id ? null : id);
  };

  return (
    <section ref={sectionRef} className='faq_section'>
      <Image
        src='/images/faq-section-bg.png'
        alt='FAQ Section Background'
        width={1000}
        height={1000}
        className='faq_section_bg'
      />
      <div className='container'>
        <div ref={headingRef} className='faq_heading'>
          <div className='emoji_left'>
            <Image
              src='/images/emoji-left.png'
              alt='emoji'
              width={104}
              height={104}
            />
          </div>
          <div className='heading_text'>
            <h2>
              <span className='line1'>Frequently Asked</span>
              <span className='line2'>Questions</span>
            </h2>
            <p>Have another question? Please contact our team!</p>
          </div>
          <div className='emoji_right'>
            <Image
              src='/images/emoji-right.png'
              alt='emoji'
              width={104}
              height={104}
            />
          </div>
        </div>

        <div className='faq_items'>
          {faqData.map((item, index) => (
            <div
              key={item.id}
              ref={el => {
                faqItemsRef.current[index] = el;
              }}
              className={`faq_item ${openItem === item.id ? 'open' : ''}`}
              onClick={() => toggleFAQ(item.id)}
            >
              <div className='faq_question'>
                <h3>{item.question}</h3>
                <div className='faq_icon'>
                  {openItem === item.id ? (
                    <svg
                      width='20'
                      height='20'
                      viewBox='0 0 20 20'
                      fill='none'
                      xmlns='http://www.w3.org/2000/svg'
                    >
                      <path
                        d='M5 12L10 7L15 12'
                        stroke='#E0E0E0'
                        strokeWidth='2'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                      />
                    </svg>
                  ) : (
                    <svg
                      width='20'
                      height='20'
                      viewBox='0 0 20 20'
                      fill='none'
                      xmlns='http://www.w3.org/2000/svg'
                    >
                      <path
                        d='M7 8L10 11L13 8'
                        stroke='#E0E0E0'
                        strokeWidth='2'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                      />
                    </svg>
                  )}
                </div>
              </div>

              {openItem === item.id && (
                <div className='faq_answer'>
                  <p>{item.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
