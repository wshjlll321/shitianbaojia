import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // 依赖我们刚才看到的 prisma.ts

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { quoteId, event, duration = 0, metadata = '{}' } = body;

    const visitorIp = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const log = await prisma.trackingLog.create({
      data: {
        quoteId,
        event,
        visitorIp,
        userAgent,
        duration,
        metadata,
      },
    });

    // 客户打开分享页：draft/sent → viewed（历史上新建曾默认为 draft，需兼容）
    if (event === 'view') {
      await prisma.quote.updateMany({
        where: {
          id: quoteId,
          status: { in: ['draft', 'sent'] },
        },
        data: { status: 'viewed' },
      });
    }

    return NextResponse.json({ success: true, logId: log.id });
  } catch (error) {
    console.error('Tracking API error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
