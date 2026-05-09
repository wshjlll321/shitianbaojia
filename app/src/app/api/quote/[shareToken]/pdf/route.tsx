import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHash } from 'crypto';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import QuoteDocument from '@/components/pdf/QuoteDocument';
import { syncExpiredQuoteIfNeeded } from '@/lib/quoteStatus';
import OSS from 'ali-oss';

function sha256Base64Url(input: string) {
  return createHash('sha256').update(input, 'utf8').digest('base64url');
}

function localPublicImageToDataUrl(publicPath: string): string {
  const filePath = join(process.cwd(), 'public', publicPath);
  if (!existsSync(filePath)) return '';
  const buffer = readFileSync(filePath);
  const ext = publicPath.split('.').pop()?.toLowerCase();
  const mimeMap: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    gif: 'image/gif',
  };
  const mime = mimeMap[ext || ''] || 'image/png';
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

async function resolveImageForPdf(imageUrl: string): Promise<string> {
  if (!imageUrl) return '';
  if (imageUrl.startsWith('/')) {
    return localPublicImageToDataUrl(imageUrl);
  }
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    try {
      const res = await fetch(imageUrl, { signal: AbortSignal.timeout(20_000) });
      if (!res.ok) return '';
      const buf = Buffer.from(await res.arrayBuffer());
      const ct = res.headers.get('content-type')?.split(';')[0]?.trim() || 'image/jpeg';
      if (!ct.startsWith('image/')) return '';
      return `data:${ct};base64,${buf.toString('base64')}`;
    } catch {
      return '';
    }
  }
  return '';
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ shareToken: string }> }
) {
  const { shareToken } = await params;
  const { searchParams } = new URL(request.url);
  const locale = (searchParams.get('locale') || 'zh') as 'zh' | 'en';

  try {
    const tokenHash = sha256Base64Url(shareToken);
    const quote = await prisma.quote.findFirst({
      where: {
        OR: [
          { shareTokenHash: tokenHash },
          { shareToken },
        ],
      },
      include: {
        sales: true,
        items: {
          include: { product: true, sku: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!quote) {
      return new NextResponse('Quote Not Found', { status: 404 });
    }

    await syncExpiredQuoteIfNeeded(prisma, quote.id);

    if (quote.tokenExpiresAt < new Date()) {
      return new NextResponse(
        locale === 'en' ? 'This quotation has expired.' : '报价单已过期。',
        { status: 410 }
      );
    }

    const [logoConfig, companyNameConfig, sealConfig] = await Promise.all([
      prisma.systemConfig.findUnique({ where: { key: 'company_logo' } }).catch(() => null),
      prisma.systemConfig.findUnique({ where: { key: 'company_name' } }).catch(() => null),
      prisma.systemConfig.findUnique({ where: { key: 'company_seal' } }).catch(() => null),
    ]);
    const companyLogoUrl = logoConfig?.value || '';
    const companyBrandName = companyNameConfig?.value?.trim() || '';
    const companySealUrl = sealConfig?.value || '';

    const mainItem = quote.items.find((i) => i.isMainItem);
    const mainProduct = mainItem?.product;
    const mainImageUrl =
      (mainItem as { snapshotImageUrl?: string } | undefined)?.snapshotImageUrl ||
      mainProduct?.imageUrl ||
      '';

    const productIds = quote.items.map((i) => i.productId);
    const skus = await prisma.sKU.findMany({
      where: { productId: { in: productIds } },
    });

    const [logoSrc, productImageSrc, sealSrc] = await Promise.all([
      companyLogoUrl ? resolveImageForPdf(companyLogoUrl) : Promise.resolve(''),
      mainImageUrl ? resolveImageForPdf(mainImageUrl) : Promise.resolve(''),
      companySealUrl ? resolveImageForPdf(companySealUrl) : Promise.resolve(''),
    ]);

    const pdfBuffer = await renderToBuffer(
      <QuoteDocument
        quote={quote}
        locale={locale}
        skus={skus}
        logoSrc={logoSrc || undefined}
        productImageSrc={productImageSrc || undefined}
        companyBrandName={companyBrandName || undefined}
        sealSrc={sealSrc || undefined}
      />
    );

    // 如果配置了 OSS，则上传到 OSS 并重定向到 OSS 链接下载
    if (process.env.OSS_REGION && process.env.OSS_ACCESS_KEY_ID && process.env.OSS_ACCESS_KEY_SECRET && process.env.OSS_BUCKET) {
      try {
        const client = new OSS({
          region: process.env.OSS_REGION,
          accessKeyId: process.env.OSS_ACCESS_KEY_ID,
          accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
          bucket: process.env.OSS_BUCKET,
        });
        
        // 使用 shareToken 作为目录，防止被人通过 quoteNumber 猜出其他报价单
        const filename = `quotes/${shareToken}/Quotation-${quote.quoteNumber}.pdf`;
        
        const result = await client.put(filename, Buffer.from(pdfBuffer), {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="Quotation-${quote.quoteNumber}.pdf"`,
          }
        });
        
        let secureUrl = result.url.replace(/^http:\/\//i, 'https://');
        
        if (process.env.OSS_CDN_DOMAIN) {
          secureUrl = `https://${process.env.OSS_CDN_DOMAIN}/${filename}`;
        }
        
        return NextResponse.redirect(secureUrl);
      } catch (ossError) {
        console.error('Failed to upload PDF to OSS, falling back to local stream:', ossError);
        // 如果上传失败，降级使用直接返回文件流的方式
      }
    }

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Quotation-${quote.quoteNumber}.pdf"`,
        'Cache-Control': 'no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
    });
  } catch (error) {
    console.error('PDF Generate error:', error);
    return new NextResponse('Failed to generate PDF', { status: 500 });
  }
}

export const runtime = 'nodejs';
