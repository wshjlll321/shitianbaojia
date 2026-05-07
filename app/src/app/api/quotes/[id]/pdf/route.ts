import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { describeQuoteWithTitle } from '@/lib/quoteVersionLabel';
import { formatSpecEntriesInline, getSnapshotSpecEntries } from '@/lib/productSpecs';

function escapeHtml(text: string) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const locale = searchParams.get('locale') || 'zh';
    const isZh = locale === 'zh';

    const quote = await prisma.quote.findUnique({
      where: { id },
      include: {
        items: {
          include: { product: true, sku: true },
          orderBy: { sortOrder: 'asc' },
        },
        sales: true,
      },
    });

    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    // Generate a simple HTML-based PDF using inline styles
    const title = isZh ? quote.titleZh : (quote.titleEn || quote.titleZh);
    const mainItem = quote.items.find((i) => i.isMainItem) ?? quote.items[0] ?? null;
    const identityLine = escapeHtml(
      describeQuoteWithTitle(isZh ? 'zh' : 'en', quote.titleZh, quote.titleEn, mainItem as any, []),
    );

    const itemRows = quote.items.map(item => {
      const name = isZh ? item.nameZh : (item.nameEn || item.nameZh);
      const loc = isZh ? 'zh' : 'en';
      const accSpecs =
        !item.isMainItem
          ? escapeHtml(
              formatSpecEntriesInline(
                getSnapshotSpecEntries((item as any).snapshotSpecsZh, (item as any).snapshotSpecsEn, loc),
                loc,
                12,
              ),
            )
          : '';
      const imgHtml = item.product.imageUrl 
        ? `<img src="${item.product.imageUrl}" style="width:56px;height:56px;object-fit:contain;border-radius:6px;background:#f8fafc;" />`
        : `<div style="width:56px;height:56px;background:#f1f5f9;border-radius:6px;display:flex;align-items:center;justify-content:center;">${item.isMainItem ? '🚁' : '🔧'}</div>`;
      return `
        <tr style="${item.isMainItem ? 'font-weight:600;background:#f8fafc;' : ''}">
          <td style="padding:12px;border-bottom:1px solid #e2e8f0;">${imgHtml}</td>
          <td style="padding:12px;border-bottom:1px solid #e2e8f0;">${name}<br/><span style="font-size:11px;color:#94a3b8;">${item.product.model}</span>${
            accSpecs
              ? `<div style="font-size:11px;color:#475569;margin-top:6px;line-height:1.45;font-weight:500;">${accSpecs}</div>`
              : ''
          }</td>
          <td style="padding:12px;border-bottom:1px solid #e2e8f0;text-align:right;">¥${item.unitPrice.toLocaleString()}</td>
          <td style="padding:12px;border-bottom:1px solid #e2e8f0;text-align:center;">${item.quantity}</td>
          <td style="padding:12px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;">¥${item.totalPrice.toLocaleString()}</td>
        </tr>
      `;
    }).join('');

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: A4; margin: 20mm; }
    body { font-family: 'Microsoft YaHei', 'SimHei', Arial, sans-serif; color: #1e293b; line-height: 1.6; font-size: 13px; }
    .header { text-align: center; border-bottom: 3px solid #1a44f5; padding-bottom: 20px; margin-bottom: 24px; }
    .logo { font-size: 24px; font-weight: 800; color: #1a44f5; }
    .title { font-size: 20px; font-weight: 700; margin-top: 12px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #f0f4ff; padding: 16px; border-radius: 8px; margin-bottom: 24px; }
    .info-item dt { font-size: 11px; color: #1a44f5; font-weight: 600; text-transform: uppercase; }
    .info-item dd { font-size: 14px; font-weight: 600; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; }
    thead { background: linear-gradient(135deg, #1a44f5, #0c1557); }
    th { padding: 10px 12px; color: white; font-size: 11px; text-align: left; text-transform: uppercase; }
    .total-section { text-align: right; padding: 16px; background: #f0f4ff; border-radius: 0 0 8px 8px; }
    .total-value { font-size: 22px; font-weight: 800; color: #1a44f5; }
    .terms-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 24px; }
    .term-item { background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0; }
    .term-item h4 { font-size: 11px; color: #1a44f5; margin-bottom: 4px; text-transform: uppercase; }
    .sales-card { display: flex; align-items: center; gap: 16px; margin-top: 24px; padding: 16px; background: #f0f4ff; border-radius: 8px; }
    .sales-avatar { width: 48px; height: 48px; background: #1a44f5; border-radius: 50%; color: white; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; }
    .footer { text-align: center; margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">青岛世天航空 Shitian Aviation</div>
    <div style="font-size:11px;color:#64748b;margin-top:4px;">
      ${isZh ? '青岛世天航空有限公司' : 'Qingdao Shitian Aviation Co., Ltd.'} · +86 755-8888-6666 · sales@shytian.com
    </div>
    <div class="title">${title}</div>
    <div style="font-size:11px;color:#94a3b8;margin-top:4px;">${quote.quoteNumber}</div>
    <div style="font-size:12px;color:#334155;font-weight:600;margin-top:10px;line-height:1.55;max-width:720px;">${identityLine}</div>
  </div>

  <div class="info-grid">
    <div class="info-item">
      <dt>${isZh ? '致' : 'To'}</dt>
      <dd>${quote.clientName}</dd>
    </div>
    <div class="info-item">
      <dt>${isZh ? '报价日期' : 'Quote Date'}</dt>
      <dd>${new Date(quote.quoteDate).toLocaleDateString(isZh ? 'zh-CN' : 'en-US')}</dd>
    </div>
    <div class="info-item">
      <dt>${isZh ? '有效期至' : 'Valid Until'}</dt>
      <dd>${new Date(quote.validUntil).toLocaleDateString(isZh ? 'zh-CN' : 'en-US')}</dd>
    </div>
    <div class="info-item">
      <dt>${isZh ? '交货条件' : 'Delivery Terms'}</dt>
      <dd>${quote.deliveryTerms}</dd>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:50px"></th>
        <th>${isZh ? '项目' : 'Item'}</th>
        <th style="text-align:right">${isZh ? '单价' : 'Unit Price'}</th>
        <th style="text-align:center">${isZh ? '数量' : 'Qty'}</th>
        <th style="text-align:right">${isZh ? '金额' : 'Amount'}</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <div class="total-section">
    ${quote.discount > 0 ? `<div style="font-size:12px;color:#64748b;">${isZh ? '小计' : 'Subtotal'}: ¥${quote.subtotal.toLocaleString()} | ${isZh ? '折扣' : 'Discount'}: -${quote.discount}%</div>` : ''}
    <div class="total-value">${isZh ? '总计' : 'Total'}: ¥${quote.totalPrice.toLocaleString()}</div>
  </div>

  <div class="terms-grid">
    <div class="term-item">
      <h4>🛡️ ${isZh ? '质保条款' : 'Warranty'}</h4>
      <p>${isZh ? quote.warrantyZh : quote.warrantyEn}</p>
    </div>
    <div class="term-item">
      <h4>💳 ${isZh ? '付款方式' : 'Payment Terms'}</h4>
      <p>${isZh ? quote.paymentTermsZh : quote.paymentTermsEn}</p>
    </div>
    <div class="term-item">
      <h4>🚚 ${isZh ? '交付周期' : 'Delivery Time'}</h4>
      <p>${isZh ? quote.deliveryTimeZh : quote.deliveryTimeEn}</p>
    </div>
    <div class="term-item">
      <h4>🎓 ${isZh ? '培训服务' : 'Training'}</h4>
      <p>${isZh ? quote.trainingZh : quote.trainingEn}</p>
    </div>
  </div>

  <div class="sales-card">
    <div class="sales-avatar">${quote.sales.nameZh.charAt(0)}</div>
    <div>
      <div style="font-weight:700;">${isZh ? quote.sales.nameZh : (quote.sales.nameEn || quote.sales.nameZh)}</div>
      <div style="font-size:12px;color:#64748b;">📞 ${quote.sales.phone} &nbsp;|&nbsp; ✉️ ${quote.sales.email}</div>
    </div>
  </div>

  <div class="footer">
    ${isZh ? '青岛世天航空 · 数字化报价系统' : 'Qingdao Shitian Aviation · Digital Quotation System'}
  </div>
</body>
</html>`;

    // Return HTML that can be printed to PDF by the browser
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="${quote.quoteNumber}.html"`,
      },
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
