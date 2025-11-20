'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';

interface SubscriptionPlansModalProps {
  onClose: () => void;
  onSelectPlan: (planType: 'monthly' | 'annual', priceId?: string) => void;
  projectId: string;
}

const PLANS = [
  {
    id: 'monthly',
    name: 'Monthly Plan',
    price: '$199',
    period: '/month',
    description: 'Start with 7 days free trial, then $199/month',
    trialNote: '7 days free trial included (if eligible)',
    features: [
      'Unlimited campaigns',
      'Full dashboard access',
      'Priority optimization',
      'Advanced AI insights',
      'Campaign performance forecasting',
      'Priority support',
      '7 days free trial for new users',
    ],
    popular: true,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID || 'price_monthly',
  },
  {
    id: 'annual',
    name: 'Annual Plan',
    price: '$1,308',
    period: '/year',
    description: 'Save 45% with annual billing',
    originalPrice: '$2,388',
    features: [
      'Everything in Monthly',
      '45% savings',
      'Priority support',
      'Early access to new features',
      'Dedicated account manager',
    ],
    popular: false,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID || 'price_annual',
  },
];

export default function SubscriptionPlansModal({
  onClose,
  onSelectPlan,
  projectId,
}: SubscriptionPlansModalProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleSelectPlan = async (plan: typeof PLANS[0]) => {
    setLoading(plan.id);

    try {
      // Redirect to Stripe checkout
      const response = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planType: plan.id,
          projectId,
          immediatePayment: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error('Error selecting plan:', error);
      alert(error.message || 'Failed to process subscription. Please try again.');
      setLoading(null);
    }
  };


  return (
    <div className="subscription-plans-modal-overlay" onClick={onClose}>
      <div className="subscription-plans-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="subscription-plans-modal-header">
          <h2>Choose Your Plan</h2>
          <button className="subscription-plans-modal-close" onClick={onClose}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <div className="subscription-plans-grid">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`subscription-plan-card ${plan.popular ? 'popular' : ''}`}
            >
              {plan.popular && (
                <div className="subscription-plan-badge">Most Popular</div>
              )}
              <div className="subscription-plan-header">
                <h3>{plan.name}</h3>
                <div className="subscription-plan-price">
                  <span className="price">{plan.price}</span>
                  <span className="period">{plan.period}</span>
                </div>
                {plan.originalPrice && (
                  <div className="subscription-plan-original-price">
                    {plan.originalPrice}
                  </div>
                )}
                <p className="subscription-plan-description">{plan.description}</p>
                {plan.trialNote && (
                  <p className="subscription-plan-trial-note" style={{ 
                    fontSize: '12px', 
                    color: '#10b981', 
                    marginTop: '4px',
                    fontWeight: '500'
                  }}>
                    ✓ {plan.trialNote}
                  </p>
                )}
              </div>

              <ul className="subscription-plan-features">
                {plan.features.map((feature, index) => (
                  <li key={index}>
                    <Check size={16} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                className={`subscription-plan-button ${plan.popular ? 'primary' : ''}`}
                onClick={() => handleSelectPlan(plan)}
                disabled={loading === plan.id}
              >
                {loading === plan.id ? 'Processing...' : `Select ${plan.name}`}
              </button>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .subscription-plans-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          padding: 20px;
        }

        .subscription-plans-modal-content {
          background: white;
          border-radius: 16px;
          max-width: 1200px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          padding: 32px;
          position: relative;
        }

        .subscription-plans-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
        }

        .subscription-plans-modal-header h2 {
          font-size: 28px;
          font-weight: 600;
          color: #121212;
          margin: 0;
        }

        .subscription-plans-modal-close {
          background: none;
          border: none;
          cursor: pointer;
          padding: 8px;
          color: #6b7280;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .subscription-plans-modal-close:hover {
          color: #121212;
        }

        .subscription-plans-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 24px;
        }

        .subscription-plan-card {
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          padding: 24px;
          position: relative;
          transition: all 0.2s ease;
        }

        .subscription-plan-card:hover {
          border-color: #7a3ff3;
          box-shadow: 0 4px 12px rgba(122, 63, 243, 0.1);
        }

        .subscription-plan-card.popular {
          border-color: #7a3ff3;
          box-shadow: 0 4px 12px rgba(122, 63, 243, 0.15);
        }

        .subscription-plan-badge {
          position: absolute;
          top: -12px;
          left: 50%;
          transform: translateX(-50%);
          background: #7a3ff3;
          color: white;
          padding: 4px 16px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }

        .subscription-plan-header {
          text-align: center;
          margin-bottom: 24px;
        }

        .subscription-plan-header h3 {
          font-size: 20px;
          font-weight: 600;
          color: #121212;
          margin: 0 0 16px 0;
        }

        .subscription-plan-price {
          display: flex;
          align-items: baseline;
          justify-content: center;
          gap: 4px;
          margin-bottom: 8px;
        }

        .subscription-plan-price .price {
          font-size: 36px;
          font-weight: 700;
          color: #121212;
        }

        .subscription-plan-price .period {
          font-size: 16px;
          color: #6b7280;
        }

        .subscription-plan-original-price {
          font-size: 14px;
          color: #9ca3af;
          text-decoration: line-through;
          margin-bottom: 8px;
        }

        .subscription-plan-description {
          font-size: 14px;
          color: #6b7280;
          margin: 0;
        }

        .subscription-plan-features {
          list-style: none;
          padding: 0;
          margin: 0 0 24px 0;
        }

        .subscription-plan-features li {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 0;
          font-size: 14px;
          color: #374151;
        }

        .subscription-plan-features li svg {
          color: #10b981;
          flex-shrink: 0;
        }

        .subscription-plan-button {
          width: 100%;
          padding: 12px 24px;
          border-radius: 8px;
          border: 2px solid #7a3ff3;
          background: white;
          color: #7a3ff3;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .subscription-plan-button:hover:not(:disabled) {
          background: #7a3ff3;
          color: white;
        }

        .subscription-plan-button.primary {
          background: #7a3ff3;
          color: white;
        }

        .subscription-plan-button.primary:hover:not(:disabled) {
          background: #6b2ee8;
        }

        .subscription-plan-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .subscription-plans-modal-content {
            padding: 24px;
          }

          .subscription-plans-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

