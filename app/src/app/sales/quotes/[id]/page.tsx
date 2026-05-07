import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deriveShareToken } from "@/lib/shareToken";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Eye,
  ExternalLink,
  FileText,
  QrCode,
  Calendar,
  DollarSign,
  User,
  Package,
  Clock,
  Phone,
} from "lucide-react";
import CopyLinkButton from "../CopyLinkButton";
import PdfDownloadButton from "@/components/PdfDownloadButton";
import BusinessTermsEditor from "./BusinessTermsEditor";
import { describeQuoteWithTitle } from "@/lib/quoteVersionLabel";
import { getSnapshotSpecEntries } from "@/lib/productSpecs";
import { QUOTE_STATUS_META, getDisplayQuoteStatus, syncExpiredQuoteIfNeeded } from "@/lib/quoteStatus";

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;

  const quote = await prisma.quote.findUnique({
    where: { id },
    include: {
      sales: true,
      items: {
        include: { product: true, sku: true },
        orderBy: { sortOrder: "asc" },
      },
      trackingLogs: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!quote) notFound();

  const isAdmin = session.user.role === "admin";
  if (!isAdmin && quote.salesId !== session.user.id) notFound();

  await syncExpiredQuoteIfNeeded(prisma, quote.id);

  const shareToken = deriveShareToken(quote.id);
  const mainQuoteItem = quote.items.find((i) => i.isMainItem) ?? quote.items[0] ?? null;
  const mainProductId = mainQuoteItem?.productId;
  const skusForLabel = mainProductId
    ? await prisma.sKU.findMany({
        where: { productId: mainProductId },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
        select: { id: true, sku: true, labelZh: true, labelEn: true, name: true, nameEn: true },
      })
    : [];
  const quoteIdentityLine = describeQuoteWithTitle(
    "zh",
    quote.titleZh,
    quote.titleEn,
    mainQuoteItem,
    skusForLabel,
  );

  const displayStatus = getDisplayQuoteStatus(quote);
  const statusBadge = QUOTE_STATUS_META[displayStatus];
  const fmt = (v: number) =>
    new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency: quote.currency,
      maximumFractionDigits: 0,
    }).format(v);

  const eventLabelZh: Record<string, string> = {
    view: "页面访问",
    duration_ping: "停留时长",
    download_pdf: "下载 PDF",
    click_contact: "点击联系方式",
  };

  return (
    <>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-info">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Link
              href="/sales/quotes"
              className="btn btn-ghost btn-icon"
              style={{ opacity: 0.6 }}
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                {quote.quoteNumber}
                <span className={`badge ${statusBadge.badgeClass}`} title={statusBadge.hint}>
                  {statusBadge.label}
                </span>
              </h1>
              <p style={{ margin: 0 }}>{quote.titleZh}</p>
              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: "0.88rem",
                  fontWeight: 600,
                  color: "var(--color-text-secondary)",
                  lineHeight: 1.5,
                  maxWidth: "720px",
                }}
              >
                {quoteIdentityLine}
              </p>
            </div>
          </div>
        </div>
        <div className="page-header-actions">
          <CopyLinkButton shareToken={shareToken} />
          <a
            href={`/zh/q/${shareToken}`}
            target="_blank"
            rel="noreferrer"
            className="btn btn-outline"
          >
            <ExternalLink size={16} />
            打开客户预览
          </a>
          <a
            href={`/api/quote/${shareToken}/qrcode?locale=zh`}
            className="btn btn-outline"
            title="下载二维码（PNG）"
          >
            <QrCode size={16} />
            下载二维码
          </a>
          <PdfDownloadButton
            shareToken={shareToken}
            locale="zh"
            className="btn btn-primary"
          >
            <FileText size={16} />
            下载 PDF
          </PdfDownloadButton>
        </div>
      </div>

      {/* Info Cards Row */}
      <div className="stats-grid quote-stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">
            <User size={22} />
          </div>
          <div className="stat-content">
            <h3>客户</h3>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--color-text-primary)", marginTop: "4px" }}>
              {quote.clientName}
            </div>
            {quote.clientContact && (
              <div style={{ fontSize: "0.8rem", color: "var(--color-text-tertiary)", marginTop: "2px" }}>
                {quote.clientContact}
              </div>
            )}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">
            <DollarSign size={22} />
          </div>
          <div className="stat-content">
            <h3>总金额</h3>
            <div
              style={{
                fontSize: "1.3rem",
                fontWeight: 800,
                fontFamily: "var(--font-mono)",
                background: "linear-gradient(135deg, var(--color-primary-400), var(--color-accent-400))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                marginTop: "4px",
              }}
            >
              {fmt(quote.totalPrice)}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon orange">
            <Eye size={22} />
          </div>
          <div className="stat-content">
            <h3>查看次数</h3>
            <div className="stat-value">
              {quote.trackingLogs.filter((l) => l.event === "view").length}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon purple">
            <Calendar size={22} />
          </div>
          <div className="stat-content">
            <h3>有效期至</h3>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--color-text-primary)", marginTop: "4px" }}>
              {quote.validUntil.toLocaleDateString("zh-CN")}
            </div>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="quote-detail-grid" style={{ gap: "24px", alignItems: "start" }}>
        {/* Left: Items table */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div
            className="card-header"
            style={{
              padding: "20px 24px",
              borderBottom: "1px solid var(--color-border)",
            }}
          >
            <div className="card-title">
              <Package size={16} style={{ marginRight: "8px", opacity: 0.5 }} />
              报价明细
            </div>
            <span className="badge badge-primary" style={{ fontSize: "0.75rem" }}>
              {quote.items.length} 项
            </span>
          </div>

          <div className="table-container" style={{ border: "none", borderRadius: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: "100px" }}>图片</th>
                  <th>产品</th>
                  <th style={{ textAlign: "right" }}>单价</th>
                  <th style={{ textAlign: "center" }}>数量</th>
                  <th style={{ textAlign: "right" }}>小计</th>
                </tr>
              </thead>
              <tbody>
                {quote.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {(() => {
                        const img = String((item as any).snapshotImageUrl || item.product.imageUrl || "");
                        return (
                          <div
                            style={{
                              width: "88px",
                              height: "88px",
                              borderRadius: "14px",
                              overflow: "hidden",
                              background: img ? "#0f172a" : "var(--color-surface-elevated)",
                              border: "1px solid var(--color-border)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {img ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={img}
                                alt={item.product.model}
                                style={{ maxWidth: "100%", maxHeight: "100%", width: "auto", height: "auto", objectFit: "contain" }}
                              />
                            ) : (
                              <Package size={16} style={{ color: "var(--color-text-tertiary)" }} />
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td>
                      <div style={{ fontWeight: item.isMainItem ? 700 : 500 }}>
                        {item.nameZh}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--color-text-tertiary)" }}>
                        {item.product.model}
                        {item.isMainItem && (
                          <span
                            style={{
                              marginLeft: "8px",
                              padding: "1px 6px",
                              borderRadius: "4px",
                              background: "rgba(51,102,255,0.15)",
                              color: "var(--color-primary-400)",
                              fontSize: "0.65rem",
                              fontWeight: 700,
                            }}
                          >
                            主机
                          </span>
                        )}
                      </div>
                      {!item.isMainItem && (() => {
                        const specE = getSnapshotSpecEntries(
                          (item as any).snapshotSpecsZh,
                          (item as any).snapshotSpecsEn,
                          "zh",
                        );
                        if (!specE.length) return null;
                        return (
                          <div style={{ marginTop: "8px", fontSize: "0.72rem", color: "var(--color-text-tertiary)", lineHeight: 1.45 }}>
                            <div style={{ fontWeight: 800, marginBottom: "4px", color: "var(--color-text-secondary)" }}>技术参数</div>
                            {specE.slice(0, 12).map(([k, v]) => (
                              <div key={k}>
                                {k}：{v}
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.85rem",
                      }}
                    >
                      {fmt(item.unitPrice)}
                    </td>
                    <td style={{ textAlign: "center", fontWeight: 600 }}>
                      {item.quantity}
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        fontWeight: 700,
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {fmt(item.totalPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div
            style={{
              padding: "20px 24px",
              borderTop: "1px solid var(--color-border)",
              display: "flex",
              justifyContent: "flex-end",
              gap: "32px",
            }}
          >
            {quote.discount > 0 && (
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--color-text-tertiary)", marginBottom: "4px" }}>
                  折扣
                </div>
                <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--color-danger-400)" }}>
                  -{quote.discount}%
                </div>
              </div>
            )}
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-tertiary)", marginBottom: "4px" }}>
                合计（{quote.deliveryTerms}）
              </div>
              <div
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 800,
                  fontFamily: "var(--font-mono)",
                  background: "linear-gradient(135deg, var(--color-primary-400), var(--color-accent-400))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {fmt(quote.totalPrice)}
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Terms + Tracking */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Terms Card */}
          <BusinessTermsEditor
            quoteId={quote.id}
            initial={{
              warrantyZh: quote.warrantyZh,
              warrantyEn: quote.warrantyEn,
              paymentTermsZh: quote.paymentTermsZh,
              paymentTermsEn: quote.paymentTermsEn,
              deliveryTimeZh: quote.deliveryTimeZh,
              deliveryTimeEn: quote.deliveryTimeEn,
              trainingZh: quote.trainingZh,
              trainingEn: quote.trainingEn,
            }}
            initialTermsJson={quote.termsJson}
          />

          {/* Tracking Logs */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <Clock size={16} style={{ marginRight: "8px", opacity: 0.5 }} />
                访问记录
              </div>
              <span className="badge badge-neutral" style={{ fontSize: "0.7rem" }}>
                {quote.trackingLogs.length} 条
              </span>
            </div>

            {quote.trackingLogs.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "24px",
                  color: "var(--color-text-tertiary)",
                  fontSize: "0.85rem",
                }}
              >
                暂无记录
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
                {quote.trackingLogs.slice(0, 10).map((log, idx) => {
                  const label = eventLabelZh[log.event] || log.event;
                  const EventIcon =
                    log.event === "view"
                      ? Eye
                      : log.event === "duration_ping"
                        ? Clock
                        : log.event === "download_pdf"
                          ? FileText
                          : log.event === "click_contact"
                            ? Phone
                            : Package;
                  return (
                    <div
                      key={log.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "10px 0",
                        borderBottom:
                          idx < quote.trackingLogs.length - 1
                            ? "1px solid var(--color-border)"
                            : "none",
                      }}
                    >
                      <div style={{ width: "24px", display: "flex", justifyContent: "center", opacity: 0.7 }}>
                        <EventIcon size={16} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-text-primary)" }}>
                          {label}
                          {log.event === "duration_ping" && (
                            <span
                              style={{
                                marginLeft: "6px",
                                fontFamily: "var(--font-mono)",
                                color: "var(--color-primary-400)",
                              }}
                            >
                              {log.duration}s
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: "0.7rem",
                            color: "var(--color-text-tertiary)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {log.visitorIp !== "unknown" && log.visitorIp}
                          {log.visitorIp !== "unknown" && " · "}
                          {log.createdAt.toLocaleString("zh-CN")}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
