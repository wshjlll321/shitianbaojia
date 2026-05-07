import { describe, expect, it } from 'vitest';
import { getDisplayQuoteStatus, normalizeQuoteStatus } from './quoteStatus';

describe('quoteStatus', () => {
  const future = new Date(Date.now() + 864e5 * 30);
  const past = new Date(Date.now() - 864e5);

  it('normalizeQuoteStatus', () => {
    expect(normalizeQuoteStatus('sent')).toBe('sent');
    expect(normalizeQuoteStatus('bogus')).toBe('draft');
    expect(normalizeQuoteStatus('converted')).toBe('viewed');
  });

  it('legacy converted maps to viewed when not expired', () => {
    expect(getDisplayQuoteStatus({ status: 'converted', tokenExpiresAt: future })).toBe('viewed');
  });

  it('expired when past tokenExpiresAt', () => {
    expect(getDisplayQuoteStatus({ status: 'sent', tokenExpiresAt: past })).toBe('expired');
    expect(getDisplayQuoteStatus({ status: 'viewed', tokenExpiresAt: past })).toBe('expired');
  });

  it('uses db status when still valid', () => {
    expect(getDisplayQuoteStatus({ status: 'sent', tokenExpiresAt: future })).toBe('sent');
    expect(getDisplayQuoteStatus({ status: 'viewed', tokenExpiresAt: future })).toBe('viewed');
  });
});
