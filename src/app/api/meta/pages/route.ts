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
            console.error('❌ Error fetching user profile in /api/meta/pages:', {
                error: profileError,
                message: profileError?.message,
                code: profileError?.code,
                hasProfile: !!profile,
            });
            return NextResponse.json(
                { 
                    error: 'User profile not found',
                    details: profileError?.message || 'Profile not found',
                },
                { status: 404 }
            );
        }

        if (!profile.meta_connected || !profile.meta_accounts || (Array.isArray(profile.meta_accounts) ? profile.meta_accounts.length === 0 : !profile.meta_accounts)) {
            console.log('⚠️ Meta account not connected in /api/meta/pages:', {
                meta_connected: profile.meta_connected,
                hasMetaAccounts: !!profile.meta_accounts,
                metaAccountsType: typeof profile.meta_accounts,
                metaAccountsLength: Array.isArray(profile.meta_accounts) ? profile.meta_accounts.length : 'not array',
            });
            return NextResponse.json(
                { error: 'Meta account not connected' },
                { status: 400 }
            );
        }

        // Get the access token from the first Meta account
        const metaAccount = Array.isArray(profile.meta_accounts)
            ? profile.meta_accounts[0]
            : profile.meta_accounts;

        const accessToken = metaAccount?.access_token;

        if (!accessToken) {
            console.error('❌ Meta access token not found in /api/meta/pages:', {
                hasMetaAccount: !!metaAccount,
                metaAccountKeys: metaAccount ? Object.keys(metaAccount) : [],
            });
            return NextResponse.json(
                { error: 'Meta access token not found' },
                { status: 400 }
            );
        }

        console.log('🔍 Fetching Facebook pages with access token...');

        // Fetch pages using multiple methods
        const allPages: any[] = [];

        try {
            // Method 1: Get pages from me/accounts
            console.log('📤 Method 1: Fetching pages from me/accounts...');
            const pagesResponse = await fetch(
                `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,category&access_token=${accessToken}`
            );
            const pagesData = await pagesResponse.json();
            
            console.log('📥 Method 1 response:', {
                status: pagesResponse.status,
                ok: pagesResponse.ok,
                hasError: !!pagesData.error,
                pagesCount: pagesData.data?.length || 0,
                error: pagesData.error,
            });

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
                console.log(`✅ Method 1: Added ${pagesData.data.length} pages`);
            } else if (pagesData.error) {
                console.error('❌ Method 1 Facebook API error:', pagesData.error);
            }
        } catch (error: any) {
            console.error('❌ Method 1 error:', error.message);
        }

        try {
            // Method 2: Get pages from me?fields=accounts
            console.log('📤 Method 2: Fetching pages from me?fields=accounts...');
            const managedPagesResponse = await fetch(
                `https://graph.facebook.com/v18.0/me?fields=accounts{id,name,category}&access_token=${accessToken}`
            );
            const managedPagesData = await managedPagesResponse.json();
            
            console.log('📥 Method 2 response:', {
                status: managedPagesResponse.status,
                ok: managedPagesResponse.ok,
                hasError: !!managedPagesData.error,
                pagesCount: managedPagesData.accounts?.data?.length || 0,
                error: managedPagesData.error,
            });

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
                console.log(`✅ Method 2: Added ${managedPagesData.accounts.data.length} pages`);
            } else if (managedPagesData.error) {
                console.error('❌ Method 2 Facebook API error:', managedPagesData.error);
            }
        } catch (error: any) {
            console.error('❌ Method 2 error:', error.message);
        }

        console.log(`✅ Total pages fetched: ${allPages.length}`);

        return NextResponse.json({
            success: true,
            pages: allPages,
        });
    } catch (error: any) {
        console.error('❌ CRITICAL ERROR in /api/meta/pages:', {
            error: error.message,
            stack: error.stack,
            fullError: error,
        });
        return NextResponse.json(
            { 
                error: 'Internal server error',
                details: error.message,
            },
            { status: 500 }
        );
    }
}

