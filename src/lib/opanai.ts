import OpenAI from 'openai';

// Server-only: This file should never be imported in client components
if (typeof window !== 'undefined') {
  throw new Error(
    'This module can only be imported in server-side code (API routes, server components).'
  );
}

if (!process.env.OPENAI_API_KEY) {
  console.error('⚠️ OPENAI_API_KEY is not set in environment variables');
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});
