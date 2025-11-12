import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export function FAQSection() {
  const [openItem, setOpenItem] = useState<string | null>(null);

  const faqs = [
    {
      question: 'Do I need a Meta account?',
      answer:
        "Yes, you'll need an existing Facebook Business account with access to Meta Ads Manager. AdSparker connects securely via OAuth to manage your campaigns.",
    },
    {
      question: 'Will it optimize existing ads?',
      answer:
        'AdSparker can optimize campaigns launched both through our platform and externally through Meta Ads Manager. Our AI analyzes all your active campaigns and provides optimization suggestions.',
    },
    {
      question: 'Can I edit ads after launch?',
      answer:
        'Yes! You can edit live campaigns directly from the AdSparker dashboard - headlines, descriptions, images, targeting, and budgets. Changes sync instantly with Meta Ads Manager.',
    },
    {
      question: "What's included in the $19.99 trial?",
      answer:
        "The first week includes up to 3 active campaigns, AI ad generation, basic optimization, and full dashboard access. After the trial, it's $59/week or you can upgrade to monthly billing.",
    },
    {
      question: 'How does AdSparker achieve 3x better ROI?',
      answer:
        "Our GPT-4o AI is trained on patterns from Meta's top-performing ads across industries. It continuously optimizes targeting, budget allocation, and ad creative based on real-time performance data - something that's impossible to do manually at scale.",
    },
    {
      question: 'What happens to my ads if I cancel?',
      answer:
        'Your campaigns continue running in Meta Ads Manager as normal. AdSparker simply stops providing optimization suggestions and automated management. You retain full control of your ads.',
    },
    {
      question: 'Do you support Instagram ads too?',
      answer:
        "Yes! AdSparker manages both Facebook and Instagram campaigns through Meta's unified advertising platform. You can target audiences across both platforms simultaneously.",
    },
  ];

  const toggleItem = (index: string) => {
    setOpenItem(openItem === index ? null : index);
  };

  return (
    <section className='py-20 bg-gray-800'>
      <div className='container mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='max-w-6xl mx-auto'>
          <div className='text-center mb-12'>
            <h2 className='text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-4 font-heading'>
              Frequently Asked Questions
            </h2>
            <p className='text-lg text-gray-400 font-body'>
              Everything you need to know about AdSparker
            </p>
          </div>

          {/* Two-column FAQ layout */}
          <div className='flex flex-col lg:flex-row gap-6 items-start'>
            {/* Left Column - Question Prompt Box */}
            <div className='w-full lg:w-1/3 flex-shrink-0'>
              <div className='bg-white rounded-2xl p-8 h-full relative min-h-[400px] flex flex-col justify-between'>
                <div>
                  <h3 className='text-4xl font-bold text-gray-800 mb-4 font-heading'>
                    Have other questions?
                  </h3>
                  <p className='text-lg text-gray-500 font-body'>
                    We're here to help!
                  </p>
                </div>
                <div className='absolute bottom-6 right-6'>
                  <button className='w-12 h-12 bg-[#8B5CF6] rounded-full flex items-center justify-center hover:bg-[#7C3AED] transition-colors'>
                    <svg
                      width='20'
                      height='20'
                      viewBox='0 0 20 20'
                      fill='none'
                      xmlns='http://www.w3.org/2000/svg'
                      className='text-white'
                    >
                      <path
                        d='M4.16675 15.8334L15.8334 4.16675M15.8334 4.16675H4.16675M15.8334 4.16675V15.8334'
                        stroke='currentColor'
                        strokeWidth='2'
                        strokeLinecap='round'
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column - FAQ List */}
            <div className='w-full lg:w-2/3 space-y-3'>
              <Accordion type='single' collapsible className='w-full'>
                {faqs.map((faq, index) => (
                  <AccordionItem
                    key={index}
                    value={`item-${index}`}
                    className='border-none'
                  >
                    <AccordionTrigger className='bg-gray-100 hover:bg-gray-200 rounded-xl px-6 py-4 transition-colors duration-200'>
                      <div className='flex items-center justify-between w-full'>
                        <span className='text-gray-800 font-medium text-left flex-1 font-heading'>
                          {faq.question}
                        </span>
                        <div className='ml-4 flex-shrink-0'>
                          <ChevronDown className='w-5 h-5 text-gray-700' />
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className='bg-gray-100 rounded-b-xl px-6 pb-4'>
                      <p className='text-gray-600 leading-relaxed font-body'>
                        {faq.answer}
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
