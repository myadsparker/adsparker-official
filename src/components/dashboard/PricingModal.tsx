'use client';

import React from 'react';
import './PricingModal.css';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan: (planType: 'free_trial' | 'monthly' | 'annual' | 'enterprise') => void;
}

const pricingPlans = [
  {
    id: 1,
    planType: 'free_trial' as const,
    title: 'First Week Trial',
    description:
      'For small businesses & startups looking for simple, AI-driven ad automation.',
    price: 'Free for 7 days',
    billingInfo: 'Billed at $199/ month after trial ends',
    features: [
      '1-Min Ad Setup',
      'Expert Ad Targeting Strategy',
      'AI Market Research',
      'Customer Support',
      'AI Budget Optimizer',
      'Performance Forecasts',
      'AI Ad Copy',
      'Live Data Insights',
      'Top-performing Audiences',
    ],
    limitations: ['Only one Facebook account', 'Daily Budget Cap: $150'],
    buttonText: 'Start Free Trial',
    buttonType: 'primary',
  },
  {
    id: 2,
    planType: 'monthly' as const,
    title: 'Monthly Plan',
    description:
      'For small businesses & startups looking for simple, AI-driven ad automation.',
    price: '$199 / month',
    billingInfo: 'Billed monthly',
    features: [
      '1-Min Ad Setup',
      'Expert Ad Targeting Strategy',
      'AI Market Research',
      'Customer Support',
      'AI Budget Optimizer',
      'Performance Forecasts',
      'AI Ad Copy',
      'Live Data Insights',
      'Top-performing Audiences',
    ],
    limitations: ['Only one Facebook account', 'Daily Budget Cap: $150'],
    buttonText: 'Subscribe Now',
    buttonType: 'primary',
  },
  {
    id: 3,
    planType: 'annual' as const,
    title: 'Annually Plan',
    description:
      'For small businesses & startups looking for simple, AI-driven ad automation.',
    price: '$109 / month',
    billingInfo: 'Billed annually',
    highlight: 'Annually Plan',
    features: [
      '1-Min Ad Setup',
      'Expert Ad Targeting Strategy',
      'AI Market Research',
      'Customer Support',
      'AI Budget Optimizer',
      'Performance Forecasts',
      'AI Ad Copy',
      'Live Data Insights',
      'Top-performing Audiences',
    ],
    limitations: ['Only one Facebook account', 'Daily Budget Cap: $150'],
    buttonText: 'Subscribe Now',
    buttonType: 'primary',
  },
  {
    id: 4,
    planType: 'enterprise' as const,
    title: 'Enterprise',
    description:
      'For growing brands & enterprises needing advanced AI ad optimization and strategic support',
    price: 'Custom',
    billingInfo: 'Billed monthly or annually',
    features: [
      'All Starter Plan Features Included',
      'Enhanced Ad Creativity',
      'Advanced AI Ads Testing',
      'Unlimited Budget',
      'Unlimited Facebook Account',
      'Team Collaboration',
      'Dedicated AI Ad Consultant',
    ],
    limitations: ['No Limitations!'],
    buttonText: 'Contact Us',
    buttonType: 'secondary',
  },
];

