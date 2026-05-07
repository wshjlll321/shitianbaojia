import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { deriveShareToken } from "@/lib/shareToken";
import CustomerQuoteBuilder from "./CustomerQuoteBuilder";

export default async function CustomerInvitePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const inv = await prisma.inviteCode.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      quote: { select: { id: true, quoteNumber: true, totalPrice: true, currency: true, validUntil: true } },
    },
  });

  if (!inv) notFound();

  // 解析 AI 历史会话（仅在邀请码可用时使用）
  const parseAiMessages = (s: string) => {
    try {
      const v = JSON.parse(s || "[]");
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  };

  // 已使用：显示之前生成的报价 + 跳转链接
  if (inv.status === "used" && inv.quote) {
    const token = deriveShareToken(inv.quote.id);
    const sym = inv.quote.currency === "CNY" ? "¥" : inv.quote.currency === "USD" ? "$" : "฿";
    const amount = `${sym}${new Intl.NumberFormat("zh-CN").format(Math.round(inv.quote.totalPrice))}`;
    return (
      <UsedState
        clientName={inv.clientName}
        quoteNumber={inv.quote.quoteNumber}
        amount={amount}
        validUntil={inv.quote.validUntil}
        usedAt={inv.usedAt}
        shareUrl={`/zh/q/${token}`}
      />
    );
  }

  if (inv.status === "revoked") {
    return <ErrorState title="邀请码已作废" message="此邀请码已被作废，请联系销售获取新链接。" />;
  }
  if (inv.expiresAt < new Date()) {
    return <ErrorState title="邀请码已过期" message="此邀请码已过期，请联系销售获取新链接。" />;
  }

  // 拉所有可选无人机及其 SKU、关联配件（含配件自身的 SKU 变体）
  const drones = await prisma.product.findMany({
    where: { category: "drone", isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      skus: { orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] },
      accessories: {
        include: {
          accessory: {
            include: {
              skus: { orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] },
            },
          },
        },
      },
    },
  });

  return (
    <CustomerQuoteBuilder
      invite={{
        code: inv.code,
        clientName: inv.clientName,
        clientContact: inv.clientContact,
        clientEmail: inv.clientEmail,
        currency: inv.currency,
        deliveryTerms: inv.deliveryTerms,
        discount: inv.discount,
        validDays: inv.validDays,
      }}
      drones={drones as any}
      aiInitialMessages={parseAiMessages(inv.aiMessages)}
    />
  );
}

function UsedState({
  clientName,
  quoteNumber,
  amount,
  validUntil,
  usedAt,
  shareUrl,
}: {
  clientName: string;
  quoteNumber: string;
  amount: string;
  validUntil: Date;
  usedAt: Date | null;
  shareUrl: string;
}) {
  return (
    <html lang="zh">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, 'Microsoft YaHei', sans-serif", background: "#f5f5f2" }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{
            maxWidth: 520, width: "100%", background: "#fff",
            borderRadius: 16, padding: "36px 32px",
            boxShadow: "0 4px 30px rgba(0,0,0,0.06)",
            borderTop: "3px solid #A07A2C",
          }}>
            <div style={{ fontSize: "0.7rem", letterSpacing: "2px", color: "#A07A2C", fontWeight: 700, marginBottom: 6 }}>
              YOUR QUOTATION IS READY
            </div>
            <h1 style={{ margin: "0 0 10px", fontSize: "1.5rem", color: "#1f2937" }}>
              {clientName}，您的报价单已生成
            </h1>
            <p style={{ margin: "0 0 24px", color: "#6b7280", fontSize: "0.9rem", lineHeight: 1.6 }}>
              此邀请码已使用，下方是您之前提交后生成的正式报价单。点击查看详情或下载 PDF。
            </p>

            <div style={{ background: "#f5f5f2", borderRadius: 10, padding: "18px 20px", marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>报价单号</span>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, fontFamily: "monospace" }}>{quoteNumber}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>含税总金额</span>
                <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "#1f2937" }}>{amount}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>有效期至</span>
                <span style={{ fontSize: "0.85rem", color: "#1f2937" }}>{new Date(validUntil).toLocaleDateString("zh-CN")}</span>
              </div>
              {usedAt && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>提交时间</span>
                  <span style={{ fontSize: "0.85rem", color: "#1f2937" }}>{new Date(usedAt).toLocaleString("zh-CN")}</span>
                </div>
              )}
            </div>

            <Link
              href={shareUrl}
              style={{
                display: "block", textAlign: "center", padding: "14px",
                background: "#1f2937", color: "#fff", borderRadius: 8,
                textDecoration: "none", fontWeight: 700, fontSize: "0.95rem", letterSpacing: "1px",
              }}
            >
              查看报价单 / 下载 PDF
            </Link>

            <div style={{ marginTop: 14, textAlign: "center", fontSize: "0.75rem", color: "#9ca3af" }}>
              如需调整内容或重新生成，请联系您的销售经理
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}

function ErrorState({ title, message }: { title: string; message: string }) {
  return (
    <html lang="zh">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, 'Microsoft YaHei', sans-serif", background: "#f5f5f2" }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{
            maxWidth: 480, width: "100%", background: "#fff",
            borderRadius: 16, padding: "40px 32px", textAlign: "center",
            boxShadow: "0 4px 30px rgba(0,0,0,0.06)",
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
            <h1 style={{ margin: "0 0 8px", fontSize: "1.4rem", color: "#0f172a" }}>{title}</h1>
            <p style={{ margin: "0 0 18px", color: "#64748b", fontSize: "0.95rem", lineHeight: 1.6 }}>{message}</p>
            <Link
              href="/i"
              style={{
                display: "inline-block", padding: "10px 20px",
                background: "#1f2937", color: "#fff", borderRadius: 8,
                textDecoration: "none", fontWeight: 600, fontSize: "0.9rem",
              }}
            >
              输入其他邀请码
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
