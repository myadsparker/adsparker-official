import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/meta/pixels?ad_account_id=act_xxx
 * Fetch all pixels from a specific Meta ad account
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient();

        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get ad account ID from query params
        const { searchParams } = new URL(request.url);
        const adAccountId = searchParams.get('ad_account_id');

        if (!adAccountId) {
            return NextResponse.json(
                { error: 'ad_account_id is required' },
                { status: 400 }
            );
        }

        const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('meta_accounts, meta_connected')
            .eq('user_id', user.id)
            .single();

        if (profileError || !profile) {
            return NextResponse.json(
                { error: 'User profile not found' },
                { status: 404 }
            );
        }

        if (!profile.meta_connected || !profile.meta_accounts || (Array.isArray(profile.meta_accounts) ? profile.meta_accounts.length === 0 : !profile.meta_accounts)) {
            return NextResponse.json(
                { error: 'Meta account not connected' },
                { status: 400 }
            );
        }

        // Get the access token from the first Meta account
        const metaAccount = Array.isArray(profile.meta_accounts)
            ? profile.meta_accounts[0]
            : profile.meta_accounts;

        const accessToken = metaAccount.access_token;

        if (!accessToken) {
            return NextResponse.json(
                { error: 'Meta access token not found' },
                { status: 400 }
            );
        }

        // Ensure ad account ID has the 'act_' prefix
        const formattedAdAccountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;

        // Fetch pixels from Meta API
        // Pixels are associated with ad accounts: /act_{ad_account_id}/adspixels
        const pixelsResponse = await fetch(
            `https://graph.facebook.com/v18.0/${formattedAdAccountId}/adspixels?fields=id,name,creation_time&access_token=${accessToken}`
        );

        const pixelsData = await pixelsResponse.json();

        if (!pixelsResponse.ok || pixelsData.error) {
            console.error('Meta Pixels API Error:', pixelsData.error);
            return NextResponse.json(
                {
                    error: 'Failed to fetch pixels',
                    details: pixelsData.error?.message || 'Unknown error',
                    metaError: pixelsData.error,
                },
                { status: 400 }
            );
        }

        const pixels = Array.isArray(pixelsData.data) ? pixelsData.data : [];

        return NextResponse.json({
            success: true,
            pixels: pixels,
        });
    } catch (error: any) {
        console.error('Error fetching pixels:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}

