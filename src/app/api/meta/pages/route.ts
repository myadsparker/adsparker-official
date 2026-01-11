import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

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

        // Fetch pages using multiple methods
        const allPages: any[] = [];

        try {
            // Method 1: Get pages from me/accounts
            const pagesResponse = await fetch(
                `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,category&access_token=${accessToken}`
            );
            const pagesData = await pagesResponse.json();
            if (pagesResponse.ok && pagesData.data && Array.isArray(pagesData.data)) {
                pagesData.data.forEach((page: any) => {
                    if (!allPages.find(p => p.id === page.id)) {
                        allPages.push({
                            id: page.id,
                            name: page.name,
                            category: page.category || null,
                        });
                    }
                });
            }
        } catch (error) {
        }

        try {
            // Method 2: Get pages from me?fields=accounts
            const managedPagesResponse = await fetch(
                `https://graph.facebook.com/v18.0/me?fields=accounts{id,name,category}&access_token=${accessToken}`
            );
            const managedPagesData = await managedPagesResponse.json();
            if (managedPagesResponse.ok && managedPagesData.accounts && managedPagesData.accounts.data && Array.isArray(managedPagesData.accounts.data)) {
                managedPagesData.accounts.data.forEach((page: any) => {
                    if (!allPages.find(p => p.id === page.id)) {
                        allPages.push({
                            id: page.id,
                            name: page.name,
                            category: page.category || null,
                        });
                    }
                });
            }
        } catch (error) {
        }

        return NextResponse.json({
            success: true,
            pages: allPages,
        });
    } catch (error) {
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

