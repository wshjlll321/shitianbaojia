import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
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
    const filename = `product-${uniqueSuffix}.${extension}`;

    // Define upload directory
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    
    // Create directory if it doesn't exist
    if (!existsSync(uploadDir)) {
      mkdirSync(uploadDir, { recursive: true });
    }

    // Save the file
    const path = join(uploadDir, filename);
    await writeFile(path, buffer);

    // Return the relative URL to be saved in database
    return NextResponse.json({ url: `/uploads/${filename}` });
  } catch (error) {
    console.error('Upload Error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
