import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Extract domain from full URL
function extractDomain(url: string): string {
  try {
    // Remove protocol
    let domain = url.replace(/^https?:\/\//, '');
    // Remove www.
    domain = domain.replace(/^www\./, '');
    // Remove trailing slashes and paths
    domain = domain.split('/')[0];
    // Remove port numbers
    domain = domain.split(':')[0];
    return domain;
  } catch (error) {
    console.error('Error extracting domain:', error);
    return url;
  }
}

// Function to fetch logo from PushOwl API
async function fetchLogoFromPushOwl(
  websiteUrl: string
): Promise<{ url?: string; svg?: string; error?: string }> {
  try {
    const domain = extractDomain(websiteUrl);
    console.log(`🎯 Extracting logo for domain: ${domain}`);

    const apiUrl = `https://getlogo.pushowl.com/api/${domain}`;
    const response = await axios.get(apiUrl, {
      timeout: 10000,
      validateStatus: status => status < 500, // Don't throw on 4xx
    });

    if (response.status === 200 && (response.data?.url || response.data?.svg)) {
      console.log(`✅ Logo found for ${domain}`);
      return response.data;
    } else {
      console.log(`⚠️ No logo found for ${domain}`);
      return { error: 'Logo not found' };
    }
  } catch (error: any) {
    console.error(`❌ Error fetching logo from PushOwl:`, error.message);
    return { error: error.message || 'Failed to fetch logo' };
  }
}

// Function to download logo and save to Supabase
async function downloadAndSaveLogo(
  logoData: { url?: string; svg?: string },
  projectId: string,
  websiteUrl: string
): Promise<string | null> {
  try {
    let logoBuffer: Buffer;
    let contentType: string;
    let fileExtension: string;

    if (logoData.url) {
      // Download logo from URL
      console.log(`📥 Downloading logo from: ${logoData.url}`);
      const response = await axios.get(logoData.url, {
        responseType: 'arraybuffer',
        timeout: 10000,
      });
      logoBuffer = Buffer.from(response.data);

      // Detect content type from response or URL
      contentType = response.headers['content-type'] || 'image/png';
      if (logoData.url.endsWith('.svg')) {
        contentType = 'image/svg+xml';
        fileExtension = 'svg';
      } else if (logoData.url.endsWith('.png')) {
        fileExtension = 'png';
      } else if (
        logoData.url.endsWith('.jpg') ||
        logoData.url.endsWith('.jpeg')
      ) {
        fileExtension = 'jpg';
      } else {
        fileExtension = 'png'; // default
      }
    } else if (logoData.svg) {
      // Save SVG content
      console.log(`📥 Processing SVG logo`);
      logoBuffer = Buffer.from(logoData.svg, 'utf-8');
      contentType = 'image/svg+xml';
      fileExtension = 'svg';
    } else {
      throw new Error('No logo URL or SVG data provided');
    }

    // Save to Supabase storage
    const domain = extractDomain(websiteUrl);
    const timestamp = Date.now();
    const fileName = `${projectId}/logos/${domain}-logo-${timestamp}.${fileExtension}`;

    console.log(`💾 Saving logo to Supabase: ${fileName}`);

    const { error: uploadError } = await supabase.storage
      .from('project-files')
      .upload(fileName, logoBuffer, {
        contentType: contentType,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('project-files')
      .getPublicUrl(fileName);

    console.log(`✅ Logo saved successfully: ${urlData.publicUrl}`);
    return urlData.publicUrl;
  } catch (error: any) {
    console.error('❌ Error downloading/saving logo:', error);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    console.log('🎯 Starting logo-extraction API request...');

    const { project_id } = await req.json();
    console.log(`📋 Request body parsed, project_id: ${project_id}`);

    if (!project_id) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      );
    }

    // Fetch project from Supabase
    console.log(`📊 Fetching project from Supabase...`);
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('url_analysis')
      .eq('project_id', project_id)
      .single();

    if (fetchError || !project) {
      console.error(`❌ Project not found:`, fetchError);
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Parse url_analysis to get website URL
    let urlAnalysis: any = project.url_analysis;
    if (typeof urlAnalysis === 'string') {
      try {
        urlAnalysis = JSON.parse(urlAnalysis);
      } catch {
        return NextResponse.json(
          { error: 'Invalid url_analysis format' },
          { status: 500 }
        );
      }
    }

    const websiteUrl = urlAnalysis?.website_url;
    if (!websiteUrl) {
      return NextResponse.json(
        { error: 'Website URL not found in project data' },
        { status: 400 }
      );
    }

    console.log(`🌐 Website URL: ${websiteUrl}`);

    // Fetch logo from PushOwl API
    console.log(`📡 Fetching logo from PushOwl API...`);
    const logoData = await fetchLogoFromPushOwl(websiteUrl);

    if (logoData.error || (!logoData.url && !logoData.svg)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Logo not found for this website',
          details: logoData.error,
          website_url: websiteUrl,
          domain: extractDomain(websiteUrl),
        },
        { status: 404 }
      );
    }

    // Download and save logo to Supabase
    console.log(`💾 Downloading and saving logo to Supabase...`);
    const logoUrl = await downloadAndSaveLogo(logoData, project_id, websiteUrl);

    if (!logoUrl) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to save logo to storage',
          logo_data: logoData,
        },
        { status: 500 }
      );
    }

    // Update url_analysis with logo URL
    const updatedUrlAnalysis = {
      ...urlAnalysis,
      extracted_logo_url: logoUrl,
      logo_extraction_timestamp: new Date().toISOString(),
    };

    await supabase
      .from('projects')
      .update({ url_analysis: updatedUrlAnalysis })
      .eq('project_id', project_id);

    console.log(`🎉 Logo extraction complete!`);

    return NextResponse.json({
      success: true,
      project_id,
      website_url: websiteUrl,
      domain: extractDomain(websiteUrl),
      logo_url: logoUrl,
      logo_type: logoData.svg ? 'svg' : 'image',
      original_logo_data: logoData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error in logo extraction:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      {
        error: 'Failed to extract logo',
        details: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
