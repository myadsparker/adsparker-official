// Test script to verify Freepik API key
// Run with: node test-freepik-api.js

const testFreepikAPI = async () => {
  console.log('🔍 Testing Freepik API Connection...\n');

  // Check if API key exists
  const apiKey = process.env.FREEPIK_API_KEY;

  if (!apiKey) {
    console.error(
      '❌ ERROR: FREEPIK_API_KEY not found in environment variables!'
    );
    console.log('\n💡 Solution:');
    console.log('1. Create a .env.local file in your project root');
    console.log('2. Add: FREEPIK_API_KEY=your_api_key_here');
    console.log(
      '3. Get your API key from: https://www.freepik.com/api/dashboard'
    );
    console.log('4. Restart your dev server');
    return;
  }

  console.log('✅ API Key found:', apiKey.substring(0, 10) + '...');
  console.log('📝 Making test request to Freepik API...\n');

  try {
    const response = await fetch('https://api.freepik.com/v1/ai/mystic', {
      method: 'POST',
      headers: {
        'x-freepik-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: 'A beautiful sunset over mountains',
        resolution: '1k', // Use 1k for faster testing
        aspect_ratio: 'square_1_1',
        model: 'realism',
      }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ SUCCESS! Freepik API is working!');
      console.log('📊 Response:', JSON.stringify(data, null, 2));
      console.log('\n🎉 Your API key is valid and working correctly!');
    } else {
      console.error('❌ API Request Failed!');
      console.error('Status:', response.status, response.statusText);
      console.error('Response:', JSON.stringify(data, null, 2));

      if (response.status === 401) {
        console.log('\n💡 401 Unauthorized Solutions:');
        console.log('1. ❌ Your API key is invalid or expired');
        console.log('2. ❌ Check if you copied the entire API key correctly');
        console.log(
          '3. ❌ Verify your API key at: https://www.freepik.com/api/dashboard'
        );
        console.log(
          '4. ❌ Make sure there are no extra spaces or quotes around the key'
        );
      } else if (response.status === 403) {
        console.log('\n💡 403 Forbidden Solutions:');
        console.log('1. ❌ Your account may not have access to this feature');
        console.log('2. ❌ Check your subscription/plan limits');
      } else if (response.status === 429) {
        console.log('\n💡 429 Rate Limit Solutions:');
        console.log('1. ❌ Too many requests - wait a few minutes');
        console.log('2. ❌ Check your API rate limits');
      }
    }
  } catch (error) {
    console.error('❌ Network Error:', error.message);
    console.log('\n💡 Possible Issues:');
    console.log('1. ❌ No internet connection');
    console.log('2. ❌ Firewall blocking the request');
    console.log('3. ❌ Freepik API might be down (unlikely)');
  }
};

// Run the test
testFreepikAPI();
