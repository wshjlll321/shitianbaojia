"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  ChevronLeft,
  Check,
  Plane,
  Package,
  User,
  FileCheck,
  Star,
  Plus,
  Minus,
  Zap,
  Shield,
  Clock,
  Weight,
  Gauge,
} from "lucide-react";
import { getSnapshotSpecEntries } from "@/lib/productSpecs";

/* ═══════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════ */
interface SelectedAccessory {
  id: string;
  qty: number;
}

interface SelectedSku {
  id: string;
  sku: string;
  labelZh: string;
  labelEn: string;
  name: string;
  nameEn: string;
  price: number;
  isDefault: boolean;
  includesZh?: string;
  includesEn?: string;
}

const STEPS = [
  { key: "aircraft", icon: Plane, label: "选择机型", labelEn: "Aircraft" },
  { key: "payload", icon: Package, label: "选配挂载", labelEn: "Payloads" },
  { key: "client", icon: User, label: "客户信息", labelEn: "Client" },
  { key: "review", icon: FileCheck, label: "确认报价", labelEn: "Review" },
];

/* ═══════════════════════════════════════════════════════════
   Helper: extract a few key specs for display
   ═══════════════════════════════════════════════════════════ */
function getQuickSpecs(specsZh: string, specsEn: string) {
  try {
    const specs = JSON.parse(specsZh || "{}");
    const specsE = JSON.parse(specsEn || "{}");
    const result: { icon: any; label: string; value: string }[] = [];

    // Payload
    const payload = specs["有效载荷"] || specsE["Payload"];
    if (payload) result.push({ icon: Weight, label: "载荷", value: payload });

    // Endurance
    const endurance = specs["续航时间"] || specsE["Endurance"];
    if (endurance) result.push({ icon: Clock, label: "航时", value: endurance.split("（")[0].split("(")[0].trim() });

    // Speed
    const speed = specs["飞行速度"] || specs["巡航速度"] || specsE["Flight Speed"] || specsE["Cruise Speed"];
    if (speed) result.push({ icon: Gauge, label: "速度", value: speed });

    // Max takeoff
    const mtow = specs["最大起飞重量"] || specsE["Max Takeoff Weight"];
    if (mtow) result.push({ icon: Shield, label: "起飞重量", value: mtow });

    return result.slice(0, 4);
  } catch {
    return [];
  }
}

function getFeatures(featuresZh: string): string[] {
  try {
    return JSON.parse(featuresZh || "[]").slice(0, 4);
  } catch {
    return [];
  }
}

function safeParseStringArray(input: any): string[] {
  try {
    const v = JSON.parse(String(input || "[]"));
    return Array.isArray(v) ? v.filter(Boolean).map(String) : [];
  } catch {
    return [];
  }
}

