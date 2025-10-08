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
