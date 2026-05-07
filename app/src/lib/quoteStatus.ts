import type { PrismaClient } from "@prisma/client";

/**
 * 报价单状态（与 Prisma Quote.status 一致）
 *
 * 规划说明（业务含义）：
 *
 * | 状态        | 含义 |
 * |------------|------|
 * | draft      | 草稿：未完成、未对外；或历史数据。当前主流程「生成报价」后为已发送，一般不再出现 draft。 |
 * | sent       | 已发送：分享链接有效、在 tokenExpiresAt 之前，客户尚未打开过分享页。 |
 * | viewed     | 已查看：客户至少打开过一次分享页（/api/track view），且未过期。 |
 * | expired    | 已过期：当前时间已超过 tokenExpiresAt，客户无法再打开有效报价（与分享页「已过期」一致）。 |
 *
 * 流转（简化）：
 *   draft → sent（生成报价并具备分享链接）
 *   sent  → viewed（客户首次打开分享页）
 *   sent|viewed|draft → expired（超过 tokenExpiresAt，可由列表/详情/分享页加载时自动落库）
 *
 * 兼容：历史库内 status 为 `converted` 时，在展示与归一化时视为 `viewed`（不再提供「已成交」态）。
 */
export const QUOTE_STATUSES = ["draft", "sent", "viewed", "expired"] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export const QUOTE_STATUS_META: Record<
  QuoteStatus,
  { label: string; badgeClass: string; hint: string }
> = {
  draft: {
    label: "草稿",
    badgeClass: "badge-neutral",
    hint: "未完成或未对外发布的历史数据",
  },
  sent: {
    label: "已发送",
    badgeClass: "badge-primary",
    hint: "链接有效，客户尚未打开分享页",
  },
  viewed: {
    label: "已查看",
    badgeClass: "badge-success",
    hint: "客户已打开过分享页",
  },
  expired: {
    label: "已过期",
    badgeClass: "badge-danger",
    hint: "已超过分享有效期（tokenExpiresAt）",
  },
};

export function normalizeQuoteStatus(raw: string | null | undefined): QuoteStatus {
  const s = String(raw || "").trim();
  if (s === "converted") return "viewed";
  if (QUOTE_STATUSES.includes(s as QuoteStatus)) return s as QuoteStatus;
  return "draft";
}

/** 用于列表/角标：按时间判定过期，其余用归一化后的库状态 */
export function getDisplayQuoteStatus(q: { status: string; tokenExpiresAt: Date }): QuoteStatus {
  if (q.tokenExpiresAt.getTime() < Date.now()) return "expired";
  return normalizeQuoteStatus(q.status);
}

/**
 * 若已超过分享有效期，将库中状态更新为 expired（便于统计与筛选）
 */
export async function syncExpiredQuoteIfNeeded(prisma: PrismaClient, quoteId: string): Promise<void> {
  const now = new Date();
  await prisma.quote.updateMany({
    where: {
      id: quoteId,
      status: { not: "expired" },
      tokenExpiresAt: { lt: now },
    },
    data: { status: "expired" },
  });
}

/** 业务员名下所有应过期而未落库的报价，批量修正（列表页/控制台入口调用一次即可） */
export async function syncExpiredQuotesForSales(prisma: PrismaClient, salesId: string): Promise<void> {
  const now = new Date();
  await prisma.quote.updateMany({
    where: {
      salesId,
      status: { not: "expired" },
      tokenExpiresAt: { lt: now },
    },
    data: { status: "expired" },
  });
}

/** 全库应过期而未落库的报价（管理员看全公司列表前调用一次即可） */
export async function syncExpiredQuotesGlobally(prisma: PrismaClient): Promise<void> {
  const now = new Date();
  await prisma.quote.updateMany({
    where: {
      status: { not: "expired" },
      tokenExpiresAt: { lt: now },
    },
    data: { status: "expired" },
  });
}
