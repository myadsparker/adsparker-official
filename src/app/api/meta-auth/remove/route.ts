import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * API endpoint to remove Meta account connection from user profile
 * POST /api/meta-auth/remove
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🗑️ Removing Meta account for user:', user.id);

    // Update user profile - remove meta connection
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        meta_accounts: null,
        meta_connected: false,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('❌ Error updating user profile:', updateError);
      return NextResponse.json(
        { error: 'Failed to remove Meta account from profile' },
        { status: 500 }
      );
    }

    console.log('✅ Meta account removed successfully for user:', user.id);

    return NextResponse.json({
      success: true,
      message: 'Meta account removed successfully',
    });
  } catch (error) {
    console.error('❌ Error in remove Meta account API:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

