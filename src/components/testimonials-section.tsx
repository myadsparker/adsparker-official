import { Star } from 'lucide-react';

export function TestimonialsSection() {
  const testimonials = [
    {
      quote: 'I fired my $800/month ad agency. Sparkr did more in 3 days.',
      author: 'Sarah Chen',
      role: 'E-commerce Founder',
      initials: 'SC',
      bgColor: 'from-blue-500 to-purple-500',
    },
    {
      quote:
        'I launched my first campaign in under 2 minutes — and got 2 sales.',
      author: 'Mike Rodriguez',
      role: 'SaaS Creator',
      initials: 'MR',
      bgColor: 'from-green-500 to-teal-500',
    },
    {
      quote:
        'Finally, Google Ads that actually work. Sparkr saved me thousands in wasted spend.',
      author: 'Jessica Park',
      role: 'Marketing Director',
      initials: 'JP',
      bgColor: 'from-orange-500 to-red-500',
    },
  ];

  return (
    <section className='py-20 bg-gray-900'>
      <div className='container mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='max-w-4xl mx-auto'>
          <div className='text-center mb-16'>
            <h2 className='text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-4'>
              What founders are saying
            </h2>
          </div>

          <div className='grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8'>
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className={`bg-gray-800/50 backdrop-blur-xl p-8 rounded-2xl shadow-2xl border border-gray-700/50 hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-2 group relative ${index === 2 ? 'sm:col-span-2 lg:col-span-1 sm:max-w-md sm:mx-auto lg:max-w-none' : ''}`}
              >
                <div className='relative z-10'>
                  <div className='flex mb-4'>
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className='h-5 w-5 text-yellow-400 fill-current'
                      />
                    ))}
                  </div>
                  <blockquote className='text-lg text-white mb-6'>
                    "{testimonial.quote}"
                  </blockquote>
                  <div className='flex items-center'>
                    <div
                      className={`w-12 h-12 rounded-full mr-4 bg-gradient-to-br ${testimonial.bgColor} flex items-center justify-center text-white font-semibold text-sm shadow-md border-2 border-gray-600`}
                    >
                      {testimonial.initials}
                    </div>
                    <div>
                      <div className='font-semibold text-white'>
                        {testimonial.author}
                      </div>
                      <div className='text-gray-400'>{testimonial.role}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
