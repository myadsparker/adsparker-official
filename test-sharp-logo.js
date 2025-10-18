// Test Sharp logo conversion
const sharp = require('sharp');
const https = require('https');

console.log('🧪 Testing Sharp logo conversion...\n');

// Test logo URL
const testLogoUrl =
  'https://cdn.prod.website-files.com/649c1bc8c68d9600b9a74616/686b6f82bf8b5d7ad3620882_image_3-removebg-preview%201.avif';

console.log('📥 Downloading test logo...');

https
  .get(testLogoUrl, res => {
    const chunks = [];

    res.on('data', chunk => chunks.push(chunk));

    res.on('end', async () => {
      const originalBuffer = Buffer.concat(chunks);
      console.log(
        `✅ Downloaded: ${(originalBuffer.length / 1024).toFixed(2)} KB\n`
      );

      try {
        console.log('🎨 Converting to optimized PNG...');

        const pngBuffer = await sharp(originalBuffer)
          .png({
            quality: 90,
            compressionLevel: 9,
            adaptiveFiltering: true,
          })
          .resize(1024, 1024, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .toBuffer();

        const pngSizeKB = (pngBuffer.length / 1024).toFixed(2);
        console.log(`✅ Converted to PNG: ${pngSizeKB} KB`);
        console.log(
          `📊 Size reduction: ${((1 - pngBuffer.length / originalBuffer.length) * 100).toFixed(1)}%\n`
        );

        console.log('🎉 Sharp is working correctly!');
        console.log('✅ Logo processing will work in your API');
      } catch (error) {
        console.error('❌ Sharp conversion failed:', error.message);
        process.exit(1);
      }
    });
  })
  .on('error', error => {
    console.error('❌ Download failed:', error.message);
    process.exit(1);
  });
