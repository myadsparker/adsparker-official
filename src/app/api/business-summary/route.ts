import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function getProjectUrlAnalysis(projectId: string) {
  if (!projectId) throw new Error('Project ID is required');

  const { data: project, error } = await supabase
    .from('projects')
    .select('url_analysis')
    .eq('project_id', projectId)
    .single();

  if (error) throw error;
  if (!project || !project.url_analysis)
    throw new Error('URL analysis not found');

  // Check if persona data exists (from persona-creation route)
  if (!project.url_analysis.personaData) {
    throw new Error(
      'Persona data not found. Please run the persona-creation route first.'
    );
  }

  return project;
}

async function generateProjectName(urlAnalysis: any) {
  const businessAnalysis = urlAnalysis.businessAnalysis;

  const prompt = `
Based on the business analysis data below, generate a simple and clear project name for this business.

Business Analysis:
- Business Type: ${businessAnalysis.businessType}
- Products/Services: ${businessAnalysis.productsServices?.join(', ') || 'Various services'}
- Target Market: ${businessAnalysis.targetMarket}
- Unique Value Proposition: ${businessAnalysis.uniqueValueProposition}

Generate a project name that:
1. Is simple and clear (2-4 words maximum)
2. Reflects the actual business type
3. Is professional and appropriate
4. Easy to remember and understand
5. No dates, years, or temporal references
6. Focus on the core business identity

Examples of good project names:
- "E-commerce Store"
- "Restaurant Business" 
- "Fitness Center"
- "SaaS Platform"
- "Consulting Firm"

Respond with only the project name, no additional text or formatting.
`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'You are a business naming expert. Generate simple, clear, and professional project names based on business analysis data.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.3,
    max_tokens: 20,
  });

  const projectName = response.choices[0]?.message?.content?.trim();
  if (!projectName) {
    throw new Error('Failed to generate project name from OpenAI');
  }

  console.log(`📝 Generated project name: ${projectName}`);
  return projectName;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { project_id } = body;

    if (!project_id)
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );

    console.log(
      `🚀 Starting project name generation for project: ${project_id}`
    );

    // Step 1: Fetch URL analysis with research data
    const project = await getProjectUrlAnalysis(project_id);
    const urlAnalysis = project.url_analysis;

    // Step 2: Generate project name using ChatGPT
    console.log(`🎯 Generating project name...`);
    const projectName = await generateProjectName(urlAnalysis);

    // Step 3: Create campaign proposal with only project name
    const campaignProposal = {
      campaignName: projectName,
      generatedAt: new Date().toISOString(),
      source: 'business-summary-route',
    };

    // Step 4: Save to campaign_proposal column
    console.log(`💾 Saving project name to campaign_proposal...`);
    const { error: updateError } = await supabase
      .from('projects')
      .update({
        campaign_proposal: campaignProposal,
      })
      .eq('project_id', project_id);

    if (updateError) throw updateError;

    console.log(`✅ Project name generated and saved successfully!`);

    return NextResponse.json({
      message: 'Project name generated and saved successfully',
      projectName,
      savedTo: 'campaign_proposal',
    });
  } catch (error: any) {
    console.error('Error in business-summary API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
