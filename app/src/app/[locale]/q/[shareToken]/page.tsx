import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { prisma } from '@/lib/prisma';
import ClientTracker from '@/components/ClientTracker';
import Link from 'next/link';
import { createHash } from 'crypto';
import { describeQuotedConfiguration } from '@/lib/quoteVersionLabel';
import { syncExpiredQuoteIfNeeded } from '@/lib/quoteStatus';
import { buildQuoteOtherTermsLines } from '@/lib/quoteShareOtherTerms';
import PdfDownloadButton from '@/components/PdfDownloadButton';
import AiChat from '@/components/AiChat';

function sha256Base64Url(input: string) {
  return createHash('sha256').update(input, 'utf8').digest('base64url');
}

export default async function QuotePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; shareToken: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, shareToken } = await params;
  const sp = (await searchParams) || {};
  const isPrint = String((sp as any).print || '') === '1';

  let t: any;
  try {
    t = await getTranslations('quote');
  } catch (e) {
    t = (key: string) => {
      const fallback: Record<string, any> = {
        quote_number: { zh: '报价单号', en: 'Quote Ref' },
        date: { zh: '日期', en: 'Date' },
        client_info: { zh: '客户信息', en: 'Client Info' },
        to: { zh: '致', en: 'To' },
        attn: { zh: '联系人', en: 'Attn' },
        valid_until: { zh: '有效期至', en: 'Valid Until' },
        key_features: { zh: '核心卖点', en: 'Key Features' },
        technical_specs: { zh: '技术参数', en: 'Technical Specs' },
        quotation_details: { zh: '报价明细', en: 'Quotation Details' },
        item_desc: { zh: '产品描述', en: 'Description' },
        qty: { zh: '数量', en: 'QTY' },
        unit_price: { zh: '单价', en: 'Unit Price' },
        total_price: { zh: '总价', en: 'Total Price' },
        grand_total: { zh: '合计总价', en: 'Grand Total' },
        terms_conditions: { zh: '商务条款', en: 'Terms & Conditions' },
        warranty: { zh: '产品质保', en: 'Warranty' },
        payment_terms: { zh: '付款方式', en: 'Payment Terms' },
        delivery_time: { zh: '交付周期', en: 'Delivery Time' },
        training: { zh: '培训', en: 'Training' },
        download_pdf: { zh: '下载 PDF', en: 'Download PDF' },
        expired_title: { zh: '报价单已过期', en: 'Quotation Expired' },
        expired_desc: { zh: '请联系您的专属销售获取最新报价。', en: 'Please contact your sales rep for an updated quote.' },
      };
      return fallback[key]?.[locale as 'zh' | 'en'] || fallback[key]?.['en'] || key;
    };
  }

  const tokenHash = sha256Base64Url(shareToken);
  const quote = await prisma.quote.findFirst({
    where: {
      OR: [
        { shareTokenHash: tokenHash },
        { shareToken }, // legacy fallback
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

  if (!quote) notFound();

  await syncExpiredQuoteIfNeeded(prisma, quote.id);

  // Fetch company logo
  const logoConfig = await prisma.systemConfig.findUnique({
    where: { key: 'company_logo' },
  }).catch(() => null);
  const companyLogoUrl = logoConfig?.value || '';

  const isExpired = quote.tokenExpiresAt < new Date();

  if (isExpired) {
    return (
      <div style={S.expiredPage}>
        <div style={S.expiredCard}>
          <div style={{ fontSize: '0.9rem', fontWeight: 900, letterSpacing: '1px', color: '#334155', marginBottom: '14px' }}>
            {locale === 'en' ? 'EXPIRED' : '已过期'}
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>{t('expired_title')}</h1>
          <p style={{ color: '#64748b', fontSize: '0.95rem' }}>{t('expired_desc')}</p>
        </div>
      </div>
    );
  }

  const mainItem = quote.items.find(i => i.isMainItem);
  const mainProduct = mainItem?.product;
  const mainImageUrl = (mainItem as any)?.snapshotImageUrl || mainProduct?.imageUrl || '';
  const templateKey =
    mainProduct?.model === 'H15' ? 'H15' :
    mainProduct?.model === 'T280' ? 'T280' : 'GENERIC';

  const selectedSkuId: string = (mainItem as any)?.skuId || '';

  const productIds = quote.items.map((i) => i.productId);
  const skus = await prisma.sKU.findMany({
    where: { productId: { in: productIds } },
  });

  const L = (zh: string, en: string) => {
    if (locale === 'en') return en || zh;
    return zh;
  };

  const parseJsonArray = (zh: string, en: string) => {
    try {
      const p = JSON.parse(zh || '[]');
      if (locale === 'zh') return p;
      if (locale === 'en' && en && en !== '[]') return JSON.parse(en);
      return p;
    } catch { return []; }
  };

  const parseJsonObject = (zh: string, en: string) => {
    try {
      const p = JSON.parse(zh || '{}');
      if (locale === 'zh') return p;
      if (locale === 'en' && en && en !== '{}') return JSON.parse(en);
      return p;
    } catch { return {}; }
  };

  const mainFeaturesZh = (mainItem as any)?.snapshotFeaturesZh || mainProduct?.featuresZh || '[]';
  const mainFeaturesEn = (mainItem as any)?.snapshotFeaturesEn || mainProduct?.featuresEn || '[]';
  const mainSpecsZh = (mainItem as any)?.snapshotSpecsZh || mainProduct?.specsZh || '{}';
  const mainSpecsEn = (mainItem as any)?.snapshotSpecsEn || mainProduct?.specsEn || '{}';

  const features = mainProduct ? parseJsonArray(mainFeaturesZh, mainFeaturesEn) : [];
  const specs = mainProduct ? parseJsonObject(mainSpecsZh, mainSpecsEn) : {};
  const title = L(quote.titleZh, quote.titleEn);
  const fmt = (v: number) => new Intl.NumberFormat(locale === 'zh' ? 'zh-CN' : 'en-US', { style: 'currency', currency: quote.currency, minimumFractionDigits: 0 }).format(v);

  const quotedConfigurationLine = mainItem
    ? describeQuotedConfiguration(locale, mainItem as any, skus as any)
    : '';

  const otherTermLines = buildQuoteOtherTermsLines(locale as 'zh' | 'en', quote as any);

  const Icon = ({
    name,
    color = '#3366ff',
  }: {
    name:
      | 'spark'
      | 'bolt'
      | 'target'
      | 'tool'
      | 'shield'
      | 'signal'
      | 'diamond'
      | 'globe'
      | 'package'
      | 'phone'
      | 'mail'
      | 'book';
    color?: string;
  }) => {
    const common = {
      width: 20,
      height: 20,
      viewBox: '0 0 24 24',
      fill: 'none',
      xmlns: 'http://www.w3.org/2000/svg',
      style: { display: 'block' as const },
    };
    const stroke = { stroke: color, strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
    switch (name) {
      case 'spark':
        return (
          <svg {...common}>
            <path {...stroke} d="M12 2l1.2 5.2L18 9l-4.8 1.8L12 16l-1.2-5.2L6 9l4.8-1.8L12 2z" />
          </svg>
        );
      case 'bolt':
        return (
          <svg {...common}>
            <path {...stroke} d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
          </svg>
        );
      case 'target':
        return (
          <svg {...common}>
            <path {...stroke} d="M12 3a9 9 0 1 0 9 9" />
            <path {...stroke} d="M12 7a5 5 0 1 0 5 5" />
            <path {...stroke} d="M12 11a1 1 0 1 0 1 1" />
            <path {...stroke} d="M22 2l-6 6" />
          </svg>
        );
      case 'tool':
        return (
          <svg {...common}>
            <path {...stroke} d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2 2-2-2 2-2z" />
          </svg>
        );
      case 'shield':
        return (
          <svg {...common}>
            <path {...stroke} d="M12 2l8 4v6c0 5-3.4 9.4-8 10-4.6-.6-8-5-8-10V6l8-4z" />
            <path {...stroke} d="M9 12l2 2 4-4" />
          </svg>
        );
      case 'signal':
        return (
          <svg {...common}>
            <path {...stroke} d="M4.5 9.5a10 10 0 0 1 15 0" />
            <path {...stroke} d="M7.5 12.5a6 6 0 0 1 9 0" />
            <path {...stroke} d="M10.5 15.5a2 2 0 0 1 3 0" />
            <path {...stroke} d="M12 19h0" />
          </svg>
        );
      case 'diamond':
        return (
          <svg {...common}>
            <path {...stroke} d="M12 2l4 6-4 14L8 8l4-6z" />
            <path {...stroke} d="M8 8h8" />
          </svg>
        );
      case 'globe':
        return (
          <svg {...common}>
            <path {...stroke} d="M12 22a10 10 0 1 0-10-10 10 10 0 0 0 10 10z" />
            <path {...stroke} d="M2 12h20" />
            <path {...stroke} d="M12 2a15 15 0 0 1 0 20" />
            <path {...stroke} d="M12 2a15 15 0 0 0 0 20" />
          </svg>
        );
      case 'package':
        return (
          <svg {...common}>
            <path {...stroke} d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7z" />
            <path {...stroke} d="M3.3 7.3L12 12l8.7-4.7" />
            <path {...stroke} d="M12 22V12" />
          </svg>
        );
      case 'phone':
        return (
          <svg {...common}>
            <path {...stroke} d="M22 16.9v3a2 2 0 0 1-2.2 2 20 20 0 0 1-8.6-3.1 19.7 19.7 0 0 1-6-6 20 20 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .3 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2.1z" />
          </svg>
        );
      case 'mail':
        return (
          <svg {...common}>
            <path {...stroke} d="M4 4h16v16H4z" />
            <path {...stroke} d="M4 6l8 7 8-7" />
          </svg>
        );
      case 'book':
        return (
          <svg {...common}>
            <path {...stroke} d="M4 19a2 2 0 0 1 2-2h14" />
            <path {...stroke} d="M6 3h14v18H6a2 2 0 0 0-2 2V5a2 2 0 0 1 2-2z" />
          </svg>
        );
    }
  };

  const featureIconNames = [
    'spark',
    'bolt',
    'target',
    'tool',
    'shield',
    'signal',
    'diamond',
    'globe',
  ] as const;

  return (
    <div style={S.pageWrap}>
      <ClientTracker quoteId={quote.id} />

      {/* Floating CTA */}
      {!isPrint && quote.sales.phone && (
        <a href={`tel:${quote.sales.phone}`} style={S.floatingBtn} aria-label="致电销售">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.9v3a2 2 0 0 1-2.2 2 20 20 0 0 1-8.6-3.1 19.7 19.7 0 0 1-6-6 20 20 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .3 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2.1z" />
          </svg>
        </a>
      )}

      {/* Hero Header */}
      <header style={S.hero}>
        <div style={S.heroOverlay} />
        <div style={S.heroContent}>
          {/* Brand */}
          <div style={S.brandRow}>
            {companyLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={companyLogoUrl}
                alt="Company Logo"
                style={{
                  maxHeight: '48px',
                  maxWidth: '180px',
                  objectFit: 'contain',
                }}
              />
            ) : (
              <>
                <div style={S.brandIcon}>ST</div>
                <div>
                  <div style={S.brandName}>SHYTIAN</div>
                  <div style={S.brandSub}>AVIATION TECHNOLOGY</div>
                </div>
              </>
            )}
          </div>

          <h1 style={S.heroTitle}>{title}</h1>
          {quotedConfigurationLine ? (
            <p
              style={{
                marginTop: '12px',
                marginBottom: 0,
                maxWidth: '920px',
                marginLeft: 'auto',
                marginRight: 'auto',
                padding: '0 20px',
                fontSize: '0.92rem',
                fontWeight: 700,
                color: 'rgba(21,21,21,0.92)',
                lineHeight: 1.55,
                textShadow: 'none',
              }}
            >
              {quotedConfigurationLine}
            </p>
          ) : null}

          <div style={S.heroBadgeRow}>
            <span style={S.heroBadge}>{t('quote_number')}: {quote.quoteNumber}</span>
            <span style={S.heroBadge}>{t('date')}: {quote.quoteDate.toLocaleDateString()}</span>
          </div>

          {/* Language Switcher (hide in print) */}
          {!isPrint && (
            <div style={S.langBar}>
              {(['zh', 'en'] as const).map((l) => (
                <Link
                  key={l}
                  href={`/${l}/q/${shareToken}`}
                  style={locale === l ? S.langActive : S.langInactive}
                >
                  {l === 'zh' ? '中文' : 'English'}
                </Link>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Product Hero Image */}
      {mainImageUrl && (
        <div className="st-mobile-tight" style={{
          maxWidth: '860px',
          margin: '-20px auto 0',
          padding: '0 24px',
          position: 'relative',
          zIndex: 30,
        }}>
          <div className="st-hero-card" style={{
            position: 'relative',
            borderRadius: '24px',
            // 参照 RTF：白底简洁卡片（不做深色遮罩与强阴影）
            overflow: 'visible',
            boxShadow: 'none',
            border: 'none',
            background: 'transparent',
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mainImageUrl}
              alt={L(mainProduct?.nameZh || (mainItem as any)?.nameZh || '', mainProduct?.nameEn || (mainItem as any)?.nameEn || '')}
              className="st-hero-img"
              style={{
                width: '100%',
                height: 'auto',
                maxHeight: 'min(72vh, 520px)',
                objectFit: 'contain',
                display: 'block',
              }}
            />
            <div className="st-hero-bottom">
              <div className="st-hero-bottom-left">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{
                    color: '#5b5e5e',
                    fontSize: '1rem',
                    fontWeight: 800,
                    lineHeight: 1.25,
                    maxWidth: '520px',
                  }}>
                    {locale === 'en' ? 'Product image' : '产品图片'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{...S.container, marginTop: mainImageUrl ? '28px' : (isPrint ? '0px' : '-28px')}}>
        <style dangerouslySetInnerHTML={{ __html: responsiveCss + printCss }} />

        {/* Client Info */}
        <section style={S.section} className="st-section">
          <div style={S.sectionHead}>
            <div style={S.sectionDot} />
            <h2 style={S.sectionTitle}>{t('client_info')}</h2>
          </div>
          <div style={S.clientGrid}>
            <div style={S.clientCard} className="st-card st-avoid-break">
              <div style={S.clientLabel}>{t('to')}</div>
              <div style={S.clientValue}>{quote.clientName}</div>
            </div>
            {quote.clientContact && (
              <div style={S.clientCard} className="st-card st-avoid-break">
                <div style={S.clientLabel}>{t('attn')}</div>
                <div style={S.clientValue}>{quote.clientContact}</div>
              </div>
            )}
            {quote.clientEmail && (
              <div style={S.clientCard} className="st-card st-avoid-break">
                <div style={S.clientLabel}>{locale === 'en' ? 'Email' : '邮箱'}</div>
                <div style={S.clientValue}>{quote.clientEmail}</div>
              </div>
            )}
            <div style={S.clientCard} className="st-card st-avoid-break">
              <div style={S.clientLabel}>{t('valid_until')}</div>
              <div style={S.clientValue}>{quote.validUntil.toLocaleDateString()}</div>
            </div>
            <div style={S.clientCard} className="st-card st-avoid-break">
              <div style={S.clientLabel}>{locale === 'en' ? 'Sales Rep' : '客户经理'}</div>
              <div style={S.clientValue}>{L(quote.sales.nameZh, quote.sales.nameEn)}</div>
            </div>
          </div>
        </section>

        {/* Product Technical Features */}
        {features.length > 0 && (
          <section style={S.section} className="st-section">
            <div style={S.sectionHead}>
              <div style={S.sectionDot} />
              <h2 style={S.sectionTitle}>
                {locale === 'en' ? 'I. Product Technical Features' : '一、产品技术特点'}
              </h2>
            </div>
            <div style={{ ...S.clientCard, padding: '16px 18px' }} className="st-card st-avoid-break">
              <div
                style={{
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  lineHeight: 1.55,
                  whiteSpace: 'pre-line',
                }}
              >
                {features.map((feat: string, i: number) => `${i + 1}、${feat}`).join('\n')}
              </div>
            </div>
          </section>
        )}

        {/* RTF 示例未包含「版本包含内容」，页面精简不展示 */}

        {/* Technical Specs */}
        {Object.keys(specs).length > 0 && (
          <section style={S.section} className="st-section">
            <div style={S.sectionHead}>
              <div style={{...S.sectionDot, background: '#f97316'}} />
              <h2 style={S.sectionTitle}>{t('technical_specs')}</h2>
            </div>
            <div style={S.specsTable} className="st-table">
              {Object.entries(specs).map(([key, value], idx) => (
                <div key={key} style={{
                  ...S.specRow,
                  background: idx % 2 === 0 ? '#f8fafc' : '#ffffff',
                }}>
                  <div style={S.specKey}>{key}</div>
                  <div style={S.specVal}>{String(value)}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Quotation */}
        <section style={S.section} className="st-section">
          <div style={S.sectionHead}>
            <div style={{...S.sectionDot, background: '#22c55e'}} />
            <h2 style={S.sectionTitle}>
              {locale === 'en' ? 'II. Quotation' : '二、报价'}
            </h2>
          </div>

          <div style={S.priceTableWrap} className="st-table-scroll st-table st-desktop-only">
            <table style={S.priceTable} className="st-price-table">
              <thead>
                <tr>
                  <th style={{...S.priceTh, textAlign: 'left' as const}}>{t('item_desc')}</th>
                  <th style={{...S.priceTh, textAlign: 'center' as const, width: '88px'}}>{t('qty')}</th>
                  <th style={{...S.priceTh, textAlign: 'right' as const}}>{t('unit_price')}</th>
                  <th style={{...S.priceTh, textAlign: 'right' as const}}>{t('total_price')}</th>
                </tr>
              </thead>
              <tbody>
                {quote.items.map((item) => (
                  <tr key={item.id}>
                    <td style={{
                      ...S.priceTd,
                      textAlign: 'left' as const,
                      fontWeight: item.isMainItem ? 700 : 500,
                      color: item.isMainItem ? '#0f172a' : '#475569',
                    }}>
                      <div>{L(item.nameZh, item.nameEn)}</div>
                      {(item.isMainItem && mainProduct?.model) || (!item.isMainItem && item.skuId) ? (
                        <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 500, marginTop: '4px' }}>
                          {item.isMainItem && mainProduct?.model ? mainProduct.model : ''}
                          {item.skuId ? `${item.isMainItem && mainProduct?.model ? ' · ' : ''}${locale === 'en' ? 'SKU: ' : 'SKU：'}${
                            (skus.find(s => s.id === item.skuId) as any)?.[locale === 'en' ? 'labelEn' : 'labelZh'] || 
                            (skus.find(s => s.id === item.skuId) as any)?.[locale === 'en' ? 'nameEn' : 'name'] || 
                            item.skuName
                          }` : ''}
                        </div>
                      ) : null}
                    </td>
                    <td style={{...S.priceTd, textAlign: 'center' as const, fontWeight: 600}}>{item.quantity}</td>
                    <td style={{...S.priceTd, textAlign: 'right' as const, fontFamily: "'JetBrains Mono', monospace"}}>{fmt(item.unitPrice)}</td>
                    <td style={{...S.priceTd, textAlign: 'right' as const, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: '#0f172a'}}>{fmt(item.totalPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={S.totalRow}>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, marginBottom: '6px', letterSpacing: '0.5px' }}>
                {t('grand_total')}（{quote.deliveryTerms}）
              </div>
              <div style={S.totalValue}>{fmt(quote.totalPrice)}</div>
            </div>
          </div>
        </section>

        {/* Other Terms (RTF style: 1-4 numbered) */}
        <section style={S.section} className="st-section">
          <div style={S.sectionHead}>
            <div style={{...S.sectionDot, background: '#0f172a'}} />
            <h2 style={S.sectionTitle}>
              {locale === 'en' ? 'III. Other Terms' : '三、其他'}
            </h2>
          </div>
          <div style={{ ...S.clientCard }} className="st-card st-avoid-break">
            <div style={{ display: 'grid', gap: '10px', fontSize: '0.92rem', color: '#0f172a', lineHeight: 1.55, fontWeight: 600 }}>
              {otherTermLines.map((line) => (
                <div key={line.index}>
                  <span style={{ fontWeight: 800 }}>{line.index}.</span>{' '}
                  {line.primary}
                  {locale === 'zh' && line.secondary ? (
                    <div style={{ marginTop: '4px', color: '#64748b', fontWeight: 500 }}>{line.secondary}</div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Sales Contact Card */}
        <section style={S.salesSection} className="st-section">
          <div style={S.salesCard} className="st-card st-avoid-break">
            <div style={S.salesGlow} />
            <div style={S.salesAvatar}>
              {quote.sales.nameZh.substring(0, 1)}
            </div>
            <div style={S.salesInfo}>
              <h3 style={S.salesName}>
                {L(quote.sales.nameZh, quote.sales.nameEn)}
              </h3>
              <p style={S.salesRole}>Technical Sales Manager · Shitian Aviation</p>
              <div style={S.salesContactRow}>
                {quote.sales.phone && (
                  <a href={`tel:${quote.sales.phone}`} style={S.salesContactBtn}>
                    <span style={{ display: 'inline-flex', width: 18, height: 18, alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="phone" color="#94a3b8" />
                    </span>
                    {quote.sales.phone}
                  </a>
                )}
                {quote.sales.email && (
                  <a href={`mailto:${quote.sales.email}`} style={S.salesContactBtn}>
                    <span style={{ display: 'inline-flex', width: 18, height: 18, alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="mail" color="#94a3b8" />
                    </span>
                    {quote.sales.email}
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Download CTA (hide in print) */}
        {!isPrint && (
          <div style={S.ctaWrap}>
            <PdfDownloadButton shareToken={shareToken} locale={locale} style={S.ctaBtn}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              {t('download_pdf')}
            </PdfDownloadButton>
          </div>
        )}

        {/* Footer */}
        <footer style={S.footer}>
          <div style={S.footerBrand}>SHITIAN AVIATION</div>
          <div style={S.footerText}>
            {locale === 'zh' ? '青岛世天航空有限公司' : 'Qingdao Shitian Aviation Co., Ltd.'}
          </div>
          <div style={S.footerText}>
            © 2026 All Rights Reserved
          </div>
        </footer>
      </div>

      {/* AI 助手（每次打开新会话，不持久化）
          注意：分享页右下角有"致电销售"电话按钮（56px 圆形 + bottom: 28），
          AI 按钮要堆叠在它上方避免相互遮挡。
          fabBottom = 28 (phone bottom) + 56 (phone size) + 16 (gap) = 100 */}
      {!isPrint && (
        <AiChat
          scope="quote"
          scopeKey={shareToken}
          greeting={
            locale === 'zh'
              ? '您好！如果您对报价中的产品、配置、规格或商务条款有任何疑问，欢迎咨询我，我会尽力为您解答。'
              : "Hi! Feel free to ask me about any product, configuration, spec, or commercial term in this quotation."
          }
          fabBottom={quote.sales?.phone ? 100 : 20}
        />
      )}
    </div>
  );
}

/* ─── Styles ──────────────────────────────────────────────── */

const S: Record<string, React.CSSProperties> = {
  pageWrap: {
    minHeight: '100vh',
    background: '#f3f4f6',
    fontFamily: "'Inter', 'Noto Sans SC', system-ui, sans-serif",
    color: '#1e293b',
    WebkitFontSmoothing: 'antialiased',
  },

  // Floating phone button
  floatingBtn: {
    position: 'fixed',
    bottom: '28px',
    right: '28px',
    zIndex: 999,
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    background: '#0f172a',
    color: '#f8fafc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 24px rgba(15,23,42,0.18)',
    textDecoration: 'none',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },

  // Hero
  hero: {
    position: 'relative',
    background: '#c6c6c6',
    paddingTop: '60px',
    paddingBottom: '56px',
    overflow: 'hidden',
  },
  heroOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundImage: `linear-gradient(to bottom, rgba(255,255,255,0.04), rgba(255,255,255,0))`,
  },
  heroContent: {
    position: 'relative',
    zIndex: 10,
    maxWidth: '800px',
    margin: '0 auto',
    textAlign: 'left' as const,
    padding: '0 24px',
  },
  brandRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '14px',
    marginBottom: '32px',
  },
  brandIcon: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    background: '#111827',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1rem',
    fontWeight: 900,
    color: 'white',
    letterSpacing: '-1px',
    boxShadow: '0 8px 26px rgba(15,23,42,0.25)',
  },
  brandName: {
    fontSize: '1.1rem',
    fontWeight: 800,
    color: '#0f172a',
    letterSpacing: '3px',
  },
  brandSub: {
    fontSize: '0.6rem',
    fontWeight: 500,
    color: 'rgba(15,23,42,0.65)',
    letterSpacing: '2px',
  },
  heroTitle: {
    fontSize: '3rem',
    fontWeight: 800,
    color: '#0c0b0b',
    lineHeight: 1.2,
    letterSpacing: '-0.5px',
    marginBottom: '20px',
  },
  heroBadgeRow: {
    display: 'flex',
    justifyContent: 'flex-start',
    gap: '12px',
    flexWrap: 'wrap' as const,
    marginBottom: '28px',
  },
  heroBadge: {
    padding: '6px 16px',
    borderRadius: '20px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.12)',
    fontSize: '0.8rem',
    fontWeight: 500,
    color: '#1f1f1f',
    backdropFilter: 'blur(8px)',
  },
  langBar: {
    display: 'inline-flex',
    padding: '4px',
    borderRadius: '24px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.08)',
    backdropFilter: 'blur(8px)',
    gap: '4px',
  },
  langActive: {
    padding: '6px 20px',
    borderRadius: '20px',
    background: '#04ccf5',
    color: 'white',
    fontSize: '0.8rem',
    fontWeight: 700,
    textDecoration: 'none',
    boxShadow: '0 4px 12px rgba(15,23,42,0.22)',
  },
  langInactive: {
    padding: '6px 20px',
    borderRadius: '20px',
    color: '#94a3b8',
    fontSize: '0.8rem',
    fontWeight: 600,
    textDecoration: 'none',
    transition: 'color 0.2s',
  },

  // Container & Sections
  container: {
    maxWidth: '860px',
    margin: '0 auto',
    padding: '0 24px',
    marginTop: '-28px',
    position: 'relative',
    zIndex: 20,
  },
  section: {
    marginBottom: '32px',
  },
  sectionHead: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '18px',
  },
  sectionDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    background: '#0f172a',
    boxShadow: 'none',
  },
  sectionTitle: {
    fontSize: '1.15rem',
    fontWeight: 800,
    color: '#0f172a',
    letterSpacing: '-0.3px',
  },

  // Client Info
  clientGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px',
  },
  clientCard: {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '20px 24px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  clientLabel: {
    fontSize: '0.7rem',
    fontWeight: 700,
    color: '#0f172a',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
    marginBottom: '6px',
  },
  clientValue: {
    fontSize: '1.05rem',
    fontWeight: 700,
    color: '#0f172a',
  },

  // Features
  featGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '12px',
  },
  featCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    background: '#ffffff',
    borderRadius: '16px',
    padding: '18px 20px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  featIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    background: '#f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  featText: {
    fontSize: '0.88rem',
    fontWeight: 600,
    color: '#1e293b',
    lineHeight: 1.4,
  },

  // Specs
  specsTable: {
    background: '#ffffff',
    borderRadius: '16px',
    overflow: 'hidden',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  specRow: {
    display: 'flex',
    borderBottom: '1px solid #f1f5f9',
  },
  specKey: {
    width: '40%',
    padding: '14px 20px',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#64748b',
    borderRight: '1px solid #f1f5f9',
  },
  specVal: {
    width: '60%',
    padding: '14px 20px',
    fontSize: '0.85rem',
    fontWeight: 500,
    color: '#1e293b',
  },

  // Pricing Table
  priceTableWrap: {
    background: '#ffffff',
    borderRadius: '20px',
    overflow: 'hidden',
    border: '1px solid #e2e8f0',
    boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
  },
  priceTable: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '0.88rem',
  },
  priceTh: {
    padding: '16px 20px',
    background: 'linear-gradient(135deg, #0f172a, #1e293b)',
    color: '#94a3b8',
    fontSize: '0.7rem',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
  },
  priceTd: {
    padding: '16px 20px',
    borderBottom: '1px solid #f1f5f9',
    fontSize: '0.88rem',
  },
  mainBadge: {
    display: 'inline-flex',
    padding: '3px 8px',
    borderRadius: '999px',
    background: 'linear-gradient(135deg, #3366ff, #1a44f5)',
    color: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.7rem',
    lineHeight: 1,
    fontWeight: 800,
    flexShrink: 0,
  },
  totalRow: {
    padding: '24px 28px',
    background: 'linear-gradient(135deg, #0f172a, #1e293b)',
    display: 'flex',
    justifyContent: 'flex-end',
  },
  totalValue: {
    fontSize: '2rem',
    fontWeight: 900,
    color: '#f8fafc',
    letterSpacing: '-1px',
    fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
  },

  // Terms
  termsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '12px',
  },
  termCard: {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  termIcon: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.3rem',
    marginBottom: '14px',
  },
  termLabel: {
    fontSize: '0.7rem',
    fontWeight: 700,
    color: '#94a3b8',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
    marginBottom: '8px',
  },
  termValue: {
    fontSize: '0.92rem',
    fontWeight: 600,
    color: '#1e293b',
    lineHeight: 1.5,
  },

  // Sales
  salesSection: {
    marginTop: '48px',
    marginBottom: '36px',
  },
  salesCard: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: '28px',
    padding: '36px',
    background: 'linear-gradient(135deg, #0f172a, #1e293b)',
    borderRadius: '24px',
    overflow: 'hidden',
    boxShadow: '0 8px 40px rgba(0,0,0,0.15)',
  },
  salesGlow: {
    position: 'absolute',
    top: '-30%',
    right: '-10%',
    width: '240px',
    height: '240px',
    background: 'radial-gradient(circle, rgba(51,102,255,0.15) 0%, transparent 70%)',
    borderRadius: '50%',
  },
  salesAvatar: {
    width: '72px',
    height: '72px',
    borderRadius: '20px',
    background: 'linear-gradient(135deg, #3366ff, #1a44f5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.8rem',
    fontWeight: 900,
    color: 'white',
    boxShadow: '0 0 30px rgba(51,102,255,0.3)',
    flexShrink: 0,
    position: 'relative',
    zIndex: 2,
  },
  salesInfo: {
    position: 'relative',
    zIndex: 2,
    flex: 1,
  },
  salesName: {
    fontSize: '1.4rem',
    fontWeight: 800,
    color: '#f1f5f9',
    marginBottom: '4px',
  },
  salesRole: {
    fontSize: '0.8rem',
    fontWeight: 500,
    color: '#64748b',
    marginBottom: '16px',
  },
  salesContactRow: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '10px',
  },
  salesContactBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    borderRadius: '10px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#94a3b8',
    fontSize: '0.82rem',
    fontWeight: 600,
    textDecoration: 'none',
    transition: 'all 0.2s',
    backdropFilter: 'blur(4px)',
  },

  // CTA
  ctaWrap: {
    display: 'flex',
    justifyContent: 'center',
    padding: '20px 0 48px',
  },
  ctaBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
    padding: '16px 40px',
    borderRadius: '16px',
    background: '#0f172a',
    color: 'white',
    fontSize: '1rem',
    fontWeight: 700,
    textDecoration: 'none',
    boxShadow: '0 8px 24px rgba(15,23,42,0.18)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    letterSpacing: '0.5px',
  },

  // Footer
  footer: {
    textAlign: 'center' as const,
    padding: '32px 0 48px',
    borderTop: '1px solid #e2e8f0',
  },
  footerBrand: {
    fontSize: '0.75rem',
    fontWeight: 800,
    color: '#94a3b8',
    letterSpacing: '4px',
    marginBottom: '6px',
  },
  footerText: {
    fontSize: '0.72rem',
    color: '#cbd5e1',
    lineHeight: 1.8,
  },

  // Expired
  expiredPage: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)',
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  expiredCard: {
    textAlign: 'center' as const,
    padding: '48px',
    background: 'white',
    borderRadius: '24px',
    boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
    maxWidth: '400px',
  },
};

// Mobile responsive overrides (keep structure, improve readability)
const responsiveCss = `
.st-mobile-only { display: none; }
.st-desktop-only { display: block; }

/* Share hero: keep bottom info readable on narrow screens */
.st-hero-bottom {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 14px;
  padding: 18px 22px 20px;
  box-sizing: border-box;
}
.st-hero-bottom-left { flex: 1 1 auto; min-width: 0; }
.st-hero-bottom-right { flex: 0 0 auto; align-self: flex-end; }

@media (max-width: 720px) {
  .st-hide-mobile { display: none !important; }
  .st-show-mobile { display: block !important; }
  .st-table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .st-table-scroll table { min-width: 640px; }
  /* Mobile layout tune */
  .st-mobile-stack { grid-template-columns: 1fr !important; }
  .st-mobile-tight { padding-left: 16px !important; padding-right: 16px !important; }
  .st-mobile-only { display: block !important; }
  .st-desktop-only { display: none !important; }

  .st-hero-img { max-height: min(58vh, 420px) !important; height: auto !important; }
  .st-hero-card { border-radius: 18px !important; }
  .st-hero-bottom {
    flex-direction: column;
    align-items: stretch;
    justify-content: flex-end;
    gap: 12px;
    padding: 14px 14px 16px;
  }
  .st-hero-bottom-right {
    align-self: stretch;
    min-width: 0 !important;
    width: 100%;
    box-sizing: border-box;
    text-align: right;
  }
}
`;

// Print pagination tuning (used by Playwright PDF).
// Goal: avoid breaking inside cards, and keep table header/rows readable across pages.
const printCss = `
@media print {
  @page { size: A4; margin: 12mm 10mm; }
  html, body { background: #ffffff !important; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

  .st-avoid-break {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  /* Keep table header repeating; avoid splitting rows */
  .st-price-table thead { display: table-header-group; }
  .st-price-table tfoot { display: table-footer-group; }
  .st-price-table tr { break-inside: avoid; page-break-inside: avoid; }

  /* Reduce accidental blank pages from shadows/filters */
  .st-card { box-shadow: none !important; }
}
`;
