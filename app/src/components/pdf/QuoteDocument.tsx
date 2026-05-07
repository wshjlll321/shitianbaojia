import React from 'react';
import os from 'os';
import { Document, Font, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { describeQuotedConfiguration } from '@/lib/quoteVersionLabel';
import { buildQuoteOtherTermsLines } from '@/lib/quoteShareOtherTerms';

// 微软雅黑（Microsoft YaHei）—— Windows 系统字体，含完整中文 + Latin。
// Windows 直接读 C:\Windows\Fonts\msyh.ttc / msyhbd.ttc；
// 非 Windows 部署需把同名 .ttc 放到 public/fonts/。
const isWin = os.platform() === 'win32';
const yaHeiPath = (file: string) =>
  isWin ? `C:/Windows/Fonts/${file}` : `${process.cwd()}/public/fonts/${file}`;

try {
  Font.register({
    family: 'MicrosoftYaHei',
    fonts: [
      { src: yaHeiPath('msyh.ttc'), postscriptName: 'MicrosoftYaHei' },
      { src: yaHeiPath('msyhbd.ttc'), postscriptName: 'MicrosoftYaHei-Bold', fontWeight: 'bold' },
    ],
  } as any);
} catch {
  // YaHei 加载失败时静默忽略；下面的 NotoSansSC 兜底
}

// 兜底：NotoSansSC（YaHei 不可用时仍能正常渲染中文）
Font.register({
  family: 'NotoSansSC',
  fonts: [
    { src: `${process.cwd()}/public/fonts/NotoSansSC-Regular.ttf` },
    { src: `${process.cwd()}/public/fonts/NotoSansSC-Bold.ttf`, fontWeight: 'bold' },
  ],
});

// 关闭 react-pdf 对单词的 hyphenation 拆分，避免误切 Latin 词。
Font.registerHyphenationCallback((word) => [word]);

// 微软雅黑含完整中文 + Latin glyphs，所有文本统一用它，无需混合 Helvetica。
type TxtProps = React.ComponentProps<typeof Text>;
const Txt = ({ children, render, style, ...rest }: TxtProps) => {
  if (render) {
    return (
      <Text
        {...rest}
        style={[style, { fontFamily: 'MicrosoftYaHei' }]}
        render={(p: any) => {
          const txt = (render as any)(p);
          return txt == null ? '' : String(txt);
        }}
      />
    );
  }
  return (
    <Text {...rest} style={[style, { fontFamily: 'MicrosoftYaHei' }]}>
      {children as React.ReactNode}
    </Text>
  );
};

/**
 * 报价单 PDF —— 杂志式编辑版面
 * 单色冷灰主轴 + 极克制的暖金 accent，用空间和字号建立层级，避免堆砌色块装饰。
 */
const T = {
  ink: '#1F2937',          // 主深 — 标题 / 强调正文
  inkSoft: '#374151',
  body: '#4B5563',         // 正文
  muted: '#6B7280',        // 辅助标签
  subtle: '#9CA3AF',
  line: '#E5E7EB',
  lineSoft: '#F3F4F6',
  panelLite: '#F5F5F2',    // 极浅米 — hero 底 / 其他条款底（弱背景）
  panelHeader: '#1F2937',  // 页眉深 slate
  accent: '#A07A2C',       // 暖金 — 线 / 序号 / 小标签
  accentSoft: '#E5C988',   // 浅金（仅用于深底页眉）
  onDark: '#FFFFFF',
  onDarkMuted: '#D1D5DB',
  paper: '#FFFFFF',
};

const PAGE_PAD_X = 44;
const PAGE_PAD_TOP = 34;
const PAGE_PAD_BOTTOM = 52;

const s = StyleSheet.create({
  page: {
    paddingTop: PAGE_PAD_TOP,
    paddingBottom: PAGE_PAD_BOTTOM,
    paddingHorizontal: PAGE_PAD_X,
    fontFamily: 'MicrosoftYaHei',
    color: T.body,
    backgroundColor: T.paper,
    fontSize: 10,
    lineHeight: 1.45,
  },

  // ===== 页眉（满版深色块） =====
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: T.panelHeader,
    marginTop: -PAGE_PAD_TOP,
    marginHorizontal: -PAGE_PAD_X,
    paddingTop: PAGE_PAD_TOP,
    paddingBottom: 12,
    paddingHorizontal: PAGE_PAD_X,
  },
  headerAccent: {
    height: 2,
    backgroundColor: T.accent,
    marginHorizontal: -PAGE_PAD_X,
    marginBottom: 18,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  logo: { maxHeight: 38, maxWidth: 200, objectFit: 'contain' as const },
  brandFallback: { fontSize: 13, fontWeight: 'bold', color: T.onDark, letterSpacing: 1.0 },
  headerRight: { alignItems: 'flex-end' },
  headerKicker: { fontSize: 7.5, color: T.accentSoft, letterSpacing: 1.4 },
  headerRef: { marginTop: 3, fontSize: 11, color: T.onDark, fontWeight: 'bold', letterSpacing: 0.6 },

  // ===== 标题区 =====
  titleBlock: { marginBottom: 14 },
  titleEyebrow: { fontSize: 8, color: T.accent, fontWeight: 'bold', letterSpacing: 2.2, marginBottom: 6, lineHeight: 1.2 },
  title: { fontSize: 22, color: T.ink, fontWeight: 'bold', lineHeight: 1.2 },
  titleRule: { marginTop: 8, width: 36, height: 2, backgroundColor: T.accent },

  // ===== 信息三栏 =====
  infoStrip: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: T.line,
    borderBottomWidth: 1,
    borderBottomColor: T.line,
    marginBottom: 14,
  },
  infoCol: { flex: 1, paddingRight: 14 },
  infoColMid: {
    flex: 1,
    paddingLeft: 14,
    paddingRight: 14,
    borderLeftWidth: 1,
    borderLeftColor: T.lineSoft,
  },
  infoColRight: {
    flex: 1,
    paddingLeft: 14,
    borderLeftWidth: 1,
    borderLeftColor: T.lineSoft,
  },
  infoLabel: { fontSize: 8, color: T.muted, fontWeight: 'bold', letterSpacing: 1.6, marginBottom: 10, lineHeight: 1.2 },
  infoLine: { flexDirection: 'row', marginBottom: 5, alignItems: 'center' },
  infoKey: { width: 56, fontSize: 9.5, color: T.muted, lineHeight: 1.4 },
  infoVal: { flex: 1, fontSize: 9.5, color: T.ink, lineHeight: 1.4 },
  infoValBold: { flex: 1, fontSize: 9.5, color: T.ink, fontWeight: 'bold', lineHeight: 1.4 },

  // ===== 产品卡（hero 图 + dealBar 合并，无缝） =====
  productCard: {
    marginBottom: 22,
  },
  hero: {
    width: '100%',
    height: 180,
    backgroundColor: T.panelLite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImage: { width: '94%', height: '94%', objectFit: 'contain' as const },
  heroPlaceholder: { fontSize: 9.5, color: T.subtle, letterSpacing: 1.0 },

  // ===== 价格主条（紧贴 hero 底部，双横线克制版） =====
  dealBar: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 0,
    alignItems: 'center',
    borderTopWidth: 0.8,
    borderTopColor: T.ink,
    borderBottomWidth: 2.5,
    borderBottomColor: T.ink,
  },
  dealLeft: { flex: 1.3, paddingRight: 16, borderRightWidth: 1, borderRightColor: T.line },
  dealRight: { flex: 1, alignItems: 'flex-end', paddingLeft: 16 },
  dealKicker: { fontSize: 8, color: T.muted, fontWeight: 'bold', letterSpacing: 1.6, lineHeight: 1.2 },
  dealModel: { marginTop: 6, fontSize: 14, color: T.ink, fontWeight: 'bold', lineHeight: 1.25 },
  dealConfig: { marginTop: 3, fontSize: 9, color: T.muted, lineHeight: 1.35 },
  dealAmount: { marginTop: 6, fontSize: 26, color: T.ink, fontWeight: 'bold', letterSpacing: 0.4, lineHeight: 1.05 },
  dealTerms: { marginTop: 5, fontSize: 9, color: T.muted, letterSpacing: 0.8, lineHeight: 1.3 },

  // ===== 章节标题（罗马字 + 标题 + 延伸金线） =====
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionRoman: {
    fontSize: 18,
    color: T.accent,
    fontWeight: 'bold',
    letterSpacing: 0.6,
    paddingRight: 12,
    lineHeight: 1.1,
  },
  sectionTitle: {
    fontSize: 13,
    color: T.ink,
    fontWeight: 'bold',
    letterSpacing: 1.2,
    lineHeight: 1.2,
    paddingRight: 14,
  },
  sectionRuleFlex: {
    flex: 1,
    height: 1,
    backgroundColor: T.accent,
  },
  sectionContent: { marginBottom: 22 },

  // ===== 编号列表（特性 / 其他条款）=====
  numberedRow: { flexDirection: 'row', marginBottom: 6 },
  numberedIndex: { width: 22, fontSize: 9.5, color: T.accent, fontWeight: 'bold', paddingTop: 1.5 },
  numberedText: { flex: 1, fontSize: 10, color: T.body, lineHeight: 1.6 },

  // ===== 配件清单（紧凑列表） =====
  accRow: {
    flexDirection: 'row',
    paddingVertical: 7,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: T.lineSoft,
  },
  accIndex: { width: 22, fontSize: 9.5, color: T.accent, fontWeight: 'bold' },
  accName: { flex: 1, fontSize: 10, color: T.body, lineHeight: 1.35, paddingRight: 10 },
  accQty: { fontSize: 10, color: T.ink, fontWeight: 'bold', minWidth: 36, textAlign: 'right' as const },

  // ===== 报价明细表（克制版：靠字号 + 行间分隔，无重底） =====
  tableHead: {
    flexDirection: 'row',
    paddingTop: 4,
    paddingBottom: 9,
    paddingHorizontal: 4,
    borderBottomWidth: 1.2,
    borderBottomColor: T.ink,
  },
  th: { fontSize: 9, color: T.ink, fontWeight: 'bold', letterSpacing: 1.2 },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 13,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: T.line,
    alignItems: 'center',
  },
  tableRowMain: {
    borderBottomWidth: 1,
    borderBottomColor: T.line,
    alignItems: 'flex-start',
    paddingVertical: 14,
  },
  tdDescWrap: { flexDirection: 'column' },
  tdDesc: { fontSize: 10, color: T.body, lineHeight: 1.4 },
  tdDescMain: { fontSize: 11.5, color: T.ink, fontWeight: 'bold', lineHeight: 1.3 },
  tdSub: { marginTop: 4, fontSize: 8.5, color: T.muted, lineHeight: 1.4, letterSpacing: 0.2 },
  tdQty: { fontSize: 10.5, color: T.ink, textAlign: 'center' as const },
  tdPrice: { fontSize: 10.5, color: T.body, textAlign: 'right' as const },
  tdSum: { fontSize: 10.5, color: T.ink, fontWeight: 'bold', textAlign: 'right' as const },

  colDesc: { width: '52%', paddingRight: 10 },
  colQty: { width: '10%', textAlign: 'center' as const },
  colPrice: { width: '19%', textAlign: 'right' as const },
  colSum: { width: '19%', textAlign: 'right' as const },

  // ===== 总计（财务报告式：小计 / 折扣 / 总计） =====
  totalsWrap: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  totalsBlock: {
    minWidth: 280,
  },
  // 折前小计 / 折扣 行 — key 左 val 右 的简单网格
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  breakdownKey: { fontSize: 9.5, color: T.body, lineHeight: 1.3 },
  breakdownVal: { fontSize: 10, color: T.ink, lineHeight: 1.3 },
  breakdownDiscountVal: { fontSize: 10, color: T.accent, fontWeight: 'bold', lineHeight: 1.3 },
  breakdownDivider: {
    height: 0.6,
    backgroundColor: T.line,
    marginVertical: 2,
  },
  // 总计强调块
  totalsBox: {
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 4,
    alignItems: 'flex-end',
    borderBottomWidth: 2.5,
    borderBottomColor: T.ink,
  },
  totalsLabel: { marginTop: 4, fontSize: 8.5, color: T.muted, fontWeight: 'bold', letterSpacing: 1.6, lineHeight: 1.2 },
  totalsAmount: { marginTop: 6, fontSize: 30, color: T.ink, fontWeight: 'bold', letterSpacing: 0.4, lineHeight: 1.05 },
  totalsSub: { marginTop: 8, fontSize: 9, color: T.muted, letterSpacing: 0.6, lineHeight: 1.3 },
  sealStamp: {
    position: 'absolute',
    right: 220,
    top: -6,
    width: 100,
    height: 100,
    opacity: 0.85,
    transform: 'rotate(-2deg)',
  },
  sealImage: { width: '100%', height: '100%', objectFit: 'contain' as const },

  // ===== 其他条款块 =====
  termsList: {
    backgroundColor: T.panelLite,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },

  // ===== 页脚 =====
  footerWrap: {
    position: 'absolute',
    left: PAGE_PAD_X,
    right: PAGE_PAD_X,
    bottom: 22,
  },
  footerLine: {
    height: 1,
    backgroundColor: T.accent,
    marginBottom: 8,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLeft: { fontSize: 7.5, color: T.muted, letterSpacing: 0.6 },
  footerRight: { fontSize: 8, color: T.ink, fontWeight: 'bold', letterSpacing: 0.8 },
});

