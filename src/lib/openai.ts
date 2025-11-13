import OpenAI from 'openai';

// Initialize OpenAI client with validated API key
const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set in environment variables');
  }
  
  // Validate API key format
  if (!apiKey.startsWith('sk-')) {
    throw new Error('OPENAI_API_KEY format is invalid. It should start with "sk-"');
  }
  
  // Check for common issues (extra spaces, newlines, etc.)
  if (apiKey.includes('\n') || apiKey.includes('\r')) {
    throw new Error('OPENAI_API_KEY contains newline characters. Please check your Vercel environment variable.');
  }
  
  return new OpenAI({
    apiKey: apiKey,
  });
};

export const openai = getOpenAIClient();

