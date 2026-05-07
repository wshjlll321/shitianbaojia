/** Minimal SKU shape from Prisma or API payloads */
export type QuoteSkuSnapshot = {
  id: string;
  sku: string;
  labelZh?: string | null;
  labelEn?: string | null;
  name?: string | null;
  nameEn?: string | null;
};

/** Main quote line (host) — may include joined `sku` */
export type QuoteMainItemInput = {
  isMainItem?: boolean;
  skuId?: string | null;
  skuName?: string | null;
  sku?: QuoteSkuSnapshot | null;
};

export function getMainQuoteItem(items: QuoteMainItemInput[] | null | undefined): QuoteMainItemInput | null {
  if (!items?.length) return null;
  return items.find((i) => i.isMainItem) ?? items[0] ?? null;
}

/**
 * Resolves the human-readable configuration name and SKU code for the quoted host line.
 */
export function resolveQuotedVersion(input: {
  locale: string;
  mainItem: QuoteMainItemInput | null | undefined;
  skus?: QuoteSkuSnapshot[];
}): { versionName: string; skuCode: string } {
  const isEn = input.locale === 'en';
  const main = input.mainItem;
  const skuId = String(main?.skuId || '').trim();
  const joined = main?.sku && String(main.sku.id || '').trim() ? main.sku : null;
  let skuObj: QuoteSkuSnapshot | null = joined;
  if (!skuObj && skuId && input.skus?.length) {
    skuObj = input.skus.find((s) => s.id === skuId) || null;
  }
  const fallback = String(main?.skuName || '').trim();
  let versionName = '';
  if (skuObj) {
    versionName = isEn
      ? String(skuObj.labelEn || skuObj.nameEn || skuObj.labelZh || skuObj.name || fallback).trim()
      : String(skuObj.labelZh || skuObj.name || skuObj.labelEn || skuObj.nameEn || fallback).trim();
  } else {
    versionName = fallback;
  }
  const skuCode = String(skuObj?.sku || '').trim();
  return { versionName, skuCode };
}

/** One line for subtitles / tables (no document title). */
export function describeQuotedConfiguration(
  locale: string,
  mainItem: QuoteMainItemInput | null | undefined,
  skus?: QuoteSkuSnapshot[],
): string {
  const isEn = locale === 'en';
  const { versionName, skuCode } = resolveQuotedVersion({ locale, mainItem, skus });
  const v = versionName || (isEn ? 'Not specified' : '未指定');
  if (isEn) {
    return skuCode ? `Configuration: ${v} · SKU: ${skuCode}` : `Configuration: ${v}`;
  }
  return skuCode ? `配置版本：${v} · SKU：${skuCode}` : `配置版本：${v}`;
}

/** Full sentence including quotation document title (localized). */
export function describeQuoteWithTitle(
  locale: string,
  titleZh: string,
  titleEn: string,
  mainItem: QuoteMainItemInput | null | undefined,
  skus?: QuoteSkuSnapshot[],
): string {
  const isEn = locale === 'en';
  const title = (isEn ? String(titleEn || titleZh).trim() : String(titleZh || titleEn).trim()) || (isEn ? 'Quotation' : '报价单');
  const cfg = describeQuotedConfiguration(locale, mainItem, skus);
  if (isEn) {
    return `This quotation: ${title} · ${cfg}`;
  }
  return `本报价：《${title}》· ${cfg}`;
}
