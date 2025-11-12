# Cloudinary Setup Guide

This project uses Cloudinary for video uploads **directly from the frontend**. Follow these steps to set up Cloudinary:

## 1. Create a Cloudinary Account

1. Go to [Cloudinary](https://cloudinary.com/)
2. Sign up for a free account
3. After signing up, you'll be taken to the dashboard

## 2. Get Your Cloud Name

On the Cloudinary dashboard, you'll see your **Cloud Name** at the top. Copy it.

## 3. Create an Unsigned Upload Preset

For frontend uploads to work, you need to create an **unsigned upload preset**:

1. In Cloudinary dashboard, go to **Settings** (gear icon)
2. Click on the **Upload** tab
3. Scroll down to **Upload presets**
4. Click **Add upload preset**
5. Set the following:
   - **Signing Mode**: Select **Unsigned**
   - **Upload preset name**: Enter something like `adsparker_unsigned` (or any name you prefer)
   - **Folder**: Leave empty or set a default folder
   - Click **Save**
6. Copy the **preset name** you just created

## 4. Add Environment Variables

Add these to your `.env.local` file:

```env
# Cloudinary Configuration (Frontend Upload)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_upload_preset_name
```

**Important Notes:**
- Use `NEXT_PUBLIC_` prefix so they're accessible in the browser
- Replace `your_cloud_name` with your actual Cloud Name
- Replace `your_upload_preset_name` with the preset name you created (e.g., `adsparker_unsigned`)
- **DO NOT** include API Key or API Secret here (not needed for frontend uploads)

## 5. Restart Your Development Server

After adding the environment variables, restart your dev server:

```bash
npm run dev
```

## 6. Test Video Upload

1. Go to the plan page in your project
2. Click "Import Media"
3. Upload a video (up to 100MB)
4. The video will be uploaded **directly to Cloudinary from your browser**
5. The video URL will be saved to Supabase database

## How It Works

### Frontend Upload Architecture

1. **Video Upload (Cloudinary)**:
   - Videos are uploaded **directly from the browser** to Cloudinary
   - No API route involved = **No payload size limits**
   - Uses unsigned upload preset (secure and public)
   - Returns a secure Cloudinary URL

2. **Image Upload (Supabase)**:
   - Images are uploaded **directly from the browser** to Supabase Storage
   - Smaller files, so no issues with size limits
   - Returns a public Supabase URL

3. **Database Update**:
   - After upload, only the **URL** (small text) is sent to the API
   - API adds the URL to the database with proper permissions
   - No RLS (Row-Level Security) issues

## Features

- **Images**: Uploaded to Supabase Storage (max 2MB)
- **Videos**: Uploaded to Cloudinary via frontend (max 100MB)
- **Supported Video Formats**: MP4, MOV, AVI, WEBM
- **Video Storage**: All videos are stored in folders: `adsparker/{project_id}/`
- **No Server Load**: Files bypass your server completely

## Cloudinary Free Tier Limits

- **Storage**: 25 GB
- **Bandwidth**: 25 GB/month
- **Transformations**: 25,000/month

This is more than enough for most projects. Upgrade if you need more.

## Video URL Format

Videos uploaded to Cloudinary will have URLs like:
```
https://res.cloudinary.com/{cloud_name}/video/upload/adsparker/{project_id}/{video_name}
```

These URLs are automatically saved to your Supabase `projects.files` column.

