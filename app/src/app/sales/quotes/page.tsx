import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deriveShareToken } from "@/lib/shareToken";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Eye, ArrowRight, FileText, Search, Filter, QrCode } from "lucide-react";
import CopyLinkButton from "./CopyLinkButton";
import { describeQuoteWithTitle } from "@/lib/quoteVersionLabel";
import {
  QUOTE_STATUSES,
  QUOTE_STATUS_META,
  getDisplayQuoteStatus,
  syncExpiredQuotesForSales,
  syncExpiredQuotesGlobally,
} from "@/lib/quoteStatus";

function quoteCreatorLabel(sales: {
  nameZh: string;
  username: string | null;
  email: string | null;
}): string {
  return sales.nameZh || sales.username || sales.email || "—";
}

export default async function QuotesListPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isAdmin = session.user.role === "admin";
  if (isAdmin) await syncExpiredQuotesGlobally(prisma);
  else await syncExpiredQuotesForSales(prisma, session.user.id);

  const quotes = await prisma.quote.findMany({
    where: isAdmin ? {} : { salesId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      sales: { select: { nameZh: true, username: true, email: true } },
      items: {
        where: { isMainItem: true },
        take: 1,
        include: { sku: true },
      },
      _count: { select: { trackingLogs: true } },
    },
  });
  const quotesWithToken = quotes.map((q) => ({ ...q, shareToken: deriveShareToken(q.id) }));

  return (
    <>
      <div className="page-header">
        <div className="page-header-info">
          <h1>报价列表</h1>
          <p>
            {isAdmin
              ? "管理员视图：查看全公司所有报价。状态：草稿 · 已发送 · 已查看 · 已过期。"
              : "管理您的报价单记录。状态：草稿 · 已发送（链接有效、客户未打开）· 已查看 · 已过期（超过分享有效期）。"}
          </p>
        </div>
        <div className="page-header-actions">
          <Link href="/sales/quote/new" className="btn btn-primary">
            <FileText size={16} />
            新建报价
          </Link>
        </div>
      </div>

      {/* Stats summary bar */}
      <div
        style={{
          display: "flex",
          gap: "16px",
          marginBottom: "24px",
          flexWrap: "wrap",
        }}
      >
        {QUOTE_STATUSES.map((key) => {
          const meta = QUOTE_STATUS_META[key];
          const count = quotes.filter((q) => getDisplayQuoteStatus(q) === key).length;
          return (
            <div
              key={key}
              style={{
                padding: "8px 18px",
                borderRadius: "12px",
                background: "var(--color-bg-card)",
                border: "1px solid var(--color-border)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "0.85rem",
              }}
              title={meta.hint}
            >
              <span className={`badge ${meta.badgeClass}`}>{meta.label}</span>
              <span style={{ fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                {count}
              </span>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div
          className="card-header"
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          <div className="card-title">
            <FileText
              size={18}
              style={{ marginRight: "8px", opacity: 0.5 }}
            />
            {quotesWithToken.length} 条报价
          </div>
        </div>

        {quotesWithToken.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <h3>暂无报价</h3>
            <p>创建您的第一份报价单开始使用</p>
            <Link href="/sales/quote/new" className="btn btn-primary">
              创建报价
            </Link>
          </div>
        ) : (
          <div
            className="table-container"
            style={{ border: "none", borderRadius: 0 }}
          >
            <table className="table">
              <thead>
                <tr>
                  <th>报价编号</th>
                  <th>客户</th>
                  {isAdmin ? <th>创建人</th> : null}
                  <th>标题</th>
                  <th>报价金额</th>
                  <th>状态</th>
                  <th>查看数</th>
                  <th>创建时间</th>
                  <th style={{ textAlign: "right" }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {quotesWithToken.map((quote) => {
                  const display = getDisplayQuoteStatus(quote);
                  const meta = QUOTE_STATUS_META[display];
                  const quoteIdentity = describeQuoteWithTitle(
                    "zh",
                    quote.titleZh,
                    quote.titleEn,
                    quote.items[0] || null,
                    [],
                  );
                  return (
                    <tr key={quote.id}>
                      <td>
                        <div
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            color: "var(--color-primary-400)",
                          }}
                        >
                          {quote.quoteNumber}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>
                          {quote.clientName}
                        </div>
                        {quote.clientContact && (
                          <div
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--color-text-tertiary)",
                            }}
                          >
                            {quote.clientContact}
                          </div>
                        )}
                      </td>
                      {isAdmin ? (
                        <td>
                          <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                            {quoteCreatorLabel(quote.sales)}
                          </div>
                          {quote.sales.username && (
                            <div
                              style={{
                                fontSize: "0.72rem",
                                color: "var(--color-text-tertiary)",
                              }}
                            >
                              @{quote.sales.username}
                            </div>
                          )}
                        </td>
                      ) : null}
                      <td>
                        <div
                          style={{
                            fontSize: "0.85rem",
                            color: "var(--color-text-secondary)",
                            maxWidth: "280px",
                          }}
                        >
                          <div
                            style={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {quote.titleZh}
                          </div>
                          <div
                            style={{
                              marginTop: "4px",
                              fontSize: "0.72rem",
                              color: "var(--color-text-tertiary)",
                              lineHeight: 1.35,
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical" as any,
                              overflow: "hidden",
                            }}
                            title={quoteIdentity}
                          >
                            {quoteIdentity}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: "0.95rem",
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          {new Intl.NumberFormat("zh-CN", {
                            style: "currency",
                            currency: quote.currency,
                            maximumFractionDigits: 0,
                          }).format(quote.totalPrice)}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${meta.badgeClass}`} title={meta.hint}>
                          {meta.label}
                        </span>
                      </td>
                      <td>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            color: "var(--color-text-secondary)",
                          }}
                        >
                          <Eye size={14} />
                          {quote._count.trackingLogs}
                        </div>
                      </td>
                      <td>
                        <div
                          style={{
                            fontSize: "0.8rem",
                            color: "var(--color-text-tertiary)",
                          }}
                        >
                          {quote.createdAt.toLocaleDateString("zh-CN")}
                        </div>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                            justifyContent: "flex-end",
                          }}
                        >
                          <CopyLinkButton
                            shareToken={quote.shareToken}
                          />
                          <a
                            href={`/api/quote/${quote.shareToken}/qrcode?locale=zh`}
                            className="btn btn-outline btn-sm"
                            title="下载二维码（PNG）"
                          >
                            <QrCode size={14} />
                            二维码
                          </a>
                          <Link
                            href={`/sales/quotes/${quote.id}`}
                            className="btn btn-outline btn-sm"
                          >
                            详情
                            <ArrowRight size={14} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
