import { NextResponse } from 'next/server';
import OSS from 'ali-oss';
import { auth } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const data = await request.formData();
    const file: File | null = data.get('file') as unknown as File;

    if (!file) {
      return NextResponse.json({ error: 'No file received.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const extension = file.name.split('.').pop();
    const filename = `uploads/product-${uniqueSuffix}.${extension}`;

    // Ensure required env vars are set
    if (!process.env.OSS_REGION || !process.env.OSS_ACCESS_KEY_ID || !process.env.OSS_ACCESS_KEY_SECRET || !process.env.OSS_BUCKET) {
      console.error('Missing Aliyun OSS environment variables');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Initialize OSS client
    const client = new OSS({
      region: process.env.OSS_REGION,
      accessKeyId: process.env.OSS_ACCESS_KEY_ID,
      accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
      bucket: process.env.OSS_BUCKET,
    });

    // Upload to OSS
    const result = await client.put(filename, buffer);

    // Convert http to https for security if necessary, though ali-oss usually returns http by default depending on config
    let finalUrl = result.url.replace(/^http:\/\//i, 'https://');
    
    if (process.env.OSS_CDN_DOMAIN) {
      finalUrl = `https://${process.env.OSS_CDN_DOMAIN}/${filename}`;
    }

    // Return the full URL to be saved in database
    return NextResponse.json({ url: finalUrl });
  } catch (error) {
    console.error('Upload Error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
