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
import { Loader2, Eye, Download } from 'lucide-react';

interface AnalysisResult {
  success: boolean;
  project_id: string;
  screenshot_url: string;
  analysis: {
    websiteType: 'product' | 'service';
    businessDetails: {
      service?: string;
      product?: string;
    };
    brandAnalysis: {
      primaryColors: string[];
      branding: string;
    };
    logoAnalysis: {
      logoDetected: boolean;
      logoDescription: string;
      logoLocation: string;
      logoUrl?: string;
    };
    productAnalysis?: {
      productsDetected: boolean;
      productCount: number;
      products: Array<{
        id: number;
        description: string;
        location: string;
        coordinates: { x: number; y: number; width: number; height: number };
        productUrl?: string;
      }>;
    };
  };
}

export default function ImageAnalysisDemo() {
  const [projectId, setProjectId] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!projectId.trim()) {
      setError('Please enter a project ID');
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch('/api/image-analysis', {
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
        throw new Error(data.error || 'Failed to analyze image');
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
          <CardTitle>🔍 Enhanced Image Analysis</CardTitle>
          <CardDescription>
            Analyze website screenshots and automatically extract logo and
            product images
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

          <Button onClick={handleAnalyze} disabled={loading} className='w-full'>
            {loading ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Analyzing & Extracting Images...
              </>
            ) : (
              <>
                <Eye className='mr-2 h-4 w-4' />
                Analyze & Extract Images
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
          {/* Website Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>📊 Website Analysis</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div>
                  <h4 className='font-medium'>Website Type</h4>
                  <Badge
                    variant={
                      results.analysis.websiteType === 'product'
                        ? 'default'
                        : 'secondary'
                    }
                  >
                    {results.analysis.websiteType}
                  </Badge>
                </div>
                <div>
                  <h4 className='font-medium'>Business</h4>
                  <p className='text-sm text-gray-600'>
                    {results.analysis.websiteType === 'product'
                      ? results.analysis.businessDetails.product
                      : results.analysis.businessDetails.service}
                  </p>
                </div>
              </div>

              <div>
                <h4 className='font-medium'>Primary Colors</h4>
                <div className='flex gap-2 mt-1'>
                  {results.analysis.brandAnalysis.primaryColors.map(
                    (color, index) => (
                      <Badge key={index} variant='outline'>
                        {color}
                      </Badge>
                    )
                  )}
                </div>
              </div>

              <div>
                <h4 className='font-medium'>Branding</h4>
                <p className='text-sm text-gray-600'>
                  {results.analysis.brandAnalysis.branding}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Logo Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>🎯 Logo Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              {results.analysis.logoAnalysis.logoDetected ? (
                <div className='space-y-4'>
                  <div className='flex items-center gap-2'>
                    <Badge variant='default'>Logo Detected</Badge>
                    <Badge variant='outline'>
                      {results.analysis.logoAnalysis.logoLocation}
                    </Badge>
                  </div>
                  <p className='text-sm text-gray-600'>
                    {results.analysis.logoAnalysis.logoDescription}
                  </p>

                  {results.analysis.logoAnalysis.logoUrl && (
                    <div className='space-y-2'>
                      <h5 className='font-medium'>Extracted Logo:</h5>
                      <div className='flex items-center gap-4'>
                        <img
                          src={results.analysis.logoAnalysis.logoUrl}
                          alt='Extracted logo'
                          className='max-w-32 max-h-16 object-contain border rounded'
                        />
                        <Button
                          size='sm'
                          variant='outline'
                          onClick={() =>
                            downloadImage(
                              results.analysis.logoAnalysis.logoUrl!,
                              'logo.png'
                            )
                          }
                        >
                          <Download className='mr-2 h-3 w-3' />
                          Download Logo
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className='text-gray-500'>No logo detected</p>
              )}
            </CardContent>
          </Card>

          {/* Product Analysis */}
          {results.analysis.websiteType === 'product' &&
            results.analysis.productAnalysis && (
              <Card>
                <CardHeader>
                  <CardTitle>🛍️ Product Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  {results.analysis.productAnalysis.productsDetected ? (
                    <div className='space-y-4'>
                      <div className='flex items-center gap-2'>
                        <Badge variant='secondary'>
                          {results.analysis.productAnalysis.productCount}{' '}
                          Products Detected
                        </Badge>
                      </div>

                      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                        {results.analysis.productAnalysis.products.map(
                          product => (
                            <Card key={product.id} className='overflow-hidden'>
                              <div className='aspect-square bg-gray-100 flex items-center justify-center'>
                                {product.productUrl ? (
                                  <img
                                    src={product.productUrl}
                                    alt={product.description}
                                    className='max-w-full max-h-full object-contain'
                                  />
                                ) : (
                                  <div className='text-gray-400 text-sm'>
                                    No image extracted
                                  </div>
                                )}
                              </div>
                              <CardContent className='p-4'>
                                <div className='space-y-2'>
                                  <div className='flex items-center gap-2'>
                                    <Badge variant='secondary'>
                                      Product #{product.id}
                                    </Badge>
                                  </div>
                                  <p className='text-sm text-gray-600'>
                                    {product.description}
                                  </p>
                                  <p className='text-xs text-gray-500'>
                                    {product.location}
                                  </p>
                                  {product.productUrl && (
                                    <Button
                                      size='sm'
                                      variant='outline'
                                      onClick={() =>
                                        downloadImage(
                                          product.productUrl!,
                                          `product-${product.id}.png`
                                        )
                                      }
                                      className='w-full'
                                    >
                                      <Download className='mr-2 h-3 w-3' />
                                      Download
                                    </Button>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          )
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className='text-gray-500'>No products detected</p>
                  )}
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
