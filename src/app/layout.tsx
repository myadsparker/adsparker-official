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
  other: {
    'fb:app_id': '1125992358956545',
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
      <body className={outfit.className}>
        <ThemeProvider
          attribute='class'
          defaultTheme='dark'
          enableSystem
          disableTransitionOnChange
        >
          <Toaster position='top-right' /> {/* Required */}
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
