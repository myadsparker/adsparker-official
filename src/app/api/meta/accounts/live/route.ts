import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

interface MetaAccountData {
    access_token?: string;
    profile?: {
        id?: string;
    };
    ad_accounts?: any[];
    [key: string]: any;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({}));
        const { userId, accessToken: overrideAccessToken } = body as {
            userId?: string;
            accessToken?: string;
        };

        if (!overrideAccessToken && !userId) {
            return NextResponse.json(
                {
                    error:
                        'Missing credentials. Provide either "accessToken" or "userId" in request body.',
                },
                { status: 400 }
            );
        }

        if (userId && !supabaseAdmin) {
            return NextResponse.json(
                { error: 'SUPABASE_SERVICE_ROLE_KEY not configured on server' },
                { status: 500 }
            );
        }

        let accessToken = overrideAccessToken || '';
        let metaAccounts: MetaAccountData[] = [];
        let profileRecordUserId: string | null = null;

        if (!accessToken && userId && supabaseAdmin) {
            const { data: profile, error: profileError } = await supabaseAdmin
                .from('user_profiles')
                .select('user_id, meta_connected, meta_accounts')
                .eq('user_id', userId)
                .single();

            if (profileError || !profile) {
                return NextResponse.json(
                    {
                        error: 'Failed to fetch user profile',
                        details: profileError?.message,
                    },
                    { status: 404 }
                );
            }

            if (!profile.meta_connected) {
                return NextResponse.json(
                    { error: 'Meta account not connected for this user' },
                    { status: 400 }
                );
            }

            profileRecordUserId = profile.user_id;

            if (profile.meta_accounts) {
                if (Array.isArray(profile.meta_accounts)) {
                    metaAccounts = profile.meta_accounts as MetaAccountData[];
                } else if (typeof profile.meta_accounts === 'string') {
                    try {
                        metaAccounts = JSON.parse(
                            profile.meta_accounts
                        ) as MetaAccountData[];
                    } catch {
                        metaAccounts = [];
                    }
                } else {
                    metaAccounts = [profile.meta_accounts as MetaAccountData];
                }
            }

            const primaryAccount =
                metaAccounts.find(
                    account =>
                        typeof account?.access_token === 'string' &&
                        account?.access_token?.length > 0
                ) || null;

            if (!primaryAccount?.access_token) {
                return NextResponse.json(
                    { error: 'Stored Meta account missing access token' },
                    { status: 400 }
                );
            }

            accessToken = primaryAccount.access_token;
        }

        // Fetch ad accounts directly from Meta Graph API
        const adAccountsResponse = await fetch(
            `https://graph.facebook.com/v18.0/me/adaccounts?fields=id,account_id,name,account_status,currency,timezone_id,disable_reason&access_token=${accessToken}`
        );
        const adAccountsData = await adAccountsResponse.json();

        if (!adAccountsResponse.ok || adAccountsData.error) {
            return NextResponse.json(
                {
                    error: 'Failed to fetch ad accounts from Meta',
                    details: adAccountsData.error || adAccountsData,
                },
                { status: 400 }
            );
        }

        const liveAdAccounts = Array.isArray(adAccountsData.data)
            ? adAccountsData.data
            : [];

        // Fetch granted permissions to verify ads_management access
        const permissionsResponse = await fetch(
            `https://graph.facebook.com/v18.0/me/permissions?access_token=${accessToken}`
        );
        const permissionsData = await permissionsResponse.json();

        if (!permissionsResponse.ok || permissionsData.error) {
            return NextResponse.json(
                {
                    error: 'Failed to fetch Meta permissions',
                    details: permissionsData.error || permissionsData,
                },
                { status: 400 }
            );
        }

        const permissionsArray: Array<{ permission: string; status: string }> =
            Array.isArray(permissionsData.data) ? permissionsData.data : [];

        const adsManagementGranted = permissionsArray.some(
            item => item.permission === 'ads_management' && item.status === 'granted'
        );

        const adsReadGranted = permissionsArray.some(
            item => item.permission === 'ads_read' && item.status === 'granted'
        );

        // Update stored meta accounts with the fresh ad accounts list
        if (userId && supabaseAdmin) {
            if (!profileRecordUserId) {
                profileRecordUserId = userId;
            }

            if (metaAccounts.length === 0 && overrideAccessToken) {
                metaAccounts = [
                    {
                        access_token: overrideAccessToken,
                        ad_accounts: [],
                    },
                ];
            }

            const updatedMetaAccounts = metaAccounts.map(account => {
                if (
                    account.access_token === accessToken ||
                    account.access_token === overrideAccessToken
                ) {
                    return {
                        ...account,
                        ad_accounts: liveAdAccounts,
                        updated_at: new Date().toISOString(),
                    };
                }
                return account;
            });

            await supabaseAdmin
                .from('user_profiles')
                .update({
                    meta_accounts: updatedMetaAccounts,
                    meta_connected: true,
                    updated_at: new Date().toISOString(),
                })
                .eq('user_id', profileRecordUserId);
        }

        return NextResponse.json({
            accounts: liveAdAccounts,
            permissions: {
                ads_management: adsManagementGranted,
                ads_read: adsReadGranted,
                raw: permissionsArray,
            },
        });
    } catch (error) {
        console.error('Error fetching live Meta accounts:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

