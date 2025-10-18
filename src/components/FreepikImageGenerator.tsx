'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

interface GenerationResult {
  taskId: string;
  status: 'CREATED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  generatedImages?: string[];
}

export default function FreepikImageGenerator() {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('square_1_1');
  const [guidanceScale, setGuidanceScale] = useState([2.5]);
  const [seed, setSeed] = useState<number | undefined>(undefined);
  const [useSeed, setUseSeed] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateImage = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      const requestBody: any = {
        prompt,
        aspect_ratio: aspectRatio,
        guidance_scale: guidanceScale[0],
      };

      // Only include seed if useSeed is true and seed is defined
      if (useSeed && seed !== undefined) {
        requestBody.seed = seed;
      }

      const response = await fetch('/api/freepik-image-gen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate image');
      }

      setResult({
        taskId: data.data.task_id,
        status: data.data.status,
        generatedImages: data.data.generated,
      });

      // Start polling for status
      startPolling(data.data.task_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  const startPolling = (taskId: string) => {
    setIsPolling(true);

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(
          `/api/freepik-image-gen?task_id=${taskId}`
        );
        const data = await response.json();

        if (!response.ok) {
          clearInterval(pollInterval);
          setIsPolling(false);
          setError(data.error || 'Failed to check status');
          return;
        }

        setResult({
          taskId: data.data.task_id,
          status: data.data.status,
          generatedImages: data.data.generated,
        });

        if (data.data.status === 'COMPLETED' || data.data.status === 'FAILED') {
          clearInterval(pollInterval);
          setIsPolling(false);

          if (data.data.status === 'FAILED') {
            setError('Image generation failed');
          }
        }
      } catch (err) {
        clearInterval(pollInterval);
        setIsPolling(false);
        setError(err instanceof Error ? err.message : 'Polling error');
      }
    }, 3000); // Poll every 3 seconds
  };

  return (
    <Card className='w-full max-w-2xl mx-auto'>
      <CardHeader>
        <CardTitle>Freepik AI Image Generator</CardTitle>
        <CardDescription>
          Generate stunning images using Freepik&apos;s Seedream v4 AI model
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-6'>
        {/* Prompt Input */}
        <div className='space-y-2'>
          <Label htmlFor='prompt'>Prompt</Label>
          <Input
            id='prompt'
            placeholder='Describe the image you want to generate...'
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            disabled={isGenerating || isPolling}
          />
        </div>

        {/* Aspect Ratio */}
        <div className='space-y-2'>
          <Label htmlFor='aspect-ratio'>Aspect Ratio</Label>
          <Select
            value={aspectRatio}
            onValueChange={setAspectRatio}
            disabled={isGenerating || isPolling}
          >
            <SelectTrigger id='aspect-ratio'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='square_1_1'>Square (1:1)</SelectItem>
              <SelectItem value='widescreen_16_9'>Widescreen (16:9)</SelectItem>
              <SelectItem value='social_story_9_16'>
                Social Story (9:16)
              </SelectItem>
              <SelectItem value='portrait_2_3'>Portrait (2:3)</SelectItem>
              <SelectItem value='traditional_3_4'>Traditional (3:4)</SelectItem>
              <SelectItem value='standard_3_2'>Standard (3:2)</SelectItem>
              <SelectItem value='classic_4_3'>Classic (4:3)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Guidance Scale */}
        <div className='space-y-2'>
          <Label htmlFor='guidance-scale'>
            Guidance Scale: {guidanceScale[0]}
          </Label>
          <Slider
            id='guidance-scale'
            min={0}
            max={20}
            step={0.5}
            value={guidanceScale}
            onValueChange={setGuidanceScale}
            disabled={isGenerating || isPolling}
          />
          <p className='text-xs text-muted-foreground'>
            Controls how closely the output image aligns with the prompt. Higher
            values mean stronger prompt correlation.
          </p>
        </div>

        {/* Seed */}
        <div className='space-y-2'>
          <div className='flex items-center justify-between'>
            <Label htmlFor='use-seed'>Use Custom Seed</Label>
            <input
              type='checkbox'
              id='use-seed'
              checked={useSeed}
              onChange={e => setUseSeed(e.target.checked)}
              disabled={isGenerating || isPolling}
              className='h-4 w-4'
            />
          </div>
          {useSeed && (
            <>
              <Input
                id='seed'
                type='number'
                placeholder='Enter seed (0-2147483647)'
                value={seed || ''}
                onChange={e => {
                  const value = e.target.value;
                  setSeed(value ? parseInt(value) : undefined);
                }}
                disabled={isGenerating || isPolling}
                min={0}
                max={2147483647}
              />
              <p className='text-xs text-muted-foreground'>
                Random seed to control image generation. Use the same seed for
                reproducible results.
              </p>
            </>
          )}
        </div>

        {/* Generate Button */}
        <Button
          onClick={generateImage}
          disabled={isGenerating || isPolling || !prompt.trim()}
          className='w-full'
        >
          {isGenerating && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
          {isGenerating ? 'Starting Generation...' : 'Generate Image'}
        </Button>

        {/* Error Alert */}
        {error && (
          <Alert variant='destructive'>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Status */}
        {result && (
          <div className='space-y-4'>
            <Alert>
              <AlertDescription>
                <div className='space-y-2'>
                  <p>
                    <strong>Task ID:</strong> {result.taskId}
                  </p>
                  <p>
                    <strong>Status:</strong>{' '}
                    <span className='capitalize'>
                      {result.status.toLowerCase().replace('_', ' ')}
                    </span>
                    {isPolling && (
                      <Loader2 className='ml-2 inline h-4 w-4 animate-spin' />
                    )}
                  </p>
                </div>
              </AlertDescription>
            </Alert>

            {/* Generated Images */}
            {result.generatedImages && result.generatedImages.length > 0 && (
              <div className='space-y-2'>
                <Label>Generated Images</Label>
                <div className='grid grid-cols-1 gap-4'>
                  {result.generatedImages.map((imageUrl, index) => (
                    <div
                      key={index}
                      className='relative rounded-lg overflow-hidden border'
                    >
                      <img
                        src={imageUrl}
                        alt={`Generated image ${index + 1}`}
                        className='w-full h-auto'
                      />
                      <div className='p-2 bg-background/80 backdrop-blur-sm'>
                        <a
                          href={imageUrl}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='text-sm text-primary hover:underline'
                        >
                          Open in new tab
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
