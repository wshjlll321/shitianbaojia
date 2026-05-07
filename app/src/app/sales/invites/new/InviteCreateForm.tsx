"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Ticket } from "lucide-react";

export default function InviteCreateForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<{ code: string; expiresAt: string } | null>(null);

  const [form, setForm] = useState({
    clientName: "",
    clientContact: "",
    clientEmail: "",
    currency: "USD",
    deliveryTerms: "FOB Qingdao",
    discount: 0,
    validDays: 30,
    codeExpiresInDays: 14,
    remark: "",
  });

  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientName.trim()) {
      alert("请填写客户名称");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setCreated({ code: data.invite.code, expiresAt: data.invite.expiresAt });
      } else {
        alert(data.error || "创建失败");
      }
    } catch (err) {
      console.error(err);
      alert("网络错误");
    } finally {
      setLoading(false);
    }
  };

  if (created) {
    const inviteUrl = typeof window !== "undefined" ? `${window.location.origin}/i/${created.code}` : `/i/${created.code}`;
    return (
      <>
        <div className="page-header">
          <div className="page-header-info">
            <h1>邀请码已生成</h1>
            <p>把下面的链接发给客户，客户可以一次性自助生成报价单</p>
          </div>
        </div>
        <div className="card" style={{ padding: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 12,
              background: "rgba(51,102,255,0.1)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Ticket size={28} style={{ color: "var(--color-primary-500)" }} />
            </div>
            <div>
              <div style={{ fontSize: "0.7rem", color: "var(--color-text-tertiary)", letterSpacing: "1.5px" }}>邀请码</div>
              <div style={{ fontSize: "2rem", fontWeight: 700, fontFamily: "var(--font-mono)", letterSpacing: "3px", color: "var(--color-primary-400)" }}>
                {created.code}
              </div>
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label className="form-label">客户访问链接</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input className="form-input" readOnly value={inviteUrl} style={{ flex: 1 }} />
              <button
                type="button"
                className="btn btn-primary"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(inviteUrl);
                    alert("已复制");
                  } catch {
                    alert("复制失败，请手动选中");
                  }
                }}
              >
                复制
              </button>
            </div>
          </div>
          <div style={{ fontSize: "0.85rem", color: "var(--color-text-tertiary)", marginBottom: 24 }}>
            邀请码 {new Date(created.expiresAt).toLocaleDateString("zh-CN")} 前有效；客户使用后状态变为"已使用"。
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/sales/invites" className="btn btn-outline">返回列表</Link>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setCreated(null);
                setForm({
                  clientName: "", clientContact: "", clientEmail: "",
                  currency: "USD", deliveryTerms: "FOB Qingdao",
                  discount: 0, validDays: 30, codeExpiresInDays: 14, remark: "",
                });
              }}
            >
              再建一个
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="page-header" style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <Link href="/sales/invites" className="btn btn-outline btn-sm">
          <ArrowLeft size={14} /> 返回
        </Link>
        <div className="page-header-info">
          <h1>新增邀请码</h1>
          <p>预填客户信息和报价参数；客户访问后只需选无人机和配件</p>
        </div>
      </div>

      <form onSubmit={submit}>
        <div className="card" style={{ padding: 24, maxWidth: 720 }}>
          <h3 style={{ margin: "0 0 16px", fontSize: "1rem" }}>客户信息（在 PDF 中显示）</h3>
          <div className="form-group">
            <label className="form-label required">客户/公司名称</label>
            <input
              className="form-input"
              value={form.clientName}
              onChange={(e) => set("clientName", e.target.value)}
              required
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="form-group">
              <label className="form-label">联系人</label>
              <input
                className="form-input"
                value={form.clientContact}
                onChange={(e) => set("clientContact", e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">客户邮箱</label>
              <input
                type="email"
                className="form-input"
                value={form.clientEmail}
                onChange={(e) => set("clientEmail", e.target.value)}
              />
            </div>
          </div>

          <h3 style={{ margin: "20px 0 16px", fontSize: "1rem" }}>报价参数（客户无法修改）</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="form-group">
              <label className="form-label">币种</label>
              <select
                className="form-select"
                value={form.currency}
                onChange={(e) => set("currency", e.target.value)}
              >
                <option value="USD">USD ($)</option>
                <option value="CNY">CNY (¥)</option>
                <option value="THB">THB (฿)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">贸易条款</label>
              <select
                className="form-select"
                value={form.deliveryTerms}
                onChange={(e) => set("deliveryTerms", e.target.value)}
              >
                <option value="EXW">EXW 工厂交货</option>
                <option value="FOB Qingdao">FOB 青岛</option>
                <option value="CIF">CIF 到岸价</option>
                <option value="DDP">DDP 完税交货</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">折扣 (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                className="form-input"
                value={form.discount}
                onChange={(e) => set("discount", Number(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">报价单有效期（天）</label>
              <input
                type="number"
                min="1"
                max="365"
                className="form-input"
                value={form.validDays}
                onChange={(e) => set("validDays", Number(e.target.value))}
              />
            </div>
          </div>

          <h3 style={{ margin: "20px 0 16px", fontSize: "1rem" }}>邀请码本身</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="form-group">
              <label className="form-label">邀请码本身有效（天）</label>
              <input
                type="number"
                min="1"
                max="180"
                className="form-input"
                value={form.codeExpiresInDays}
                onChange={(e) => set("codeExpiresInDays", Number(e.target.value))}
              />
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-tertiary)", marginTop: 4 }}>
                超过此期限客户访问邀请码会显示已过期
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">备注（仅后台可见）</label>
              <input
                className="form-input"
                value={form.remark}
                onChange={(e) => set("remark", e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 24 }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Save size={14} /> {loading ? "生成中..." : "生成邀请码"}
            </button>
            <button type="button" className="btn btn-outline" onClick={() => router.push("/sales/invites")}>
              取消
            </button>
          </div>
        </div>
      </form>
    </>
  );
}
