import { NextRequest, NextResponse } from 'next/server';

// Freepik Seedream v4 API types
interface FreepikImageGenRequest {
  prompt: string;
  webhook_url?: string;
  aspect_ratio?:
    | 'square_1_1'
    | 'widescreen_16_9'
    | 'social_story_9_16'
    | 'portrait_2_3'
    | 'traditional_3_4'
    | 'standard_3_2'
    | 'classic_4_3';
  guidance_scale?: number; // 0-20, default 2.5
  seed?: number; // 0-2147483647
}

interface FreepikImageGenResponse {
  data: {
    generated: string[];
    task_id: string;
    status: 'CREATED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  };
}

interface FreepikErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  console.log('\n' + '='.repeat(80));
  console.log(
    `🚀 [${timestamp}] FREEPIK SEEDREAM V4 IMAGE GENERATION - POST REQUEST STARTED`
  );
  console.log('='.repeat(80));

  try {
    // Get the API key from environment variables
    const apiKey = process.env.FREEPIK_API_KEY;

    console.log('🔑 Checking API key...');
    if (!apiKey) {
      console.error('❌ ERROR: Freepik API key is not configured!');
      return NextResponse.json(
        { error: 'Freepik API key is not configured' },
        { status: 500 }
      );
    }
    console.log('✅ API key found:', apiKey.substring(0, 10) + '...');

    // Parse the request body
    console.log('📥 Parsing request body...');
    const body: FreepikImageGenRequest = await request.json();
    console.log('📝 Request parameters:', {
      prompt: body.prompt?.substring(0, 50) + '...',
      aspect_ratio: body.aspect_ratio,
      guidance_scale: body.guidance_scale,
      seed: body.seed,
    });

    // Validate required fields
    if (!body.prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Validate numeric ranges if provided
    if (
      body.guidance_scale !== undefined &&
      (body.guidance_scale < 0 || body.guidance_scale > 20)
    ) {
      return NextResponse.json(
        { error: 'guidance_scale must be between 0 and 20' },
        { status: 400 }
      );
    }

    if (body.seed !== undefined && (body.seed < 0 || body.seed > 2147483647)) {
      return NextResponse.json(
        { error: 'seed must be between 0 and 2147483647' },
        { status: 400 }
      );
    }

    // Prepare the request payload with defaults
    const requestPayload: FreepikImageGenRequest = {
      prompt: body.prompt,
      aspect_ratio: body.aspect_ratio || 'square_1_1',
      guidance_scale: body.guidance_scale ?? 2.5,
      ...(body.webhook_url && { webhook_url: body.webhook_url }),
      ...(body.seed !== undefined && { seed: body.seed }),
    };

    // Make the request to Freepik API (Seedream v4)
    console.log('\n🌐 Making request to Freepik Seedream v4 API...');
    const url = 'https://api.freepik.com/v1/ai/text-to-image/seedream-v4';
    console.log('🔗 URL:', url);

    const options = {
      method: 'POST',
      headers: {
        'x-freepik-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload),
    };

    console.log('⏳ Sending request to Freepik...');
    const startTime = Date.now();
    const response = await fetch(url, options);
    const duration = Date.now() - startTime;
    console.log(`⏱️  Request completed in ${duration}ms`);
    console.log('📊 Response status:', response.status, response.statusText);

    const data = (await response.json()) as
      | FreepikImageGenResponse
      | FreepikErrorResponse;

    // Check if the request was successful
    if (!response.ok) {
      console.error('❌ FREEPIK API ERROR!');
      console.error('📊 Status:', response.status);
      console.error('📄 Response:', JSON.stringify(data, null, 2));

      const errorData = data as FreepikErrorResponse;
      return NextResponse.json(
        {
          error: errorData.error?.message || 'Failed to generate image',
          code: errorData.error?.code || 'FREEPIK_API_ERROR',
          status: response.status,
        },
        { status: response.status }
      );
    }

    // Return the successful response
    const successData = data as FreepikImageGenResponse;
    console.log('\n✅ SUCCESS! Image generation task created');
    console.log('🎫 Task ID:', successData.data.task_id);
    console.log('📊 Status:', successData.data.status);
    console.log('🖼️  Generated images:', successData.data.generated.length);

    console.log('\n' + '⚠️'.repeat(40));
    console.log('⚠️  IMPORTANT: Image is NOT ready yet!');
    console.log('⚠️  Status "CREATED" means Freepik has accepted your request');
    console.log(
      "⚠️  You need to poll the GET endpoint to check when it's done"
    );
    console.log(
      '⚠️  Use: GET /api/freepik-image-gen?task_id=' + successData.data.task_id
    );
    console.log('⚠️  Expected wait time: 10-30 seconds');
    console.log('⚠️'.repeat(40));
    console.log('='.repeat(80) + '\n');

    return NextResponse.json(successData, { status: 200 });
  } catch (error) {
    console.error('\n' + '❌'.repeat(40));
    console.error('❌ CRITICAL ERROR IN POST REQUEST!');
    console.error('❌'.repeat(40));
    console.error('📄 Error:', error);
    console.error(
      '📄 Error message:',
      error instanceof Error ? error.message : String(error)
    );
    console.error(
      '📄 Stack trace:',
      error instanceof Error ? error.stack : 'N/A'
    );
    console.error('='.repeat(80) + '\n');

    return NextResponse.json(
      {
        error: 'Internal server error',
        message:
          error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

// Optional: Add a GET endpoint to check the status of a generation task
export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  console.log('\n' + '='.repeat(80));
  console.log(
    `🔍 [${timestamp}] FREEPIK SEEDREAM V4 STATUS CHECK - GET REQUEST STARTED`
  );
  console.log('='.repeat(80));

  try {
    const apiKey = process.env.FREEPIK_API_KEY;

    console.log('🔑 Checking API key...');
    if (!apiKey) {
      console.error('❌ ERROR: Freepik API key is not configured!');
      return NextResponse.json(
        { error: 'Freepik API key is not configured' },
        { status: 500 }
      );
    }
    console.log('✅ API key found');

    // Get task_id from query parameters
    const searchParams = request.nextUrl.searchParams;
    const taskId = searchParams.get('task_id');

    console.log('🎫 Task ID:', taskId);

    if (!taskId) {
      console.error('❌ ERROR: task_id parameter is missing!');
      return NextResponse.json(
        { error: 'task_id is required' },
        { status: 400 }
      );
    }

    // Make the request to Freepik API to get task status (Seedream v4)
    const url = `https://api.freepik.com/v1/ai/text-to-image/seedream-v4/${taskId}`;
    console.log('🔗 URL:', url);
    console.log('⏳ Checking task status...');

    const options = {
      method: 'GET',
      headers: {
        'x-freepik-api-key': apiKey,
      },
    };

    const startTime = Date.now();
    const response = await fetch(url, options);
    const duration = Date.now() - startTime;
    console.log(`⏱️  Request completed in ${duration}ms`);
    console.log('📊 Response status:', response.status, response.statusText);

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ FREEPIK API ERROR!');
      console.error('📊 Status:', response.status);
      console.error('📄 Response:', JSON.stringify(data, null, 2));

      return NextResponse.json(
        {
          error: data.error?.message || 'Failed to get task status',
          code: data.error?.code || 'FREEPIK_API_ERROR',
          status: response.status,
        },
        { status: response.status }
      );
    }

    // Log the status
    const currentStatus = data.data?.status;
    console.log('\n📊 TASK STATUS:', currentStatus);
    console.log('🖼️  Generated images:', data.data?.generated?.length || 0);

    if (currentStatus === 'CREATED') {
      console.log('⏳ Status: CREATED - Task has been accepted by Freepik');
      console.log('💡 This means: Freepik received your request and queued it');
      console.log('⏰ Action: Wait 3 seconds and check again');
    } else if (currentStatus === 'IN_PROGRESS') {
      console.log('🎨 Status: IN_PROGRESS - Freepik is generating your image');
      console.log('💡 This means: The AI is actively creating your image');
      console.log('⏰ Action: Wait 3-5 seconds and check again');
    } else if (currentStatus === 'COMPLETED') {
      console.log('✅ Status: COMPLETED - Image generation finished!');
      console.log('💡 This means: Your image is ready!');
      console.log('🖼️  Images:', data.data.generated);
      console.log('🎉 SUCCESS!');
    } else if (currentStatus === 'FAILED') {
      console.log('❌ Status: FAILED - Image generation failed');
      console.log("💡 This means: Something went wrong on Freepik's side");
    } else {
      console.log('❓ Status: UNKNOWN -', currentStatus);
    }

    console.log('='.repeat(80) + '\n');

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('❌ ERROR in status check:', error);
    console.error(
      '📄 Error details:',
      error instanceof Error ? error.message : String(error)
    );
    console.log('='.repeat(80) + '\n');

    return NextResponse.json(
      {
        error: 'Internal server error',
        message:
          error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
