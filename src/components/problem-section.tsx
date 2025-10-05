import { X, DollarSign, AlertTriangle, Sparkles } from 'lucide-react';

export function ProblemSection() {
  return (
    <section className='py-20 bg-gray-900'>
      <div className='container mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='max-w-5xl mx-auto text-center'>
          <h2 className='text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-16 font-heading'>
            Agencies charge <span className='text-white'>$1,000+</span> for what
            Sparkr does in <span className='text-blue-400'>minutes</span>.
          </h2>

          <div className='grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 mb-12'>
            <div className='relative bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6 sm:p-8 shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-2 group'>
              {/* Gradient overlay */}
              <div className='absolute inset-0 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-sm'></div>

              <div className='relative z-10'>
                <div className='w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-lg group-hover:scale-110 transition-transform duration-300'>
                  <DollarSign className='h-8 w-8 text-white' />
                </div>
                <h3 className='text-lg sm:text-xl font-extrabold text-white mb-3 font-heading'>
                  Overpriced "Experts"
                </h3>
                <p className='text-gray-400 leading-relaxed font-body'>
                  Tired of "ad experts" that overpromise and underdeliver?
                </p>
              </div>
            </div>

            <div className='relative bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6 sm:p-8 shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-2 group'>
              {/* Gradient overlay */}
              <div className='absolute inset-0 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-sm'></div>

              <div className='relative z-10'>
                <div className='w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-lg group-hover:scale-110 transition-transform duration-300'>
                  <AlertTriangle className='h-8 w-8 text-white' />
                </div>
                <h3 className='text-lg sm:text-xl font-extrabold text-white mb-3 font-heading'>
                  Complex Confusion
                </h3>
                <p className='text-gray-400 leading-relaxed font-body'>
                  Confused by Google's dashboard and policy rules?
                </p>
              </div>
            </div>

            <div className='relative bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6 sm:p-8 shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-2 group sm:col-span-2 lg:col-span-1 sm:max-w-md sm:mx-auto lg:max-w-none'>
              {/* Gradient overlay */}
              <div className='absolute inset-0 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-sm'></div>

              <div className='relative z-10'>
                <div className='w-16 h-16 bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-lg group-hover:scale-110 transition-transform duration-300'>
                  <X className='h-8 w-8 text-white' />
                </div>
                <h3 className='text-lg sm:text-xl font-extrabold text-white mb-3 font-heading'>
                  Wasted Budget
                </h3>
                <p className='text-gray-400 leading-relaxed font-body'>
                  Burnt budget with zero clicks or results?
                </p>
              </div>
            </div>
          </div>

          <div className='relative'>
            <div className='absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl'></div>
            <div className='relative bg-gradient-to-r from-blue-600/90 to-purple-600/90 backdrop-blur-xl text-white p-8 lg:p-10 rounded-2xl shadow-2xl border border-gray-600/20'>
              <div className='text-center mb-4'>
                <div className='w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3'>
                  <Sparkles className='w-6 h-6 text-yellow-400' />
                </div>
                <h3 className='text-2xl lg:text-3xl font-extrabold font-heading'>
                  The Sparkr Solution
                </h3>
              </div>
              <p className='text-xl lg:text-2xl font-semibold text-blue-100 font-body'>
                Sparkr replaces all of it. No fluff. No retainers. Just smarter
                ads that actually run.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
