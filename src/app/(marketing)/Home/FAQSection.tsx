'use client';

import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './FAQSection.css';
import Image from 'next/image';
import ContactUsModal from '@/components/ContactUsModal';

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
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const faqItemsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const section = sectionRef.current;
    const faqItems = faqItemsRef.current;

    if (!section || !faqItems.length) return;

    // Viewport entrance animations
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top 80%',
        end: 'bottom 20%',
        toggleActions: 'play none none reverse',
      },
    });

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

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  const toggleFAQ = (id: number) => {
    setOpenItem(openItem === id ? null : id);
  };

  return (
    <section id='faq' ref={sectionRef} className='faq-section'>
      <Image
        src='/images/faq-section-bg.png'
        alt='FAQ Section Background'
        width={1000}
        height={1000}
        className='faq-section-bg'
      />
      {/* Decorative elements */}
      <div className='faq-decorative-circle-1'></div>
      <div className='faq-decorative-circle-2'></div>

      <div className='faq-container'>
        {/* Two-column FAQ layout */}
        <div className='faq-content-wrapper'>
          {/* Left Column - Question Prompt Box */}
          <div className='faq-left-column'>
            <div className='faq-question-box'>
              <div>
                <h3 className='faq-question-title'>Have other questions?</h3>
                <p className='faq-question-text'>We're here to help!</p>
              </div>
              <div className='faq-icon-button'>
                <button 
                  className='faq-contact-button'
                  onClick={() => setIsContactModalOpen(true)}
                >
                  <svg
                    width='20'
                    height='20'
                    viewBox='0 0 20 20'
                    fill='none'
                    xmlns='http://www.w3.org/2000/svg'
                    className='faq-contact-icon'
                  >
                    <path
                      d='M4.16675 15.8334L15.8334 4.16675M15.8334 4.16675H4.16675M15.8334 4.16675V15.8334'
                      stroke='currentColor'
                      strokeWidth='2'
                      strokeLinecap='round'
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - FAQ List */}
          <div className='faq-right-column'>
            {faqData.map((item, index) => (
              <div
                key={item.id}
                ref={el => {
                  faqItemsRef.current[index] = el;
                }}
                className={`faq-item ${openItem === item.id ? 'open' : ''}`}
                onClick={() => toggleFAQ(item.id)}
              >
                <div className='faq-item-header'>
                  <h3 className='faq-item-question'>{item.question}</h3>
                  <div className='faq-item-icon'>
                    <svg
                      width='14'
                      height='14'
                      viewBox='0 0 14 14'
                      fill='none'
                      xmlns='http://www.w3.org/2000/svg'
                      className={`faq-icon-svg ${openItem === item.id ? 'faq-icon-rotated' : ''}`}
                    >
                      <path
                        d='M1 1L13 13M13 13V5M13 13H5'
                        stroke='#767693'
                        strokeWidth='2'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                      />
                    </svg>
                  </div>
                </div>

                {openItem === item.id && (
                  <div className='faq-item-answer'>
                    <p className='faq-item-answer-text'>{item.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      <ContactUsModal 
        isOpen={isContactModalOpen} 
        onClose={() => setIsContactModalOpen(false)} 
      />
    </section>
  );
}
