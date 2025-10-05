# Google Gemini Setup Guide

## ✅ **Image Generation with Google Gemini**

I've successfully replaced Firecrawl and ChatGPT with **Google Gemini's image generation API** for creating Meta/Facebook ad images!

## 🚀 **Setup Instructions**

### 1. Get Your Google Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Click "Get API Key" in the left sidebar
4. Create a new API key
5. Copy your API key

### 2. Add Environment Variable

Add this to your `.env.local` file:

```bash
GOOGLE_GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Install Required Package

```bash
npm install @google/generative-ai
```

## 🎯 **What Changed**

### ❌ **Removed:**

- Firecrawl API calls
- ChatGPT image generation
- Complex image extraction pipeline

### ✅ **Added:**

- **Google Gemini Image Generation** (Advanced AI!)
- Direct image generation from ad details
- Simplified 3-step process

## 🔄 **New Pipeline**

1. **Step 1**: Generate image with Google Gemini using ad details
2. **Step 2**: Save image to Supabase
3. **Step 3**: Update ad set with image URL

## 💰 **Cost Information**

| Service            | Cost                                      |
| ------------------ | ----------------------------------------- |
| ~~Firecrawl~~      | ~~$20/month~~                             |
| ~~ChatGPT Images~~ | ~~$0.04/image~~                           |
| **Google Gemini**  | **Free tier available, then pay-per-use** |

## 🎨 **Features**

- ✅ **Advanced AI** image generation
- ✅ **High Quality** 1024x1024 images
- ✅ **Business-Specific** scenes based on ad details
- ✅ **Intelligent Composition** (right number of people, angles, etc.)
- ✅ **Meta/Facebook Optimized** for social media ads
- ✅ **Professional Quality** commercial-grade images
- ✅ **Safety Filters** built-in content moderation

## 🚀 **Ready to Use!**

Your image generation is now powered by Google's advanced Gemini AI! Just add your Gemini API key and you're ready to generate Meta/Facebook ad images.
