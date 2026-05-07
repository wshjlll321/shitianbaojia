import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateShareToken } from '@/lib/token';
import { generateQuoteNumber } from '@/lib/utils';

export async function GET() {
  try {
    const quotes = await prisma.quote.findMany({
      include: {
        items: {
          include: { product: true },
          orderBy: { sortOrder: 'asc' },
        },
        sales: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(quotes);
  } catch (error) {
    console.error('Error fetching quotes:', error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Get the first sales user (or create one)
    let salesUser = await prisma.user.findFirst({ where: { role: 'sales' } });
    if (!salesUser) {
      salesUser = await prisma.user.findFirst();
    }
    if (!salesUser) {
      return NextResponse.json({ error: 'No sales user found' }, { status: 400 });
    }

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + (body.validDays || 30));

    const tokenExpiresAt = new Date();
    tokenExpiresAt.setDate(tokenExpiresAt.getDate() + (body.validDays || 30) + 7);

    // Calculate prices
    const items = body.items || [];
    let subtotal = 0;
    items.forEach((item: { unitPrice: number; quantity: number }) => {
      subtotal += item.unitPrice * (item.quantity || 1);
    });

    const discount = body.discount || 0;
    const totalPrice = subtotal * (1 - discount / 100);

    const quote = await prisma.quote.create({
      data: {
        quoteNumber: generateQuoteNumber(),
        clientName: body.clientName,
        clientContact: body.clientContact || '',
        clientEmail: body.clientEmail || '',
        titleZh: body.titleZh,
        titleEn: body.titleEn || '',
        titleTh: body.titleTh || '',
        validUntil,
        currency: body.currency || 'CNY',
        deliveryTerms: body.deliveryTerms || 'FOB Qingdao',
        subtotal,
        discount,
        totalPrice,
        shareToken: generateShareToken(),
        tokenExpiresAt,
        status: 'sent',
        salesId: salesUser.id,
        items: {
          create: items.map((item: {
            productId: string;
            nameZh: string;
            nameEn: string;
            unitPrice: number;
            quantity: number;
            isMainItem: boolean;
          }, i: number) => ({
            productId: item.productId,
            nameZh: item.nameZh,
            nameEn: item.nameEn || '',
            unitPrice: item.unitPrice,
            quantity: item.quantity || 1,
            totalPrice: item.unitPrice * (item.quantity || 1),
            sortOrder: i,
            isMainItem: item.isMainItem || false,
          })),
        },
      },
      include: {
        items: { include: { product: true } },
        sales: true,
      },
    });

    return NextResponse.json(quote, { status: 201 });
  } catch (error) {
    console.error('Error creating quote:', error);
    return NextResponse.json({ error: 'Failed to create quote' }, { status: 500 });
  }
}
