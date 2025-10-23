import Header from '../../../components/marketing/Header';
import Footer from '../../../components/marketing/Footer';
import BannerSection from './BannerSection';
import StepsSection from './StepsSection';
import FeaturesSection from './FeaturesSection';
import TestimonialsSection from './TestimonialsSection';
import PricingSection from './PricingSection';
import FAQSection from './FAQSection';

export default function HomePage() {
  return (
    <>
      <Header />
      <BannerSection />
      <StepsSection />
      <FeaturesSection />
      <PricingSection />
      <TestimonialsSection />
      <FAQSection />
      <Footer />
      <></>
    </>
  );
}
