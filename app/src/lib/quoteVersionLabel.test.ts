import { describe, expect, it } from 'vitest';
import { describeQuotedConfiguration, describeQuoteWithTitle, resolveQuotedVersion } from './quoteVersionLabel';

describe('quoteVersionLabel', () => {
  const skuA = {
    id: 'sk1',
    sku: 'T280-PRO',
    labelZh: '专业版',
    labelEn: 'Pro',
    name: '专业版N',
    nameEn: 'ProN',
  };

  it('resolveQuotedVersion prefers joined sku', () => {
    const main = { skuId: 'sk1', skuName: '旧名', sku: skuA };
    expect(resolveQuotedVersion({ locale: 'zh', mainItem: main, skus: [] })).toEqual({
      versionName: '专业版',
      skuCode: 'T280-PRO',
    });
  });

  it('resolveQuotedVersion falls back to skus array', () => {
    const main = { skuId: 'sk1', skuName: '快照名' };
    expect(resolveQuotedVersion({ locale: 'zh', mainItem: main, skus: [skuA] })).toEqual({
      versionName: '专业版',
      skuCode: 'T280-PRO',
    });
  });

  it('describeQuotedConfiguration english', () => {
    expect(describeQuotedConfiguration('en', { skuId: 'sk1', sku: skuA }, [])).toBe(
      'Configuration: Pro · SKU: T280-PRO',
    );
  });

  it('describeQuoteWithTitle wraps title', () => {
    expect(
      describeQuoteWithTitle('zh', 'H15 销售报价', 'H15 Quote', { skuId: 'sk1', sku: skuA }, []),
    ).toBe('本报价：《H15 销售报价》· 配置版本：专业版 · SKU：T280-PRO');
  });
});
