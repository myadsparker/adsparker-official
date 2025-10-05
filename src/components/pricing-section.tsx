'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Check, Star } from 'lucide-react';
import Link from 'next/link';

export function PricingSection() {
  const plans = [
    {
      name: 'Starter Weekly',
      price: '$19.99',
      originalPrice: '$59',
      period: 'first week',
      afterPrice: 'then $59/week',
      popular: false,
      features: [
        'Up to 3 active campaigns',
        'AI ad generation + optimization',
        'Campaign editor + budget reallocation',
        'Real-time performance monitoring',
        'Basic Meta Ads Manager integration',
        'Email support',
      ],
      summary: 'Best for solo founders testing campaigns',
      cta: 'Start for $19.99',
      highlight: 'Perfect for testing',
    },
    {
      name: 'Starter Monthly',
      price: '$199',
      period: '/month',
      popular: true,
      features: [
        'Unlimited campaigns',
        'Full dashboard access',
        'Priority optimization speed',
        'Advanced AI insights',
        'Competitor analysis (coming soon)',
        'Campaign performance forecasting',
        'Priority support',
        'Edit live campaigns',
      ],
      summary: 'Most popular for growing businesses',
      cta: 'Start Monthly Plan',
      highlight: 'Best value',
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: 'pricing',
      popular: false,
      features: [
        'Everything in Monthly',
        'Dedicated AI assistant',
        'API access',
        'White-labeling options',
        'Team seats & collaboration',
        'Custom integrations',
        'Dedicated account manager',
        'SLA guarantees',
      ],
      summary: 'For agencies and large teams',
      cta: 'Contact Sales',
      highlight: 'Full customization',
    },
  ];

  return (
    <section id='pricing' className='py-16 lg:py-24 bg-gray-900'>
      <div className='container mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='max-w-6xl mx-auto'>
          {/* Header */}
          <div className='text-center mb-16'>
            <h2 className='text-3xl sm:text-4xl lg:text-5xl font-extrabold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-4 font-heading'>
              Simple Pricing
            </h2>
            <p className='text-lg sm:text-xl text-gray-400 font-body max-w-2xl mx-auto'>
              Plug-and-play pricing tiers. Start with $19.99 and scale as you
              grow.
            </p>
          </div>

          {/* Pricing Cards */}
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'>
            {plans.map(plan => (
              <Card
                key={plan.name}
                className={`relative bg-gray-800/50 backdrop-blur-xl border-2 transition-all duration-300 hover:shadow-2xl ${
                  plan.popular
                    ? 'border-blue-500/50 lg:scale-105 shadow-blue-500/20 shadow-xl'
                    : 'border-gray-700/50 hover:border-gray-600/50'
                }`}
              >
                {plan.popular && (
                  <div className='absolute -top-4 left-1/2 transform -translate-x-1/2 z-10'>
                    <div className='bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2 rounded-full text-sm font-semibold shadow-lg border border-blue-500/30 flex items-center gap-2'>
                      <Star className='w-4 h-4' />
                      Most Popular
                    </div>
                  </div>
                )}

                <CardContent
                  className={`p-8 ${plan.popular ? 'pt-12' : 'pt-8'}`}
                >
                  {/* Plan Header */}
                  <div className='mb-8'>
                    <h3 className='text-2xl font-bold text-white mb-2 font-heading'>
                      {plan.name}
                    </h3>
                    <div className='flex items-baseline mb-2'>
                      {plan.originalPrice && (
                        <span className='text-lg text-gray-500 line-through mr-2 font-heading'>
                          {plan.originalPrice}
                        </span>
                      )}
                      <span className='text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent font-heading'>
                        {plan.price}
                      </span>
                      <span className='text-gray-400 ml-1 font-body'>
                        {plan.period === 'first week' ? '' : plan.period}
                      </span>
                    </div>
                    {plan.period === 'first week' && (
                      <div className='text-sm text-gray-400 mb-4 font-body'>
                        {plan.period}, {plan.afterPrice}
                      </div>
                    )}
                    <div className='inline-flex items-center gap-2 bg-white/10 rounded-full px-3 py-1 text-sm text-white/80 mb-4'>
                      {plan.name === 'Starter Weekly' && '🚀'}
                      {plan.name === 'Starter Monthly' && '⭐'}
                      {plan.name === 'Enterprise' && '🏢'}
                      {plan.highlight}
                    </div>
                  </div>

                  {/* Features */}
                  <div className='mb-8 space-y-4'>
                    {plan.features.map((feature, index) => (
                      <div key={index} className='flex items-start gap-3'>
                        <div className='w-5 h-5 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5'>
                          <Check className='h-3 w-3 text-white' />
                        </div>
                        <span className='text-gray-300 leading-relaxed font-body'>
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Summary */}
                  <div className='mb-8 p-4 bg-gray-700/30 rounded-lg border border-gray-600/30'>
                    <div className='flex items-start gap-2'>
                      <span className='text-lg'>💡</span>
                      <p className='text-gray-300 italic font-body text-sm leading-relaxed'>
                        {plan.summary}
                      </p>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <Link href='/signup'>
                    <Button
                      className={`w-full py-4 font-semibold transition-all duration-300 transform hover:scale-105 font-body ${
                        plan.popular
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg'
                          : plan.name === 'Enterprise'
                            ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg'
                            : 'bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white shadow-md'
                      }`}
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Bottom CTA */}
          <div className='text-center mt-16'>
            <p className='text-lg text-gray-300 mb-6 font-body'>
              All plans include Meta Ads Manager integration and 24/7 AI
              optimization
            </p>
            <div className='flex flex-col sm:flex-row gap-4 justify-center items-center'>
              <Link href='/signup'>
                <Button className='bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-3 font-body'>
                  Start for $19.99
                </Button>
              </Link>
              <Button
                variant='outline'
                className='border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white px-8 py-3 font-body bg-transparent'
              >
                View Demo
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
