export function formatCurrency(amount: number, currency: string = 'CNY'): string {
  const formatters: Record<string, Intl.NumberFormat> = {
    CNY: new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }),
    USD: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
    THB: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'THB' }),
  };
  return (formatters[currency] || formatters.CNY).format(amount);
}

export function formatDate(date: Date | string, locale: string = 'zh'): string {
  const d = new Date(date);
  const localeMap: Record<string, string> = {
    zh: 'zh-CN',
    en: 'en-US',
  };
  return d.toLocaleDateString(localeMap[locale] || 'zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function generateQuoteNumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `QT-${dateStr}-${rand}`;
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function parseJsonField<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}
