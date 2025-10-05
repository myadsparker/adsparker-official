'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/header';
import { HeroSection } from '@/components/hero-section';
import { SmartAdsSection } from '@/components/smart-ads-section';
import { OutperformSection } from '@/components/outperform-section';
import { UnlockPotentialSection } from '@/components/unlock-potential-section';
import { AudienceTargetingSection } from '@/components/audience-targeting-section';
import { AiStrategySection } from '@/components/ai-strategy-section';
import { PerformanceForecastSection } from '@/components/performance-forecast-section';
import { AdGenerationSection } from '@/components/ad-generation-section';
import { AiAdManagerSection } from '@/components/ai-ad-manager-section';
import { Footer } from '@/components/footer';

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className='min-h-screen bg-black text-white relative overflow-hidden'>
      {/* Loading overlay */}
      {isLoading && (
        <div className='fixed inset-0 bg-black z-50 transition-opacity duration-500' />
      )}

      {/* Background */}
      <div className='fixed inset-0 bg-black'>
        <div className='absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-black'></div>
        <div className='absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse'></div>
        <div className='absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000'></div>
      </div>

      {/* Content */}
      <div className='relative z-10'>
        <Header />
        <main>
          <HeroSection />
          <SmartAdsSection />
          <OutperformSection />
          <UnlockPotentialSection />
          <AudienceTargetingSection />
          <AiStrategySection />
          <PerformanceForecastSection />
          <AdGenerationSection />
          <AiAdManagerSection />
        </main>
        <Footer />
      </div>
    </div>
  );
}
