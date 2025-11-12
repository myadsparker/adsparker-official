import { Zap, Bot, Target, TrendingUp } from 'lucide-react';

export function HowItWorksSection() {
  const steps = [
    {
      icon: Zap,
      iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600',
      iconColor: 'text-white',
      badgeBg: 'bg-gradient-to-r from-blue-600 to-blue-700',
      step: 'Step 1',
      title: 'Connect Meta Account',
      description:
        "One-click OAuth connection to your Facebook Ads Manager. Select your ad account and you're ready to go.",
    },
    {
      icon: Bot,
      iconBg: 'bg-gradient-to-br from-teal-500 to-teal-600',
      iconColor: 'text-white',
      badgeBg: 'bg-gradient-to-r from-teal-600 to-teal-700',
      step: 'Step 2',
      title: 'Describe Your Business',
      description:
        'Tell AdSparker about your product, target audience, and goals. Our GPT-4o AI instantly understands your business.',
    },
    {
      icon: Target,
      iconBg: 'bg-gradient-to-br from-green-500 to-green-600',
      iconColor: 'text-white',
      badgeBg: 'bg-gradient-to-r from-green-600 to-green-700',
      step: 'Step 3',
      title: 'Launch AI Ads',
      description:
        'AI generates high-converting ad copy, creates targeting suggestions, and launches your campaigns directly to Meta.',
    },
    {
      icon: TrendingUp,
      iconBg: 'bg-gradient-to-br from-purple-500 to-purple-600',
      iconColor: 'text-white',
      badgeBg: 'bg-gradient-to-r from-purple-600 to-purple-700',
      step: 'Step 4',
      title: 'Smart Optimization, Always On',
      description:
        'AI monitors performance 24/7, reallocates budget, updates copy, and pauses underperforming ads — even ones not launched on AdSparker.',
    },
  ];

  return (
    <section id='how-it-works' className='py-20 bg-gray-800'>
      <div className='container mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='max-w-7xl mx-auto'>
          <div className='text-center mb-12 sm:mb-16'>
            <h2 className='text-3xl sm:text-4xl lg:text-5xl font-extrabold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-4 font-heading'>
              How It Works
            </h2>
            <p className='text-lg sm:text-xl text-gray-400 font-body'>
              Connect → Describe → Launch AI Ads in 60 seconds
            </p>
          </div>
          <div className='space-y-6 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-4 md:gap-6 lg:gap-8'>
            {steps.map((step, index) => (
              <div
                key={index}
                className={`relative bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6 sm:p-8 shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-2 group`}
              >
                <div className='absolute inset-0 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-sm'></div>
                <div className='absolute -top-3 left-6 z-10'>
                  <span
                    className={`${step.badgeBg} text-white text-sm font-semibold px-4 py-2 rounded-full shadow-lg font-body`}
                  >
                    {step.step}
                  </span>
                </div>
                <div className='text-center mb-6 mt-4 relative z-10'>
                  <div
                    className={`w-16 h-16 ${step.iconBg} rounded-2xl flex items-center justify-center mb-4 mx-auto shadow-lg group-hover:scale-110 transition-transform duration-300`}
                  >
                    <step.icon className={`h-8 w-8 ${step.iconColor}`} />
                  </div>
                </div>
                <div className='text-center relative z-10'>
                  <h3 className='text-xl sm:text-2xl font-extrabold text-white mb-4 leading-tight whitespace-pre-line font-heading'>
                    {step.title}
                  </h3>
                  <p className='text-gray-400 leading-relaxed font-body'>
                    {step.description}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className='hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10'>
                    <div className='w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg'>
                      <svg
                        className='w-4 h-4 text-white'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M9 5l7 7-7 7'
                        />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
