import { describe, expect, it } from 'vitest';
import { formatSpecEntriesInline, getSnapshotSpecEntries } from './productSpecs';

describe('productSpecs', () => {
  const zh = JSON.stringify({ 重量: '860g', 接口: 'UART' });
  const en = JSON.stringify({ Weight: '860g', Interface: 'UART' });

  it('getSnapshotSpecEntries prefers zh on default locale', () => {
    expect(getSnapshotSpecEntries(zh, en, 'zh')).toEqual([
      ['重量', '860g'],
      ['接口', 'UART'],
    ]);
  });

  it('formatSpecEntriesInline zh', () => {
    expect(
      formatSpecEntriesInline(
        [
          ['重量', '860g'],
          ['接口', 'UART'],
        ],
        'zh',
      ),
    ).toBe('重量：860g · 接口：UART');
  });
});
