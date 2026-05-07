import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deriveShareToken } from "@/lib/shareToken";
import Link from "next/link";
import { Plus, Eye, ArrowRight, FileText, TrendingUp } from "lucide-react";
import DashboardCharts from "@/components/DashboardCharts";
import {
  QUOTE_STATUS_META,
  getDisplayQuoteStatus,
  syncExpiredQuotesForSales,
  syncExpiredQuotesGlobally,
} from "@/lib/quoteStatus";
import { buildWeeklyQuoteTrend, statusBarsFromGroupBy } from "@/lib/salesDashboardChartData";

function dashCreatorLabel(sales: {
  nameZh: string;
  username: string | null;
  email: string | null;
}): string {
  return sales.nameZh || sales.username || sales.email || "—";
}

export default async function SalesDashboard() {
  const session = await auth();

  if (!session?.user) return null;

  const isAdmin = session.user.role === "admin";
  const quoteWhere = isAdmin ? {} : { salesId: session.user.id };

  if (isAdmin) await syncExpiredQuotesGlobally(prisma);
  else await syncExpiredQuotesForSales(prisma, session.user.id);

  const trendSince = new Date();
  trendSince.setDate(trendSince.getDate() - 70);

  const [quotes, totalQuotes, viewedQuotes, totalProducts, trendRows, statusGroups] = await Promise.all([
    prisma.quote.findMany({
      where: quoteWhere,
      orderBy: { createdAt: "desc" },
      include: {
        sales: { select: { nameZh: true, username: true, email: true } },
        _count: {
          select: { trackingLogs: true },
        },
      },
    }),
    prisma.quote.count({ where: quoteWhere }),
    prisma.quote.count({
      where: { ...quoteWhere, status: "viewed" },
    }),
    prisma.product.count({ where: { isActive: true } }),
    prisma.quote.findMany({
      where: { ...quoteWhere, createdAt: { gte: trendSince } },
      select: { createdAt: true },
    }),
    prisma.quote.groupBy({
      by: ["status"],
      where: quoteWhere,
      _count: { _all: true },
    }),
  ]);

  const weeklyTrend = buildWeeklyQuoteTrend(trendRows, 8);
  const statusBars = statusBarsFromGroupBy(statusGroups);
  const quotesWithToken = quotes.map((q) => ({ ...q, shareToken: deriveShareToken(q.id) }));

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-info">
          <h1>控制台</h1>
          <p>{isAdmin ? "管理员视图：全公司报价与统计" : "管理与追踪您的报价单"}</p>
        </div>
        <div className="page-header-actions">
          <Link href="/sales/quote/new" className="btn btn-primary">
            <Plus size={18} />
            新建报价
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">
            <FileText size={24} />
          </div>
          <div className="stat-content">
            <h3>报价总数</h3>
            <div className="stat-value">{totalQuotes}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">
            <Eye size={24} />
          </div>
          <div className="stat-content">
            <h3>已查看</h3>
            <div className="stat-value">{viewedQuotes}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon purple">
            <TrendingUp size={24} />
          </div>
          <div className="stat-content">
            <h3>在售产品</h3>
            <div className="stat-value">{totalProducts}</div>
          </div>
        </div>
      </div>

      {/* 与上方统计同范围：业务员=本人，管理员=全公司 */}
      <DashboardCharts weeklyTrend={weeklyTrend} statusBars={statusBars} />

      {/* Quotes Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div
          className="card-header"
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          <div className="card-title">{isAdmin ? "近期报价（全公司）" : "近期报价"}</div>
          <span
            className="badge badge-primary"
            style={{ fontSize: "0.75rem" }}
          >
            {quotes.length} 条
          </span>
        </div>

        {quotes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <h3>暂无报价</h3>
            <p>点击下方按钮创建您的第一份报价单</p>
            <Link href="/sales/quote/new" className="btn btn-primary">
              创建报价
            </Link>
          </div>
        ) : (
          <div className="table-container" style={{ border: "none", borderRadius: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>报价编号</th>
                  <th>客户</th>
                  {isAdmin ? <th>创建人</th> : null}
                  <th>状态</th>
                  <th>查看数</th>
                  <th style={{ textAlign: "right" }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {quotesWithToken.map((quote) => {
                  const display = getDisplayQuoteStatus(quote);
                  const meta = QUOTE_STATUS_META[display];
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
                        <div
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--color-text-tertiary)",
                            marginTop: "2px",
                          }}
                        >
                          {quote.quoteDate.toLocaleDateString("zh-CN")}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{quote.clientName}</div>
                        <div
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--color-text-tertiary)",
                          }}
                        >
                          {quote.titleZh}
                        </div>
                      </td>
                      {isAdmin ? (
                        <td>
                          <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                            {dashCreatorLabel(quote.sales)}
                          </div>
                        </td>
                      ) : null}
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
                      <td style={{ textAlign: "right" }}>
                        <a
                          href={`/zh/q/${quote.shareToken}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-outline btn-sm"
                        >
                          查看链接
                          <ArrowRight size={14} />
                        </a>
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