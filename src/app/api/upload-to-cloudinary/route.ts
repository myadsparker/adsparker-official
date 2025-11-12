import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const projectId = formData.get('project_id') as string;

    if (!file || !projectId) {
      return NextResponse.json(
        { error: 'File and project_id are required' },
        { status: 400 }
      );
    }

    // Validate file type
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    
    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: 'Only image and video files are allowed' },
        { status: 400 }
      );
    }

    // Validate file size
    const maxImageSize = 2 * 1024 * 1024; // 2 MB
    const maxVideoSize = 100 * 1024 * 1024; // 100 MB for Cloudinary
    
    if (isImage && file.size > maxImageSize) {
      return NextResponse.json(
        { error: 'Image file size must be less than 2MB' },
        { status: 400 }
      );
    }
    
    if (isVideo && file.size > maxVideoSize) {
      return NextResponse.json(
        { error: 'Video file size must be less than 100MB' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: isVideo ? 'video' : 'image',
          folder: `adsparker/${projectId}`,
          chunk_size: 6000000, // 6MB chunks for large files
          timeout: 120000, // 2 minutes timeout
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      uploadStream.end(buffer);
    });

    const cloudinaryUrl = (uploadResult as any).secure_url;
    
    console.log('✅ File uploaded to Cloudinary:', cloudinaryUrl);

    return NextResponse.json({
      success: true,
      fileUrl: cloudinaryUrl,
      fileName: file.name,
      fileType: isVideo ? 'video' : 'image',
      cloudinaryData: uploadResult,
    });
  } catch (error: any) {
    console.error('Error uploading to Cloudinary:', error);
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    );
  }
}

