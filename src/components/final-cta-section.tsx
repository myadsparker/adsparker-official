import { Button } from '@/components/ui/button';
import { ArrowRight, Zap } from 'lucide-react';
import Link from 'next/link';

export function FinalCTASection() {
  return (
    <section className='py-20 bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 relative overflow-hidden'>
      {/* Background Pattern */}
      <div className='absolute inset-0 opacity-10'>
        <div
          className='absolute inset-0'
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23ffffff' fillOpacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className='container mx-auto px-4 sm:px-6 lg:px-8 relative z-10'>
        <div className='max-w-4xl mx-auto text-center'>
          <div className='mb-8'>
            <div className='inline-flex items-center gap-2 bg-white/20 backdrop-blur-xl border border-white/30 rounded-full px-6 py-3 text-white font-medium mb-6'>
              <Zap className='w-5 h-5' />
              <span>Ready to Scale Your Meta Ads?</span>
            </div>

            <h2 className='text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white mb-6 font-heading'>
              Let AI Run Your Meta Ads —{' '}
              <span className='italic'>So You Don't Have To</span>
            </h2>

            <p className='text-xl sm:text-2xl text-blue-100 mb-8 font-body leading-relaxed'>
              Join thousands of entrepreneurs who've scaled their businesses
              with AI-powered Meta advertising. Start your first campaign in 60
              seconds.
            </p>
          </div>

          <div className='flex flex-col sm:flex-row gap-6 justify-center items-center mb-12'>
            <Link href='/signup'>
              <Button
                size='lg'
                className='bg-white text-blue-700 hover:bg-gray-100 px-10 py-5 text-lg font-semibold shadow-xl transition-all duration-300 transform hover:scale-105 w-full sm:w-auto min-w-[280px]'
              >
                Start for $19.99
                <ArrowRight className='ml-2 h-5 w-5' />
              </Button>
            </Link>

            <Link href='/signup'>
              <Button
                variant='outline'
                size='lg'
                className='border-2 border-white/50 text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm px-10 py-5 text-lg font-semibold transition-all duration-300 w-full sm:w-auto min-w-[280px]'
              >
                Watch Demo
              </Button>
            </Link>
          </div>

          {/* Trust Indicators */}
          <div className='grid grid-cols-1 sm:grid-cols-3 gap-8 text-center'>
            <div className='text-white/90'>
              <div className='text-3xl font-bold mb-2'>3x</div>
              <div className='text-blue-100'>
                Better ROI than manual campaigns
              </div>
            </div>
            <div className='text-white/90'>
              <div className='text-3xl font-bold mb-2'>60s</div>
              <div className='text-blue-100'>Average campaign launch time</div>
            </div>
            <div className='text-white/90'>
              <div className='text-3xl font-bold mb-2'>24/7</div>
              <div className='text-blue-100'>AI optimization monitoring</div>
            </div>
          </div>

          <div className='mt-12 text-center'>
            <p className='text-blue-100 text-sm font-body'>
              ✨ No Meta Ads Manager experience needed • 🚀 Cancel anytime • 📈
              Results in 48-72 hours
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
