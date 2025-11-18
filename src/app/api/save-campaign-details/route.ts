import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { project_id, startDate, endDate, selectedGoal, selectedCta, businessSummary } = body;

    // Validate required fields
    if (
      !project_id ||
      !startDate ||
      !endDate ||
      !selectedGoal ||
      !selectedCta
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Get existing campaign_analysis data
    const { data: existingData, error: fetchError } = await supabase
      .from('projects')
      .select('campaign_proposal')
      .eq('project_id', project_id)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Update campaign_proposal with new form data
    const updatedCampaignProposal = {
      ...existingData?.campaign_proposal,
      start_date: startDate,
      end_date: endDate,
      ad_goal: selectedGoal,
      cta_button_text: selectedCta,
      business_summary: businessSummary || '',
      updated_at: new Date().toISOString(),
    };

    // Save to database
    const { error: updateError } = await supabase
      .from('projects')
      .update({
        campaign_proposal: updatedCampaignProposal,
        updated_at: new Date().toISOString(),
      })
      .eq('project_id', project_id);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to save campaign details' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Campaign details saved successfully',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
