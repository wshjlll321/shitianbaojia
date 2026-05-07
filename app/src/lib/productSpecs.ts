/**
 * Parse snapshot specs JSON (zh/en) for display on quotes and configurator.
 */
export function getSnapshotSpecEntries(
  snapshotSpecsZh: string | undefined | null,
  snapshotSpecsEn: string | undefined | null,
  locale: string,
): [string, string][] {
  try {
    const zh = JSON.parse(String(snapshotSpecsZh || '{}'));
    const en = JSON.parse(String(snapshotSpecsEn || '{}'));
    const isEn = locale === 'en';
    const primary = isEn && en && typeof en === 'object' && !Array.isArray(en) && Object.keys(en).length
      ? en
      : zh;
    const fallback = isEn ? zh : en;
    if (!primary || typeof primary !== 'object' || Array.isArray(primary)) return [];
    return Object.entries(primary as Record<string, unknown>).map(([k, v]) => {
      const val =
        v != null && String(v).trim() !== ''
          ? String(v)
          : String((fallback as Record<string, unknown>)?.[k] ?? '');
      return [String(k), val] as [string, string];
    });
  } catch {
    return [];
  }
}

export function formatSpecEntriesInline(entries: [string, string][], locale: string, max = 12): string {
  const sep = locale === 'en' ? ': ' : '：';
  const joiner = locale === 'en' ? ' · ' : ' · ';
  return entries
    .slice(0, max)
    .map(([k, v]) => `${k}${sep}${v}`)
    .join(joiner);
}
