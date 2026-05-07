export type QuoteOtherTermsInput = {
  warrantyZh?: string | null;
  warrantyEn?: string | null;
  trainingZh?: string | null;
  trainingEn?: string | null;
  deliveryTimeZh?: string | null;
  deliveryTimeEn?: string | null;
  paymentTermsZh?: string | null;
  paymentTermsEn?: string | null;
};

export type OtherTermsLine = {
  index: number;
  primary: string;
  secondary?: string;
};

function pickLocalized(locale: 'zh' | 'en', zh?: string | null, en?: string | null): { primary: string; secondary?: string } {
  const z = String(zh || '').trim();
  const e = String(en || '').trim();
  if (locale === 'en') {
    return { primary: e || z };
  }
  // 中文页：只展示中文；无中文时单行用英文兜底，不附带英文副行
  return { primary: z || e };
}

export function buildQuoteOtherTermsLines(locale: 'zh' | 'en', quote: QuoteOtherTermsInput): OtherTermsLine[] {
  const items: Array<{ zh?: string | null; en?: string | null }> = [
    { zh: quote.warrantyZh, en: quote.warrantyEn },
    { zh: quote.trainingZh, en: quote.trainingEn },
    { zh: quote.deliveryTimeZh, en: quote.deliveryTimeEn },
    { zh: quote.paymentTermsZh, en: quote.paymentTermsEn },
  ];

  const lines: OtherTermsLine[] = [];
  for (let i = 0; i < items.length; i++) {
    const { primary, secondary } = pickLocalized(locale, items[i]?.zh, items[i]?.en);
    if (!primary) continue;
    lines.push({ index: lines.length + 1, primary, secondary });
  }
  return lines;
}