export interface QuotePdfSku {
  id: string;
  sku: string;
  labelZh: string;
  labelEn: string;
  name: string;
  nameEn: string;
  price: number;
  isDefault: boolean;
}

export interface QuoteDocumentProps {
  quote: Record<string, unknown> & {
    quoteNumber: string;
    titleZh: string;
    titleEn: string;
    quoteDate: Date;
    validUntil: Date;
    currency: string;
    deliveryTerms: string;
    clientName: string;
    clientContact?: string;
    clientEmail?: string;
    totalPrice: number;
    items?: unknown[];
    sales?: { nameZh?: string; nameEn?: string; phone?: string; email?: string | null };
  };
  locale: 'zh' | 'en';
  skus?: QuotePdfSku[];
  logoSrc?: string;
  productImageSrc?: string;
  companyBrandName?: string;
  sealSrc?: string;
}

const stripSectionPrefix = (label: string) =>
  String(label || '')
    .replace(/^([一二三四五六七八九十]+、\s*)/, '')
    .replace(/^([IVX]+\.\s*)/, '')
    .trim();

const padIndex = (n: number) => (n < 10 ? `0${n}` : String(n));

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

export default function QuoteDocument({
  quote,
  locale,
  skus = [],
  logoSrc,
  productImageSrc,
  companyBrandName,
  sealSrc,
}: QuoteDocumentProps) {
  const isEn = locale === 'en';
  const L = (zh: string, en: string) => (isEn ? en || zh : zh);

  const labels = {
    zh: {
      quoteNo: '报价单号',
      date: '报价日期',
      validTo: '有效期至',
      currency: '币别',
      incoterms: '贸易条款',
      rep: '客户经理',
      attn: '联系人',
      emailKey: '邮箱',
      phoneKey: '电话',
      companyKey: '公司',
      repNameKey: '姓名',
      product: '主推产品',
      accessories: '配件清单',
      features: '一、产品技术特点',
      pricing: '二、报价',
      other: '三、其他',
      item: '产品描述',
      qty: '数量',
      unit: '单价',
      sub: '小计',
      breakdownSubtotal: '小计（折前）',
      breakdownDiscount: '折扣',
      grand: '总计含税金额',
      placeholderImg: '产品图片',
      legalFooter: '青岛世天航空有限公司',
      notice: '以上报价以最终签署合同为准。',
      preparedFor: '致',
      quoteInfo: '报价信息',
      accountManager: '客户经理',
    },
    en: {
      quoteNo: 'QUOTE NO.',
      date: 'Date',
      validTo: 'Valid Until',
      currency: 'Currency',
      incoterms: 'Incoterms',
      rep: 'Account Manager',
      attn: 'Attn.',
      emailKey: 'Email',
      phoneKey: 'Phone',
      companyKey: 'Company',
      repNameKey: 'Name',
      product: 'PRODUCT',
      accessories: 'Accessories',
      features: 'I. Product Technical Features',
      pricing: 'II. Quotation',
      other: 'III. Other Terms',
      item: 'Description',
      qty: 'Qty',
      unit: 'Unit Price',
      sub: 'Subtotal',
      breakdownSubtotal: 'Subtotal',
      breakdownDiscount: 'Discount',
      grand: 'GRAND TOTAL · INCL. TAX',
      placeholderImg: 'Product image',
      legalFooter: 'Qingdao Shitian Aviation Co., Ltd.',
      notice: 'All figures are subject to final confirmation.',
      preparedFor: 'PREPARED FOR',
      quoteInfo: 'QUOTE INFO',
      accountManager: 'ACCOUNT MANAGER',
    },
  }[isEn ? 'en' : 'zh'];

  const getJsonArray = (zh: string, en: string) => {
    try {
      const p = JSON.parse(zh || '[]');
      if (!isEn) return Array.isArray(p) ? p : [];
      if (en && en !== '[]') {
        const q = JSON.parse(en);
        return Array.isArray(q) ? q : p;
      }
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  };

  // 折前小计 / 折扣 推导：
  // 优先用 quote.subtotal 与 quote.discount；老数据这两个字段为 0，
  // 则从 items 倒推：subtotal = sum(unitPrice * quantity)，discount% = (subtotal - totalPrice) / subtotal
  const itemsRaw = (quote.items as any[]) || [];
  const itemsSumOfUnits = itemsRaw.reduce(
    (s: number, it: any) => s + Number(it.unitPrice || 0) * Number(it.quantity || 1),
    0
  );
  const dbSubtotal = Number((quote as any).subtotal || 0);
  const dbDiscount = Number((quote as any).discount || 0);
  const breakdownSubtotal = dbSubtotal > 0 ? dbSubtotal : itemsSumOfUnits;
  const breakdownDiscountAmount = Math.max(0, breakdownSubtotal - Number(quote.totalPrice || 0));
  const breakdownDiscountPct =
    dbDiscount > 0
      ? dbDiscount
      : breakdownSubtotal > 0
      ? Math.round((breakdownDiscountAmount / breakdownSubtotal) * 1000) / 10
      : 0;
  const showBreakdown = breakdownDiscountAmount > 0.5;

  const mainItem = (quote.items as any[])?.find((i: any) => i.isMainItem);
  const mainProduct = mainItem?.product;
  const mainFeaturesZh = mainItem?.snapshotFeaturesZh || mainProduct?.featuresZh || '[]';
  const mainFeaturesEn = mainItem?.snapshotFeaturesEn || mainProduct?.featuresEn || '[]';
  const features = mainProduct ? getJsonArray(mainFeaturesZh, mainFeaturesEn) : [];
  const otherTermLines = buildQuoteOtherTermsLines(locale, quote as any);

  const accessoryItems = ((quote.items as any[]) || []).filter((i: any) => !i.isMainItem);
  const normalizedAccessories = accessoryItems
    .map((i: any) => ({
      name: String(L(i.nameZh, i.nameEn) || '').trim(),
      qty: Number(i.quantity || 0) || 0,
    }))
    .filter((x: any) => x.name);

  const fmtPrice = (v: number) =>
    new Intl.NumberFormat(isEn ? 'en-US' : 'zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
  const currencySymbol = quote.currency === 'CNY' ? '¥' : quote.currency === 'USD' ? '$' : '฿';

  const brand = (companyBrandName || '').trim() || (isEn ? 'SHITIAN AVIATION' : '青岛世天航空');

  const mainConfigLine = mainItem ? describeQuotedConfiguration(locale, mainItem, skus as any) : '';
  const docTitle = L(quote.titleZh, quote.titleEn);

  const SectionHeader = ({ index, title }: { index: number; title: string }) => (
    <View style={s.sectionHeader} wrap={false} minPresenceAhead={70}>
      <Txt style={s.sectionRoman}>{ROMAN[index] || String(index)}</Txt>
      <Txt style={s.sectionTitle}>{title}</Txt>
      <View style={s.sectionRuleFlex} />
    </View>
  );

  let sectionIndex = 0;
  const nextIndex = () => ++sectionIndex;

  const featuresIndex = features.length > 0 ? nextIndex() : 0;
  const accessoriesIndex = normalizedAccessories.length > 0 ? nextIndex() : 0;
  const pricingIndex = nextIndex();
  const otherIndex = otherTermLines.length > 0 ? nextIndex() : 0;

  return (
    <Document>
      <Page size="A4" style={s.page} wrap>
        {/* 页眉（每页 fixed） */}
        <View fixed>
          <View style={s.header}>
            <View style={s.headerLeft}>
              {logoSrc ? <Image src={logoSrc} style={s.logo} /> : <Txt style={s.brandFallback}>{brand}</Txt>}
            </View>
            <View style={s.headerRight}>
              <Txt style={s.headerKicker}>{labels.quoteNo}</Txt>
              <Txt style={s.headerRef}>{quote.quoteNumber}</Txt>
            </View>
          </View>
          <View style={s.headerAccent} />
        </View>

        {/* 标题区 */}
        <View style={s.titleBlock}>
          <Txt style={s.titleEyebrow}>{isEn ? 'OFFICIAL QUOTATION' : '正式商务报价'}</Txt>
          <Txt style={s.title}>{docTitle}</Txt>
          <View style={s.titleRule} />
        </View>

        {/* 信息三栏 */}
        <View style={s.infoStrip} wrap={false}>
          <View style={s.infoCol}>
            <Txt style={s.infoLabel}>{labels.preparedFor}</Txt>
            <View style={s.infoLine}>
              <Txt style={s.infoKey}>{labels.companyKey}</Txt>
              <Txt style={s.infoValBold}>{quote.clientName}</Txt>
            </View>
            <View style={s.infoLine}>
              <Txt style={s.infoKey}>{labels.attn}</Txt>
              <Txt style={s.infoVal}>{String(quote.clientContact || '—')}</Txt>
            </View>
            <View style={s.infoLine}>
              <Txt style={s.infoKey}>{labels.emailKey}</Txt>
              <Txt style={s.infoVal}>{String(quote.clientEmail || '—')}</Txt>
            </View>
          </View>

          <View style={s.infoColMid}>
            <Txt style={s.infoLabel}>{labels.quoteInfo}</Txt>
            <View style={s.infoLine}>
              <Txt style={s.infoKey}>{labels.date}</Txt>
              <Txt style={s.infoVal}>{quote.quoteDate.toLocaleDateString(isEn ? 'en-US' : 'zh-CN')}</Txt>
            </View>
            <View style={s.infoLine}>
              <Txt style={s.infoKey}>{labels.validTo}</Txt>
              <Txt style={s.infoVal}>{quote.validUntil.toLocaleDateString(isEn ? 'en-US' : 'zh-CN')}</Txt>
            </View>
            <View style={s.infoLine}>
              <Txt style={s.infoKey}>{labels.currency}</Txt>
              <Txt style={s.infoVal}>{quote.currency}</Txt>
            </View>
          </View>

          <View style={s.infoColRight}>
            <Txt style={s.infoLabel}>{labels.accountManager}</Txt>
            <View style={s.infoLine}>
              <Txt style={s.infoKey}>{labels.repNameKey}</Txt>
              <Txt style={s.infoValBold}>
                {L(quote.sales?.nameZh || '', quote.sales?.nameEn || '') || '—'}
              </Txt>
            </View>
            <View style={s.infoLine}>
              <Txt style={s.infoKey}>{labels.phoneKey}</Txt>
              <Txt style={s.infoVal}>{quote.sales?.phone || '—'}</Txt>
            </View>
            <View style={s.infoLine}>
              <Txt style={s.infoKey}>{labels.emailKey}</Txt>
              <Txt style={s.infoVal}>{quote.sales?.email || '—'}</Txt>
            </View>
          </View>
        </View>

        {/* 产品卡（hero 图 + dealBar 紧贴拼接） */}
        <View style={s.productCard} wrap={false}>
          <View style={s.hero}>
            {productImageSrc ? (
              <Image src={productImageSrc} style={s.heroImage} />
            ) : (
              <Txt style={s.heroPlaceholder}>{labels.placeholderImg}</Txt>
            )}
          </View>
          <View style={s.dealBar}>
            <View style={s.dealLeft}>
              <Txt style={s.dealKicker}>{labels.product}</Txt>
              <Txt style={s.dealModel}>{mainItem ? L(mainItem.nameZh, mainItem.nameEn) : '—'}</Txt>
              {mainConfigLine ? <Txt style={s.dealConfig}>{mainConfigLine}</Txt> : null}
            </View>
            <View style={s.dealRight}>
              <Txt style={s.dealKicker}>{labels.grand}</Txt>
              <Txt style={s.dealAmount}>
                {currencySymbol} {fmtPrice(quote.totalPrice)}
              </Txt>
              <Txt style={s.dealTerms}>{quote.deliveryTerms}</Txt>
            </View>
          </View>
        </View>

        {/* 特性 */}
        {features.length > 0 ? (
          <>
            <SectionHeader index={featuresIndex} title={stripSectionPrefix(labels.features)} />
            <View style={s.sectionContent}>
              {features.map((f: string, i: number) => (
                <View key={i} style={s.numberedRow} wrap={false}>
                  <Txt style={s.numberedIndex}>{padIndex(i + 1)}</Txt>
                  <Txt style={s.numberedText}>{String(f || '').trim()}</Txt>
                </View>
              ))}
            </View>
          </>
        ) : null}

        {/* 配件 */}
        {normalizedAccessories.length > 0 ? (
          <>
            <SectionHeader index={accessoriesIndex} title={labels.accessories} />
            <View style={s.sectionContent}>
              {normalizedAccessories.map((a: any, idx: number) => (
                <View key={idx} style={s.accRow} wrap={false}>
                  <Txt style={s.accIndex}>{padIndex(idx + 1)}</Txt>
                  <Txt style={s.accName}>{a.name}</Txt>
                  <Txt style={s.accQty}>{`× ${a.qty || 1}`}</Txt>
                </View>
              ))}
            </View>
          </>
        ) : null}

        {/* 报价明细 */}
        <SectionHeader index={pricingIndex} title={stripSectionPrefix(labels.pricing)} />
        <View style={s.sectionContent}>
          <View style={s.tableHead} wrap={false}>
            <Txt style={[s.th, s.colDesc]}>{labels.item}</Txt>
            <Txt style={[s.th, s.colQty]}>{labels.qty}</Txt>
            <Txt style={[s.th, s.colPrice]}>{labels.unit}</Txt>
            <Txt style={[s.th, s.colSum]}>{labels.sub}</Txt>
          </View>
          {(quote.items as any[])?.map((item: any, i: number) => {
            const meta = item.isMainItem ? describeQuotedConfiguration(locale, item, skus as any) : '';
            return (
              <View
                key={i}
                style={[s.tableRow, item.isMainItem ? s.tableRowMain : null].filter(Boolean) as any}
                wrap={false}
              >
                <View style={[s.colDesc, s.tdDescWrap]}>
                  <Txt style={item.isMainItem ? s.tdDescMain : s.tdDesc}>
                    {L(item.nameZh, item.nameEn)}
                  </Txt>
                  {item.isMainItem && meta ? <Txt style={s.tdSub}>{meta}</Txt> : null}
                </View>
                <Txt style={[s.tdQty, s.colQty]}>{item.quantity}</Txt>
                <Txt style={[s.tdPrice, s.colPrice]}>
                  {currencySymbol} {fmtPrice(item.unitPrice)}
                </Txt>
                <Txt style={[s.tdSum, s.colSum]}>
                  {currencySymbol} {fmtPrice(Number(item.unitPrice) * Number(item.quantity || 1))}
                </Txt>
              </View>
            );
          })}

          <View style={s.totalsWrap} wrap={false}>
            {sealSrc ? (
              <View style={s.sealStamp}>
                <Image src={sealSrc} style={s.sealImage} />
              </View>
            ) : null}
            <View style={s.totalsBlock}>
              {showBreakdown ? (
                <>
                  <View style={s.breakdownRow}>
                    <Txt style={s.breakdownKey}>{labels.breakdownSubtotal}</Txt>
                    <Txt style={s.breakdownVal}>
                      {currencySymbol} {fmtPrice(breakdownSubtotal)}
                    </Txt>
                  </View>
                  <View style={s.breakdownRow}>
                    <Txt style={s.breakdownKey}>
                      {labels.breakdownDiscount} ({breakdownDiscountPct}%)
                    </Txt>
                    <Txt style={s.breakdownDiscountVal}>
                      − {currencySymbol} {fmtPrice(breakdownDiscountAmount)}
                    </Txt>
                  </View>
                  <View style={s.breakdownDivider} />
                </>
              ) : null}
              <View style={s.totalsBox}>
                <Txt style={s.totalsLabel}>{labels.grand}</Txt>
                <Txt style={s.totalsAmount}>
                  {currencySymbol} {fmtPrice(quote.totalPrice)}
                </Txt>
                <Txt style={s.totalsSub}>{quote.deliveryTerms}</Txt>
              </View>
            </View>
          </View>
        </View>

        {/* 其他条款 */}
        {otherTermLines.length > 0 ? (
          <>
            <SectionHeader index={otherIndex} title={stripSectionPrefix(labels.other)} />
            <View style={s.sectionContent}>
              <View style={s.termsList}>
                {otherTermLines.map((l) => (
                  <View key={l.index} style={s.numberedRow} wrap={false}>
                    <Txt style={s.numberedIndex}>{padIndex(l.index)}</Txt>
                    <Txt style={s.numberedText}>{l.primary}</Txt>
                  </View>
                ))}
              </View>
            </View>
          </>
        ) : null}

        {/* 页脚（每页 fixed） */}
        <View style={s.footerWrap} fixed>
          <View style={s.footerLine} />
          <View style={s.footerRow}>
            <Txt style={s.footerLeft}>
              {labels.legalFooter}    {labels.notice}
            </Txt>
            <Text
              style={s.footerRight}
              render={({ pageNumber, totalPages }) =>
                isEn ? `${pageNumber} / ${totalPages}` : `第 ${pageNumber} / ${totalPages} 页`
              }
            />
          </View>
        </View>
      </Page>
    </Document>
  );
}
