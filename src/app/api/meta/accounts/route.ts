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
            .select('meta_connected, meta_accounts')
            .eq('user_id', user.id)
            .single();

        if (profileError) {
            console.error('❌ Error fetching user profile in /api/meta/accounts:', {
                error: profileError,
                message: profileError.message,
                code: profileError.code,
                details: profileError.details,
                hint: profileError.hint,
            });
            return NextResponse.json(
                { 
                    error: 'Failed to fetch user profile',
                    details: profileError.message,
                },
                { status: 500 }
            );
        }

        let metaAccounts: any[] = [];

        if (profile?.meta_accounts) {
            if (Array.isArray(profile.meta_accounts)) {
                metaAccounts = profile.meta_accounts;
            } else if (typeof profile.meta_accounts === 'string') {
                try {
                    metaAccounts = JSON.parse(profile.meta_accounts);
                } catch (parseError) {
                    console.error('❌ Error parsing meta_accounts JSON:', parseError);
                    metaAccounts = [];
                }
            } else {
                metaAccounts = [profile.meta_accounts];
            }
        }

        console.log('✅ Fetched meta accounts successfully:', {
            connected: Boolean(profile?.meta_connected),
            accountsCount: metaAccounts.length,
        });

        return NextResponse.json({
            connected: Boolean(profile?.meta_connected),
            accounts: metaAccounts,
        });
    } catch (error: any) {
        console.error('❌ CRITICAL ERROR in /api/meta/accounts:', {
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