export default function PricingModal({ isOpen, onClose, onSelectPlan }: PricingModalProps) {
  if (!isOpen) return null;

  return (
    <div className='pricing-modal-overlay' onClick={onClose}>
      <div className='pricing-modal-content' onClick={e => e.stopPropagation()}>
        <div className='pricing-modal-header'>
          <h2>Choose Your Plan</h2>
          <p>Select a plan to start publishing your ads</p>
          <button className='pricing-modal-close' onClick={onClose}>
            <svg
              width='24'
              height='24'
              viewBox='0 0 24 24'
              fill='none'
              xmlns='http://www.w3.org/2000/svg'
            >
              <path
                d='M18 6L6 18M6 6l12 12'
                stroke='currentColor'
                strokeWidth='2'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
            </svg>
          </button>
        </div>

        <div className='pricing-modal-body'>
          <div className='pricing-cards-grid'>
            {pricingPlans.map((plan) => (
              <div
                key={plan.id}
                className={`pricing-card-modal ${plan.highlight ? 'highlighted' : ''}`}
              >
                <div className='card-content-modal'>
                  {plan.highlight && <div className='plan-badge'>{plan.highlight}</div>}
                  <h3 className='card-title-modal'>{plan.title}</h3>
                  <p className='card-description-modal'>{plan.description}</p>

                  <div className='pricing-info-modal'>
                    <div className='price-modal'>
                      {plan.price === 'Free for 7 days' ? (
                        <>
                          <span className='price-main-modal'>Free</span>
                          <span className='price-period-modal'>for 7 days</span>
                        </>
                      ) : plan.price === 'Custom' ? (
                        <span className='price-main-modal'>Custom</span>
                      ) : (
                        <>
                          <span className='price-main-modal'>
                            {plan.price.split(' ')[0]}
                          </span>
                          <span className='price-period-modal'>
                            {plan.price.split(' ').slice(1).join(' ')}
                          </span>
                        </>
                      )}
                    </div>
                    <p className='billing-info-modal'>{plan.billingInfo}</p>
                  </div>

                  <div className='features-section-modal'>
                    <ul className='features-list-modal'>
                      {plan.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className='feature-item-modal'>
                          <svg
                            width='18'
                            height='18'
                            viewBox='0 0 18 18'
                            fill='none'
                            xmlns='http://www.w3.org/2000/svg'
                          >
                            <path
                              d='M9 0.875C7.39303 0.875 5.82214 1.35152 4.486 2.24431C3.14985 3.1371 2.10844 4.40605 1.49348 5.8907C0.87852 7.37535 0.717618 9.00901 1.03112 10.5851C1.34463 12.1612 2.11846 13.6089 3.25476 14.7452C4.39106 15.8815 5.8388 16.6554 7.4149 16.9689C8.99099 17.2824 10.6247 17.1215 12.1093 16.5065C13.594 15.8916 14.8629 14.8502 15.7557 13.514C16.6485 12.1779 17.125 10.607 17.125 9C17.1227 6.84581 16.266 4.78051 14.7427 3.25727C13.2195 1.73403 11.1542 0.877275 9 0.875ZM12.5672 7.56719L8.19219 11.9422C8.13415 12.0003 8.06522 12.0464 7.98934 12.0779C7.91347 12.1093 7.83214 12.1255 7.75 12.1255C7.66787 12.1255 7.58654 12.1093 7.51067 12.0779C7.43479 12.0464 7.36586 12.0003 7.30782 11.9422L5.43282 10.0672C5.31554 9.94991 5.24966 9.79085 5.24966 9.625C5.24966 9.45915 5.31554 9.30009 5.43282 9.18281C5.55009 9.06554 5.70915 8.99965 5.875 8.99965C6.04086 8.99965 6.19992 9.06554 6.31719 9.18281L7.75 10.6164L11.6828 6.68281C11.7409 6.62474 11.8098 6.57868 11.8857 6.54725C11.9616 6.51583 12.0429 6.49965 12.125 6.49965C12.2071 6.49965 12.2884 6.51583 12.3643 6.54725C12.4402 6.57868 12.5091 6.62474 12.5672 6.68281C12.6253 6.74088 12.6713 6.80982 12.7027 6.88569C12.7342 6.96156 12.7504 7.04288 12.7504 7.125C12.7504 7.20712 12.7342 7.28844 12.7027 7.36431C12.6713 7.44018 12.6253 7.50912 12.5672 7.56719Z'
                              fill='#7E52E0'
                            />
                          </svg>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className='limitations-section-modal'>
                    <h4 className='limitations-title-modal'>
                      {plan.limitations[0] === 'No Limitations!'
                        ? 'No Limitations!'
                        : 'Limitations'}
                    </h4>
                    <ul className='limitations-list-modal'>
                      {plan.limitations.map((limitation, limitationIndex) => (
                        <li key={limitationIndex} className='limitation-item-modal'>
                          {limitation}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    className={`cta-button-modal ${plan.buttonType}`}
                    onClick={() => onSelectPlan(plan.planType)}
                  >
                    {plan.buttonText}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

