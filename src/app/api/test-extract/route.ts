import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('🧪 Testing Extract.pics API...');

    const testUrl =
      'https://montaukhairco.com/products/ocean-hair-texture-treatment';
    console.log(`🔍 Testing URL: ${testUrl}`);

    // Test the Extract.pics API
    const response = await fetch('https://api.extract.pics/v0/extractions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.EXTRACTAPIAUTHTOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: testUrl }),
    });

    console.log(`📊 Response status: ${response.status}`);
    console.log(
      `📊 Response headers:`,
      Object.fromEntries(response.headers.entries())
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error:`, errorText);
      return NextResponse.json(
        {
          error: 'Extract.pics API error',
          status: response.status,
          statusText: response.statusText,
          details: errorText,
        },
        { status: response.status }
      );
    }

    const json = await response.json();
    console.log(`📊 API Response:`, JSON.stringify(json, null, 2));

    return NextResponse.json({
      success: true,
      testUrl,
      apiKey: process.env.EXTRACTAPIAUTHTOKEN ? 'Set' : 'Missing',
      response: json,
    });
  } catch (error) {
    console.error('❌ Test error:', error);
    return NextResponse.json(
      {
        error: 'Test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
