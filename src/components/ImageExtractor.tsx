'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Download, Eye } from 'lucide-react';

interface ExtractedImage {
  type: 'logo' | 'product';
  id?: number;
  url: string;
  coordinates: { x: number; y: number; width: number; height: number };
  description: string;
}

export default function ImageExtractor() {
  const [projectId, setProjectId] = useState('');
  const [extractionType, setExtractionType] = useState<
    'logo' | 'products' | 'both'
  >('both');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    success: boolean;
    extractedImages: ExtractedImage[];
    screenshot_url?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExtract = async () => {
    if (!projectId.trim()) {
      setError('Please enter a project ID');
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch('/api/extract-images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_id: projectId,
          extractionType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to extract images');
      }

      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className='container mx-auto p-6 space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>🖼️ Image Extractor</CardTitle>
          <CardDescription>
            Extract logo and product images from website screenshots using AI
            analysis
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='projectId'>Project ID</Label>
            <Input
              id='projectId'
              value={projectId}
              onChange={e => setProjectId(e.target.value)}
              placeholder='Enter your project ID'
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='extractionType'>Extraction Type</Label>
            <Select
              value={extractionType}
              onValueChange={(value: any) => setExtractionType(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder='Select extraction type' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='logo'>Logo Only</SelectItem>
                <SelectItem value='products'>Products Only</SelectItem>
                <SelectItem value='both'>Both Logo & Products</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleExtract} disabled={loading} className='w-full'>
            {loading ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Extracting Images...
              </>
            ) : (
              <>
                <Eye className='mr-2 h-4 w-4' />
                Extract Images
              </>
            )}
          </Button>

          {error && (
            <div className='p-4 bg-red-50 border border-red-200 rounded-md'>
              <p className='text-red-800'>❌ {error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {results && (
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              ✅ Extraction Results
              <Badge variant='secondary'>
                {results.extractedImages.length} images extracted
              </Badge>
            </CardTitle>
            <CardDescription>
              Successfully extracted images from the website screenshot
            </CardDescription>
          </CardHeader>
          <CardContent>
            {results.screenshot_url && (
              <div className='mb-6'>
                <h4 className='font-medium mb-2'>Original Screenshot:</h4>
                <img
                  src={results.screenshot_url}
                  alt='Original screenshot'
                  className='max-w-full h-auto border rounded-md'
                />
              </div>
            )}

            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
              {results.extractedImages.map((image, index) => (
                <Card key={index} className='overflow-hidden'>
                  <div className='aspect-square bg-gray-100 flex items-center justify-center'>
                    <img
                      src={image.url}
                      alt={image.description}
                      className='max-w-full max-h-full object-contain'
                    />
                  </div>
                  <CardContent className='p-4'>
                    <div className='space-y-2'>
                      <div className='flex items-center gap-2'>
                        <Badge
                          variant={
                            image.type === 'logo' ? 'default' : 'secondary'
                          }
                        >
                          {image.type}
                        </Badge>
                        {image.id && (
                          <Badge variant='outline'>#{image.id}</Badge>
                        )}
                      </div>
                      <p className='text-sm text-gray-600'>
                        {image.description}
                      </p>
                      <p className='text-xs text-gray-500'>
                        {image.coordinates.width} × {image.coordinates.height}px
                      </p>
                      <Button
                        size='sm'
                        variant='outline'
                        onClick={() =>
                          downloadImage(
                            image.url,
                            `${image.type}-${image.id || 'logo'}.png`
                          )
                        }
                        className='w-full'
                      >
                        <Download className='mr-2 h-3 w-3' />
                        Download
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
