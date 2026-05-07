"use client";

import { useMemo, useState, type CSSProperties } from "react";
import {
  Save,
  Pencil,
  X,
  CheckCircle2,
  AlertTriangle,
  Plus,
  ChevronUp,
  ChevronDown,
  Trash2,
  Eye,
  EyeOff,
  GripVertical,
  ChevronRight,
} from "lucide-react";

type LegacyTerms = {
  warrantyZh: string | null;
  warrantyEn?: string | null;
  paymentTermsZh: string | null;
  paymentTermsEn?: string | null;
  deliveryTimeZh: string | null;
  deliveryTimeEn?: string | null;
  trainingZh: string | null;
  trainingEn?: string | null;
};

type TermItem = {
  key: string;
  labelZh: string;
  labelEn: string;
  valueZh: string;
  valueEn: string;
  enabled: boolean;
  order: number;
};

function safeParseTermsJson(raw: string | null | undefined): TermItem[] | null {
  if (!raw) return null;
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return null;
    return arr
      .map((t: any, i: number) => ({
        key: String(t?.key ?? "").trim() || `term_${i}`,
        labelZh: String(t?.labelZh ?? "").trim(),
        labelEn: String(t?.labelEn ?? "").trim(),
        valueZh: String(t?.valueZh ?? "").trim(),
        valueEn: String(t?.valueEn ?? "").trim(),
        enabled: t?.enabled === false ? false : true,
        order: Number.isFinite(Number(t?.order)) ? Number(t.order) : i * 10,
      }))
      .sort((a, b) => a.order - b.order);
  } catch {
    return null;
  }
}

function buildDefaultTermsFromLegacy(legacy: LegacyTerms): TermItem[] {
  return [
    { key: "warranty", labelZh: "质保", labelEn: "Warranty", valueZh: legacy.warrantyZh || "", valueEn: String(legacy.warrantyEn || ""), enabled: true, order: 10 },
    { key: "payment", labelZh: "付款", labelEn: "Payment", valueZh: legacy.paymentTermsZh || "", valueEn: String(legacy.paymentTermsEn || ""), enabled: true, order: 20 },
    { key: "delivery", labelZh: "交付", labelEn: "Delivery", valueZh: legacy.deliveryTimeZh || "", valueEn: String(legacy.deliveryTimeEn || ""), enabled: true, order: 30 },
    { key: "training", labelZh: "培训", labelEn: "Training", valueZh: legacy.trainingZh || "", valueEn: String(legacy.trainingEn || ""), enabled: true, order: 40 },
  ];
}

