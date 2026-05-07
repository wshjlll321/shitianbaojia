import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Ticket, Plus, ExternalLink, FileText } from "lucide-react";
import CopyInviteUrl from "./CopyInviteUrl";

export default async function InvitesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const items = await prisma.inviteCode.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { nameZh: true } },
      quote: { select: { id: true, quoteNumber: true, totalPrice: true, currency: true } },
    },
  });

  const now = new Date();

  const statusBadge = (it: any) => {
    let s = it.status as string;
    if (s === "pending" && it.expiresAt < now) s = "expired";
    const map: Record<string, { label: string; cls: string }> = {
      pending: { label: "待使用", cls: "badge-primary" },
      used: { label: "已使用", cls: "badge-success" },
      expired: { label: "已过期", cls: "badge-neutral" },
      revoked: { label: "已作废", cls: "badge-danger" },
    };
    const m = map[s] || { label: s, cls: "badge-neutral" };
    return <span className={`badge ${m.cls}`}>{m.label}</span>;
  };

  return (
    <>
      <div
        className="page-header"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <div className="page-header-info">
          <h1>邀请码</h1>
          <p>给客户分发一次性自助报价链接，预填客户信息和折扣后客户只需选机型与配件</p>
        </div>
        <div className="page-header-actions">
          <Link href="/sales/invites/new" className="btn btn-primary">
            <Plus size={16} />
            新增邀请码
          </Link>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div
          className="card-header"
          style={{ padding: "20px 24px", borderBottom: "1px solid var(--color-border)" }}
        >
          <div className="card-title">全部邀请码（{items.length}）</div>
        </div>
        <div className="table-container" style={{ border: "none", borderRadius: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>邀请码</th>
                <th>客户</th>
                <th>币别 / Incoterms</th>
                <th>折扣</th>
                <th>有效期</th>
                <th>状态</th>
                <th>关联报价</th>
                <th>创建</th>
                <th style={{ textAlign: "right" }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", color: "var(--color-text-tertiary)", padding: "40px 0" }}>
                    <Ticket size={28} style={{ opacity: 0.3 }} />
                    <div style={{ marginTop: 8 }}>暂无邀请码</div>
                  </td>
                </tr>
              )}
              {items.map((it) => {
                const usable = it.status === "pending" && it.expiresAt >= now;
                const shareUrl = usable ? `/i/${it.code}` : "";
                return (
                  <tr key={it.id}>
                    <td>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.95rem", fontWeight: 700, color: "var(--color-primary-400)", letterSpacing: "1.2px" }}>
                        {it.code}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{it.clientName}</div>
                      {it.clientContact && (
                        <div style={{ fontSize: "0.75rem", color: "var(--color-text-tertiary)" }}>
                          {it.clientContact}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: "0.85rem" }}>{it.currency}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--color-text-tertiary)" }}>{it.deliveryTerms}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{it.discount}%</div>
                    </td>
                    <td>
                      <div style={{ fontSize: "0.85rem" }}>{it.validDays} 天</div>
                    </td>
                    <td>{statusBadge(it)}</td>
                    <td>
                      {it.quote ? (
                        <Link href={`/sales/quotes/${it.quote.id}`} className="btn btn-outline btn-sm">
                          <FileText size={12} />
                          {it.quote.quoteNumber}
                        </Link>
                      ) : (
                        <span style={{ color: "var(--color-text-tertiary)", fontSize: "0.85rem" }}>—</span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: "0.8rem" }}>{it.createdBy.nameZh}</div>
                      <div style={{ fontSize: "0.7rem", color: "var(--color-text-tertiary)" }}>
                        {it.createdAt.toLocaleDateString("zh-CN")}
                      </div>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {usable && shareUrl ? (
                        <div style={{ display: "inline-flex", gap: 6 }}>
                          <CopyInviteUrl path={shareUrl} />
                          <Link href={shareUrl} target="_blank" className="btn btn-outline btn-sm">
                            <ExternalLink size={12} />
                            打开
                          </Link>
                        </div>
                      ) : (
                        <span style={{ color: "var(--color-text-tertiary)", fontSize: "0.85rem" }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
