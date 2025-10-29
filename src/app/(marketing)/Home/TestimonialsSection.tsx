'use client';

import Image from 'next/image';
import { useEffect } from 'react';

// Testimonials data
const testimonials = [
  {
    name: 'Sarah Chen',
    designation: 'E-commerce Store Owner',
    testimonial:
      "With AdSparker, we tested over 50 e-books in a single week to find our bestsellers. It's the ultimate tool for rapid product validation.",
  },
  {
    name: 'Marcus Rodriguez',
    designation: 'Digital Marketing Manager',
    testimonial:
      "AdSparker's AI-powered ads increased our conversion rate by 300%. The automated optimization is a game-changer for our business.",
  },
  {
    name: 'Emily Johnson',
    designation: 'SaaS Founder',
    testimonial:
      'The speed at which AdSparker creates and tests ad variations is incredible. We went from idea to profitable campaign in just 3 days.',
  },
  {
    name: 'David Kim',
    designation: 'Online Course Creator',
    testimonial:
      'AdSparker helped us identify our most profitable audience segments. Our ROI improved by 250% within the first month.',
  },
  {
    name: 'Lisa Thompson',
    designation: 'Fitness Coach',
    testimonial:
      "The AI-generated ad creatives are so professional and engaging. We've never had such high-quality content at this scale.",
  },
  {
    name: 'Alex Morgan',
    designation: 'Tech Startup CEO',
    testimonial:
      "AdSparker's predictive analytics saved us thousands in ad spend by identifying winning campaigns before we scaled them.",
  },
  {
    name: 'Rachel Green',
    designation: 'Fashion Brand Owner',
    testimonial:
      'The A/B testing capabilities are phenomenal. We found our best-performing ad in just 24 hours instead of weeks.',
  },
  {
    name: 'James Wilson',
    designation: 'Consulting Agency Owner',
    testimonial:
      "AdSparker's integration with Meta Ads is seamless. Our client campaigns are now 5x more effective than before.",
  },
  {
    name: 'Maria Garcia',
    designation: 'Health & Wellness Entrepreneur',
    testimonial:
      'The automated campaign optimization is incredible. We set it up once and it continuously improves our ad performance.',
  },
  {
    name: 'Kevin Lee',
    designation: 'Software Developer',
    testimonial:
      'As a non-marketer, AdSparker made it easy for me to create professional ads. The AI does all the heavy lifting.',
  },
  {
    name: 'Amanda Foster',
    designation: 'Real Estate Agent',
    testimonial:
      'AdSparker helped us generate 200+ qualified leads in our first month. The targeting precision is unmatched.',
  },
  {
    name: 'Robert Taylor',
    designation: 'Restaurant Owner',
    testimonial:
      "The local targeting features are perfect for our business. We're getting customers from our exact neighborhood.",
  },
  {
    name: 'Jennifer Davis',
    designation: 'Beauty Brand Founder',
    testimonial:
      "AdSparker's creative variations helped us find our brand voice. Our engagement rates increased by 400%.",
  },
  {
    name: 'Michael Brown',
    designation: 'Financial Advisor',
    testimonial:
      'The compliance features give us confidence in our ads. We can focus on results without worrying about policy violations.',
  },
  {
    name: 'Stephanie White',
    designation: 'Event Planner',
    testimonial:
      "AdSparker's seasonal campaign suggestions are brilliant. We're always ahead of trends and competition.",
  },
  {
    name: 'Daniel Martinez',
    designation: 'Home Services Owner',
    testimonial:
      'The lead quality from AdSparker campaigns is outstanding. Our cost per acquisition dropped by 60%.',
  },
  {
    name: 'Nicole Anderson',
    designation: 'Travel Blogger',
    testimonial:
      "AdSparker's audience insights helped us discover new profitable niches we never considered before.",
  },
  {
    name: 'Christopher Clark',
    designation: 'B2B Sales Director',
    testimonial:
      "The LinkedIn integration is perfect for our B2B campaigns. We're generating enterprise-level leads consistently.",
  },
  {
    name: 'Ashley Wright',
    designation: 'Pet Store Owner',
    testimonial:
      "AdSparker's pet industry templates saved us hours of creative work. Our pet product ads are now our top performers.",
  },
  {
    name: 'Brandon Lewis',
    designation: 'Gaming Content Creator',
    testimonial:
      "The gaming audience targeting is incredibly precise. We're reaching exactly the right gamers for our products.",
  },
];

export default function TestimonialsSection() {
  useEffect(() => {
    const control = document.getElementById('direction-toggle');
    const marquees = document.querySelectorAll('.marquee');
    const wrapper = document.querySelector('.wrapper');

    if (control && marquees && wrapper) {
      control.addEventListener('click', () => {
        control.classList.toggle('toggle--vertical');
        wrapper.classList.toggle('wrapper--vertical');
        [...marquees].forEach(marquee =>
          marquee.classList.toggle('marquee--vertical')
        );
      });
    }
  }, []);

  return (
    <section className='testimonials_section'>
      <Image
        src='/images/testimonials-bg.png'
        alt='Testimonials Section Background'
        width={1000}
        height={1000}
        className='testimonials_section_bg'
      />
      <div className='container'>
        <div className='faq_heading'>
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
              <span className='line1'>Hear What Customers</span>
              <span className='line2'>Have to Say</span>
            </h2>
            <p>
              Real results. Real businesses. See how founders, shops, and
              creators are scaling their sales with AdSparkers' AI-powered Meta
              ads.
            </p>
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
      </div>
      <div className='testimonials_section_content'>
        <article className='wrapper'>
          <div className='marquee'>
            <div className='marquee__group'>
              {testimonials.slice(0, 10).map((testimonial, index) => (
                <div key={index} className='testimonial-card'>
                  <h3 className='testimonial-name'>{testimonial.name}</h3>
                  <p className='testimonial-designation'>
                    {testimonial.designation}
                  </p>
                  <p className='testimonial-text'>{testimonial.testimonial}</p>
                </div>
              ))}
            </div>

            <div aria-hidden='true' className='marquee__group'>
              {testimonials.slice(0, 10).map((testimonial, index) => (
                <div key={`duplicate-${index}`} className='testimonial-card'>
                  <h3 className='testimonial-name'>{testimonial.name}</h3>
                  <p className='testimonial-designation'>
                    {testimonial.designation}
                  </p>
                  <p className='testimonial-text'>{testimonial.testimonial}</p>
                </div>
              ))}
            </div>
          </div>

          <div className='marquee marquee--reverse'>
            <div className='marquee__group'>
              {testimonials.slice(10, 20).map((testimonial, index) => (
                <div key={index + 10} className='testimonial-card'>
                  <h3 className='testimonial-name'>{testimonial.name}</h3>
                  <p className='testimonial-designation'>
                    {testimonial.designation}
                  </p>
                  <p className='testimonial-text'>{testimonial.testimonial}</p>
                </div>
              ))}
            </div>

            <div aria-hidden='true' className='marquee__group'>
              {testimonials.slice(10, 20).map((testimonial, index) => (
                <div
                  key={`duplicate-reverse-${index}`}
                  className='testimonial-card'
                >
                  <h3 className='testimonial-name'>{testimonial.name}</h3>
                  <p className='testimonial-designation'>
                    {testimonial.designation}
                  </p>
                  <p className='testimonial-text'>{testimonial.testimonial}</p>
                </div>
              ))}
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