function previewText(s: string, max = 72) {
  const t = s.replace(/\s+/g, " ").trim();
  if (!t) return "（无正文）";
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

export default function BusinessTermsEditor({
  quoteId,
  initial,
  initialTermsJson,
}: {
  quoteId: string;
  initial: LegacyTerms;
  initialTermsJson?: string | null;
}) {
  const initTerms = useMemo(() => {
    if (initialTermsJson === null || initialTermsJson === undefined) {
      return buildDefaultTermsFromLegacy(initial);
    }
    const parsed = safeParseTermsJson(initialTermsJson);
    if (!parsed) return buildDefaultTermsFromLegacy(initial);
    if (parsed.length === 0) return buildDefaultTermsFromLegacy(initial);
    return parsed;
  }, [initial, initialTermsJson]);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [terms, setTerms] = useState<TermItem[]>(initTerms);
  /** true = 折叠（只显示一行摘要） */
  const [folded, setFolded] = useState<Record<string, boolean>>({});

  const reset = () => {
    setTerms(initTerms);
    setError(null);
  };

  const normalizeOrder = (arr: TermItem[]) =>
    arr
      .map((t, idx) => ({ ...t, order: (idx + 1) * 10 }))
      .sort((a, b) => a.order - b.order);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const payload = {
        terms: normalizeOrder(
          terms.map((t) => ({
            ...t,
            key: String(t.key || "").trim() || `term_${Math.random().toString(36).slice(2, 8)}`,
            labelZh: String(t.labelZh || "").trim(),
            labelEn: String(t.labelEn || "").trim(),
            valueZh: String(t.valueZh || "").trim(),
            valueEn: String(t.valueEn || "").trim(),
            enabled: t.enabled !== false,
          }))
        ),
      };
      const res = await fetch(`/api/sales/quotes/${quoteId}/terms`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) {
        setError(json?.error || "保存失败");
        return;
      }
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("网络异常，保存失败");
    } finally {
      setSaving(false);
    }
  };

  const iconBtn: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "34px",
    height: "34px",
    padding: 0,
    borderRadius: "8px",
    border: "1px solid var(--color-border)",
    background: "var(--color-bg-tertiary)",
    color: "var(--color-text-secondary)",
    cursor: "pointer",
    flexShrink: 0,
  };

  const TermRow = ({ t, idx }: { t: TermItem; idx: number }) => {
    const isFolded = !!folded[t.key];
    const move = (dir: -1 | 1) => {
      setTerms((prev) => {
        const next = [...prev];
        const j = idx + dir;
        if (j < 0 || j >= next.length) return prev;
        const tmp = next[idx];
        next[idx] = next[j];
        next[j] = tmp;
        return normalizeOrder(next);
      });
    };
    const remove = () => {
      if (!confirm("确定删除该条款？")) return;
      setTerms((prev) => prev.filter((_, i) => i !== idx));
      setFolded((f) => {
        const n = { ...f };
        delete n[t.key];
        return n;
      });
    };

    const titleLine = [t.labelZh || "未命名", t.labelEn].filter(Boolean).join(" · ");

    return (
      <div
        style={{
          border: "1px solid var(--color-border)",
          borderRadius: "12px",
          overflow: "hidden",
          minWidth: 0,
          background: "var(--color-bg-card)",
        }}
      >
        {/* 摘要条：可点击展开/收起 */}
        <button
          type="button"
          onClick={() => setFolded((f) => ({ ...f, [t.key]: !isFolded }))}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "12px 14px",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            textAlign: "left",
            color: "var(--color-text-primary)",
          }}
        >
          <span style={{ color: "var(--color-text-tertiary)", display: "flex" }}>
            {isFolded ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.7rem",
              fontWeight: 800,
              color: "var(--color-text-tertiary)",
              minWidth: "28px",
            }}
          >
            {idx + 1}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: "0.9rem", lineHeight: 1.3 }}>{titleLine}</div>
            {isFolded ? (
              <div style={{ marginTop: "4px", fontSize: "0.78rem", color: "var(--color-text-tertiary)", lineHeight: 1.4 }}>
                {previewText(t.valueZh || t.valueEn)}
              </div>
            ) : null}
          </div>
          {!t.enabled ? (
            <span
              style={{
                fontSize: "0.65rem",
                fontWeight: 800,
                padding: "2px 8px",
                borderRadius: "999px",
                background: "rgba(148,163,184,0.15)",
                color: "var(--color-text-tertiary)",
              }}
            >
              已隐藏
            </span>
          ) : (
            <span
              style={{
                fontSize: "0.65rem",
                fontWeight: 800,
                padding: "2px 8px",
                borderRadius: "999px",
                background: "rgba(34,197,94,0.12)",
                color: "var(--color-success-500)",
              }}
            >
              展示中
            </span>
          )}
        </button>

        {/* 展开：表单 + 工具 */}
        {!isFolded && (
          <div style={{ padding: "0 14px 14px", borderTop: "1px solid var(--color-border)" }}>
            <div style={{ display: "flex", gap: "12px", paddingTop: "12px" }}>
              {/* 左侧：排序（竖向，不占文字宽度） */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "6px",
                  paddingTop: "4px",
                  flexShrink: 0,
                }}
                title="调整顺序"
              >
                <GripVertical size={16} style={{ color: "var(--color-text-tertiary)", opacity: 0.6 }} />
                <button type="button" style={{ ...iconBtn, opacity: idx === 0 ? 0.35 : 1 }} disabled={idx === 0} onClick={() => move(-1)} aria-label="上移">
                  <ChevronUp size={16} />
                </button>
                <button
                  type="button"
                  style={{ ...iconBtn, opacity: idx === terms.length - 1 ? 0.35 : 1 }}
                  disabled={idx === terms.length - 1}
                  onClick={() => move(1)}
                  aria-label="下移"
                >
                  <ChevronDown size={16} />
                </button>
              </div>

              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "14px" }}>
                {/* 类目 */}
                <div>
                  <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--color-text-tertiary)", marginBottom: "8px", letterSpacing: "0.04em" }}>
                    类目标题（客户可见）
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px" }}>
                    <input
                      className="form-input"
                      value={t.labelZh}
                      onChange={(e) => setTerms((p) => p.map((x, i) => (i === idx ? { ...x, labelZh: e.target.value } : x)))}
                      placeholder="中文，如：质保"
                      style={{ width: "100%", height: "38px", boxSizing: "border-box" }}
                    />
                    <input
                      className="form-input"
                      value={t.labelEn}
                      onChange={(e) => setTerms((p) => p.map((x, i) => (i === idx ? { ...x, labelEn: e.target.value } : x)))}
                      placeholder="English, e.g. Warranty"
                      style={{ width: "100%", height: "38px", boxSizing: "border-box" }}
                    />
                  </div>
                </div>

                {/* 正文：上下排列，符合阅读顺序 */}
                <div>
                  <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--color-text-tertiary)", marginBottom: "8px", letterSpacing: "0.04em" }}>
                    条款正文
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div>
                      <label className="form-label" style={{ marginBottom: "6px", display: "block", fontSize: "0.75rem" }}>
                        中文
                      </label>
                      <textarea
                        className="form-input"
                        rows={4}
                        value={t.valueZh}
                        onChange={(e) => setTerms((p) => p.map((x, i) => (i === idx ? { ...x, valueZh: e.target.value } : x)))}
                        placeholder="填写中文条款内容"
                        style={{ width: "100%", minHeight: "100px", resize: "vertical", boxSizing: "border-box", lineHeight: 1.5 }}
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ marginBottom: "6px", display: "block", fontSize: "0.75rem" }}>
                        English（可选）
                      </label>
                      <textarea
                        className="form-input"
                        rows={4}
                        value={t.valueEn}
                        onChange={(e) => setTerms((p) => p.map((x, i) => (i === idx ? { ...x, valueEn: e.target.value } : x)))}
                        placeholder="English terms (optional)"
                        style={{ width: "100%", minHeight: "100px", resize: "vertical", boxSizing: "border-box", lineHeight: 1.5 }}
                      />
                    </div>
                  </div>
                </div>

                {/* 底部操作：与表单区对齐 */}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: "8px",
                    borderTop: "1px dashed var(--color-border)",
                    marginTop: "2px",
                    paddingTop: "12px",
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => setTerms((p) => p.map((x, i) => (i === idx ? { ...x, enabled: !x.enabled } : x)))}
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                  >
                    {t.enabled ? <EyeOff size={14} /> : <Eye size={14} />}
                    {t.enabled ? "在分享页隐藏" : "在分享页显示"}
                  </button>
                  <button type="button" className="btn btn-outline btn-sm" onClick={remove} style={{ color: "var(--color-danger-400)", marginLeft: "auto" }}>
                    <Trash2 size={14} />
                    删除此条
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="card">
      <div className="card-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <div className="card-title">商务条款</div>
          <div style={{ fontSize: "0.78rem", color: "var(--color-text-tertiary)", marginTop: "4px" }}>
            分享页与 PDF 与这里保持一致；编辑后请点右下角保存。
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {saved && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--color-success-500)", fontSize: "0.75rem", fontWeight: 700 }}>
              <CheckCircle2 size={14} />
              已保存
            </span>
          )}
          {!editing ? (
            <button className="btn btn-outline btn-sm" type="button" onClick={() => setEditing(true)}>
              <Pencil size={14} />
              编辑条款
            </button>
          ) : (
            <>
              <button
                className="btn btn-outline btn-sm"
                type="button"
                onClick={() => {
                  reset();
                  setEditing(false);
                }}
                disabled={saving}
              >
                <X size={14} />
                放弃修改
              </button>
              <button className="btn btn-primary btn-sm" type="button" onClick={handleSave} disabled={saving}>
                <Save size={14} />
                {saving ? "保存中…" : "保存"}
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 12px",
            borderRadius: "10px",
            background: "rgba(248,113,113,0.08)",
            border: "1px solid rgba(248,113,113,0.18)",
            color: "var(--color-danger-400)",
            fontSize: "0.85rem",
            marginBottom: "12px",
          }}
        >
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {!editing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {terms.filter((t) => t.enabled).length === 0 ? (
            <div style={{ color: "var(--color-text-tertiary)", fontSize: "0.85rem" }}>暂无展示条款。点击「编辑条款」可添加或开启。</div>
          ) : (
            terms
              .filter((t) => t.enabled)
              .sort((a, b) => a.order - b.order)
              .map((t, i) => (
                <div
                  key={`${t.key}-${i}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(88px, 120px) 1fr",
                    gap: "14px 16px",
                    alignItems: "start",
                    padding: "12px 0",
                    borderBottom: i < terms.filter((x) => x.enabled).length - 1 ? "1px solid var(--color-border)" : "none",
                  }}
                >
                  <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--color-text-secondary)", lineHeight: 1.35 }}>
                    <div>{t.labelZh || "条款"}</div>
                    {t.labelEn ? <div style={{ marginTop: "6px", color: "var(--color-text-tertiary)", fontWeight: 700 }}>{t.labelEn}</div> : null}
                  </div>
                  <div style={{ fontSize: "0.88rem", color: "var(--color-text-primary)", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
                    {t.valueZh ? <div>{t.valueZh}</div> : null}
                    {t.valueZh && t.valueEn ? <div style={{ height: "10px" }} /> : null}
                    {t.valueEn ? <div style={{ color: "var(--color-text-secondary)", fontSize: "0.86rem" }}>{t.valueEn}</div> : null}
                    {!t.valueZh && !t.valueEn ? "—" : null}
                  </div>
                </div>
              ))
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--color-text-tertiary)" }}>
              点击标题行可折叠，便于长列表浏览。
            </span>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() =>
                setTerms((prev) =>
                  normalizeOrder([
                    ...prev,
                    {
                      key: `custom_${Date.now()}`,
                      labelZh: "新条款",
                      labelEn: "",
                      valueZh: "",
                      valueEn: "",
                      enabled: true,
                      order: (prev.length + 1) * 10,
                    },
                  ])
                )
              }
            >
              <Plus size={14} />
              新增一条
            </button>
          </div>
          {terms.length === 0 ? (
            <div style={{ color: "var(--color-text-tertiary)", fontSize: "0.85rem" }}>暂无条款，请点击「新增一条」。</div>
          ) : (
            terms.map((t, idx) => <TermRow key={`${t.key}-${idx}`} t={t} idx={idx} />)
          )}
        </div>
      )}
    </div>
  );
}