/* ═══════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════ */
export default function QuoteBuilderForm({
  mainProducts,
  allAccessories,
  salesId,
}: any) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [selectedMainId, setSelectedMainId] = useState("");
  const [selectedSkuId, setSelectedSkuId] = useState("");
  const [selectedAcc, setSelectedAcc] = useState<SelectedAccessory[]>([]);
  const [clientName, setClientName] = useState("");
  const [clientContact, setClientContact] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [deliveryTerms, setDeliveryTerms] = useState("FOB Qingdao");
  const [discount, setDiscount] = useState(0);
  const [validDays, setValidDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [animDir, setAnimDir] = useState<"right" | "left">("right");

  const mainP = mainProducts.find((p: any) => p.id === selectedMainId);
  const mainSkus: SelectedSku[] = (mainP?.skus || []) as any;
  const selectedSku: SelectedSku | undefined = mainSkus.find((s) => s.id === selectedSkuId);
  const selectedSkuIncludes = useMemo(() => {
    if (!selectedSku) return [];
    // Prefer zh for now; English is shown on share page by locale
    return safeParseStringArray(selectedSku.includesZh || "[]");
  }, [selectedSku]);

  // Get accessories for the selected drone (from ProductAccessory relation)
  const relevantAccessories = useMemo(() => {
    if (!mainP) return allAccessories;
    const associatedIds = mainP.accessories?.map((a: any) => a.accessory.id) || [];
    if (associatedIds.length === 0) return allAccessories;
    // Return associated accessories with recommendation info
    return mainP.accessories.map((a: any) => ({
      ...a.accessory,
      isRecommended: a.isRecommended,
    }));
  }, [mainP, allAccessories]);

  const currencySymbol = currency === "CNY" ? "¥" : currency === "USD" ? "$" : "฿";
  const mainUnitPrice = selectedSku ? Number(selectedSku.price || 0) : mainP ? Number(mainP.fobPrice || mainP.msrp) : 0;
  const mainPrice = mainP ? mainUnitPrice : 0;
  const accTotal = selectedAcc.reduce((sum, item) => {
    const acc = relevantAccessories.find((a: any) => a.id === item.id);
    return sum + (acc ? Number(acc.fobPrice || acc.msrp) * item.qty : 0);
  }, 0);
  const subtotal = mainPrice + accTotal;
  const total = subtotal * (1 - discount / 100);

  const fmt = (v: number) =>
    new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(v);

  // Navigation
  const canNext = () => {
    if (step === 0) return !!selectedMainId && !!selectedSkuId;
    if (step === 1) return true;
    if (step === 2) return !!clientName;
    return true;
  };

  const goNext = () => {
    if (!canNext()) return;
    setAnimDir("right");
    setStep((s) => Math.min(s + 1, 3));
  };

  const goPrev = () => {
    setAnimDir("left");
    setStep((s) => Math.max(s - 1, 0));
  };

  const selectDrone = (id: string) => {
    setSelectedMainId(id);
    const p = mainProducts.find((x: any) => x.id === id);
    const skus = (p?.skus || []) as any[];
    const def = skus.find((s) => s.isDefault) || skus[0];
    setSelectedSkuId(def?.id || "");
    setSelectedAcc([]); // Reset accessories when changing drone
  };

  const toggleAcc = (id: string) => {
    if (selectedAcc.find((a) => a.id === id)) {
      setSelectedAcc(selectedAcc.filter((a) => a.id !== id));
    } else {
      setSelectedAcc([...selectedAcc, { id, qty: 1 }]);
    }
  };

  const updateAccQty = (id: string, delta: number) => {
    setSelectedAcc(
      selectedAcc.map((a) =>
        a.id === id ? { ...a, qty: Math.max(1, a.qty + delta) } : a
      )
    );
  };

  const handleSubmit = async () => {
    if (!selectedMainId || !selectedSkuId || !clientName) return;
    setLoading(true);
    try {
      const res = await fetch("/api/sales/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName,
          clientContact,
          clientEmail,
          currency,
          deliveryTerms,
          salesId,
          discount,
          validDays,
          mainProductId: selectedMainId,
          mainSkuId: selectedSkuId,
          accessories: selectedAcc,
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Redirect to detail page for immediate sharing (link/QR/PDF)
        router.push(`/sales/quotes/${data.quote.id}`);
      } else {
        alert(data?.error || "生成报价失败 / Error generating quote");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /* ═══════════════════════════════════════════════════════════
     Render
     ═══════════════════════════════════════════════════════════ */
  return (
    <div className="configurator-wrap">
      {/* ─── STEPPER ─── */}
      <div className="cfg-stepper">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const state = i < step ? "completed" : i === step ? "active" : "pending";
          return (
            <div key={s.key} className={`cfg-stepper-step ${state}`}>
              <div className="cfg-stepper-dot">
                {state === "completed" ? <Check size={14} /> : <Icon size={14} />}
              </div>
              <div className="cfg-stepper-labels">
                <span className="cfg-stepper-label">{s.label}</span>
                <span className="cfg-stepper-sublabel">{s.labelEn}</span>
              </div>
              {i < STEPS.length - 1 && <div className="cfg-stepper-line" />}
            </div>
          );
        })}
      </div>

      {/* ─── STEP CONTENT ─── */}
      <div className="cfg-content" key={step} style={{
        animation: `${animDir === "right" ? "cfgSlideInRight" : "cfgSlideInLeft"} 0.35s ease forwards`,
      }}>
        {step === 0 && renderStep1()}
        {step === 1 && renderStep2()}
        {step === 2 && renderStep3()}
        {step === 3 && renderStep4()}
      </div>

      {/* ─── BOTTOM BAR ─── */}
      <div className="cfg-bottombar">
        <div className="cfg-bottombar-inner">
          {step > 0 ? (
            <button className="btn btn-outline" onClick={goPrev} type="button">
              <ChevronLeft size={16} />
              上一步
            </button>
          ) : (
            <button
              className="btn btn-outline"
              onClick={() => router.push("/sales")}
              type="button"
            >
              取消
            </button>
          )}

          {/* Live price */}
          <div className="cfg-bottombar-price">
            <div className="cfg-price-label">FOB 青岛报价</div>
            <div className="cfg-price-value">
              {currencySymbol}
              {fmt(total)}
            </div>
          </div>

          {step < 3 ? (
            <button
              className="btn btn-primary"
              onClick={goNext}
              disabled={!canNext()}
              type="button"
            >
              下一步
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              className="btn btn-accent"
              onClick={handleSubmit}
              disabled={loading}
              type="button"
              style={{ minWidth: "180px" }}
            >
              {loading ? "生成中..." : "生成报价"}
              <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>

      {/* ─── STEP RENDERERS ─── */}
      {renderStyles()}
    </div>
  );

  /* ═══════════════════════════════════════════════════════════
     STEP 1: Select Aircraft
     ═══════════════════════════════════════════════════════════ */
  function renderStep1() {
    return (
      <div>
        <div className="cfg-step-header">
          <h2>选择您的机型</h2>
          <p>请选择需要报价的无人机平台，并选择对应版本（SKU）</p>
        </div>
        <div className="cfg-aircraft-grid">
          {mainProducts.map((p: any) => {
            const active = selectedMainId === p.id;
            const quickSpecs = getQuickSpecs(p.specsZh, p.specsEn);
            const features = getFeatures(p.featuresZh);
            const skus: SelectedSku[] = (p.skus || []) as any;
            const hasSku = skus.length > 0;
            return (
              <div
                key={p.id}
                className={`cfg-aircraft-card ${active ? "selected" : ""}`}
                onClick={() => selectDrone(p.id)}
              >
                {/* Selection indicator */}
                <div className="cfg-aircraft-check">
                  {active && <Check size={16} />}
                </div>

                {/* Image */}
                <div className="cfg-aircraft-img">
                  {p.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imageUrl} alt={p.model} />
                  ) : (
                    <div className="cfg-aircraft-placeholder">
                      <Plane size={48} />
                    </div>
                  )}
                  {/* Model badge */}
                  <div className="cfg-aircraft-model-badge">{p.model}</div>
                </div>

                {/* Info */}
                <div className="cfg-aircraft-info">
                  <h3>{p.nameZh}</h3>
                  <p className="cfg-aircraft-name-en">{p.nameEn}</p>

                  {/* SKU selector */}
                  <div style={{ marginBottom: "12px" }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-tertiary)", marginBottom: "6px" }}>
                      版本（SKU）
                    </div>
                    {hasSku ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                        {skus.map((s) => {
                          const selected = active && selectedSkuId === s.id;
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedMainId(p.id);
                                setSelectedSkuId(s.id);
                              }}
                              style={{
                                border: `1px solid ${selected ? "var(--color-primary-500)" : "var(--color-border)"}`,
                                background: selected ? "rgba(51,102,255,0.08)" : "var(--color-bg-tertiary)",
                                color: selected ? "var(--color-primary-400)" : "var(--color-text-secondary)",
                                borderRadius: "10px",
                                padding: "6px 10px",
                                cursor: "pointer",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                              }}
                              title={s.sku}
                            >
                              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 800, letterSpacing: "0.5px" }}>
                                {s.sku}
                              </span>
                              <span>{s.labelZh || s.name}</span>
                              {s.isDefault && (
                                <span style={{
                                  padding: "2px 6px",
                                  borderRadius: "999px",
                                  background: "rgba(34,197,94,0.12)",
                                  color: "var(--color-success-500)",
                                  fontSize: "0.65rem",
                                  fontWeight: 800,
                                }}>
                                  默认
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ fontSize: "0.8rem", color: "var(--color-danger-400)", fontWeight: 700 }}>
                        该机型暂无 SKU，请先在“无人机管理 → 编辑”中新增版本
                      </div>
                    )}
                  </div>

                  {/* Selected SKU includes */}
                  {active && selectedSku && safeParseStringArray(selectedSku.includesZh || "[]").length > 0 && (
                    <div
                      style={{
                        marginTop: "10px",
                        padding: "10px 12px",
                        borderRadius: "12px",
                        background: "rgba(51,102,255,0.06)",
                        border: "1px solid var(--color-border)",
                      }}
                    >
                      <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--color-primary-400)", marginBottom: "6px" }}>
                        该版本包含内容
                      </div>
                      <ul style={{ margin: 0, paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "4px" }}>
                        {safeParseStringArray(selectedSku.includesZh || "[]").slice(0, 6).map((it: string, idx: number) => (
                          <li key={idx} style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)", fontWeight: 600 }}>
                            {it}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Quick specs */}
                  {quickSpecs.length > 0 && (
                    <div className="cfg-aircraft-specs">
                      {quickSpecs.map((spec, i) => {
                        const SIcon = spec.icon;
                        return (
                          <div key={i} className="cfg-aircraft-spec">
                            <SIcon size={12} />
                            <span>{spec.value}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Features preview */}
                  {features.length > 0 && (
                    <div className="cfg-aircraft-features">
                      {features.map((f: string, i: number) => (
                        <span key={i} className="cfg-feat-tag">
                          <Zap size={10} />
                          {f.length > 12 ? f.slice(0, 12) + "…" : f}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Price */}
                  <div className="cfg-aircraft-price">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span className="cfg-price-from">FOB 青岛</span>
                      {Number(p.msrp) > 0 && Number(p.msrp) !== Number(p.fobPrice) && (
                        <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>市场指导价 MSRP</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                      <span className="cfg-price-amount">
                        {currencySymbol}{fmt(active ? (selectedSku ? selectedSku.price : (p.fobPrice || p.msrp)) : (p.fobPrice || p.msrp))}
                      </span>
                      {Number(p.msrp) > 0 && Number(p.msrp) !== Number(p.fobPrice) && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textDecoration: 'line-through', fontFamily: 'var(--font-mono)' }}>
                          {currencySymbol}{fmt(p.msrp)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     STEP 2: Configure Payloads
     ═══════════════════════════════════════════════════════════ */
  function renderStep2() {
    return (
      <div>
        <div className="cfg-step-header">
          <h2>选配挂载与配件</h2>
          <p>为 {mainP?.model} 选择搭载设备与附件</p>
        </div>

        {/* Selected drone summary */}
        {mainP && (
          <div className="cfg-selected-drone">
            <div className="cfg-selected-drone-img">
              {mainP.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mainP.imageUrl} alt={mainP.model} />
              ) : (
                <Plane size={24} />
              )}
            </div>
            <div>
              <span className="cfg-selected-drone-model">{mainP.model}</span>
              <span className="cfg-selected-drone-name">{mainP.nameZh}</span>
              {selectedSku && (
                <div style={{ fontSize: "0.75rem", color: "var(--color-text-tertiary)", marginTop: "2px" }}>
                  SKU：{selectedSku.labelZh || selectedSku.name} ({selectedSku.sku})
                </div>
              )}
              {selectedSkuIncludes.length > 0 && (
                <div style={{ marginTop: "8px", fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                  <div style={{ fontWeight: 800, marginBottom: "4px" }}>版本包含：</div>
                  <ul style={{ margin: 0, paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "2px" }}>
                    {selectedSkuIncludes.slice(0, 5).map((it, idx) => (
                      <li key={idx}>{it}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="cfg-selected-drone-price">
              {currencySymbol}{fmt(mainUnitPrice)}
            </div>
          </div>
        )}

        {/* Accessories grid */}
        <div className="cfg-payload-grid">
          {relevantAccessories.map((acc: any) => {
            const sel = selectedAcc.find((a) => a.id === acc.id);
            const isSelected = !!sel;
            const accFeatures = getFeatures(acc.featuresZh);
            return (
              <div
                key={acc.id}
                className={`cfg-payload-card ${isSelected ? "selected" : ""}`}
              >
                {/* Recommended badge */}
                {acc.isRecommended && (
                  <div className="cfg-payload-recommended">
                    <Star size={10} />
                    推荐
                  </div>
                )}

                {/* Image */}
                <div className="cfg-payload-img">
                  {acc.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={acc.imageUrl} alt={acc.model} />
                  ) : (
                    <Package size={28} />
                  )}
                </div>

                {/* Info */}
                <div className="cfg-payload-info">
                  <div className="cfg-payload-model">{acc.model}</div>
                  <h4>{acc.nameZh}</h4>
                  <p className="cfg-payload-name-en">{acc.nameEn}</p>

                  {/* Feature tags */}
                  {accFeatures.length > 0 && (
                    <div className="cfg-payload-feats">
                      {accFeatures.map((f: string, i: number) => (
                        <span key={i} className="cfg-payload-feat-tag">{f}</span>
                      ))}
                    </div>
                  )}

                  {(() => {
                    const specEntries = getSnapshotSpecEntries(acc.specsZh, acc.specsEn, "zh");
                    if (!specEntries.length) return null;
                    return (
                      <div className="cfg-payload-specs">
                        <div className="cfg-payload-specs-title">技术参数</div>
                        <div className="cfg-payload-specs-grid">
                          {specEntries.slice(0, 12).map(([k, v]) => (
                            <div key={k} className="cfg-payload-spec-item">
                              <span className="cfg-payload-spec-k">{k}</span>
                              <span className="cfg-payload-spec-v">{v}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  <div className="cfg-payload-price">
                    {currencySymbol}{fmt(acc.fobPrice || acc.msrp)}
                    {Number(acc.msrp) > 0 && Number(acc.msrp) !== Number(acc.fobPrice) && (
                      <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textDecoration: 'line-through', marginLeft: '6px', fontWeight: 400 }}>
                        {currencySymbol}{fmt(acc.msrp)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action */}
                <div className="cfg-payload-action">
                  {isSelected ? (
                    <div className="cfg-payload-qty-ctrl">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); updateAccQty(acc.id, -1); }}
                        className="cfg-qty-btn"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="cfg-qty-value">{sel!.qty}</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); updateAccQty(acc.id, 1); }}
                        className="cfg-qty-btn"
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleAcc(acc.id); }}
                        className="cfg-remove-btn"
                      >
                        移除
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleAcc(acc.id)}
                      className="cfg-add-btn"
                    >
                      <Plus size={14} />
                      添加
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     STEP 3: Client Details
     ═══════════════════════════════════════════════════════════ */
  function renderStep3() {
    return (
      <div>
        <div className="cfg-step-header">
          <h2>客户信息</h2>
          <p>填写客户信息用于生成报价单</p>
        </div>

        <div className="cfg-client-layout">
          {/* Form */}
          <div className="cfg-client-form">
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <User size={18} style={{ marginRight: "8px", opacity: 0.5 }} />
                  客户详情
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                  <label className="form-label">客户公司名称 *</label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="form-input"
                    placeholder="请输入客户公司名称"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">联系人</label>
                  <input
                    type="text"
                    value={clientContact}
                    onChange={(e) => setClientContact(e.target.value)}
                    className="form-input"
                    placeholder="联系人姓名"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">邮箱</label>
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className="form-input"
                    placeholder="client@company.com"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">币种</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="form-select"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="CNY">CNY (¥)</option>
                    <option value="THB">THB (฿)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">贸易条款</label>
                  <select
                    value={deliveryTerms}
                    onChange={(e) => setDeliveryTerms(e.target.value)}
                    className="form-select"
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
                    max="50"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">有效期（天）</label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={validDays}
                    onChange={(e) => setValidDays(Number(e.target.value))}
                    className="form-input"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Config Summary Sidebar */}
          <div className="cfg-client-summary">
            <div className="card" style={{ background: "var(--color-bg-tertiary)" }}>
              <div className="card-header">
                <div className="card-title" style={{ fontSize: "0.9rem" }}>
                  当前配置
                </div>
              </div>
              {mainP && (
                <div className="cfg-summary-item main">
                  <Plane size={14} />
                  <span>
                    {mainP.model} — {mainP.nameZh}
                    {selectedSku ? `（${selectedSku.labelZh || selectedSku.name}）` : ""}
                  </span>
                  <span className="cfg-summary-price">{currencySymbol}{fmt(mainUnitPrice)}</span>
                </div>
              )}
              {selectedAcc.map((a) => {
                const acc = relevantAccessories.find((x: any) => x.id === a.id);
                if (!acc) return null;
                return (
                  <div key={a.id} className="cfg-summary-item">
                    <Package size={14} />
                    <span>{acc.model} ×{a.qty}</span>
                    <span className="cfg-summary-price">
                      {currencySymbol}{fmt((acc.fobPrice || acc.msrp) * a.qty)}
                    </span>
                  </div>
                );
              })}
              <div className="cfg-summary-total">
                <span>合计</span>
                <span>{currencySymbol}{fmt(total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     STEP 4: Review & Generate
     ═══════════════════════════════════════════════════════════ */
  function renderStep4() {
    return (
      <div>
        <div className="cfg-step-header">
          <h2>确认报价方案</h2>
          <p>请确认以下配置信息，确认无误后生成报价单</p>
        </div>

        <div className="cfg-review-layout">
          {/* Product Hero */}
          {mainP && (
            <div className="cfg-review-hero">
              <div className="cfg-review-hero-img">
                {mainP.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mainP.imageUrl} alt={mainP.model} />
                ) : (
                  <Plane size={60} style={{ color: "var(--color-text-muted)" }} />
                )}
              </div>
              <div className="cfg-review-hero-info">
                <div className="cfg-review-hero-model">{mainP.model}</div>
                <h3>{mainP.nameZh}</h3>
                <p>{mainP.nameEn}</p>
              </div>
            </div>
          )}

          {/* Client Info */}
          <div className="cfg-review-section">
            <h4>
              <User size={16} />
              客户信息
            </h4>
            <div className="cfg-review-client-grid">
              <div>
                <span className="cfg-review-label">公司</span>
                <span className="cfg-review-value">{clientName || "—"}</span>
              </div>
              <div>
                <span className="cfg-review-label">联系人</span>
                <span className="cfg-review-value">{clientContact || "—"}</span>
              </div>
              <div>
                <span className="cfg-review-label">币种</span>
                <span className="cfg-review-value">{currency}</span>
              </div>
              <div>
                <span className="cfg-review-label">条款</span>
                <span className="cfg-review-value">{deliveryTerms}</span>
              </div>
            </div>
          </div>

          {/* Price Breakdown */}
          <div className="cfg-review-section">
            <h4>
              <FileCheck size={16} />
              报价明细
            </h4>
            <div className="cfg-review-table">
              {/* Header */}
              <div className="cfg-review-row header">
                <span className="cfg-review-col desc">产品描述</span>
                <span className="cfg-review-col qty">数量</span>
                <span className="cfg-review-col price">FOB 单价</span>
                <span className="cfg-review-col total">小计</span>
              </div>
              {/* Main product */}
              {mainP && (
                <div className="cfg-review-row main-row">
                  <span className="cfg-review-col desc">
                    <Star size={12} style={{ marginRight: "6px", color: "var(--color-accent-400)" }} />
                    {mainP.model} — {mainP.nameZh}{selectedSku ? `（${selectedSku.labelZh || selectedSku.name}）` : ""}
                  </span>
                  <span className="cfg-review-col qty">1</span>
                  <span className="cfg-review-col price">{currencySymbol}{fmt(mainUnitPrice)}</span>
                  <span className="cfg-review-col total">{currencySymbol}{fmt(mainUnitPrice)}</span>
                </div>
              )}
              {/* Accessories */}
              {selectedAcc.map((a) => {
                const acc = relevantAccessories.find((x: any) => x.id === a.id);
                if (!acc) return null;
                const accUnitPrice = Number(acc.fobPrice || acc.msrp);
                const specEntries = getSnapshotSpecEntries(acc.specsZh, acc.specsEn, "zh");
                return (
                  <div key={a.id} className="cfg-review-row">
                    <div className="cfg-review-col desc" style={{ flexDirection: "column", alignItems: "flex-start", gap: "6px" }}>
                      <span>{acc.model} — {acc.nameZh}</span>
                      {specEntries.length > 0 ? (
                        <div style={{ fontSize: "0.72rem", color: "var(--color-text-tertiary)", lineHeight: 1.45, fontWeight: 500 }}>
                          {specEntries.slice(0, 10).map(([k, v]) => (
                            <div key={k}>{k}：{v}</div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <span className="cfg-review-col qty">{a.qty}</span>
                    <span className="cfg-review-col price">{currencySymbol}{fmt(accUnitPrice)}</span>
                    <span className="cfg-review-col total">{currencySymbol}{fmt(accUnitPrice * a.qty)}</span>
                  </div>
                );
              })}
            </div>

            {/* Totals */}
            <div className="cfg-review-totals">
              <div className="cfg-review-total-row">
                <span>小计</span>
                <span>{currencySymbol}{fmt(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="cfg-review-total-row discount">
                  <span>折扣 ({discount}%)</span>
                  <span>-{currencySymbol}{fmt(subtotal * discount / 100)}</span>
                </div>
              )}
              <div className="cfg-review-total-row grand">
                <span>FOB 青岛 合计总价</span>
                <span>{currencySymbol}{fmt(total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     Embedded Styles (scoped to configurator)
     ═══════════════════════════════════════════════════════════ */
  function renderStyles() {
    return (
      <style>{`
        /* ─── Animations ─── */
        @keyframes cfgSlideInRight {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes cfgSlideInLeft {
          from { opacity: 0; transform: translateX(-40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes cfgPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }

        /* ─── Wrapper ─── */
        .configurator-wrap {
          padding-bottom: 100px;
        }

        /* ─── Stepper ─── */
        .cfg-stepper {
          display: flex;
          align-items: center;
          margin-bottom: 32px;
          padding: 20px 24px;
          background: var(--color-bg-card);
          border: 1px solid var(--color-border);
          border-radius: 16px;
        }
        .cfg-stepper-step {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
          position: relative;
        }
        .cfg-stepper-dot {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-bg-tertiary);
          border: 2px solid var(--color-border);
          color: var(--color-text-muted);
          flex-shrink: 0;
          transition: all 0.3s ease;
          z-index: 2;
        }
        .cfg-stepper-step.active .cfg-stepper-dot {
          background: linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600));
          border-color: var(--color-primary-400);
          color: white;
          box-shadow: 0 0 20px rgba(51,102,255,0.35);
        }
        .cfg-stepper-step.completed .cfg-stepper-dot {
          background: var(--color-success-500);
          border-color: var(--color-success-500);
          color: white;
        }
        .cfg-stepper-labels {
          display: flex;
          flex-direction: column;
        }
        .cfg-stepper-label {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--color-text-tertiary);
        }
        .cfg-stepper-step.active .cfg-stepper-label,
        .cfg-stepper-step.completed .cfg-stepper-label {
          color: var(--color-text-primary);
        }
        .cfg-stepper-sublabel {
          font-size: 0.65rem;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .cfg-stepper-line {
          flex: 1;
          height: 2px;
          background: var(--color-border);
          margin: 0 12px;
        }
        .cfg-stepper-step.completed .cfg-stepper-line {
          background: var(--color-success-500);
        }

        /* ─── Step Header ─── */
        .cfg-step-header {
          margin-bottom: 28px;
        }
        .cfg-step-header h2 {
          font-size: 1.6rem;
          font-weight: 800;
          color: var(--color-text-primary);
          margin-bottom: 4px;
        }
        .cfg-step-header p {
          font-size: 0.9rem;
          color: var(--color-text-tertiary);
        }

        /* ─── STEP 1: Aircraft Cards ─── */
        .cfg-aircraft-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
        }
        .cfg-aircraft-card {
          background: var(--color-bg-card);
          border: 2px solid var(--color-border);
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.3s ease;
          overflow: hidden;
          position: relative;
        }
        .cfg-aircraft-card:hover {
          border-color: var(--color-primary-400);
          transform: translateY(-4px);
          box-shadow: 0 12px 40px rgba(51,102,255,0.15);
        }
        .cfg-aircraft-card.selected {
          border-color: var(--color-primary-500);
          box-shadow: 0 0 0 3px rgba(51,102,255,0.2), 0 12px 40px rgba(51,102,255,0.2);
        }
        .cfg-aircraft-check {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--color-bg-tertiary);
          border: 2px solid var(--color-border);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 5;
          transition: all 0.2s;
          color: white;
        }
        .cfg-aircraft-card.selected .cfg-aircraft-check {
          background: var(--color-primary-500);
          border-color: var(--color-primary-500);
          box-shadow: 0 4px 12px rgba(51,102,255,0.4);
        }
        .cfg-aircraft-img {
          height: 200px;
          background: linear-gradient(135deg, #0a0e1a, #111d3a);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          position: relative;
        }
        .cfg-aircraft-img img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          padding: 16px;
        }
        .cfg-aircraft-placeholder {
          color: var(--color-text-muted);
        }
        .cfg-aircraft-model-badge {
          position: absolute;
          bottom: 12px;
          left: 12px;
          padding: 4px 14px;
          border-radius: 8px;
          background: linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600));
          color: white;
          font-size: 0.8rem;
          font-weight: 800;
          letter-spacing: 1px;
          box-shadow: 0 4px 12px rgba(51,102,255,0.4);
        }
        .cfg-aircraft-info {
          padding: 20px;
        }
        .cfg-aircraft-info h3 {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--color-text-primary);
          margin-bottom: 2px;
        }
        .cfg-aircraft-name-en {
          font-size: 0.8rem;
          color: var(--color-text-tertiary);
          margin-bottom: 12px;
        }
        .cfg-aircraft-specs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
          margin-bottom: 12px;
        }
        .cfg-aircraft-spec {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          color: var(--color-text-secondary);
          padding: 4px 8px;
          background: var(--color-bg-tertiary);
          border-radius: 6px;
        }
        .cfg-aircraft-features {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-bottom: 12px;
        }
        .cfg-feat-tag {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-size: 0.65rem;
          padding: 2px 8px;
          border-radius: 4px;
          background: rgba(51,102,255,0.08);
          color: var(--color-primary-400);
          font-weight: 500;
        }
        .cfg-aircraft-price {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          padding-top: 12px;
          border-top: 1px solid var(--color-border);
        }
        .cfg-price-from {
          font-size: 0.7rem;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .cfg-price-amount {
          font-size: 1.3rem;
          font-weight: 800;
          background: linear-gradient(135deg, var(--color-primary-400), var(--color-accent-400));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          font-family: var(--font-mono);
        }

        /* ─── STEP 2: Payload Cards ─── */
        .cfg-selected-drone {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 20px;
          background: var(--color-bg-card);
          border: 1px solid var(--color-border);
          border-radius: 12px;
          margin-bottom: 20px;
        }
        .cfg-selected-drone-img {
          width: 48px;
          height: 48px;
          border-radius: 10px;
          background: #0f172a;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
        }
        .cfg-selected-drone-img img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .cfg-selected-drone-model {
          font-family: var(--font-mono);
          font-weight: 700;
          font-size: 0.85rem;
          color: var(--color-primary-400);
          margin-right: 8px;
        }
        .cfg-selected-drone-name {
          font-size: 0.85rem;
          color: var(--color-text-secondary);
        }
        .cfg-selected-drone-price {
          margin-left: auto;
          font-family: var(--font-mono);
          font-weight: 700;
          font-size: 1rem;
          color: var(--color-text-primary);
        }

        .cfg-payload-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }
        .cfg-payload-card {
          background: var(--color-bg-card);
          border: 2px solid var(--color-border);
          border-radius: 16px;
          padding: 20px;
          transition: all 0.25s ease;
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .cfg-payload-card:hover {
          border-color: var(--color-border-hover);
          box-shadow: var(--shadow-md);
        }
        .cfg-payload-card.selected {
          border-color: var(--color-primary-500);
          background: rgba(51,102,255,0.03);
          box-shadow: 0 0 0 3px rgba(51,102,255,0.12);
        }
        .cfg-payload-recommended {
          position: absolute;
          top: -1px;
          right: 16px;
          padding: 3px 10px;
          background: linear-gradient(135deg, var(--color-accent-500), var(--color-accent-600));
          color: white;
          font-size: 0.65rem;
          font-weight: 700;
          border-radius: 0 0 8px 8px;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .cfg-payload-img {
          width: 56px;
          height: 56px;
          border-radius: 12px;
          background: var(--color-bg-tertiary);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
          color: var(--color-text-muted);
        }
        .cfg-payload-img img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          padding: 6px;
        }
        .cfg-payload-info { flex: 1; }
        .cfg-payload-model {
          font-family: var(--font-mono);
          font-size: 0.7rem;
          font-weight: 600;
          color: var(--color-primary-400);
          letter-spacing: 0.5px;
        }
        .cfg-payload-info h4 {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--color-text-primary);
          margin: 2px 0;
        }
        .cfg-payload-name-en {
          font-size: 0.75rem;
          color: var(--color-text-tertiary);
        }
        .cfg-payload-feats {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-top: 8px;
        }
        .cfg-payload-feat-tag {
          font-size: 0.6rem;
          padding: 2px 6px;
          border-radius: 4px;
          background: var(--color-bg-tertiary);
          color: var(--color-text-secondary);
        }
        .cfg-payload-specs {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px dashed var(--color-border);
        }
        .cfg-payload-specs-title {
          font-size: 0.65rem;
          font-weight: 800;
          color: var(--color-text-secondary);
          letter-spacing: 0.5px;
          margin-bottom: 6px;
        }
        .cfg-payload-specs-grid {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .cfg-payload-spec-item {
          display: flex;
          flex-wrap: wrap;
          gap: 6px 10px;
          font-size: 0.68rem;
          line-height: 1.35;
          color: var(--color-text-secondary);
        }
        .cfg-payload-spec-k {
          font-weight: 700;
          color: var(--color-text-tertiary);
        }
        .cfg-payload-spec-v {
          flex: 1;
          min-width: 0;
          color: var(--color-text-primary);
        }
        .cfg-payload-price {
          font-size: 1.1rem;
          font-weight: 800;
          color: var(--color-text-primary);
          font-family: var(--font-mono);
          margin-top: 6px;
        }
        .cfg-payload-action {
          border-top: 1px solid var(--color-border);
          padding-top: 12px;
        }
        .cfg-add-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          width: 100%;
          padding: 8px;
          border-radius: 10px;
          border: 1px solid var(--color-primary-500);
          background: rgba(51,102,255,0.06);
          color: var(--color-primary-400);
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-family: var(--font-sans);
        }
        .cfg-add-btn:hover {
          background: var(--color-primary-500);
          color: white;
        }
        .cfg-payload-qty-ctrl {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .cfg-qty-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: 1px solid var(--color-border);
          background: var(--color-bg-tertiary);
          color: var(--color-text-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s;
        }
        .cfg-qty-btn:hover {
          background: var(--color-primary-500);
          color: white;
          border-color: var(--color-primary-500);
        }
        .cfg-qty-value {
          font-family: var(--font-mono);
          font-weight: 700;
          font-size: 1rem;
          min-width: 28px;
          text-align: center;
        }
        .cfg-remove-btn {
          margin-left: auto;
          padding: 6px 12px;
          border-radius: 8px;
          border: none;
          background: rgba(239,68,68,0.08);
          color: var(--color-danger-400);
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          font-family: var(--font-sans);
        }
        .cfg-remove-btn:hover {
          background: var(--color-danger-500);
          color: white;
        }

        /* ─── STEP 3: Client Layout ─── */
        .cfg-client-layout {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 24px;
          align-items: flex-start;
        }
        .cfg-client-form { min-width: 0; }
        .cfg-summary-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 0;
          border-bottom: 1px solid var(--color-border);
          font-size: 0.8rem;
          color: var(--color-text-secondary);
        }
        .cfg-summary-item.main {
          font-weight: 600;
          color: var(--color-text-primary);
        }
        .cfg-summary-price {
          margin-left: auto;
          font-family: var(--font-mono);
          font-weight: 600;
          color: var(--color-text-primary);
        }
        .cfg-summary-total {
          display: flex;
          justify-content: space-between;
          padding-top: 12px;
          margin-top: 8px;
          font-weight: 800;
          font-size: 1.1rem;
          color: var(--color-primary-400);
          font-family: var(--font-mono);
        }

        /* ─── STEP 4: Review ─── */
        .cfg-review-layout {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .cfg-review-hero {
          display: flex;
          align-items: center;
          gap: 24px;
          padding: 24px;
          background: var(--color-bg-card);
          border: 1px solid var(--color-border);
          border-radius: 20px;
          overflow: hidden;
        }
        .cfg-review-hero-img {
          width: 160px;
          height: 110px;
          border-radius: 14px;
          background: #0f172a;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
        }
        .cfg-review-hero-img img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          padding: 8px;
        }
        .cfg-review-hero-model {
          font-family: var(--font-mono);
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--color-primary-400);
          letter-spacing: 1px;
          margin-bottom: 4px;
        }
        .cfg-review-hero-info h3 {
          font-size: 1.2rem;
          font-weight: 700;
          color: var(--color-text-primary);
          margin-bottom: 2px;
        }
        .cfg-review-hero-info p {
          font-size: 0.85rem;
          color: var(--color-text-tertiary);
        }
        .cfg-review-section {
          background: var(--color-bg-card);
          border: 1px solid var(--color-border);
          border-radius: 16px;
          padding: 24px;
        }
        .cfg-review-section h4 {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 1rem;
          font-weight: 700;
          color: var(--color-primary-400);
          margin-bottom: 16px;
          padding-bottom: 10px;
          border-bottom: 1px solid var(--color-border);
        }
        .cfg-review-client-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr 1fr;
          gap: 16px;
        }
        .cfg-review-label {
          display: block;
          font-size: 0.7rem;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
          font-weight: 600;
        }
        .cfg-review-value {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--color-text-primary);
        }

        /* Review Table */
        .cfg-review-table {
          border: 1px solid var(--color-border);
          border-radius: 10px;
          overflow: hidden;
        }
        .cfg-review-row {
          display: flex;
          padding: 12px 16px;
          border-bottom: 1px solid var(--color-border);
          font-size: 0.85rem;
          align-items: center;
        }
        .cfg-review-row:last-child { border-bottom: none; }
        .cfg-review-row.header {
          background: var(--color-bg-tertiary);
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .cfg-review-row.main-row {
          background: rgba(51,102,255,0.04);
          font-weight: 600;
        }
        .cfg-review-col.desc { flex: 1; display: flex; align-items: center; }
        .cfg-review-col.qty { width: 60px; text-align: center; }
        .cfg-review-col.price { width: 120px; text-align: right; font-family: var(--font-mono); }
        .cfg-review-col.total { width: 120px; text-align: right; font-family: var(--font-mono); font-weight: 700; }

        /* Review Totals */
        .cfg-review-totals {
          margin-top: 16px;
          padding-top: 12px;
          border-top: 1px solid var(--color-border);
        }
        .cfg-review-total-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          font-size: 0.9rem;
          color: var(--color-text-secondary);
        }
        .cfg-review-total-row.discount {
          color: var(--color-danger-400);
        }
        .cfg-review-total-row.grand {
          padding-top: 12px;
          margin-top: 8px;
          border-top: 2px solid var(--color-primary-500);
          font-size: 1.3rem;
          font-weight: 800;
          color: var(--color-text-primary);
          font-family: var(--font-mono);
        }

        /* ─── Bottom Bar ─── */
        .cfg-bottombar {
          position: fixed;
          bottom: 0;
          left: var(--sidebar-width);
          right: 0;
          z-index: 50;
          background: var(--glass-bg);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-top: 1px solid var(--color-border);
          padding: 14px 32px;
        }
        .cfg-bottombar-inner {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }
        .cfg-bottombar-price {
          text-align: center;
        }
        .cfg-price-label {
          font-size: 0.65rem;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 600;
        }
        .cfg-price-value {
          font-size: 1.6rem;
          font-weight: 800;
          background: linear-gradient(135deg, var(--color-primary-400), var(--color-accent-400));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          font-family: var(--font-mono);
          letter-spacing: -0.5px;
        }
      `}</style>
    );
  }
}
