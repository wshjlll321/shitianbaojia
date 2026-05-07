import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        skus: true,
      },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });
    return NextResponse.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const product = await prisma.product.create({
      data: {
        model: body.model,
        nameZh: body.nameZh,
        nameEn: body.nameEn,
        nameTh: body.nameTh || '',
        category: body.category,
        imageUrl: body.imageUrl || '',
        featuresZh: JSON.stringify(body.featuresZh || []),
        featuresEn: JSON.stringify(body.featuresEn || []),
        featuresTh: JSON.stringify(body.featuresTh || []),
        specsZh: JSON.stringify(body.specsZh || {}),
        specsEn: JSON.stringify(body.specsEn || {}),
        specsTh: JSON.stringify(body.specsTh || {}),
        msrp: body.msrp || 0,
        exwPrice: body.exwPrice || 0,
        fobPrice: body.fobPrice || 0,
      },
    });
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
