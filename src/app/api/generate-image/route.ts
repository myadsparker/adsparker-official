import { NextRequest, NextResponse } from 'next/server';

// Simple Freepik image generation API
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { prompt } = body;

    // Validate prompt
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required and must be a string' },
        { status: 400 }
      );
    }

    // Get API key
    const apiKey = process.env.FREEPIK_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Freepik API key not configured' },
        { status: 500 }
      );
    }

    // Prepare request payload
    const requestPayload = {
      prompt: prompt,
      aspect_ratio: 'square_1_1',
      guidance_scale: 2.5,
    };

    // Make request to Freepik API
    const response = await fetch(
      'https://api.freepik.com/v1/ai/text-to-image/seedream-v4',
      {
        method: 'POST',
        headers: {
          'x-freepik-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          error: data.error?.message || 'Failed to generate image',
          code: data.error?.code || 'FREEPIK_API_ERROR',
        },
        { status: response.status }
      );
    }

    // Return the response with task ID for polling
    return NextResponse.json({
      success: true,
      task_id: data.data.task_id,
      status: data.data.status,
      message: 'Image generation started. Use the task_id to check status.',
    });
  } catch (error) {
    console.error('Error generating image:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check image generation status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('task_id');

    if (!taskId) {
      return NextResponse.json(
        { error: 'task_id parameter is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.FREEPIK_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Freepik API key not configured' },
        { status: 500 }
      );
    }

    // Check task status
    const response = await fetch(
      `https://api.freepik.com/v1/ai/text-to-image/seedream-v4/${taskId}`,
      {
        method: 'GET',
        headers: {
          'x-freepik-api-key': apiKey,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          error: data.error?.message || 'Failed to get task status',
          code: data.error?.code || 'FREEPIK_API_ERROR',
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      task_id: data.data.task_id,
      status: data.data.status,
      generated_images: data.data.generated || [],
      is_completed: data.data.status === 'COMPLETED',
      is_failed: data.data.status === 'FAILED',
    });
  } catch (error) {
    console.error('Error checking image status:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
