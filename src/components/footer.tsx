export function Footer() {
  return (
    <footer className='bg-black border-t border-gray-800 py-12 px-4 sm:px-6 lg:px-8'>
      <div className='max-w-7xl mx-auto'>
        <div className='grid grid-cols-1 md:grid-cols-4 gap-8'>
          {/* Brand */}
          <div className='col-span-1 md:col-span-2'>
            <div className='flex items-center gap-2 mb-4'>
              <div className='w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center'>
                <span className='text-white font-bold text-sm'>⚡</span>
              </div>
              <span
                className='text-white font-semibold text-lg'
                style={{
                  fontFamily:
                    "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif",
                  fontWeight: 600,
                }}
              >
                AdSparker
              </span>
            </div>
            <p
              className='text-gray-400 max-w-md'
              style={{
                fontFamily:
                  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif",
                fontSize: '16px',
                fontWeight: 400,
                letterSpacing: '-0.011em',
              }}
            >
              AI-powered Meta Ads platform that creates high-converting
              campaigns in seconds. Launch and optimize ads to boost sales and
              maximize ROI.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3
              className='text-white font-semibold mb-4'
              style={{
                fontFamily:
                  "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif",
                fontSize: '16px',
                fontWeight: 600,
              }}
            >
              Product
            </h3>
            <ul className='space-y-3'>
              <li>
                <a
                  href='#features'
                  className='text-gray-400 hover:text-white transition-colors duration-200'
                  style={{
                    fontFamily:
                      "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif",
                    fontSize: '15px',
                    fontWeight: 400,
                  }}
                >
                  Features
                </a>
              </li>
              <li>
                <a
                  href='#pricing'
                  className='text-gray-400 hover:text-white transition-colors duration-200'
                  style={{
                    fontFamily:
                      "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif",
                    fontSize: '15px',
                    fontWeight: 400,
                  }}
                >
                  Pricing
                </a>
              </li>
              <li>
                <a
                  href='#demo'
                  className='text-gray-400 hover:text-white transition-colors duration-200'
                  style={{
                    fontFamily:
                      "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif",
                    fontSize: '15px',
                    fontWeight: 400,
                  }}
                >
                  Demo
                </a>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3
              className='text-white font-semibold mb-4'
              style={{
                fontFamily:
                  "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif",
                fontSize: '16px',
                fontWeight: 600,
              }}
            >
              Company
            </h3>
            <ul className='space-y-3'>
              <li>
                <a
                  href='#about'
                  className='text-gray-400 hover:text-white transition-colors duration-200'
                  style={{
                    fontFamily:
                      "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif",
                    fontSize: '15px',
                    fontWeight: 400,
                  }}
                >
                  About
                </a>
              </li>
              <li>
                <a
                  href='#contact'
                  className='text-gray-400 hover:text-white transition-colors duration-200'
                  style={{
                    fontFamily:
                      "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif",
                    fontSize: '15px',
                    fontWeight: 400,
                  }}
                >
                  Contact
                </a>
              </li>
              <li>
                <a
                  href='#support'
                  className='text-gray-400 hover:text-white transition-colors duration-200'
                  style={{
                    fontFamily:
                      "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif",
                    fontSize: '15px',
                    fontWeight: 400,
                  }}
                >
                  Support
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className='border-t border-gray-800 mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center'>
          <p
            className='text-gray-400 text-sm'
            style={{
              fontFamily:
                "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif",
              fontSize: '14px',
              fontWeight: 400,
            }}
          >
            © 2024 AdSparker. All rights reserved.
          </p>
          <div className='flex gap-6 mt-4 sm:mt-0'>
            <a
              href='#privacy'
              className='text-gray-400 hover:text-white transition-colors duration-200 text-sm'
              style={{
                fontFamily:
                  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif",
                fontSize: '14px',
                fontWeight: 400,
              }}
            >
              Privacy
            </a>
            <a
              href='#terms'
              className='text-gray-400 hover:text-white transition-colors duration-200 text-sm'
              style={{
                fontFamily:
                  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif",
                fontSize: '14px',
                fontWeight: 400,
              }}
            >
              Terms
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
