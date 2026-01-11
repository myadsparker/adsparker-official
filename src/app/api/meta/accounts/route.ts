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
            return NextResponse.json(
                { error: 'Failed to fetch user profile' },
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
                } catch {
                    metaAccounts = [];
                }
            } else {
                metaAccounts = [profile.meta_accounts];
            }
        }

        return NextResponse.json({
            connected: Boolean(profile?.meta_connected),
            accounts: metaAccounts,
        });
    } catch (error) {
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}


