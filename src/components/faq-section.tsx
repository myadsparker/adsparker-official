import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export function FAQSection() {
  const faqs = [
    {
      question: 'Do I need a Meta account?',
      answer:
        "Yes, you'll need an existing Facebook Business account with access to Meta Ads Manager. AdSparkr connects securely via OAuth to manage your campaigns.",
    },
    {
      question: 'Will it optimize existing ads?',
      answer:
        'AdSparkr can optimize campaigns launched both through our platform and externally through Meta Ads Manager. Our AI analyzes all your active campaigns and provides optimization suggestions.',
    },
    {
      question: 'Can I edit ads after launch?',
      answer:
        'Yes! You can edit live campaigns directly from the AdSparkr dashboard - headlines, descriptions, images, targeting, and budgets. Changes sync instantly with Meta Ads Manager.',
    },
    {
      question: "What's included in the $19.99 trial?",
      answer:
        "The first week includes up to 3 active campaigns, AI ad generation, basic optimization, and full dashboard access. After the trial, it's $59/week or you can upgrade to monthly billing.",
    },
    {
      question: 'How does AdSparkr achieve 3x better ROI?',
      answer:
        "Our GPT-4o AI is trained on patterns from Meta's top-performing ads across industries. It continuously optimizes targeting, budget allocation, and ad creative based on real-time performance data - something that's impossible to do manually at scale.",
    },
    {
      question: 'What happens to my ads if I cancel?',
      answer:
        'Your campaigns continue running in Meta Ads Manager as normal. AdSparkr simply stops providing optimization suggestions and automated management. You retain full control of your ads.',
    },
    {
      question: 'Do you support Instagram ads too?',
      answer:
        "Yes! AdSparkr manages both Facebook and Instagram campaigns through Meta's unified advertising platform. You can target audiences across both platforms simultaneously.",
    },
    {
      question: 'Is there a setup fee or contract?',
      answer:
        'No setup fees, no contracts. Start with the $19.99 weekly trial and cancel anytime. Monthly plans offer better value for ongoing campaigns.',
    },
    {
      question: 'How quickly will I see results?',
      answer:
        'Most users see improved performance within 48-72 hours as our AI begins optimizing campaigns. Full optimization benefits typically appear within the first week of active management.',
    },
    {
      question: 'What if I need help getting started?',
      answer:
        'All plans include support to help you connect your Meta account and launch your first campaigns. Monthly and Enterprise plans include priority support and dedicated assistance.',
    },
  ];

  return (
    <section className='py-20 bg-gray-800'>
      <div className='container mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='max-w-4xl mx-auto'>
          <div className='text-center mb-12'>
            <h2 className='text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-4 font-heading'>
              Frequently Asked Questions
            </h2>
            <p className='text-lg text-gray-400 font-body'>
              Everything you need to know about AdSparkr
            </p>
          </div>

          <div className='bg-gray-800/50 rounded-2xl shadow-lg border border-gray-700/50 overflow-hidden'>
            <Accordion type='single' collapsible className='w-full'>
              {faqs.map((faq, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className='border-b border-gray-700/50 last:border-b-0'
                >
                  <AccordionTrigger className='text-left text-lg sm:text-xl font-extrabold text-white hover:text-blue-400 px-6 py-5 hover:bg-gray-700/30 transition-colors duration-200 font-heading'>
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className='text-gray-400 text-base leading-relaxed px-6 pb-5 font-body'>
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          <div className='text-center mt-12'>
            <p className='text-gray-400 mb-4 font-body'>
              Still have questions? We're here to help.
            </p>
            <button className='bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200 font-body'>
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
