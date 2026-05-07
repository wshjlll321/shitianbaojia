import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const [totalProducts, totalQuotes, pendingQuotes, viewedQuotes, expiredQuotes] = await Promise.all([
      prisma.product.count({ where: { isActive: true } }),
      prisma.quote.count(),
      prisma.quote.count({
        where: { status: { in: ['draft', 'sent'] } },
      }),
      prisma.quote.count({
        where: { OR: [{ status: 'viewed' }, { status: 'converted' }] },
      }),
      prisma.quote.count({ where: { status: 'expired' } }),
    ]);

    const recentQuotes = await prisma.quote.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        quoteNumber: true,
        clientName: true,
        totalPrice: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      totalProducts,
      totalQuotes,
      pendingQuotes,
      viewedQuotes,
      expiredQuotes,
      recentQuotes,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({
      totalProducts: 0,
      totalQuotes: 0,
      pendingQuotes: 0,
      viewedQuotes: 0,
      expiredQuotes: 0,
      recentQuotes: [],
    });
  }
}
