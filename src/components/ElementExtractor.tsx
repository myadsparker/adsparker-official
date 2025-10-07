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
import { Badge } from '@/components/ui/badge';
import { Loader2, Download, Scissors } from 'lucide-react';

interface ExtractedElement {
  type: 'logo' | 'product';
  id?: number;
  url: string;
  description: string;
  coordinates: { x: number; y: number; width: number; height: number };
}

export default function ElementExtractor() {
  const [projectId, setProjectId] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    success: boolean;
    extractedImages: ExtractedElement[];
    screenshot_url: string;
    analysis: {
      logoDetected: boolean;
      productsDetected: boolean;
      productCount: number;
    };
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
      const response = await fetch('/api/extract-elements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_id: projectId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to extract elements');
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
          <CardTitle>✂️ Element Extractor</CardTitle>
          <CardDescription>
            Extract logo and product images from your existing screenshot using
            AI analysis
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

          <Button onClick={handleExtract} disabled={loading} className='w-full'>
            {loading ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Extracting Elements...
              </>
            ) : (
              <>
                <Scissors className='mr-2 h-4 w-4' />
                Extract Logo & Products
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
        <div className='space-y-6'>
          {/* Analysis Summary */}
          <Card>
            <CardHeader>
              <CardTitle>📊 Analysis Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='flex gap-4'>
                <Badge
                  variant={
                    results.analysis.logoDetected ? 'default' : 'secondary'
                  }
                >
                  Logo:{' '}
                  {results.analysis.logoDetected ? 'Detected' : 'Not Found'}
                </Badge>
                <Badge
                  variant={
                    results.analysis.productsDetected ? 'default' : 'secondary'
                  }
                >
                  Products: {results.analysis.productCount} Found
                </Badge>
                <Badge variant='outline'>
                  Total Extracted: {results.extractedImages.length}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Extracted Images */}
          {results.extractedImages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>🖼️ Extracted Images</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                  {results.extractedImages.map((image, index) => (
                    <Card key={index} className='overflow-hidden'>
                      <div className='aspect-square bg-gray-100 flex items-center justify-center p-4'>
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
                            {image.coordinates.width} ×{' '}
                            {image.coordinates.height}px
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

          {/* Original Screenshot */}
          <Card>
            <CardHeader>
              <CardTitle>📸 Original Screenshot</CardTitle>
            </CardHeader>
            <CardContent>
              <img
                src={results.screenshot_url}
                alt='Original screenshot'
                className='max-w-full h-auto border rounded-md'
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
