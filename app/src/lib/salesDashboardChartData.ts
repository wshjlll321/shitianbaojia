/** 控制台图表：与 Prisma 查询结果拼装，无外部依赖 */

export type WeeklyQuotePoint = { label: string; count: number };
export type StatusBarPoint = { key: string; label: string; count: number; fill: string };

const STATUS_ORDER = ["draft", "sent", "viewed", "expired"] as const;

const STATUS_LABEL: Record<(typeof STATUS_ORDER)[number], string> = {
  draft: "草稿",
  sent: "已发送（待客户打开）",
  viewed: "已查看",
  expired: "已过期",
};

const STATUS_FILL: Record<(typeof STATUS_ORDER)[number], string> = {
  draft: "var(--color-text-tertiary)",
  sent: "var(--color-primary-400)",
  viewed: "var(--color-accent-400)",
  expired: "var(--color-danger-400)",
};

/** 共 numWeeks 个连续「7 日区间」，覆盖约 numWeeks×7 天；横轴从左到右由早到晚 */
export function buildWeeklyQuoteTrend(
  rows: { createdAt: Date }[],
  numWeeks = 8,
): WeeklyQuotePoint[] {
  const dayMs = 86400000;
  const out: WeeklyQuotePoint[] = [];
  const endToday = new Date();
  endToday.setHours(23, 59, 59, 999);

  for (let i = 0; i < numWeeks; i++) {
    const rangeEnd = new Date(endToday.getTime() - (numWeeks - 1 - i) * 7 * dayMs);
    rangeEnd.setHours(23, 59, 59, 999);
    const rangeStart = new Date(rangeEnd.getTime() - 6 * dayMs);
    rangeStart.setHours(0, 0, 0, 0);
    const startT = rangeStart.getTime();
    const endT = rangeEnd.getTime();
    const count = rows.filter((r) => {
      const t = r.createdAt.getTime();
      return t >= startT && t <= endT;
    }).length;
    const label = `${rangeStart.getMonth() + 1}/${rangeStart.getDate()}`;
    out.push({ label, count });
  }
  return out;
}

export function statusBarsFromGroupBy(
  groups: { status: string; _count: { _all: number } }[],
): StatusBarPoint[] {
  const m = new Map<string, number>();
  for (const g of groups) {
    const k = g.status === "converted" ? "viewed" : g.status;
    if (!STATUS_ORDER.includes(k as (typeof STATUS_ORDER)[number])) continue;
    m.set(k, (m.get(k) ?? 0) + g._count._all);
  }
  return STATUS_ORDER.map((key) => ({
    key,
    label: STATUS_LABEL[key],
    count: m.get(key) ?? 0,
    fill: STATUS_FILL[key],
  }));
}
