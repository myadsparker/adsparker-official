import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Initialize services
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface LogoExtractionResult {
  logoDetected: boolean;
  logoCoordinates: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  logoDescription: string;
  extractionMethod: string;
  confidence: number;
}

// Function to analyze and extract logo coordinates
async function analyzeLogoCoordinates(
  screenshotUrl: string
): Promise<LogoExtractionResult> {
  console.log(`🎯 Analyzing logo coordinates...`);

  const prompt = `
  Analyze this website screenshot and identify the company logo. Provide the exact coordinates for cropping the logo.

  IMPORTANT: Look for the main company logo/brand mark, typically located in:
  - Top-left corner (most common)
  - Header area
  - Navigation bar
  - Center of header

  Please respond with ONLY valid JSON in this exact format:
  {
    "logoDetected": true/false,
    "logoCoordinates": {
      "x": 0-1000, // horizontal position from left edge
      "y": 0-1000, // vertical position from top edge  
      "width": 50-500, // width of the logo
      "height": 20-200 // height of the logo
    },
    "logoDescription": "detailed description of what the logo looks like",
    "extractionMethod": "how you identified the logo location",
    "confidence": 0.0-1.0 // confidence level in the coordinates
  }

  Guidelines:
  - Be precise with coordinates
  - Include padding around the logo (don't crop too tight)
  - If multiple logos exist, choose the main company logo
  - If no clear logo is found, set logoDetected to false
  - Coordinates should be relative to the full screenshot dimensions
  `;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content:
          'You are an expert at analyzing website screenshots and identifying logo positions. Provide precise coordinates for logo extraction. Always respond with ONLY valid JSON, no markdown, no code blocks, no additional text.',
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: prompt,
          },
          {
            type: 'image_url',
            image_url: { url: screenshotUrl },
          },
        ],
      },
    ],
    temperature: 0.1,
    max_tokens: 500,
    response_format: { type: 'json_object' },
  });

  const analysisText = response.choices[0]?.message?.content;
  console.log(`📝 Logo coordinate analysis completed`);

  // Clean the response text
  let cleanedText = analysisText!;
  if (cleanedText.includes('```json')) {
    cleanedText = cleanedText
      .replace(/```json\s*/g, '')
      .replace(/```\s*$/g, '');
  }
  if (cleanedText.includes('```')) {
    cleanedText = cleanedText.replace(/```\s*$/g, '');
  }
  cleanedText = cleanedText.trim();

  return JSON.parse(cleanedText);
}

// Function to generate logo extraction instructions
async function generateExtractionInstructions(
  screenshotUrl: string,
  coordinates: LogoExtractionResult
): Promise<{
  instructions: string;
  cssClipPath: string;
  cropCoordinates: string;
  visualGuide: string;
}> {
  console.log(`📋 Generating extraction instructions...`);

  if (!coordinates.logoDetected) {
    return {
      instructions: 'No logo detected in the image',
      cssClipPath: '',
      cropCoordinates: '',
      visualGuide: 'Unable to provide visual guide - no logo detected',
    };
  }

  const { x, y, width, height } = coordinates.logoCoordinates;

  // CSS clip-path for web extraction
  const cssClipPath = `clip-path: rect(${y}px, ${x + width}px, ${y + height}px, ${x}px)`;

  // Crop coordinates for image processing tools
  const cropCoordinates = `x:${x}, y:${y}, width:${width}, height:${height}`;

  const instructions = `
  Logo Extraction Instructions:
  
  1. MANUAL CROPPING:
     - Open the screenshot in an image editor
     - Select a rectangular area starting at position (${x}, ${y})
     - Make the selection ${width}px wide by ${height}px tall
     - Copy or crop this selection
  
  2. PROGRAMMATIC EXTRACTION:
     - Use image processing library (Canvas, ImageMagick, etc.)
     - Crop coordinates: ${cropCoordinates}
     - CSS clip-path: ${cssClipPath}
  
  3. VISUAL LANDMARKS:
     - Logo is located ${coordinates.extractionMethod}
     - ${coordinates.logoDescription}
     - Confidence level: ${Math.round(coordinates.confidence * 100)}%
  `;

  const visualGuide = `
  Visual Guide:
  - Look for the logo in the ${coordinates.extractionMethod}
  - The logo area starts at ${x}px from the left, ${y}px from the top
  - Expected size: ${width}x${height} pixels
  - ${coordinates.logoDescription}
  `;

  return {
    instructions,
    cssClipPath,
    cropCoordinates,
    visualGuide,
  };
}

export async function POST(req: Request) {
  try {
    console.log('🎯 Starting logo-extraction API request...');

    // Check environment variables
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const { project_id } = await req.json();
    console.log(`📋 Request body parsed, project_id: ${project_id}`);

    if (!project_id) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      );
    }

    // Fetch project from Supabase
    console.log(`📊 Fetching project from Supabase...`);
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('analysing_points')
      .eq('project_id', project_id)
      .single();

    if (fetchError || !project) {
      console.error(`❌ Project not found:`, fetchError);
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Extract screenshot URL
    const analysingPoints = project.analysing_points;
    if (!analysingPoints?.parsingUrl?.screenshot) {
      return NextResponse.json(
        { error: 'No screenshot found. Please run analyzing-points first.' },
        { status: 400 }
      );
    }

    const screenshotUrl = analysingPoints.parsingUrl.screenshot;
    console.log(`📸 Screenshot URL found: ${screenshotUrl}`);

    // Analyze logo coordinates
    console.log(`📋 Analyzing logo coordinates...`);
    const logoCoordinates = await analyzeLogoCoordinates(screenshotUrl);

    // Generate extraction instructions
    console.log(`📋 Generating extraction instructions...`);
    const extractionInstructions = await generateExtractionInstructions(
      screenshotUrl,
      logoCoordinates
    );

    console.log(`🎉 Logo extraction analysis complete!`);

    return NextResponse.json({
      success: true,
      project_id,
      screenshot_url: screenshotUrl,
      logoAnalysis: logoCoordinates,
      extractionInstructions: extractionInstructions,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error in logo extraction:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      {
        error: 'Failed to extract logo',
        details: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
