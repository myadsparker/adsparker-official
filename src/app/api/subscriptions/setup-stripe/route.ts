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
    apiVersion: '2024-06-20',
  });
} catch (error) {
  console.error('Failed to initialize Stripe:', error);
}

/**
 * Setup Stripe products and prices programmatically
 * This creates the Monthly and Annual subscription products if they don't exist
 */
export async function POST(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe is not initialized. Please check STRIPE_SECRET_KEY.' },
        { status: 500 }
      );
    }

    const results = {
      monthly: null as any,
      annual: null as any,
      errors: [] as string[],
    };

    // Check if products already exist
    const existingProducts = await stripe.products.list({
      limit: 100,
    });

    // Find existing products
    let monthlyProduct = existingProducts.data.find(
      (p) => p.name?.toLowerCase().includes('monthly') || p.name?.toLowerCase().includes('adsparker monthly')
    );
    let annualProduct = existingProducts.data.find(
      (p) => p.name?.toLowerCase().includes('annual') || p.name?.toLowerCase().includes('adsparker annual')
    );

    // Create Monthly Product if it doesn't exist
    if (!monthlyProduct) {
      try {
        monthlyProduct = await stripe.products.create({
          name: 'AdSparker Monthly Plan',
          description: 'Monthly subscription at $199/month - Unlimited ad projects, 1 Facebook account, $150 daily budget cap',
        });
        console.log('✅ Created monthly product:', monthlyProduct.id);
      } catch (error: any) {
        results.errors.push(`Failed to create monthly product: ${error.message}`);
      }
    } else {
      console.log('✅ Monthly product already exists:', monthlyProduct.id);
    }

    // Create Monthly Price if it doesn't exist
    if (monthlyProduct) {
      const existingMonthlyPrices = await stripe.prices.list({
        product: monthlyProduct.id,
        limit: 100,
      });

      const monthlyPrice = existingMonthlyPrices.data.find(
        (p) => p.recurring?.interval === 'month' && p.unit_amount === 19900 // $199.00 in cents
      );

      if (!monthlyPrice) {
        try {
          const newMonthlyPrice = await stripe.prices.create({
            product: monthlyProduct.id,
            unit_amount: 19900, // $199.00
            currency: 'usd',
            recurring: {
              interval: 'month',
            },
          });
          results.monthly = {
            product_id: monthlyProduct.id,
            price_id: newMonthlyPrice.id,
            amount: '$199/month',
          };
          console.log('✅ Created monthly price:', newMonthlyPrice.id);
        } catch (error: any) {
          results.errors.push(`Failed to create monthly price: ${error.message}`);
        }
      } else {
        results.monthly = {
          product_id: monthlyProduct.id,
          price_id: monthlyPrice.id,
          amount: `$${(monthlyPrice.unit_amount || 0) / 100}/month`,
        };
        console.log('✅ Monthly price already exists:', monthlyPrice.id);
      }
    }

    // Create Annual Product if it doesn't exist
    if (!annualProduct) {
      try {
        annualProduct = await stripe.products.create({
          name: 'AdSparker Annual Plan',
          description: 'Annual subscription at $109/month (billed annually at $1,308) - Unlimited ad projects, 1 Facebook account, $150 daily budget cap',
        });
        console.log('✅ Created annual product:', annualProduct.id);
      } catch (error: any) {
        results.errors.push(`Failed to create annual product: ${error.message}`);
      }
    } else {
      console.log('✅ Annual product already exists:', annualProduct.id);
    }

    // Create Annual Price if it doesn't exist
    if (annualProduct) {
      const existingAnnualPrices = await stripe.prices.list({
        product: annualProduct.id,
        limit: 100,
      });

      const annualPrice = existingAnnualPrices.data.find(
        (p) => p.recurring?.interval === 'year' && p.unit_amount === 130800 // $1,308.00 in cents
      );

      if (!annualPrice) {
        try {
          const newAnnualPrice = await stripe.prices.create({
            product: annualProduct.id,
            unit_amount: 130800, // $1,308.00 (or $109/month × 12)
            currency: 'usd',
            recurring: {
              interval: 'year',
            },
          });
          results.annual = {
            product_id: annualProduct.id,
            price_id: newAnnualPrice.id,
            amount: '$1,308/year ($109/month)',
          };
          console.log('✅ Created annual price:', newAnnualPrice.id);
        } catch (error: any) {
          results.errors.push(`Failed to create annual price: ${error.message}`);
        }
      } else {
        results.annual = {
          product_id: annualProduct.id,
          price_id: annualPrice.id,
          amount: `$${(annualPrice.unit_amount || 0) / 100}/year`,
        };
        console.log('✅ Annual price already exists:', annualPrice.id);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Stripe products and prices created successfully',
      results,
      environmentVariables: {
        STRIPE_MONTHLY_PRICE_ID: results.monthly?.price_id || 'Not created',
        STRIPE_ANNUAL_PRICE_ID: results.annual?.price_id || 'Not created',
      },
    });
  } catch (error: any) {
    console.error('Stripe setup error:', error);
    return NextResponse.json(
      {
        error: 'Failed to setup Stripe products',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to retrieve existing Stripe products and prices
 */
export async function GET(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe is not initialized. Please check STRIPE_SECRET_KEY.' },
        { status: 500 }
      );
    }

    // Get all products
    const products = await stripe.products.list({
      limit: 100,
    });

    // Get all prices
    const prices = await stripe.prices.list({
      limit: 100,
    });

    // Find monthly and annual prices
    const monthlyPrice = prices.data.find(
      (p) => p.recurring?.interval === 'month' && p.active
    );
    const annualPrice = prices.data.find(
      (p) => p.recurring?.interval === 'year' && p.active
    );

    return NextResponse.json({
      products: products.data.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
      })),
      prices: {
        monthly: monthlyPrice
          ? {
              id: monthlyPrice.id,
              amount: `$${(monthlyPrice.unit_amount || 0) / 100}`,
              interval: monthlyPrice.recurring?.interval,
            }
          : null,
        annual: annualPrice
          ? {
              id: annualPrice.id,
              amount: `$${(annualPrice.unit_amount || 0) / 100}`,
              interval: annualPrice.recurring?.interval,
            }
          : null,
      },
      environmentVariables: {
        STRIPE_MONTHLY_PRICE_ID: monthlyPrice?.id || 'Not found',
        STRIPE_ANNUAL_PRICE_ID: annualPrice?.id || 'Not found',
      },
    });
  } catch (error: any) {
    console.error('Error fetching Stripe products:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch Stripe products',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

