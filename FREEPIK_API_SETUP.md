# Freepik Image Generation API Setup

## Environment Variables

Add the following to your `.env.local` file:

```env
FREEPIK_API_KEY=your_freepik_api_key_here
```

Get your API key from: [Freepik API Dashboard](https://www.freepik.com/api/dashboard)

## API Route Usage

### Endpoint: `POST /api/freepik-image-gen`

Generate an image using Freepik's Seedream v4 AI model.

#### Request Body

```json
{
  "prompt": "a cat with wings, playing the guitar, and wearing a hat",
  "aspect_ratio": "square_1_1",
  "guidance_scale": 2.5,
  "seed": 123456789
}
```

#### Parameters

- **prompt** (string, required): The text prompt used to generate the image
- **aspect_ratio** (string, optional, default: `square_1_1`): The aspect ratio of the generated image
  - `square_1_1` - Square (1:1)
  - `widescreen_16_9` - Widescreen (16:9)
  - `social_story_9_16` - Social Story (9:16)
  - `portrait_2_3` - Portrait (2:3)
  - `traditional_3_4` - Traditional (3:4)
  - `standard_3_2` - Standard (3:2)
  - `classic_4_3` - Classic (4:3)
- **guidance_scale** (number, optional, default: `2.5`, range: 0-20): Controls how closely the output image aligns with the input prompt. Higher values mean stronger prompt correlation.
- **seed** (integer, optional, range: 0-2147483647): Random seed to control the stochasticity of image generation. Use the same seed for reproducible results.
- **webhook_url** (string, optional): Callback URL for async notifications when the task status changes

#### Response

```json
{
  "data": {
    "generated": [],
    "task_id": "046b6c7f-0b8a-43b9-b35d-6489e6daee91",
    "status": "IN_PROGRESS"
  }
}
```

### Endpoint: `GET /api/freepik-image-gen?task_id={task_id}`

Check the status of a generation task.

#### Query Parameters

- **task_id** (required): The task ID returned from the POST request

#### Response

```json
{
  "data": {
    "generated": [
      "https://example.com/generated-image-1.jpg",
      "https://example.com/generated-image-2.jpg"
    ],
    "task_id": "046b6c7f-0b8a-43b9-b35d-6489e6daee91",
    "status": "COMPLETED"
  }
}
```

## Example Usage

### JavaScript/TypeScript

```typescript
// Generate an image
const generateImage = async () => {
  const response = await fetch('/api/freepik-image-gen', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: 'a beautiful sunset over mountains',
      aspect_ratio: 'widescreen_16_9',
      guidance_scale: 5.0,
      seed: 123456, // Optional: for reproducible results
    }),
  });

  const data = await response.json();
  console.log('Task ID:', data.data.task_id);

  return data.data.task_id;
};

// Check generation status
const checkStatus = async (taskId: string) => {
  const response = await fetch(`/api/freepik-image-gen?task_id=${taskId}`);
  const data = await response.json();

  if (data.data.status === 'COMPLETED') {
    console.log('Generated images:', data.data.generated);
  }

  return data;
};

// Poll for completion
const generateAndWait = async () => {
  const taskId = await generateImage();

  const pollInterval = setInterval(async () => {
    const result = await checkStatus(taskId);

    if (result.data.status === 'COMPLETED') {
      clearInterval(pollInterval);
      console.log('Generation complete!');
      // Use the generated images
    } else if (result.data.status === 'FAILED') {
      clearInterval(pollInterval);
      console.error('Generation failed');
    }
  }, 3000); // Check every 3 seconds
};
```

### Using with Custom Seed for Reproducibility

```typescript
// Generate the same image multiple times with the same seed
const response = await fetch('/api/freepik-image-gen', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    prompt: 'a magical forest with glowing mushrooms',
    aspect_ratio: 'portrait_2_3',
    guidance_scale: 7.5,
    seed: 42, // Using the same seed will produce similar results
  }),
});
```

## Parameter Tuning Guide

### Guidance Scale

- **Low (0-5)**: More creative freedom, less strict adherence to prompt
- **Medium (5-10)**: Balanced between creativity and prompt accuracy
- **High (10-20)**: Very strict prompt adherence, less creative interpretation

### Seed

- Use a specific seed value to get reproducible results
- Same prompt + same seed + same parameters = similar output
- Useful for iterating on a specific generation or A/B testing

## Important Notes

1. **Seedream v4 Model**: This implementation uses the Seedream v4 model, which is simpler and more straightforward than the Mystic model. It focuses on text-to-image generation with guidance scale and seed control.

2. **Webhook Setup**: For production use, set up a webhook URL to receive async notifications when generation is complete.

3. **Rate Limiting**: Check Freepik API documentation for rate limits and pricing.

4. **Polling**: Since image generation is asynchronous, you need to poll the GET endpoint to check when the image is ready. Typical generation time is 10-30 seconds.

## Task Status

The generation process has the following statuses:

- **CREATED**: Task has been accepted and queued
- **IN_PROGRESS**: AI is actively generating the image
- **COMPLETED**: Image generation finished successfully
- **FAILED**: Generation failed (check error details)

## Error Handling

The API route includes comprehensive error handling:

- Validates required fields (prompt)
- Validates numeric ranges (guidance_scale: 0-20, seed: 0-2147483647)
- Returns detailed error messages
- Logs errors for debugging

## API Documentation

For complete API documentation, visit: [Freepik Seedream v4 API Documentation](https://docs.freepik.com/api-reference/text-to-image/seedream-4/post-seedream-v4)
