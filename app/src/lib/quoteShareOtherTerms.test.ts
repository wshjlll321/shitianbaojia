import { describe, expect, it } from 'vitest';
import { buildQuoteOtherTermsLines } from './quoteShareOtherTerms';

describe('buildQuoteOtherTermsLines', () => {
  it('zh: uses zh primary only, no English secondary', () => {
    const lines = buildQuoteOtherTermsLines('zh', {
      warrantyZh: '整机质保 1 年',
      warrantyEn: '1-year warranty on the entire machine.',
      trainingZh: '国内免费培训飞手（10天）',
      trainingEn: 'Domestic free training (10 days).',
      deliveryTimeZh: '最快 3 个月',
      deliveryTimeEn: 'As fast as 3 months.',
      paymentTermsZh: '预付款 70%，发货前 30%',
      paymentTermsEn: '70% deposit, 30% before shipment.',
    });
    expect(lines).toHaveLength(4);
    expect(lines[0]).toEqual({ index: 1, primary: '整机质保 1 年' });
    expect(lines[0].secondary).toBeUndefined();
    expect(lines[3].primary).toContain('预付款');
    expect(lines[3].secondary).toBeUndefined();
  });

  it('en: uses en primary and does not include secondary', () => {
    const lines = buildQuoteOtherTermsLines('en', {
      warrantyZh: '整机质保1年',
      warrantyEn: '1-year warranty',
      trainingZh: '含5天免费操作培训',
      trainingEn: '5-day training included',
      deliveryTimeZh: '45个工作日',
      deliveryTimeEn: 'Within 45 business days',
      paymentTermsZh: '预付70%，发货前付清30%',
      paymentTermsEn: '70% advance, 30% before shipment',
    });
    expect(lines).toHaveLength(4);
    expect(lines[0]).toEqual({ index: 1, primary: '1-year warranty' });
    expect(lines[0].secondary).toBeUndefined();
  });

  it('skips empty lines and keeps numbering compact', () => {
    const lines = buildQuoteOtherTermsLines('zh', {
      warrantyZh: '',
      warrantyEn: '',
      trainingZh: '培训 A',
      trainingEn: 'Training A',
      deliveryTimeZh: '',
      deliveryTimeEn: '',
      paymentTermsZh: '付款 B',
      paymentTermsEn: 'Payment B',
    });
    expect(lines).toHaveLength(2);
    expect(lines[0].index).toBe(1);
    expect(lines[0].primary).toBe('培训 A');
    expect(lines[1].index).toBe(2);
    expect(lines[1].primary).toBe('付款 B');
  });
});

