'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';

const testimonials = [
  {
    id: 1,
    name: 'Daniel.y',
    title: 'New Store Owner',
    quote:
      'AdSparker got my new store its first 2 orders in just 48 hours. An absolutely incredible start for any new business!',
  },
  {
    id: 2,
    name: 'Joe',
    title: 'Education Organization',
    quote:
      'AdSparker solved our biggest challenge by taking the guesswork out of targeting. We started driving high-quality traffic to our programs from day one.',
  },
  {
    id: 3,
    name: 'Jay',
    title: 'Cleaning Service',
    quote:
      "I don't have time to manage ads, so AdSparker does it for me. It automatically delivers qualified leads, letting me focus on converting them into customers.",
  },
  {
    id: 4,
    name: 'Augon',
    title: 'E-book Store Owner',
    quote:
      "With AdSparker, we tested over 50 e-books in a single week to find our bestsellers. It's the ultimate tool for rapid product validation.",
  },
  {
    id: 5,
    name: 'Elle',
    title: 'Freelance Marketer',
    quote:
      'AdSparker is my secret weapon for client work. It provides professional-grade audience research that helps me deliver confident, data-backed campaigns.',
  },
  {
    id: 6,
    name: 'Desi',
    title: 'Agency Owner',
    quote:
      "As an agency owner, AdSparker's versatility is a huge asset. It works seamlessly across clients in different industries, making my entire portfolio easier to manage.",
  },
  {
    id: 7,
    name: 'Sarah',
    title: 'Fitness Coach',
    quote:
      'The AI-generated creatives are so professional and engaging. My conversion rates have improved by 40% since using AdSparker.',
  },
  {
    id: 8,
    name: 'Mike',
    title: 'SaaS Founder',
    quote:
      'AdSparker saved me hours of work every week. The automated optimization features are incredible - it finds the best performing ads automatically.',
  },
];

export default function TestimonialsSection() {
  const headingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const heading = headingRef.current;

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  return (
    <div className='marquee-wrapper testimonials_section'>
      <Image
        src='/images/faq-section-bg.png'
        alt='FAQ Section Background'
        width={1000}
        height={1000}
        className='testimonials_section_bg'
      />
      <div className='container'>
        <div ref={headingRef} className='faq_heading'>
          <div className='emoji_left'>
            <Image
              src='/images/fire-emoji-left.png'
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
              src='/images/fire-emoji-right.png'
              alt='emoji'
              width={104}
              height={104}
            />
          </div>
        </div>

        <div className='testimonials_container'>
          <div className='fade_top'></div>
          <div className='testimonials_grid_row'>
            <div className='marquee-block'>
              <div className='marquee-inner to-left'>
                <span>
                  {testimonials.map(testimonial => (
                    <div key={testimonial.id} className='marquee-item'>
                      <h4 className='testimonial'>{testimonial.quote}</h4>
                      <p className='text-white'>
                        {testimonial.name} - {testimonial.title}
                      </p>
                    </div>
                  ))}
                </span>
                <span>
                  {testimonials.map(testimonial => (
                    <div
                      key={`duplicate-${testimonial.id}`}
                      className='marquee-item'
                    >
                      <h4 className='testimonial'>{testimonial.quote}</h4>
                      <p className='text-white'>
                        {testimonial.name} - {testimonial.title}
                      </p>
                    </div>
                  ))}
                </span>
              </div>
            </div>

            <div className='marquee-block'>
              <div className='marquee-inner to-right'>
                <span>
                  {testimonials.map(testimonial => (
                    <div
                      key={`row2-${testimonial.id}`}
                      className='marquee-item'
                    >
                      <h4 className='testimonial'>{testimonial.quote}</h4>
                      <p className='text-white'>
                        {testimonial.name} - {testimonial.title}
                      </p>
                    </div>
                  ))}
                </span>
                <span>
                  {testimonials.map(testimonial => (
                    <div
                      key={`row2-duplicate-${testimonial.id}`}
                      className='marquee-item'
                    >
                      <h4 className='testimonial'>{testimonial.quote}</h4>
                      <p className='text-white'>
                        {testimonial.name} - {testimonial.title}
                      </p>
                    </div>
                  ))}
                </span>
              </div>
            </div>

            <div className='marquee-block'>
              <div className='marquee-inner to-left'>
                <span>
                  {testimonials.map(testimonial => (
                    <div
                      key={`row3-${testimonial.id}`}
                      className='marquee-item'
                    >
                      <h4 className='testimonial'>{testimonial.quote}</h4>
                      <p className='text-white'>
                        {testimonial.name} - {testimonial.title}
                      </p>
                    </div>
                  ))}
                </span>
                <span>
                  {testimonials.map(testimonial => (
                    <div
                      key={`row3-duplicate-${testimonial.id}`}
                      className='marquee-item'
                    >
                      <h4 className='testimonial'>{testimonial.quote}</h4>
                      <p className='text-white'>
                        {testimonial.name} - {testimonial.title}
                      </p>
                    </div>
                  ))}
                </span>
              </div>
            </div>
          </div>
          <div className='fade_bottom'></div>
        </div>
      </div>
    </div>
  );
}
