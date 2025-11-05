import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// Initialize Stripe
let stripe: Stripe | null = null;
try {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-08-27.basil',
  });
} catch (error) {
  console.error('Failed to initialize Stripe:', error);
}

/**
 * Setup Stripe Webhook Endpoint via API
 * This creates a webhook endpoint in Stripe programmatically
 */
export async function POST(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe is not initialized. Please check STRIPE_SECRET_KEY.' },
        { status: 500 }
      );
    }

    // Parse request body - optimized for Postman testing
    let body: any = {};
    try {
      const contentType = request.headers.get('content-type');
      
      // Only parse if Content-Type is application/json
      if (contentType && contentType.includes('application/json')) {
        try {
          body = await request.json();
        } catch (jsonError) {
          // If body is empty or invalid JSON, use empty object (will use defaults)
          console.warn('Body is empty or invalid JSON, using defaults');
          body = {};
        }
      }
      // If no Content-Type header, assume empty body (use defaults)
    } catch (parseError: any) {
      // If body is empty or invalid, use empty object (will use defaults)
      console.warn('Body parsing error (using defaults):', parseError.message);
      body = {};
    }

    const { webhook_url, enabled_events } = body;

    // Get app URL with fallback
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   process.env.NEXT_PUBLIC_SITE_URL || 
                   'http://localhost:3000';

    // Default webhook URL if not provided
    const defaultWebhookUrl = `${appUrl}/api/subscriptions/webhook`;

    // Use provided URL or default
    const endpointUrl = webhook_url || defaultWebhookUrl;

    // Default events to listen to
    const defaultEvents: Stripe.WebhookEndpointCreateParams.EnabledEvent[] = [
      'checkout.session.completed',
      'customer.subscription.created',
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'invoice.payment_succeeded',
      'invoice.payment_failed',
    ];

    // Use provided events or default
    const eventsToListen = enabled_events || defaultEvents;

    // Check if webhook endpoint already exists
    const existingEndpoints = await stripe.webhookEndpoints.list({
      limit: 100,
    });

    // Find existing endpoint with same URL
    const existingEndpoint = existingEndpoints.data.find(
      (endpoint) => endpoint.url === endpointUrl
    );

    if (existingEndpoint) {
      // Update existing endpoint if needed
      if (existingEndpoint.status === 'disabled') {
        // Re-enable if disabled
        const updatedEndpoint = await stripe.webhookEndpoints.update(
          existingEndpoint.id,
          {
            enabled_events: eventsToListen,
            description: 'AdSparker Subscription Webhook',
          }
        );

        return NextResponse.json({
          success: true,
          message: 'Webhook endpoint updated and enabled',
          endpoint: {
            id: updatedEndpoint.id,
            url: updatedEndpoint.url,
            status: updatedEndpoint.status,
            enabled_events: updatedEndpoint.enabled_events,
          },
          signing_secret: updatedEndpoint.secret || 'Check Stripe Dashboard for secret',
          note: 'Use the signing secret from Stripe Dashboard or create a new endpoint',
        });
      }

      // Return existing endpoint
      return NextResponse.json({
        success: true,
        message: 'Webhook endpoint already exists',
        endpoint: {
          id: existingEndpoint.id,
          url: existingEndpoint.url,
          status: existingEndpoint.status,
          enabled_events: existingEndpoint.enabled_events,
        },
        signing_secret: existingEndpoint.secret || 'Check Stripe Dashboard for secret',
        note: 'To get the signing secret, go to Stripe Dashboard → Developers → Webhooks → Click on the endpoint → Reveal signing secret',
      });
    }

    // Create new webhook endpoint
    let webhookEndpoint: Stripe.WebhookEndpoint;
    try {
      webhookEndpoint = await stripe.webhookEndpoints.create({
        url: endpointUrl,
        enabled_events: eventsToListen,
        description: 'AdSparker Subscription Webhook',
        api_version: '2025-08-27.basil',
      });
    } catch (stripeError: any) {
      // Handle Stripe-specific errors
      if (stripeError.code === 'parameter_invalid_url' || 
          stripeError.message?.includes('publicly accessible') ||
          stripeError.message?.includes('Invalid URL')) {
        return NextResponse.json(
          {
            error: 'Webhook URL must be publicly accessible',
            details: stripeError.message || 'URL must be accessible from the internet',
            solutions: {
              local_development: {
                method: 'Use Stripe CLI',
                description: 'For local testing, use Stripe CLI to forward webhooks',
                steps: [
                  '1. Install Stripe CLI: https://github.com/stripe/stripe-cli',
                  '2. Run: stripe listen --forward-to localhost:3000/api/subscriptions/webhook',
                  '3. Use the webhook signing secret from CLI output',
                  '4. Add to .env.local: STRIPE_WEBHOOK_SECRET=whsec_...'
                ],
                alternative: 'Or use ngrok to create a public tunnel: ngrok http 3000'
              },
              production: {
                method: 'Use production URL',
                description: 'For production, use your actual domain',
                steps: [
                  '1. Deploy your app to production',
                  '2. Use production URL: https://yourdomain.com/api/subscriptions/webhook',
                  '3. Make sure the URL is accessible from the internet'
                ]
              }
            },
            current_url: endpointUrl,
            note: 'Stripe requires webhook URLs to be publicly accessible. Localhost URLs won\'t work.'
          },
          { status: 400 }
        );
      }
      // Re-throw other errors
      throw stripeError;
    }

    // Note: Stripe doesn't return the signing secret immediately after creation
    // You need to retrieve it separately or get it from the dashboard
    let signingSecret = null;
    
    try {
      // Try to retrieve the signing secret
      // Note: This might not work immediately, may need to check dashboard
      const endpointDetails = await stripe.webhookEndpoints.retrieve(webhookEndpoint.id);
      signingSecret = endpointDetails.secret || null;
    } catch (error) {
      console.log('Could not retrieve signing secret immediately');
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook endpoint created successfully',
      endpoint: {
        id: webhookEndpoint.id,
        url: webhookEndpoint.url,
        status: webhookEndpoint.status,
        enabled_events: webhookEndpoint.enabled_events,
      },
      signing_secret: signingSecret || 'Check Stripe Dashboard for secret',
      instructions: {
        step1: 'Go to Stripe Dashboard → Developers → Webhooks',
        step2: `Find endpoint: ${webhookEndpoint.id}`,
        step3: 'Click on the endpoint → Click "Reveal" next to Signing secret',
        step4: 'Copy the signing secret (starts with whsec_)',
        step5: 'Add to .env.local: STRIPE_WEBHOOK_SECRET=whsec_...',
      },
    });
  } catch (error: any) {
    console.error('Stripe webhook setup error:', error);
    return NextResponse.json(
      {
        error: 'Failed to setup Stripe webhook',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to retrieve existing webhook endpoints
 */
export async function GET(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe is not initialized. Please check STRIPE_SECRET_KEY.' },
        { status: 500 }
      );
    }

    // Get all webhook endpoints
    const endpoints = await stripe.webhookEndpoints.list({
      limit: 100,
    });

    // Filter for subscription-related endpoints
    const subscriptionEndpoints = endpoints.data.filter((endpoint) =>
      endpoint.url.includes('subscriptions') || 
      endpoint.description?.toLowerCase().includes('subscription') ||
      endpoint.description?.toLowerCase().includes('adsparker')
    );

    return NextResponse.json({
      total_endpoints: endpoints.data.length,
      subscription_endpoints: subscriptionEndpoints.map((endpoint) => ({
        id: endpoint.id,
        url: endpoint.url,
        status: endpoint.status,
        enabled_events: endpoint.enabled_events,
        created: new Date(endpoint.created * 1000).toISOString(),
      })),
      all_endpoints: endpoints.data.map((endpoint) => ({
        id: endpoint.id,
        url: endpoint.url,
        status: endpoint.status,
      })),
      note: 'To get signing secret, go to Stripe Dashboard → Developers → Webhooks → Click on endpoint → Reveal signing secret',
    });
  } catch (error: any) {
    console.error('Error fetching webhook endpoints:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch webhook endpoints',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE endpoint to remove a webhook endpoint
 */
export async function DELETE(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe is not initialized. Please check STRIPE_SECRET_KEY.' },
        { status: 500 }
      );
    }

    // Parse request body - optimized for Postman testing
    let body: any = {};
    try {
      const contentType = request.headers.get('content-type');
      
      // Only parse if Content-Type is application/json
      if (contentType && contentType.includes('application/json')) {
        try {
          body = await request.json();
        } catch (jsonError) {
          // If body is invalid JSON, return error
          console.error('Invalid JSON body:', jsonError);
          return NextResponse.json(
            { error: 'Invalid request body. Please send valid JSON.' },
            { status: 400 }
          );
        }
      } else {
        // If no Content-Type or not JSON, return error (endpoint_id is required)
        return NextResponse.json(
          { error: 'Content-Type must be application/json. Endpoint ID is required.' },
          { status: 400 }
        );
      }
    } catch (parseError: any) {
      // If body is invalid, return error
      console.error('Body parsing error:', parseError.message);
      return NextResponse.json(
        { error: 'Invalid request body. Please send valid JSON.' },
        { status: 400 }
      );
    }

    const { endpoint_id } = body;

    if (!endpoint_id) {
      return NextResponse.json(
        { error: 'Endpoint ID is required' },
        { status: 400 }
      );
    }

    // Get endpoint details before deleting (to preserve URL info)
    let endpointUrl = '';
    try {
      const endpointDetails = await stripe.webhookEndpoints.retrieve(endpoint_id);
      endpointUrl = endpointDetails.url;
    } catch (error) {
      console.log('Could not retrieve endpoint details before deletion');
    }

    // Delete webhook endpoint
    const deletedEndpoint = await stripe.webhookEndpoints.del(endpoint_id);

    return NextResponse.json({
      success: true,
      message: 'Webhook endpoint deleted successfully',
      endpoint: {
        id: deletedEndpoint.id,
        url: endpointUrl || 'N/A',
        deleted: deletedEndpoint.deleted,
      },
    });
  } catch (error: any) {
    console.error('Error deleting webhook endpoint:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete webhook endpoint',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

