import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function buildPromptFromPosterSpec(urlAnalysis: any): Promise<string> {
  const spec = urlAnalysis?.poster_spec || urlAnalysis?.posterSpec || {};
  const snap = urlAnalysis?.snapshotanalysis || {};
  let research = urlAnalysis?.research_data;
  if (typeof research === 'string') {
    try {
      research = JSON.parse(research);
    } catch {
      research = undefined;
    }
  }

  const aspectRatios = Array.isArray(spec.aspect_ratios)
    ? spec.aspect_ratios.join(', ')
    : '1:1, 4:5';

  const paletteArr: string[] = (spec.palette || snap.color_palette || []).slice(
    0,
    6
  );
  const palette = paletteArr.join(', ');

  const headlineFont = spec.typography?.headline || 'bold modern sans-serif';
  const bodyFont = spec.typography?.body || 'clean sans-serif';
  const layout = spec.layout || 'center-card';

  const nlp = research?.nlpAnalysis || {};
  const businessType: string = nlp?.businessType || '';
  const targetAudience: string = nlp?.targetAudience || '';
  const advantages: string[] = Array.isArray(nlp?.competitiveAdvantages)
    ? nlp.competitiveAdvantages.slice(0, 3)
    : [];
  const websiteTitle: string = research?.websiteData?.title || '';
  const websiteDesc: string = research?.websiteData?.description || '';

  function pickCta(): string {
    if (spec?.cta?.label) return spec.cta.label;
    const bt = businessType.toLowerCase();
    if (bt.includes('saas') || bt.includes('software')) return 'Book a Demo';
    if (bt.includes('service')) return 'Get a Quote';
    if (bt.includes('education') || bt.includes('course')) return 'Enroll Now';
    if (bt.includes('app')) return 'Download App';
    return 'Shop Now';
  }

  const ctaLabel = pickCta();
  const ctaBg = spec.cta?.bg || paletteArr[3] || paletteArr[0] || '#2F80ED';
  const ctaFg = spec.cta?.fg || '#FFFFFF';
  const ctaRadius = typeof spec.cta?.radius === 'number' ? spec.cta.radius : 14;

  const copyHeadline =
    spec.copy?.headline ||
    (websiteTitle ? `${websiteTitle}` : advantages[0] || 'Unlock Value Today');
  const copySubhead =
    spec.copy?.subhead ||
    (advantages.length
      ? advantages.join(' • ')
      : websiteDesc || 'Built for your needs');
  const copyProof = spec.copy?.proof || '';
  const disclaimer = spec.copy?.disclaimer || '';

  const tone = snap.tone || 'modern, clean';
  const iconography = spec.iconography_style || 'brand-aligned icons';
  const imagery =
    spec.imagery_style ||
    (businessType ? `${businessType} visuals` : 'high-quality product photo');
  const effectsShadow = spec.effects?.shadow || 'soft-md';
  const overlay = spec.effects?.overlay || 'none';

  const negative = Array.isArray(spec.negative_prompts)
    ? spec.negative_prompts.join(', ')
    : 'blurry text, low-res, jpeg artifacts, extra limbs, warped text';

  const brandIntro =
    websiteTitle || businessType
      ? `For ${websiteTitle || businessType}, targeting ${targetAudience || 'core audience'}.`
      : '';

  return [
    `Design a Facebook ad poster image in a ${tone} style. ${brandIntro}`,
    `Prioritize aspect ratios: ${aspectRatios}. Use brand colors: ${palette}.`,
    `Layout: ${layout}. Typography: headline ${headlineFont}, body ${bodyFont}.`,
    `CTA: \"${ctaLabel}\" with background ${ctaBg}, text ${ctaFg}, border radius ${ctaRadius}px.`,
    `Copy: Headline: \"${copyHeadline}\"; Subhead: \"${copySubhead}\"; Social proof: \"${copyProof}\"; Disclaimer: \"${disclaimer}\".`,
    `Imagery: ${imagery}. Iconography: ${iconography}.`,
    `Effects: shadow ${effectsShadow}, overlay ${overlay}.`,
    `Respect safe margins; high readability for feed; balanced hierarchy.`,
    `Avoid: ${negative}.`,
  ].join(' ');
}

async function uploadBase64PngToSupabase(base64: string, keyPrefix: string) {
  const buffer = Buffer.from(base64, 'base64');
  const ts = Date.now();
  const filePath = `${keyPrefix}/poster-${ts}.png`;

  const { error } = await supabase.storage
    .from('project-files')
    .upload(filePath, buffer, { contentType: 'image/png', upsert: false });

  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from('project-files')
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const projectId: string | undefined = body.project_id || body.projectId;
    if (!projectId) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      );
    }

    const { data: project, error } = await supabase
      .from('projects')
      .select('url_analysis, url_analysis->>website_url')
      .eq('project_id', projectId)
      .single();

    if (error || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    let urlAnalysis: any = project.url_analysis ?? {};
    if (typeof urlAnalysis === 'string') {
      try {
        urlAnalysis = JSON.parse(urlAnalysis);
      } catch {
        urlAnalysis = {};
      }
    }

    if (!urlAnalysis?.poster_spec && !urlAnalysis?.snapshotanalysis) {
      return NextResponse.json(
        { error: 'poster_spec or snapshotanalysis not found in url_analysis' },
        { status: 400 }
      );
    }

    const prompt = await buildPromptFromPosterSpec(urlAnalysis);

    // Choose size based on aspect ratio preference (map to supported sizes)
    const spec = urlAnalysis?.poster_spec || {};
    const ratios: string[] = Array.isArray(spec.aspect_ratios)
      ? spec.aspect_ratios
      : [];
    let size:
      | '1024x1024'
      | '1536x1024'
      | '1024x1536'
      | '1792x1024'
      | '1024x1792' = '1024x1024';
    if (ratios.includes('9:16')) size = '1024x1792';
    else if (ratios.includes('16:9')) size = '1536x1024';
    else if (ratios.includes('4:5')) size = '1024x1536';
    else if (ratios.includes('3:2')) size = '1536x1024';

    const image = await openai.images.generate({
      model: 'gpt-image-1',
      prompt,
      size,
      quality: 'high',
      n: 1,
    });

    const data0 = image.data?.[0];
    if (!data0) {
      return NextResponse.json(
        { error: 'Image not generated' },
        { status: 500 }
      );
    }

    let base64: string | undefined;
    if (data0.b64_json) base64 = data0.b64_json;
    else if (data0.url) {
      const resp = await fetch(data0.url);
      const buf = await resp.arrayBuffer();
      base64 = Buffer.from(buf).toString('base64');
    }

    if (!base64) {
      return NextResponse.json(
        { error: 'No image data from OpenAI' },
        { status: 500 }
      );
    }

    const keyPrefix = `generated-posters/${projectId}`;
    const publicUrl = await uploadBase64PngToSupabase(base64, keyPrefix);

    return NextResponse.json({
      success: true,
      project_id: projectId,
      prompt,
      image_url: publicUrl,
      model: 'gpt-image-1',
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error('generate-poster (here) error', e);
    return NextResponse.json(
      { error: 'Failed to generate poster' },
      { status: 500 }
    );
  }
}
