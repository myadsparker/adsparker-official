import type React from 'react';
import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from 'react-hot-toast';
import 'antd/dist/reset.css';

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'AdSparkr - AI-Powered Meta Ads Platform',
  description:
    'Launch and optimize Meta Ads to boost sales and maximize ROI with AI-powered automation.',
  generator: 'v0.dev',
  verification: {
    other: {
      'facebook-domain-verification': 'tls4d3ui2iuer4kz3dbj88q1hw3an8',
    },
  },
  facebook: {
    appId: '762075266617741',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://adsparker.com',
    siteName: 'AdSparker',
    title: 'AdSparker - AI-Powered Meta Ads Platform',
    description:
      'Launch and optimize Meta Ads to boost sales and maximize ROI with AI-powered automation.',
    images: [
      {
        url: '/images/adsparker-create-page.png',
        width: 1200,
        height: 630,
        alt: 'AdSparker - AI-Powered Meta Ads Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AdSparker - AI-Powered Meta Ads Platform',
    description:
      'Launch and optimize Meta Ads to boost sales and maximize ROI with AI-powered automation.',
    images: ['/images/adsparker-create-page.png'],
    creator: '@adsparker',
  },
  keywords: [
    'Meta Ads',
    'Facebook Ads',
    'AI Marketing',
    'Ad Automation',
    'ROI Optimization',
    'Digital Marketing',
    'Ad Campaign',
    'Social Media Advertising',
  ],
  authors: [{ name: 'AdSparker' }],
  creator: 'AdSparker',
  publisher: 'AdSparker',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='en' suppressHydrationWarning>
      <body className={`${outfit.className} flex flex-col min-h-screen`}>
        <ThemeProvider
          attribute='class'
          defaultTheme='dark'
          enableSystem
          disableTransitionOnChange
        >
          <Toaster position='top-right' /> {/* Required */}
          <div className='flex-1'>{children}</div>
          <footer className='bg-black border-t border-gray-800 py-6 px-4 relative z-50'>
            <div className='max-w-7xl mx-auto text-center'>
              <p className='text-gray-400 text-sm mb-2'>
                © 2025 AdSparker LLC. All rights reserved.
              </p>
              <p className='text-gray-500 text-xs'>
                AdSparker LLC is a Delaware-registered company based in the
                United States
              </p>
            </div>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
