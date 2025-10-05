export function cleanContent(text: string): string {
  if (!text) return 'Generating insights...';
  return text
    .replace(/\*\*/g, '') // Remove bold markers
    .replace(/^\s*[-\*›]\s*/gm, '') // Remove bullet points and arrows
    .replace(/^\s*\d+\.\s*/gm, '') // Remove numbered lists
    .replace(/<\/?[^>]+(>|$)/g, '') // Remove HTML tags if any
    .replace(/undefined/g, '') // Remove undefined text
    .trim()
    .replace(/\n{3,}/g, '\n\n'); // Limit consecutive newlines
}

export function parseSectionContent(sectionContent: string): string {
  // Remove the section header from the content
  const lines = sectionContent.split('\n');
  const contentLines = lines.slice(1); // Skip the header line
  return cleanContent(contentLines.join('\n'));
}

export function breakTextIntoSentences(
  text: string,
  maxSentenceLength: number = 120
): string {
  if (!text) return 'Generating insights...';

  // First clean the text
  const cleanedText = cleanContent(text);

  // Split by sentence endings (. ! ?)
  const sentences = cleanedText
    .split(/(?<=[.!?])\s+/)
    .filter(sentence => sentence.trim().length > 0);

  // Break long sentences into smaller parts
  const processedSentences = sentences.map(sentence => {
    if (sentence.length <= maxSentenceLength) {
      return sentence;
    }

    // Split by commas, semicolons, and conjunctions
    const parts = sentence.split(
      /(?<=[,;])\s+(?=\w)|(?<=\s)(and|but|or|so|yet|for|nor)\s+/i
    );

    if (parts.length > 1) {
      return (
        parts
          .map(part => part.trim())
          .filter(part => part.length > 0)
          .join('. ') + '.'
      );
    }

    // If still too long, split by length
    const words = sentence.split(' ');
    if (words.length > 15) {
      const chunks = [];
      for (let i = 0; i < words.length; i += 12) {
        chunks.push(words.slice(i, i + 12).join(' '));
      }
      return chunks.join('. ') + '.';
    }

    return sentence;
  });

  return processedSentences.join(' ');
}

export interface AnalysisStep {
  key: string;
  label: string;
  subtitle: string;
  apiEndpoint: string;
  icon: any;
  subpoints?: AnalysisStep[];
}

export const ANALYSIS_STEPS: AnalysisStep[] = [
  {
    key: 'analyzingBusiness',
    label: 'Phase 1: Analyzing Your Business',
    subtitle: 'Understanding the product/service',
    apiEndpoint: '/api/analyze/analyzing-business',
    icon: null,
    subpoints: [
      {
        key: 'productInfo',
        label: 'a) Product Information',
        subtitle: 'What product or service the site offers',
        apiEndpoint: '/api/analyze/product-info',
        icon: null,
      },
      {
        key: 'sellingPoints',
        label: 'b) Selling Points',
        subtitle: 'Key features and customer benefits',
        apiEndpoint: '/api/analyze/selling-points',
        icon: null,
      },
      {
        key: 'advertisingGoal',
        label: 'c) Advertising Goal',
        subtitle: 'Brand advertising objectives',
        apiEndpoint: '/api/analyze/advertising-goal',
        icon: null,
      },
    ],
  },
  {
    key: 'researchingMarket',
    label: 'Phase 2: Researching Your Market',
    subtitle: 'Competitive and market analysis',
    apiEndpoint: '/api/analyze/researching-market',
    icon: null,
    subpoints: [
      {
        key: 'topCompetitors',
        label: 'a) Top Competitors',
        subtitle: '2-3 competitors and their websites',
        apiEndpoint: '/api/analyze/competitors',
        icon: null,
      },
      {
        key: 'searchKeywords',
        label: 'b) Search Keywords',
        subtitle: 'High-intent customer search terms',
        apiEndpoint: '/api/analyze/keywords',
        icon: null,
      },
      {
        key: 'currentAdMarket',
        label: 'c) Current Ad Market Landscape',
        subtitle: 'Types of ads running in this category',
        apiEndpoint: '/api/analyze/ad-market',
        icon: null,
      },
      {
        key: 'regionalStrategy',
        label: 'd) Regional Strategy Insights',
        subtitle: 'Local context and adaptations',
        apiEndpoint: '/api/analyze/regional-strategy',
        icon: null,
      },
      {
        key: 'userSentiment',
        label: 'e) User Sentiment & Community Insights',
        subtitle: 'Sentiment and reviews analysis',
        apiEndpoint: '/api/analyze/user-sentiment',
        icon: null,
      },
    ],
  },
];
